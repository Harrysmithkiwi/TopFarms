-- 095 — Job Check evidence from the applicant pipeline (Phase D5)
--
-- WHY THIS IS THE SHAPE IT IS. D1 verified the AEWV Job Check rules against live INZ on
-- 2026-08-18 (docs/immigration/05-job-check-advertising-verified.md) and the assumption in the
-- campaign map was wrong in a useful direction. INZ does not ask for a screenshot of the
-- advertisement. It asks the employer to report:
--
--   * the number of candidates that applied
--   * the number of New Zealand citizens or residents that applied
--   * the number assessed as suitable
--   * the number hired
--   * (ANZSCO skill level 4-5) why any New Zealanders who applied were not suitable
--
-- Those are facts about the applicant pipeline, and TopFarms already holds every one of them.
-- The compliance artefact is therefore a by-product of a job board doing its ordinary job,
-- which is the whole wedge: a farm needs this document in order to hire the migrant they have
-- already chosen, so they cannot refuse to post.
--
-- ── WHAT THIS FUNCTION DELIBERATELY DOES NOT DO ─────────────────────────────────────────
--
-- It does NOT map our pipeline onto INZ's category "assessed as suitable". That mapping is a
-- LEGAL judgement -- does `shortlisted` mean assessed-and-suitable? does `review` count as
-- assessed? -- and baking a legal conclusion into a SQL function would put a determination in
-- front of a farm with nobody accountable for it. The founder holds the practising certificate
-- (IALA s 11, see docs/immigration/02-legal-line.md); the advice is his to give, not this
-- function's. So it returns the pipeline FACTS, per status, and the answer is composed above it.
--
-- It also does not state an advertising duration. That is 14 days at ANZSCO skill level 1-3 and
-- 21 days at level 4-5, which is most farm work -- and level 4-5 additionally requires good
-- faith engagement with Work and Income, which happens entirely outside TopFarms and must never
-- be implied as covered. The function reports the dates; the occupation band is a human call.
--
-- Residency is read from `seeker_profiles.visa_status`, which is SELF-DECLARED. Labelled as
-- such in the output, because an INZ-facing count that quietly presents self-declaration as
-- verified fact is the same class of defect as F-11's self-asserted trust badge.

BEGIN;

CREATE OR REPLACE FUNCTION public.job_check_evidence(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job     record;
  v_caller  uuid := auth.uid();
  v_is_admin boolean := public.get_user_role(auth.uid()) = 'admin';
  v_owns    boolean;
  -- array_append, never `v_gaps || 'text'`: plpgsql resolves that operator by trying to
  -- parse the right side as an ARRAY LITERAL, so any string containing a comma or parenthesis
  -- raises 22P02 at runtime rather than at deploy.
  v_gaps    text[] := ARRAY[]::text[];
  v_counts  jsonb;
  v_by_status jsonb;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- The employer who owns the listing, or an admin. Nobody else: these are applicant counts
  -- for one farm's vacancy and they are commercially sensitive.
  SELECT EXISTS (
    SELECT 1 FROM public.employer_profiles ep
    WHERE ep.id = v_job.employer_id AND ep.user_id = v_caller
  ) INTO v_owns;

  IF NOT (v_owns OR v_is_admin) THEN
    RAISE EXCEPTION 'Not authorised for this job';
  END IF;

  -- ── Listing content required by INZ ───────────────────────────────────────────────────
  -- "a job description with details of the key tasks, duties and responsibilities; the minimum
  -- and maximum rate of pay or salary, or estimated actual earnings if actual earnings are not
  -- guaranteed; type of work and minimum guaranteed hours of work; the minimum skills,
  -- experience and qualifications for the job."
  --
  -- Only `contract_type` is NOT NULL on `jobs`, so a farm can publish a listing that cannot
  -- support a Job Check and nothing anywhere tells them. This is that telling.
  IF coalesce(btrim(v_job.description_daytoday), '') = '' THEN
    v_gaps := array_append(v_gaps, 'Key tasks, duties and responsibilities (the day-to-day description)');
  END IF;
  IF v_job.salary_min IS NULL THEN
    v_gaps := array_append(v_gaps, 'Minimum rate of pay');
  END IF;
  IF v_job.salary_max IS NULL THEN
    v_gaps := array_append(v_gaps, 'Maximum rate of pay');
  END IF;
  IF v_job.hours_min IS NULL THEN
    v_gaps := array_append(v_gaps, 'Minimum guaranteed hours of work');
  END IF;
  IF v_job.min_dairy_experience IS NULL
     AND v_job.seniority_level IS NULL
     AND coalesce(array_length(v_job.qualifications, 1), 0) = 0 THEN
    v_gaps := array_append(v_gaps, 'Minimum skills, experience or qualifications');
  END IF;

  -- ── Pipeline facts, by status. No INZ category is asserted here. ──────────────────────
  SELECT coalesce(jsonb_object_agg(t.status, t.n), '{}'::jsonb)
    INTO v_by_status
  FROM (
    SELECT status, count(*) AS n
    FROM public.applications WHERE job_id = p_job_id GROUP BY status
  ) t;

  SELECT jsonb_build_object(
    'applied_total', count(*),
    'applied_nz_citizen_or_resident', count(*) FILTER (
      WHERE sp.visa_status IN ('nz_citizen', 'permanent_resident')),
    'applied_visa_status_not_stated', count(*) FILTER (WHERE sp.visa_status IS NULL),
    'by_status', v_by_status,
    'hired_total', count(*) FILTER (WHERE a.status = 'hired'),
    'hired_nz_citizen_or_resident', count(*) FILTER (
      WHERE a.status = 'hired' AND sp.visa_status IN ('nz_citizen', 'permanent_resident'))
  )
  INTO v_counts
  FROM public.applications a
  LEFT JOIN public.seeker_profiles sp ON sp.id = a.seeker_id
  WHERE a.job_id = p_job_id;

  RETURN jsonb_build_object(
    'job_id', p_job_id,
    'job_title', v_job.title,
    'advertised', jsonb_build_object(
      'from', v_job.created_at,
      'until', v_job.expires_at,
      'days_live', GREATEST(0, (coalesce(v_job.expires_at, now())::date - v_job.created_at::date)),
      'status', v_job.status
    ),
    'listing_gaps', to_jsonb(v_gaps),
    'listing_meets_content_rule', coalesce(array_length(v_gaps, 1), 0) = 0,
    'pipeline', coalesce(v_counts, jsonb_build_object('applied_total', 0)),
    'caveats', jsonb_build_array(
      'Residency is self-declared by the applicant and has not been verified.',
      'INZ category "assessed as suitable" is not asserted here. Pipeline statuses are reported as-is; mapping them is a legal judgement.',
      'Required advertising duration depends on the ANZSCO skill level of the occupation: 14 days at levels 1-3, 21 days at levels 4-5.',
      'ANZSCO skill level 4-5 also requires good-faith engagement with Work and Income, which happens outside TopFarms.'
    ),
    'verified_against_inz_on', '2026-08-18'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.job_check_evidence(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.job_check_evidence(uuid) TO authenticated;

COMMENT ON FUNCTION public.job_check_evidence(uuid) IS
  'AEWV Job Check evidence for one listing: advertising dates, INZ listing-content gaps, and applicant-pipeline counts. Employer-owner or admin only. Deliberately reports pipeline FACTS rather than mapping them onto the INZ category "assessed as suitable" -- that mapping is a legal judgement and belongs to the practising-certificate holder, not to a SQL function. See docs/immigration/05-job-check-advertising-verified.md.';

COMMIT;
