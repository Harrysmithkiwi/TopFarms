-- ============================================================
-- 072_match_scoring_v2.sql
-- TopFarms — Phase 3 Task 3.1: match scoring correctness
--
-- The core differentiator, wrong in five independent ways. All fixed together
-- under one algorithm_version bump — a partial fix makes the version lie.
--
-- 1. THE DENOMINATOR WAS DAIRY-SHAPED.
--    Dimension maxima were shed 25 · location 20 · accommodation 20 · skills 20
--    · salary 10 · visa 5 · couples 5 = 105, and every dimension was scored
--    against that fixed total. shed_type only scores when the job declares a
--    shed, which only dairy jobs do, so a PERFECT cropping/deer match could
--    not exceed 80. Scoring is now against APPLICABLE dimensions only,
--    normalised to 100: a perfect match reads 100 in every sector.
--
-- 2. THE RECENCY MULTIPLIER WAS THREE BUGS IN ONE (removed entirely).
--    (a) It was absent from `breakdown`, so for any job under 7 days old the
--        seven dimension bars did not reconcile with the headline number —
--        the UI displayed a total it could not explain.
--    (b) It inverted at the top: a perfect match on a 3-week-old job stored
--        105, the same match on a fresh job clamped to 100. Freshness LOWERED
--        the score exactly where it should not.
--    (c) It compressed: any base >= 91 on a recent job collapsed to 100.
--    Freshness is a ranking concern, not a fit concern. It now lives in the
--    ORDER BY (JobSearch tie-breaker), not in the score.
--
-- 3. NO CLAMP OUTSIDE THE RECENCY BRANCH, AND NO CONSTRAINT.
--    LEAST(100, ...) sat inside the recency IF, so a >7-day perfect match
--    persisted as 105. Now clamped unconditionally AND constrained by the
--    database, which is the part that matters.
--
-- 4. A JOB THAT LISTED NO SKILLS SCORED EVERY SEEKER 0/20 ON SKILLS.
--    20.0 * 0 / GREATEST(0, 1) = 0. Found while rewriting; not in the audit.
--    Skills are now inapplicable when the job declares none.
--
-- 5. A SOLO SEEKER SILENTLY LOST THE 5-POINT COUPLES BONUS.
--    couples is a bonus dimension; for a seeker not seeking as a couple it is
--    inapplicable, not zero. (This is why 105 only ever manifested for a
--    couples-seeking seeker — solo seekers capped at 100 by accident.)
--
-- APPLICABILITY RULES (the whole design in one table):
--    shed_type      25  applicable when the job declares a shed_type
--    location       20  always
--    accommodation  20  always
--    skills         20  applicable when the job declares >= 1 job_skills row
--    salary         10  always
--    visa            5  always
--    couples         5  applicable when the seeker is couples_seeking
--
--    total_score = ROUND(100 * sum(applicable points) / sum(applicable maxima))
--
-- INVARIANT, machine-checkable from the row alone (tests/match-scoring.test.ts
-- and probe T3): ROUND(100.0 * (breakdown->_meta->>raw_total)
--                      / (breakdown->_meta->>applicable_max)) = total_score
--
--    NOTE — this replaces the "sum(breakdown) = total_score" invariant written
--    into the Phase 3 brief. The two are mutually exclusive: normalising to 100
--    means the raw dimension points cannot also sum to the headline unless the
--    per-dimension maxima are themselves rescaled (making "Location out of
--    26.7" on a cropping job). Raw points against raw maxima, with an explicit
--    "not applicable", is the more legible product and the same arithmetic a
--    human uses for an exam mark: 75/75 = 100%. Stated loudly rather than
--    changed quietly — see the PR body.
--
-- `breakdown` now uses JSON null for an inapplicable dimension. null is not 0
-- and the UI must not render it as a zero-length bar. Existing readers are
-- safe: `null > 15` is false in JS/SQL alike.
--
-- Apply via claude.ai Supabase connector. Verify via pg_catalog read-back.
-- ============================================================

BEGIN;

-- ─── 1. Schema: constrain the column, version the rows ──────────────────────

ALTER TABLE public.match_scores
  ADD COLUMN algorithm_version smallint NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.match_scores.algorithm_version IS
  'Scoring algorithm that produced this row. 1 = pre-Phase-3 (fixed 105 denominator, recency multiplier, unclamped above 7 days). 2 = sector-aware normalisation to 100, no recency, unconditional clamp (072).';

-- Existing rows are recomputed at the end of this migration, so every row will
-- be v2 by COMMIT. The constraint is added AFTER that recompute.

-- ─── 2. compute_match_score v2 ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_match_score(
  p_seeker_id uuid,
  p_job_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seeker      record;
  v_job         record;
  v_shed        int := 0;
  v_location    int := 0;
  v_accommodation int := 0;
  v_skills      int := 0;
  v_salary      int := 0;
  v_visa        int := 0;
  v_couples     int := 0;

  -- applicability
  v_shed_applicable    boolean := false;
  v_skills_applicable  boolean := false;
  v_couples_applicable boolean := false;

  v_raw_total   int := 0;
  v_max         int := 0;
  v_total       int := 0;

  -- skill counting variables
  v_seeker_skill_ids   uuid[];
  v_total_required     int := 0;
  v_matched_required   int := 0;
  v_total_preferred    int := 0;
  v_matched_preferred  int := 0;
  v_job_skill_count    int := 0;
BEGIN
  SELECT * INTO v_seeker FROM public.seeker_profiles WHERE id = p_seeker_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb, 'algorithm_version', 2);
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb, 'algorithm_version', 2);
  END IF;

  -- ── Shed type (25) — applicable only when the job declares one ────────────
  v_shed_applicable := v_job.shed_type IS NOT NULL
                       AND COALESCE(array_length(v_job.shed_type, 1), 0) > 0;

  IF v_shed_applicable AND v_seeker.shed_types_experienced IS NOT NULL THEN
    IF v_seeker.shed_types_experienced && v_job.shed_type THEN
      v_shed := 25;
    ELSIF (
      ('rotary'      = ANY(v_seeker.shed_types_experienced) AND 'herringbone' = ANY(v_job.shed_type))
      OR
      ('herringbone' = ANY(v_seeker.shed_types_experienced) AND 'rotary'      = ANY(v_job.shed_type))
    ) THEN
      v_shed := 10;
    END IF;
  END IF;

  -- ── Location (20) — always applicable ─────────────────────────────────────
  IF v_seeker.region = v_job.region THEN
    v_location := 20;
  ELSIF v_seeker.open_to_relocate = true THEN
    v_location := 16;
  ELSIF v_seeker.region IS NOT NULL
        AND v_job.region = ANY(public.get_adjacent_regions(v_seeker.region))
  THEN
    v_location := 12;
  END IF;

  -- ── Accommodation (20) — always applicable ────────────────────────────────
  IF v_seeker.accommodation_needed = false THEN
    v_accommodation := 20;
  ELSIF v_job.accommodation IS NOT NULL
        AND (v_job.accommodation->>'available')::boolean = true
  THEN
    v_accommodation := 10;
    IF v_seeker.pets IS NOT NULL AND (v_job.accommodation->>'pets') = 'true' THEN
      v_accommodation := v_accommodation + 3;
    END IF;
    IF v_seeker.couples_seeking = true AND (v_job.accommodation->>'couples') = 'true' THEN
      v_accommodation := v_accommodation + 2;
    END IF;
    IF v_seeker.family IS NOT NULL AND (v_job.accommodation->>'family') = 'true' THEN
      v_accommodation := v_accommodation + 2;
    END IF;
    IF (v_job.accommodation->>'utilities_included') = 'true' THEN
      v_accommodation := v_accommodation + 3;
    END IF;
    v_accommodation := LEAST(v_accommodation, 20);
  END IF;

  -- ── Skills (20) — applicable only when the job declares skills ────────────
  SELECT count(*) INTO v_job_skill_count FROM public.job_skills WHERE job_id = p_job_id;
  v_skills_applicable := v_job_skill_count > 0;

  IF v_skills_applicable THEN
    SELECT ARRAY_AGG(skill_id) INTO v_seeker_skill_ids
    FROM public.seeker_skills WHERE seeker_id = p_seeker_id;
    v_seeker_skill_ids := COALESCE(v_seeker_skill_ids, ARRAY[]::uuid[]);

    SELECT
      COUNT(*) FILTER (WHERE requirement_level = 'required'),
      COUNT(*) FILTER (WHERE requirement_level = 'required' AND skill_id = ANY(v_seeker_skill_ids)),
      COUNT(*) FILTER (WHERE requirement_level = 'preferred'),
      COUNT(*) FILTER (WHERE requirement_level = 'preferred' AND skill_id = ANY(v_seeker_skill_ids))
    INTO v_total_required, v_matched_required, v_total_preferred, v_matched_preferred
    FROM public.job_skills
    WHERE job_id = p_job_id;

    IF v_total_required > 0 THEN
      v_skills := LEAST(20, ROUND(20.0 * v_matched_required::numeric / v_total_required)::int);
    ELSE
      -- Preferred-only job: preferred skills carry the whole dimension rather
      -- than acting as a bonus on a base of zero.
      v_skills := 0;
    END IF;

    IF v_total_preferred > 0 THEN
      IF v_total_required > 0 THEN
        v_skills := LEAST(20, v_skills + ROUND(20.0 * 0.6 * v_matched_preferred::numeric / v_total_preferred)::int);
      ELSE
        v_skills := LEAST(20, ROUND(20.0 * v_matched_preferred::numeric / v_total_preferred)::int);
      END IF;
    END IF;
  END IF;

  -- ── Salary (10) — always applicable ───────────────────────────────────────
  IF v_seeker.min_salary IS NULL THEN
    v_salary := 10;
  ELSIF v_job.salary_max IS NULL THEN
    v_salary := 5;
  ELSIF v_job.salary_max >= v_seeker.min_salary THEN
    v_salary := 10;
  ELSE
    v_salary := GREATEST(0, 10 - ROUND(
      10.0 * (v_seeker.min_salary - v_job.salary_max)::numeric / v_seeker.min_salary)::int);
  END IF;

  -- ── Visa (5) — always applicable ──────────────────────────────────────────
  IF v_seeker.visa_status IN ('nz_citizen', 'permanent_resident') THEN
    v_visa := 5;
  ELSIF v_seeker.visa_status IN ('working_holiday', 'needs_sponsorship')
        AND v_job.visa_sponsorship = true
  THEN
    v_visa := 5;
  END IF;

  -- ── Couples (5) — applicable only for a couples-seeking seeker ────────────
  v_couples_applicable := v_seeker.couples_seeking = true;
  IF v_couples_applicable AND v_job.couples_welcome = true THEN
    v_couples := 5;
  END IF;

  -- ── Normalise against APPLICABLE dimensions only ──────────────────────────
  v_raw_total := v_location + v_accommodation + v_salary + v_visa
                 + CASE WHEN v_shed_applicable    THEN v_shed    ELSE 0 END
                 + CASE WHEN v_skills_applicable  THEN v_skills  ELSE 0 END
                 + CASE WHEN v_couples_applicable THEN v_couples ELSE 0 END;

  v_max := 20 + 20 + 10 + 5
           + CASE WHEN v_shed_applicable    THEN 25 ELSE 0 END
           + CASE WHEN v_skills_applicable  THEN 20 ELSE 0 END
           + CASE WHEN v_couples_applicable THEN 5  ELSE 0 END;

  -- location + accommodation + salary + visa are unconditional, so v_max is
  -- never below 55 and the guard is belt-and-braces.
  v_total := ROUND(100.0 * v_raw_total::numeric / GREATEST(v_max, 1))::int;

  -- Unconditional clamp (defect 3). No branch can bypass this.
  v_total := LEAST(100, GREATEST(0, v_total));

  RETURN jsonb_build_object(
    'total_score', v_total,
    'algorithm_version', 2,
    'breakdown', jsonb_build_object(
      -- null, not 0, when the dimension does not apply to this pairing
      'shed_type',     CASE WHEN v_shed_applicable    THEN v_shed    END,
      'location',      v_location,
      'accommodation', v_accommodation,
      'skills',        CASE WHEN v_skills_applicable  THEN v_skills  END,
      'salary',        v_salary,
      'visa',          v_visa,
      'couples',       CASE WHEN v_couples_applicable THEN v_couples END,
      '_meta', jsonb_build_object(
        'raw_total',         v_raw_total,
        'applicable_max',    v_max,
        'algorithm_version', 2
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.compute_match_score(uuid, uuid) IS
  'Match scoring v2 (Phase 3, migration 072). Scores against APPLICABLE dimensions and normalises to 100, so a perfect match reads 100 in every sector. No recency multiplier — freshness is a sort key, not a fit signal. breakdown carries raw points per dimension (null = not applicable) plus _meta.raw_total / _meta.applicable_max, from which total_score is reproducible.';

-- ─── 3. Skills-change rescore triggers (defect: 20 points went stale) ───────
-- STATEMENT-level with transition tables, deliberately. SeekerStep4Skills.tsx
-- deletes the whole skill set and re-inserts it, so a row-level trigger would
-- fire N+M times and recompute the same seeker N+M times. Statement-level
-- fires exactly twice for that edit.

CREATE OR REPLACE FUNCTION public.trigger_recompute_scores_for_seeker_skills()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seeker_ids uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT seeker_id) INTO v_seeker_ids FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT seeker_id) INTO v_seeker_ids FROM old_rows;
  ELSE
    SELECT array_agg(DISTINCT s) INTO v_seeker_ids FROM (
      SELECT seeker_id AS s FROM new_rows
      UNION
      SELECT seeker_id AS s FROM old_rows
    ) u;
  END IF;

  IF v_seeker_ids IS NULL OR array_length(v_seeker_ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
  SELECT j.id, sp.id, (result->>'total_score')::int, result->'breakdown', now(),
         (result->>'algorithm_version')::smallint
  FROM public.seeker_profiles sp
  JOIN public.jobs j ON j.status = 'active' AND j.sector = ANY(sp.sector_pref)
  CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
  WHERE sp.id = ANY(v_seeker_ids)
  ON CONFLICT (job_id, seeker_id) DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    breakdown         = EXCLUDED.breakdown,
    calculated_at     = EXCLUDED.calculated_at,
    algorithm_version = EXCLUDED.algorithm_version;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recompute_scores_for_job_skills()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_ids uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT job_id) INTO v_job_ids FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT job_id) INTO v_job_ids FROM old_rows;
  ELSE
    SELECT array_agg(DISTINCT j) INTO v_job_ids FROM (
      SELECT job_id AS j FROM new_rows
      UNION
      SELECT job_id AS j FROM old_rows
    ) u;
  END IF;

  IF v_job_ids IS NULL OR array_length(v_job_ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
  SELECT j.id, sp.id, (result->>'total_score')::int, result->'breakdown', now(),
         (result->>'algorithm_version')::smallint
  FROM public.jobs j
  JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
  CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
  WHERE j.id = ANY(v_job_ids)
    AND j.status = 'active'
  ON CONFLICT (job_id, seeker_id) DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    breakdown         = EXCLUDED.breakdown,
    calculated_at     = EXCLUDED.calculated_at,
    algorithm_version = EXCLUDED.algorithm_version;

  RETURN NULL;
END;
$$;

-- One trigger per operation: PostgreSQL only exposes NEW TABLE on INSERT/UPDATE
-- and OLD TABLE on DELETE/UPDATE, so a single trigger cannot cover all three.
DROP TRIGGER IF EXISTS seeker_skills_match_rescore_ins ON public.seeker_skills;
CREATE TRIGGER seeker_skills_match_rescore_ins
  AFTER INSERT ON public.seeker_skills
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_seeker_skills();

DROP TRIGGER IF EXISTS seeker_skills_match_rescore_upd ON public.seeker_skills;
CREATE TRIGGER seeker_skills_match_rescore_upd
  AFTER UPDATE ON public.seeker_skills
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_seeker_skills();

DROP TRIGGER IF EXISTS seeker_skills_match_rescore_del ON public.seeker_skills;
CREATE TRIGGER seeker_skills_match_rescore_del
  AFTER DELETE ON public.seeker_skills
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_seeker_skills();

DROP TRIGGER IF EXISTS job_skills_match_rescore_ins ON public.job_skills;
CREATE TRIGGER job_skills_match_rescore_ins
  AFTER INSERT ON public.job_skills
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_job_skills();

DROP TRIGGER IF EXISTS job_skills_match_rescore_upd ON public.job_skills;
CREATE TRIGGER job_skills_match_rescore_upd
  AFTER UPDATE ON public.job_skills
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_job_skills();

DROP TRIGGER IF EXISTS job_skills_match_rescore_del ON public.job_skills;
CREATE TRIGGER job_skills_match_rescore_del
  AFTER DELETE ON public.job_skills
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_recompute_scores_for_job_skills();

-- ─── 4. Existing rescore triggers must carry the version through ────────────

CREATE OR REPLACE FUNCTION public.trigger_recompute_seeker_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      RETURN NEW;
    END IF;
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.trigger_recompute_job_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

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
$$;

-- ─── 5. Recompute every existing row, then constrain ────────────────────────
-- At 0 live jobs this is free. It is the last moment that will be true — after
-- the hand-recruitment lane lands listings, a rescore reorders every
-- employer's shortlist overnight with no explanation (roadmap risk register).

SET statement_timeout = '0';

INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
SELECT j.id, sp.id, (result->>'total_score')::int, result->'breakdown', now(),
       (result->>'algorithm_version')::smallint
FROM public.jobs j
JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
WHERE j.status = 'active'
ON CONFLICT (job_id, seeker_id) DO UPDATE SET
  total_score       = EXCLUDED.total_score,
  breakdown         = EXCLUDED.breakdown,
  calculated_at     = EXCLUDED.calculated_at,
  algorithm_version = EXCLUDED.algorithm_version;

-- Any row NOT covered by the recompute above (job no longer active, or sector
-- preference changed since it was written) is a v1 leftover. Delete rather than
-- relabel: a stale score for an inactive job is not something to keep, and the
-- cleanup trigger from 027 already treats those as garbage.
DELETE FROM public.match_scores WHERE algorithm_version < 2;

RESET statement_timeout;

-- Now that every surviving row is v2 and normalised, the bound is enforceable.
ALTER TABLE public.match_scores
  ADD CONSTRAINT match_scores_total_score_range CHECK (total_score BETWEEN 0 AND 100);

-- ─── 6. Nightly recompute — carry the version, drop the obsolete rationale ──
-- jobid 2 was scheduled by 010 with TWO stated purposes: (a) data-integrity
-- drift, and (b) "day-7 recency transition: jobs crossing the 7-day mark drop
-- the 1.1x multiplier". Purpose (b) no longer exists — there is no multiplier.
-- The job stays as the integrity net (a), but it must write algorithm_version
-- explicitly: relying on the column DEFAULT would silently mislabel rows as v2
-- the day a v3 lands, which is exactly the lie the version column exists to
-- prevent. cron.schedule is idempotent on the job name.

SELECT cron.schedule(
  'nightly-match-score-recompute',
  '0 3 * * *',
  $$
    INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at, algorithm_version)
    SELECT
      j.id,
      sp.id,
      (result->>'total_score')::int,
      result->'breakdown',
      now(),
      (result->>'algorithm_version')::smallint
    FROM public.jobs j
    JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
    CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
    WHERE j.status = 'active'
    ON CONFLICT (job_id, seeker_id)
    DO UPDATE SET
      total_score       = EXCLUDED.total_score,
      breakdown         = EXCLUDED.breakdown,
      calculated_at     = EXCLUDED.calculated_at,
      algorithm_version = EXCLUDED.algorithm_version
    WHERE match_scores.total_score       IS DISTINCT FROM EXCLUDED.total_score
       OR match_scores.breakdown         IS DISTINCT FROM EXCLUDED.breakdown
       OR match_scores.algorithm_version IS DISTINCT FROM EXCLUDED.algorithm_version;
    -- explanation intentionally excluded — managed by AI Edge Function
  $$
);

COMMIT;
