-- 066: Phase 1 Task 1.3 — close the authorization gaps that live in Postgres.
--
-- Companion to the Edge Function work in feat/phase1-auth-spine (Tasks 1.1/1.2). Those
-- closed holes in function code; these are holes in policy. Audit refs: P0-5, P0-6, F-S1,
-- F-S2 (docs/AUDIT-PRELAUNCH-2026-07-30.md).
--
-- CROSS-TABLE PREDICATES GO THROUGH DEFINER HELPERS. A policy that subqueries another
-- RLS'd table can form a cycle with that table's policies — incident E8 (migration 059 →
-- 42P17 infinite recursion on prod, hotfixed by 060). Every cross-table check below is
-- wrapped in a SECURITY DEFINER boolean for that reason.

-- ============================================================================
-- 1.3a — set_user_role: first assignment only
-- ============================================================================
-- Was: INSERT ... ON CONFLICT (user_id) DO UPDATE SET role. Any authenticated user could
-- flip themselves to 'employer' — unlimited, free, unaudited — and then read every
-- open-to-work seeker's profile and skills.
--
-- Both callers are compatible with one-shot assignment: SelectRole.tsx:32 early-returns
-- when a role already exists, and AuthContext.tsx:168 sets it once at OAuth signup. So this
-- removes an attack without changing any legitimate flow.
--
-- Deliberately NOT adding an audit-log write: if the role can only be set once, there is
-- nothing to audit. Prefer removing the capability over logging it.

CREATE OR REPLACE FUNCTION public.set_user_role(p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('employer', 'seeker') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  SELECT role INTO v_existing FROM public.user_roles WHERE user_id = auth.uid();

  IF v_existing IS NOT NULL THEN
    -- Idempotent: re-selecting the SAME role is a no-op rather than an error, so a double
    -- submit or a retried signup does not surface a scary failure to the user.
    IF v_existing = p_role THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Role already set; contact support to change it'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), p_role);
END;
$function$;

-- ============================================================================
-- 1.3b — seeker_skills: bind employer reads to a real relationship
-- ============================================================================
-- Was: qual = get_user_role(auth.uid()) = 'employer'. No ownership binding whatsoever, so
-- any account holding the employer role read every seeker's skills.
--
-- Now: the seeker applied to one of the caller's jobs, OR is open_to_work. The second arm
-- matches the posture seeker_profiles already takes ("employers view open-to-work seekers"),
-- which is the intended marketplace browse. Keeping the two consistent is the point — a
-- seeker who is discoverable by profile but not by skills is an incoherent boundary.

CREATE OR REPLACE FUNCTION public.employer_may_view_seeker(p_seeker_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- (a) the seeker applied to a job this employer owns
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j             ON j.id = a.job_id
    JOIN public.employer_profiles e ON e.id = j.employer_id
    WHERE a.seeker_id = p_seeker_id
      AND e.user_id = auth.uid()
  ) OR EXISTS (
    -- (b) the seeker is openly discoverable
    SELECT 1
    FROM public.seeker_profiles sp
    WHERE sp.id = p_seeker_id
      AND sp.open_to_work = true
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.employer_may_view_seeker(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.employer_may_view_seeker(uuid) TO authenticated;

DROP POLICY IF EXISTS "seeker_skills: employers can view" ON public.seeker_skills;
CREATE POLICY "seeker_skills: employers can view" ON public.seeker_skills
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role((SELECT auth.uid()))) = 'employer'
    AND public.employer_may_view_seeker(seeker_id)
  );

-- ============================================================================
-- 1.3c — messages: bind the INSERT to the thread
-- ============================================================================
-- Was: with_check = (sender_id = auth.uid()) only. thread_id was unchecked, so any
-- authenticated user could inject a message into ANY employer<->seeker thread. They could
-- not read it back (the SELECT policy is correctly bound), but both real participants would
-- see the injected content — a harassment and phishing vector against workers, on a surface
-- that has no UI and is therefore unmonitored.
--
-- Mirrors the existing SELECT policy's predicate exactly.

DROP POLICY IF EXISTS "messages: sender can insert" ON public.messages;
CREATE POLICY "messages: sender can insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND thread_id IN (
      SELECT mt.id FROM public.message_threads mt
      WHERE mt.employer_id IN (
              SELECT ep.id FROM public.employer_profiles ep WHERE ep.user_id = (SELECT auth.uid())
            )
         OR mt.seeker_id IN (
              SELECT sp.id FROM public.seeker_profiles sp WHERE sp.user_id = (SELECT auth.uid())
            )
    )
  );

-- ============================================================================
-- 1.3d — employer_verifications: close BOTH read policies
-- ============================================================================
-- The audit flagged the anon policy (qual: true). Reading pg_policies live surfaced a
-- SECOND one with the same effect for any seeker (qual: role = 'seeker'). Both exposed
-- nzbn_number and document_url — the latter a path into the private employer-documents
-- bucket — for every employer, including those with no public listing.
--
-- Live row count is 0, so this was an armed landmine rather than a live breach: it arms
-- itself the moment the first employer verifies.
--
-- NOTE: this does NOT make the "verified" badge trustworthy. Verification is still
-- self-service (DocumentUpload.tsx:47-56 writes status='verified' from the client) — that
-- is audit P0-9, fixed in Phase 3. This only stops leaking the evidence behind the badge.

DROP POLICY IF EXISTS "anon view employer verifications" ON public.employer_verifications;
CREATE POLICY "anon view employer verifications" ON public.employer_verifications
  FOR SELECT TO anon
  USING (
    status = 'verified'
    AND public.employer_has_public_job(employer_id)
  );

DROP POLICY IF EXISTS "seekers view employer verifications" ON public.employer_verifications;
CREATE POLICY "seekers view employer verifications" ON public.employer_verifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role((SELECT auth.uid()))) = 'seeker'
    AND status = 'verified'
    AND public.employer_has_public_job(employer_id)
  );

-- ============================================================================
-- 1.3e — applications column exposure: DEFERRED, with the reason recorded
-- ============================================================================
-- Seekers can read application_notes and ai_summary on their own application rows.
--
-- The obvious fix does not work: column-level grants are per-ROLE, and employer and seeker
-- are both `authenticated`. Revoking these columns from authenticated would strip them from
-- the employer applicant dashboard too.
--
-- Real options are (a) a seeker-facing view with direct table SELECT revoked — invasive,
-- rewrites client queries; or (b) moving employer-private fields to a sibling table. Both
-- are schema-shaped changes that belong with the Phase 5 data-layer work, not in a security
-- hotfix migration.
--
-- Severity supports deferring: the exposed data is the employer's own notes about THAT
-- seeker, not another tenant's data. No cross-tenant leak. Carried to the roadmap as a
-- Phase 5 item rather than silently left open.
