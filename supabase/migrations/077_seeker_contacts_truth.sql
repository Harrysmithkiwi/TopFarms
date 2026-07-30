-- ============================================================
-- 077_seeker_contacts_truth.sql
-- TopFarms — Phase 3 Task 3.6
--
-- THE FINDING. `seeker_contacts` is the table the entire placement fee unlocks:
-- the RLS policy releases it when placement_fees.acknowledged_at is set, and
-- Phase 2 built the CV gate around the same predicate. Live count 2026-07-30:
--
--     seeker_profiles           4
--     seeker_contacts           1     <- and that one was seeded by a probe
--     seekers with no contacts  3
--     triggers on the table     0
--
-- Nothing in the application ever writes it (grep: the only reference in src/
-- is ApplicantDashboard READING it). So an employer pays $200–$800, the gate
-- opens, and there is nothing behind it. We were charging for contact details
-- we had never collected. That is the purest instance of what this phase is
-- about, and it was invisible because the paywall worked perfectly.
--
-- ALSO: migrations 023:328, 023:515, 030:60 and 033:52 all reference
-- `sc.first_name` / `sc.last_name`. Those columns have never existed — 057 and
-- 058 patched the RPCs to stop selecting them. The columns were assumed by a
-- year of code and never created, which is why Phase 2 had to derive a display
-- name from the email local-part ("Phase2probe S."). Adding them properly ends
-- that workaround.
--
-- Apply via claude.ai Supabase connector. Verify via pg_catalog read-back.
-- ============================================================

BEGIN;

-- ─── 1. The name columns a year of code already assumed ─────────────────────

ALTER TABLE public.seeker_contacts
  ADD COLUMN first_name text,
  ADD COLUMN last_name  text;

COMMENT ON COLUMN public.seeker_contacts.first_name IS
  'Referenced by migrations 023/030/033 since 2026-04 but never created until Phase 3 (077). Lets get_applicants_for_job show a real name instead of deriving one from the email local-part.';

-- ─── 2. A contact row must exist for every seeker ───────────────────────────
-- Email comes from auth.users: it is already verified at signup, and asking the
-- seeker to retype it would invite a typo in the one field the employer pays to
-- receive. Phone stays NULL until the seeker supplies it.

CREATE OR REPLACE FUNCTION public.ensure_seeker_contact_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seeker_contacts (user_id, email)
  SELECT NEW.user_id, u.email
  FROM auth.users u
  WHERE u.id = NEW.user_id AND u.email IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seeker_profiles_ensure_contact ON public.seeker_profiles;
CREATE TRIGGER seeker_profiles_ensure_contact
  AFTER INSERT ON public.seeker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_seeker_contact_row();

COMMENT ON FUNCTION public.ensure_seeker_contact_row() IS
  'Guarantees the paywalled table is non-empty (Phase 3 Task 3.6). Before this, 3 of 4 seekers had no seeker_contacts row at all and nothing in the app created one — so acknowledging a placement fee unlocked nothing. A trigger rather than app code: the row must exist for every seeker regardless of which client path created the profile.';

-- Backfill every existing seeker.
INSERT INTO public.seeker_contacts (user_id, email)
SELECT sp.user_id, u.email
FROM public.seeker_profiles sp
JOIN auth.users u ON u.id = sp.user_id
WHERE u.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ─── 3. Let the seeker maintain their own name and phone ────────────────────
-- The FOR ALL policy from 031 already covers this (user_id = auth.uid()), but
-- the column grants must allow the new columns explicitly if any were pinned.
GRANT INSERT (user_id, email, phone, first_name, last_name),
      UPDATE (phone, first_name, last_name)
  ON public.seeker_contacts TO authenticated;

-- ─── 4. Real names in the applicant list, with the derivation as fallback ───

CREATE OR REPLACE FUNCTION public.get_applicants_for_job(p_job_id uuid)
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
    -- Prefer the name the seeker gave us: "Sarah M.". Fall back to the
    -- email-local-part derivation only where no name has been captured yet
    -- (Phase 2 stopgap), and to an opaque label if even that is unusable.
    COALESCE(
      NULLIF(TRIM(
        COALESCE(sc.first_name, '') ||
        CASE WHEN NULLIF(TRIM(COALESCE(sc.last_name, '')), '') IS NOT NULL
             THEN ' ' || upper(LEFT(TRIM(sc.last_name), 1)) || '.' ELSE '' END
      ), ''),
      CASE
        WHEN COALESCE(sc.email, u.email) IS NULL
          OR split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 1) !~ '^[a-zA-Z]'
        THEN NULL
        ELSE initcap(split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 1))
          || COALESCE(
               ' ' || upper(LEFT(NULLIF(split_part(regexp_replace(split_part(COALESCE(sc.email, u.email), '@', 1), '[._+\-]+', ' ', 'g'), ' ', 2), ''), 1)) || '.',
               ''
             )
      END,
      'Applicant ' || LEFT(a.id::text, 8)
    ) AS display_name,
    COALESCE(ms.total_score, 0) AS match_score,
    -- Full email only after the placement fee is acknowledged.
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
