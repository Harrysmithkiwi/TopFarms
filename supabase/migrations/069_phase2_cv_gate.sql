-- ============================================================
-- 069_phase2_cv_gate.sql
-- TopFarms — Phase 2 Task 2.3: the contact gate (Option C)
--
-- Audit P0-1: seeker_contacts is correctly paywalled behind
-- placement_fees.acknowledged_at, but the same phone and email sit in the CV,
-- and 020's employer SELECT policy released the CV with no fee predicate.
-- The CV row itself also leaks (filename is typically "First-Last-CV.pdf"),
-- so the gate is on SELECT, not just on the signed-URL mint.
--
-- Option C (locked 2026-07-30): pre-placement the employer sees the
-- structured profile, match breakdown, AI summary and a first name; the CV
-- unlocks when the placement fee is acknowledged. certificate / reference
-- stay available pre-placement.
--
-- Cross-table predicate via SECURITY DEFINER helper per incident E8 (42P17
-- recursion when policy predicates walk RLS-bearing tables).
--
-- Also fixes audit P0-5: get_applicants_for_job returned
-- COALESCE(sc.email, u.email, …) as display_name — the paywalled email leaked
-- as a display string on every applicant card. Now returns a derived
-- "First L." label (no name columns exist anywhere in the schema — carryforward:
-- collect real first/last names at onboarding) and gates the email column on
-- the same acknowledged-fee predicate as everything else.
-- ============================================================

BEGIN;

-- ─── 1. Definer helper: has this employer acknowledged a placement fee for
--        this seeker? ───────────────────────────────────────────────────────
-- 037-family hardening: SECURITY DEFINER, pinned search_path, STABLE.

CREATE OR REPLACE FUNCTION public.employer_has_placement_access(p_seeker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.placement_fees pf
    JOIN public.jobs j ON j.id = pf.job_id
    JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE ep.user_id = auth.uid()
      AND pf.seeker_id = p_seeker_id
      AND pf.acknowledged_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.employer_has_placement_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_has_placement_access(uuid) TO authenticated;

-- ─── 2. Rebuild the employer SELECT policy on seeker_documents ──────────────
-- certificate / reference: unchanged relationship walk (020).
-- cv: additionally requires an acknowledged placement fee via the helper.

DROP POLICY IF EXISTS "employers select applicant visible documents" ON public.seeker_documents;

CREATE POLICY "employers select applicant visible documents"
ON public.seeker_documents
FOR SELECT
USING (
  public.get_user_role((SELECT auth.uid())) = 'employer'
  AND (
    (
      document_type IN ('certificate', 'reference')
      AND seeker_id IN (
        SELECT a.seeker_id
        FROM public.applications a
        INNER JOIN public.jobs j ON j.id = a.job_id
        INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
        WHERE ep.user_id = (SELECT auth.uid())
      )
    )
    OR (
      document_type = 'cv'
      AND public.employer_has_placement_access(seeker_id)
    )
  )
);

COMMENT ON POLICY "employers select applicant visible documents" ON public.seeker_documents IS
  'Phase 2 Option C contact gate. certificate/reference: visible to employers the seeker applied to (020 walk). cv: additionally requires placement_fees.acknowledged_at via employer_has_placement_access() — the CV carries the paywalled phone/email. Mirrored in get-applicant-document-url (service-role path). identity stays hard-excluded.';

-- ─── 3. get_applicants_for_job — stop leaking email as display_name ─────────
-- Return shape changes (adds email), so DROP + CREATE. Sole caller:
-- src/pages/jobs/MarkFilledModal.tsx.

DROP FUNCTION IF EXISTS public.get_applicants_for_job(uuid);

CREATE FUNCTION public.get_applicants_for_job(p_job_id uuid)
 RETURNS TABLE(id uuid, seeker_id uuid, status text, display_name text, match_score integer, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employer_user_id uuid;
BEGIN
  SELECT ur.user_id INTO v_employer_user_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'employer';

  IF v_employer_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE j.id = p_job_id
      AND ep.user_id = v_employer_user_id
  ) THEN
    RAISE EXCEPTION 'Job not found or not owned by caller' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.seeker_id,
    a.status::text,
    -- "First L." from the email local-part; the full email never appears here.
    -- No name columns exist in the schema (057/058 precedent) — carryforward:
    -- collect real names at onboarding, then swap this derivation out.
    CASE
      WHEN COALESCE(sc.email, u.email) IS NULL
        OR split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 1) !~ '^[a-zA-Z]'
      THEN 'Applicant ' || LEFT(a.id::text, 8)
      ELSE initcap(split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 1))
        || COALESCE(
             ' ' || upper(LEFT(NULLIF(split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 2), ''), 1)) || '.',
             ''
           )
    END AS display_name,
    COALESCE(ms.total_score, 0) AS match_score,
    -- Full email only after the placement fee is acknowledged — same predicate
    -- as seeker_contacts and the CV gate.
    CASE WHEN pf.id IS NOT NULL THEN sc.email END AS email
  FROM public.applications a
  LEFT JOIN public.seeker_profiles sp ON sp.id = a.seeker_id
  LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id
  LEFT JOIN auth.users u ON u.id = sp.user_id
  LEFT JOIN public.match_scores ms ON ms.job_id = a.job_id AND ms.seeker_id = a.seeker_id
  LEFT JOIN public.placement_fees pf ON pf.application_id = a.id AND pf.acknowledged_at IS NOT NULL
  WHERE a.job_id = p_job_id
  ORDER BY COALESCE(ms.total_score, 0) DESC, a.created_at ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_applicants_for_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_applicants_for_job(uuid) TO authenticated;

COMMIT;
