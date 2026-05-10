BEGIN;

-- get_applicants_for_job(p_job_id uuid)
-- SECURITY DEFINER RPC for MarkFilledModal employer applicant picker.
-- Returns applicants for a job with human-readable display names.
-- Bypasses seeker_contacts RLS (employer access gated behind placement fee)
-- to surface names for the filled-job UX flow.
-- Ownership check: confirms the job belongs to the calling employer before
-- returning any data.
--
-- Returns: SETOF rows with (id, seeker_id, status, display_name, match_score)
--   display_name: COALESCE(first+last name from seeker_contacts, email from auth.users, LEFT(application.id::text, 8))
--   match_score: match_scores.total_score or 0 if no score exists
--
-- Note: applied via Supabase Studio SQL Editor (CLAUDE.md §2).
-- NAMING.md lookup table entry added in 18.2-01-SUMMARY.md.

CREATE OR REPLACE FUNCTION public.get_applicants_for_job(p_job_id uuid)
RETURNS TABLE (
  id             uuid,
  seeker_id      uuid,
  status         text,
  display_name   text,
  match_score    int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_user_id uuid;
BEGIN
  -- Resolve the calling employer's user_id from user_roles
  SELECT ur.user_id INTO v_employer_user_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'employer';

  IF v_employer_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  -- Verify job ownership: jobs → employer_profiles → user_id must match caller
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
    COALESCE(
      NULLIF(TRIM(COALESCE(sc.first_name, '') || ' ' || COALESCE(sc.last_name, '')), ''),
      u.email,
      LEFT(a.id::text, 8)
    ) AS display_name,
    COALESCE(ms.total_score, 0) AS match_score
  FROM public.applications a
  LEFT JOIN public.seeker_profiles sp ON sp.user_id = a.seeker_id
  LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
  LEFT JOIN auth.users u ON u.id = a.seeker_id
  LEFT JOIN public.match_scores ms ON ms.application_id = a.id
  WHERE a.job_id = p_job_id
  ORDER BY COALESCE(ms.total_score, 0) DESC, a.created_at ASC;
END;
$$;

-- Grant execute to authenticated role so the employer client can call it
GRANT EXECUTE ON FUNCTION public.get_applicants_for_job(uuid) TO authenticated;

COMMIT;
