-- Migration 010: Pre-computed match scores — explanation column, triggers, backfill, pg_cron
--
-- Transforms match scoring from query-time RPC to pre-computed, trigger-maintained rows.
-- The existing compute_match_score() function already implements all 7 scoring dimensions;
-- this migration wraps it with store-and-refresh infrastructure.
--
-- Sections:
--   1. Add explanation column + index
--   2. Seeker trigger function (trigger_recompute_seeker_scores)
--   3. Seeker trigger definition
--   4. Job trigger function (trigger_recompute_job_scores)
--   5. Job trigger definition
--   6. Backfill existing active seeker-job pairs
--   7. pg_cron nightly batch recompute at 3 AM UTC

-- ============================================================
-- 1. Add explanation column
-- ============================================================

ALTER TABLE public.match_scores
  ADD COLUMN IF NOT EXISTS explanation text;

-- Partial index for finding rows that still need AI explanations
CREATE INDEX IF NOT EXISTS match_scores_explanation_null_idx
  ON public.match_scores (id)
  WHERE explanation IS NULL;

-- ============================================================
-- 2. Seeker trigger function
-- ============================================================
-- Fires AFTER INSERT OR UPDATE on seeker_profiles.
-- Column-guarded: only rescores when a scoring-relevant column changes.
-- Sector-scoped: only touches match_scores rows for active jobs in the seeker's sectors.
-- Never touches the explanation column — managed separately by the AI Edge Function.

CREATE OR REPLACE FUNCTION public.trigger_recompute_seeker_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For UPDATE: skip rescoring if no scoring-relevant column changed
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.shed_types_experienced IS NOT DISTINCT FROM NEW.shed_types_experienced AND
      OLD.region                 IS NOT DISTINCT FROM NEW.region AND
      OLD.sector_pref            IS NOT DISTINCT FROM NEW.sector_pref AND
      OLD.visa_status            IS NOT DISTINCT FROM NEW.visa_status AND
      OLD.min_salary             IS NOT DISTINCT FROM NEW.min_salary AND
      OLD.accommodation_needed   IS NOT DISTINCT FROM NEW.accommodation_needed AND
      OLD.couples_seeking        IS NOT DISTINCT FROM NEW.couples_seeking AND
      OLD.open_to_relocate       IS NOT DISTINCT FROM NEW.open_to_relocate
    ) THEN
      RETURN NEW; -- nothing scoring-relevant changed
    END IF;
  END IF;

  -- Recompute and upsert scores for all active jobs matching this seeker's sector preferences.
  -- CROSS JOIN LATERAL captures the full jsonb result in a single call (avoids double-calling).
  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
  SELECT
    j.id,
    NEW.id,
    (result->>'total_score')::int,
    result->'breakdown',
    now()
  FROM public.jobs j
  CROSS JOIN LATERAL public.compute_match_score(NEW.id, j.id) AS result
  WHERE j.status = 'active'
    AND j.sector = ANY(NEW.sector_pref)
  ON CONFLICT (job_id, seeker_id)
  DO UPDATE SET
    total_score   = EXCLUDED.total_score,
    breakdown     = EXCLUDED.breakdown,
    calculated_at = EXCLUDED.calculated_at;
  -- explanation intentionally excluded — managed by AI Edge Function

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Seeker trigger definition
-- ============================================================

CREATE TRIGGER seeker_profile_match_rescore
  AFTER INSERT OR UPDATE ON public.seeker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_seeker_scores();

-- ============================================================
-- 4. Job trigger function
-- ============================================================
-- Fires AFTER INSERT OR UPDATE on jobs.
-- Status guard: only rescores when the new job status is 'active'.
-- Column-guarded for UPDATE: only rescores when a scoring-relevant job column changes.
-- Sector-scoped: only touches match_scores rows for seekers whose sector_pref overlaps the job's sector.
-- Never touches the explanation column — managed separately by the AI Edge Function.

CREATE OR REPLACE FUNCTION public.trigger_recompute_job_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recompute scores for active jobs
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- For UPDATE: skip rescoring if no scoring-relevant column changed
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.sector            IS NOT DISTINCT FROM NEW.sector AND
      OLD.region            IS NOT DISTINCT FROM NEW.region AND
      OLD.shed_type         IS NOT DISTINCT FROM NEW.shed_type AND
      OLD.salary_min        IS NOT DISTINCT FROM NEW.salary_min AND
      OLD.salary_max        IS NOT DISTINCT FROM NEW.salary_max AND
      OLD.visa_sponsorship  IS NOT DISTINCT FROM NEW.visa_sponsorship AND
      OLD.couples_welcome   IS NOT DISTINCT FROM NEW.couples_welcome AND
      OLD.accommodation     IS NOT DISTINCT FROM NEW.accommodation AND
      OLD.status            IS NOT DISTINCT FROM NEW.status
    ) THEN
      RETURN NEW; -- nothing scoring-relevant changed
    END IF;
  END IF;

  -- Recompute and upsert scores for all seekers whose sector_pref overlaps this job's sector.
  -- CROSS JOIN LATERAL captures the full jsonb result in a single call (avoids double-calling).
  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
  SELECT
    NEW.id,
    sp.id,
    (result->>'total_score')::int,
    result->'breakdown',
    now()
  FROM public.seeker_profiles sp
  CROSS JOIN LATERAL public.compute_match_score(sp.id, NEW.id) AS result
  WHERE NEW.sector = ANY(sp.sector_pref)
  ON CONFLICT (job_id, seeker_id)
  DO UPDATE SET
    total_score   = EXCLUDED.total_score,
    breakdown     = EXCLUDED.breakdown,
    calculated_at = EXCLUDED.calculated_at;
  -- explanation intentionally excluded — managed by AI Edge Function

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Job trigger definition
-- ============================================================

CREATE TRIGGER job_match_rescore
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_job_scores();

-- ============================================================
-- 6. Backfill existing active seeker-job pairs
-- ============================================================
-- Populates match_scores for all existing active jobs × matching seeker pairs
-- so that search works immediately with pre-computed scores after this migration.
-- SET statement_timeout = '0' prevents timeout for large datasets on Supabase.

SET statement_timeout = '0';

INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
SELECT
  j.id,
  sp.id,
  (result->>'total_score')::int,
  result->'breakdown',
  now()
FROM public.jobs j
JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
WHERE j.status = 'active'
ON CONFLICT (job_id, seeker_id)
DO UPDATE SET
  total_score   = EXCLUDED.total_score,
  breakdown     = EXCLUDED.breakdown,
  calculated_at = EXCLUDED.calculated_at;
-- explanation intentionally excluded — managed by AI Edge Function

RESET statement_timeout;

-- ============================================================
-- 7. pg_cron nightly batch recompute
-- ============================================================
-- Runs at 3:00 AM UTC daily. Two responsibilities:
--   (a) Data integrity: recalculates any scores that may have drifted
--   (b) Day-7 recency transition: jobs crossing the 7-day mark drop the 1.1× multiplier;
--       the nightly batch catches these by recomputing all active pairs
--
-- The WHERE ... IS DISTINCT FROM guards skip unnecessary writes for unchanged scores.
-- The explanation column is never touched — the AI Edge Function manages it separately.
--
-- Follows the exact pattern established in 008_job_expiry_cron.sql.

SELECT cron.schedule(
  'nightly-match-score-recompute',  -- Job name (unique)
  '0 3 * * *',                       -- Cron expression: every day at 03:00 UTC
  $$
    INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
    SELECT
      j.id,
      sp.id,
      (result->>'total_score')::int,
      result->'breakdown',
      now()
    FROM public.jobs j
    JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
    CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
    WHERE j.status = 'active'
    ON CONFLICT (job_id, seeker_id)
    DO UPDATE SET
      total_score   = EXCLUDED.total_score,
      breakdown     = EXCLUDED.breakdown,
      calculated_at = EXCLUDED.calculated_at
    WHERE match_scores.total_score IS DISTINCT FROM EXCLUDED.total_score
       OR match_scores.breakdown   IS DISTINCT FROM EXCLUDED.breakdown;
    -- explanation intentionally excluded — managed by AI Edge Function
  $$
);
