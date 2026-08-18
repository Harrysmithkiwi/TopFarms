-- 094 — The rescore guard sees what the score reads, and an explanation cannot outlive it
--       (audit F-15 + F-20, Phase C4)
--
-- BOTH FINDINGS IN ONE MIGRATION, deliberately. Applied separately the second reverts the
-- first: they both rewrite the two rescore trigger functions, so whichever lands last wins
-- and silently drops the other's change. This is recorded in the audit and is the reason
-- this file carries two tickets.
--
-- ── F-15: the guard was stale, and v3 made it staler ────────────────────────────────────
--
-- Both rescore triggers early-return when "nothing relevant changed". The seeker-side list
-- named 8 columns; `compute_match_score` v3 (093) reads 15. Seven were missing:
--
--   pets, family              -- the two the audit named. compute_match_score reads BOTH for
--                               the accommodation dimension, so a seeker adding a dog got no
--                               rescore until the next cron pass, up to 24h later.
--   role_type_pref            -- NEW in v3, and now the single largest dimension at 18 points
--   contract_type_pref        -- NEW in v3, 12 points, and the most common thing seekers state
--   years_experience          -- NEW in v3, 10 points
--   availability_date         -- NEW in v3, 6 points
--   herd_sizes_worked         -- NEW in v3, 3 points
--
-- So after 093 a seeker could change the ROLE THEY WANT and their score would not move. The
-- job side had the same shape: its guard named 9 columns while v3 reads role_type,
-- contract_type, min_dairy_experience, seniority_level, start_date and herd_size_min/max as
-- well, so an employer correcting the role on a listing rescored nothing.
--
-- The audit says "do not apply job-side", which was correct against v2 -- the job trigger
-- already had the IS NOT DISTINCT FROM pattern, so there was no guard to ADD. It did not
-- anticipate v3 widening what the job side reads. Leaving that list stale is the same defect
-- the ticket exists to fix, so both lists are corrected here.
--
-- `views_count` stays OUT of both lists on purpose: it changes on every page view, and a
-- rescore is a cross join over every seeker.
--
-- ── F-15, second half: narrowing sector_pref orphaned rows ──────────────────────────────
--
-- The seeker trigger only INSERTs/UPDATEs rows for jobs matching the CURRENT sector_pref.
-- Narrowing from ['dairy','sheep_beef'] to ['dairy'] left every sheep_beef row in
-- match_scores forever -- and `match_scores` is what job search reads AND what the operator
-- match-alert emails from. The seeker was still shown, and still emailed about, jobs in a
-- sector they had explicitly removed.
--
-- Done in the trigger rather than the cron the audit suggested: the trigger already holds the
-- seeker id, the DELETE is one seeker's rows, and a cron leaves a staleness window during
-- which search is wrong. NULL sector_pref deletes everything, which is consistent -- the
-- INSERT below matches no job when sector_pref is NULL.
--
-- ── F-20: explanations were never invalidated ───────────────────────────────────────────
--
-- `match_scores.explanation` is LLM prose about a specific score. Every writer upserts
-- total_score/breakdown and leaves explanation untouched, so a rescore left last week's
-- reasoning attached to this week's number. After 093 that is worse than stale: every
-- explanation in the table describes v2's weights, including a shed-type dimension that no
-- longer carries 25 points and a role dimension that did not exist.
--
-- Fixed with ONE trigger on match_scores rather than by editing each writer's ON CONFLICT
-- clause. There are three writers today (job-side, seeker-side, seeker_skills) and a fourth
-- can be added without noticing this rule; a table-level trigger cannot be forgotten.
-- `generate-match-explanation` writes explanation ALONE, leaving score and breakdown
-- untouched, so it does not trip its own guard.

BEGIN;

-- ── F-20 ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._match_score_invalidate_explanation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total_score       IS DISTINCT FROM OLD.total_score
     OR NEW.breakdown         IS DISTINCT FROM OLD.breakdown
     OR NEW.algorithm_version IS DISTINCT FROM OLD.algorithm_version THEN
    NEW.explanation := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public._match_score_invalidate_explanation() IS
  'Audit F-20: an explanation is prose about a specific score, so it cannot outlive one. Drops it whenever the score, the breakdown or the algorithm version moves. Table-level rather than per-writer because there are three writers and a fourth would not know the rule.';

DROP TRIGGER IF EXISTS match_scores_invalidate_explanation ON public.match_scores;
CREATE TRIGGER match_scores_invalidate_explanation
  BEFORE UPDATE ON public.match_scores
  FOR EACH ROW EXECUTE FUNCTION public._match_score_invalidate_explanation();

-- ── F-15, seeker side ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_recompute_seeker_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Every column compute_match_score v3 reads from seeker_profiles. If you add a dimension
  -- to the score, add its column here or the score will not move when the seeker changes it.
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.region                 IS NOT DISTINCT FROM NEW.region AND
      OLD.open_to_relocate       IS NOT DISTINCT FROM NEW.open_to_relocate AND
      OLD.sector_pref            IS NOT DISTINCT FROM NEW.sector_pref AND
      OLD.role_type_pref         IS NOT DISTINCT FROM NEW.role_type_pref AND
      OLD.contract_type_pref     IS NOT DISTINCT FROM NEW.contract_type_pref AND
      OLD.years_experience       IS NOT DISTINCT FROM NEW.years_experience AND
      OLD.accommodation_needed   IS NOT DISTINCT FROM NEW.accommodation_needed AND
      OLD.pets                   IS NOT DISTINCT FROM NEW.pets AND
      OLD.family                 IS NOT DISTINCT FROM NEW.family AND
      OLD.couples_seeking        IS NOT DISTINCT FROM NEW.couples_seeking AND
      OLD.visa_status            IS NOT DISTINCT FROM NEW.visa_status AND
      OLD.min_salary             IS NOT DISTINCT FROM NEW.min_salary AND
      OLD.availability_date      IS NOT DISTINCT FROM NEW.availability_date AND
      OLD.herd_sizes_worked      IS NOT DISTINCT FROM NEW.herd_sizes_worked AND
      OLD.shed_types_experienced IS NOT DISTINCT FROM NEW.shed_types_experienced
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Reconcile BEFORE inserting. A sector this seeker no longer wants must stop appearing in
  -- search and in the match-alert email, both of which read match_scores directly.
  DELETE FROM public.match_scores ms
  USING public.jobs j
  WHERE ms.seeker_id = NEW.id
    AND ms.job_id = j.id
    AND (NEW.sector_pref IS NULL OR NOT (j.sector = ANY(NEW.sector_pref)));

  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
  SELECT j.id, NEW.id, (result->>'total_score')::int, result->'breakdown', now(),
         (result->>'algorithm_version')::smallint
  FROM public.jobs j
  CROSS JOIN LATERAL public.compute_match_score(NEW.id, j.id) AS result
  WHERE j.status = 'active'
    AND j.sector = ANY(NEW.sector_pref)
  ON CONFLICT (job_id, seeker_id) DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    breakdown         = EXCLUDED.breakdown,
    calculated_at     = EXCLUDED.calculated_at,
    algorithm_version = EXCLUDED.algorithm_version;

  RETURN NEW;
END;
$function$;

-- ── F-15, job side ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_recompute_job_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Every column compute_match_score v3 reads from jobs. views_count is deliberately absent:
  -- it moves on every page view and a rescore is a cross join over every seeker.
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.sector               IS NOT DISTINCT FROM NEW.sector AND
      OLD.region               IS NOT DISTINCT FROM NEW.region AND
      OLD.role_type            IS NOT DISTINCT FROM NEW.role_type AND
      OLD.contract_type        IS NOT DISTINCT FROM NEW.contract_type AND
      OLD.shed_type            IS NOT DISTINCT FROM NEW.shed_type AND
      OLD.herd_size_min        IS NOT DISTINCT FROM NEW.herd_size_min AND
      OLD.herd_size_max        IS NOT DISTINCT FROM NEW.herd_size_max AND
      OLD.salary_min           IS NOT DISTINCT FROM NEW.salary_min AND
      OLD.salary_max           IS NOT DISTINCT FROM NEW.salary_max AND
      OLD.min_dairy_experience IS NOT DISTINCT FROM NEW.min_dairy_experience AND
      OLD.seniority_level      IS NOT DISTINCT FROM NEW.seniority_level AND
      OLD.start_date           IS NOT DISTINCT FROM NEW.start_date AND
      OLD.visa_sponsorship     IS NOT DISTINCT FROM NEW.visa_sponsorship AND
      OLD.couples_welcome      IS NOT DISTINCT FROM NEW.couples_welcome AND
      OLD.accommodation        IS NOT DISTINCT FROM NEW.accommodation AND
      OLD.status               IS NOT DISTINCT FROM NEW.status
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
  SELECT NEW.id, sp.id, (result->>'total_score')::int, result->'breakdown', now(),
         (result->>'algorithm_version')::smallint
  FROM public.seeker_profiles sp
  CROSS JOIN LATERAL public.compute_match_score(sp.id, NEW.id) AS result
  WHERE NEW.sector = ANY(sp.sector_pref)
  ON CONFLICT (job_id, seeker_id) DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    breakdown         = EXCLUDED.breakdown,
    calculated_at     = EXCLUDED.calculated_at,
    algorithm_version = EXCLUDED.algorithm_version;

  RETURN NEW;
END;
$function$;

COMMIT;
