-- ============================================================
-- 009_seeker_onboarding.sql
-- TopFarms — Seeker onboarding, application pipeline, match scoring
-- Phase 3: Seeker Demand Side foundation migration
-- ============================================================

-- ============================================================
-- 1. seeker_profiles — onboarding and experience columns
-- ============================================================

ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_complete bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dairynz_level       text
    CHECK (dairynz_level IN ('none', 'level_1', 'level_2', 'level_3', 'level_4'));

-- Experience capture columns (from Phase 3 CONTEXT.md decisions)
-- shed_types_experienced: text[] of 'rotary', 'herringbone', 'other'
-- herd_sizes_worked: text[] of bucket labels '<200', '200-500', '500-1000', '1000+'
ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS shed_types_experienced text[],
  ADD COLUMN IF NOT EXISTS herd_sizes_worked      text[];

-- ============================================================
-- 2. Fix applications status enum — 8-stage pipeline
-- Old values: pending, reviewed, shortlisted, rejected, hired
-- New values: applied, review, interview, shortlisted, offered, hired, declined, withdrawn
-- ============================================================

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied', 'review', 'interview', 'shortlisted', 'offered', 'hired', 'declined', 'withdrawn'));
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'applied';

-- ============================================================
-- 3. Fix seeker_skills proficiency — align with SkillsPicker component
-- Old values: learning, competent, experienced, expert
-- New values: basic, intermediate, advanced
-- ============================================================

ALTER TABLE public.seeker_skills DROP CONSTRAINT IF EXISTS seeker_skills_proficiency_check;
ALTER TABLE public.seeker_skills
  ADD CONSTRAINT seeker_skills_proficiency_check
  CHECK (proficiency IN ('basic', 'intermediate', 'advanced'));
ALTER TABLE public.seeker_skills ALTER COLUMN proficiency SET DEFAULT 'basic';

-- ============================================================
-- 4. Application update RLS policies
-- employers can update pipeline status; seekers can withdraw
-- ============================================================

CREATE POLICY "applications: employers update status for own jobs"
  ON public.applications FOR UPDATE
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
  );

CREATE POLICY "applications: seekers update own"
  ON public.applications FOR UPDATE
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5. Region adjacency helper (for location scoring)
-- Returns text[] of adjacent regions for a given NZ region
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_adjacent_regions(p_region text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE p_region
    WHEN 'Waikato'             THEN ARRAY['Bay of Plenty', 'Taranaki', 'Manawatu-Whanganui']
    WHEN 'Bay of Plenty'       THEN ARRAY['Waikato', 'Gisborne']
    WHEN 'Taranaki'            THEN ARRAY['Waikato', 'Manawatu-Whanganui']
    WHEN 'Manawatu-Whanganui'  THEN ARRAY['Taranaki', 'Waikato', 'Hawke''s Bay', 'Wellington']
    WHEN 'Canterbury'          THEN ARRAY['Otago', 'West Coast', 'Marlborough']
    WHEN 'Otago'               THEN ARRAY['Canterbury', 'Southland']
    WHEN 'Southland'           THEN ARRAY['Otago']
    WHEN 'West Coast'          THEN ARRAY['Canterbury', 'Nelson', 'Tasman']
    WHEN 'Hawke''s Bay'        THEN ARRAY['Manawatu-Whanganui', 'Gisborne']
    WHEN 'Gisborne'            THEN ARRAY['Hawke''s Bay', 'Bay of Plenty']
    WHEN 'Northland'           THEN ARRAY['Auckland']
    WHEN 'Auckland'            THEN ARRAY['Northland', 'Waikato']
    WHEN 'Nelson'              THEN ARRAY['Tasman', 'Marlborough', 'West Coast']
    WHEN 'Tasman'              THEN ARRAY['Nelson', 'Marlborough', 'West Coast']
    WHEN 'Marlborough'         THEN ARRAY['Nelson', 'Tasman', 'Canterbury']
    WHEN 'Wellington'          THEN ARRAY['Manawatu-Whanganui']
    ELSE ARRAY[]::text[]
  END;
END;
$$;

-- ============================================================
-- 6. compute_match_score(p_seeker_id uuid, p_job_id uuid)
-- Returns jsonb: { total_score, breakdown }
-- Implements all 7 scoring dimensions from SPEC 9.1
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_match_score(
  p_seeker_id uuid,
  p_job_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
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
  v_total       int := 0;

  -- skill counting variables
  v_seeker_skill_ids   uuid[];
  v_total_required     int := 0;
  v_matched_required   int := 0;
  v_total_preferred    int := 0;
  v_matched_preferred  int := 0;
BEGIN
  -- Load seeker profile
  SELECT *
  INTO v_seeker
  FROM public.seeker_profiles
  WHERE id = p_seeker_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb);
  END IF;

  -- Load job
  SELECT *
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb);
  END IF;

  -- --------------------------------------------------------
  -- Shed type (25 pts)
  -- Any exact overlap between seeker shed_types_experienced
  -- and job shed_type = 25pts.
  -- Rotary <-> Herringbone crossover = 10pts (40%).
  -- --------------------------------------------------------
  IF v_seeker.shed_types_experienced IS NOT NULL
     AND v_job.shed_type IS NOT NULL
  THEN
    -- Exact overlap
    IF v_seeker.shed_types_experienced && v_job.shed_type THEN
      v_shed := 25;
    -- Rotary <-> Herringbone partial credit
    ELSIF (
      ('rotary'      = ANY(v_seeker.shed_types_experienced) AND 'herringbone' = ANY(v_job.shed_type))
      OR
      ('herringbone' = ANY(v_seeker.shed_types_experienced) AND 'rotary'      = ANY(v_job.shed_type))
    ) THEN
      v_shed := 10;
    END IF;
  END IF;

  -- --------------------------------------------------------
  -- Location (20 pts)
  -- Same region = 20pts
  -- open_to_relocate = true and different region = 16pts (80%)
  -- Adjacent region = 12pts (60%)
  -- Otherwise = 0
  -- --------------------------------------------------------
  IF v_seeker.region = v_job.region THEN
    v_location := 20;
  ELSIF v_seeker.open_to_relocate = true THEN
    v_location := 16;
  ELSIF v_seeker.region IS NOT NULL
        AND v_job.region = ANY(public.get_adjacent_regions(v_seeker.region))
  THEN
    v_location := 12;
  END IF;

  -- --------------------------------------------------------
  -- Accommodation (20 pts)
  -- No accommodation needed = 20pts (no conflict)
  -- Accommodation needed + available: base 10pts + up to 10pts sub-scores
  -- --------------------------------------------------------
  IF v_seeker.accommodation_needed = false THEN
    v_accommodation := 20;
  ELSIF v_job.accommodation IS NOT NULL
        AND (v_job.accommodation->>'available')::boolean = true
  THEN
    v_accommodation := 10;
    -- +2.5 each for pets, couples, family, utilities (stored as rounded int)
    IF v_seeker.pets IS NOT NULL
       AND (v_job.accommodation->>'pets') = 'true'
    THEN
      v_accommodation := v_accommodation + 3;
    END IF;
    IF v_seeker.couples_seeking = true
       AND (v_job.accommodation->>'couples') = 'true'
    THEN
      v_accommodation := v_accommodation + 2;
    END IF;
    IF v_seeker.family IS NOT NULL
       AND (v_job.accommodation->>'family') = 'true'
    THEN
      v_accommodation := v_accommodation + 2;
    END IF;
    IF (v_job.accommodation->>'utilities_included') = 'true' THEN
      v_accommodation := v_accommodation + 3;
    END IF;
    -- Cap at 20
    v_accommodation := LEAST(v_accommodation, 20);
  END IF;

  -- --------------------------------------------------------
  -- Skills (20 pts)
  -- Match seeker skills against job required/preferred skills
  -- --------------------------------------------------------
  SELECT ARRAY_AGG(skill_id)
  INTO v_seeker_skill_ids
  FROM public.seeker_skills
  WHERE seeker_id = p_seeker_id;

  v_seeker_skill_ids := COALESCE(v_seeker_skill_ids, ARRAY[]::uuid[]);

  SELECT
    COUNT(*) FILTER (WHERE requirement_level = 'required'),
    COUNT(*) FILTER (WHERE requirement_level = 'required' AND skill_id = ANY(v_seeker_skill_ids)),
    COUNT(*) FILTER (WHERE requirement_level = 'preferred'),
    COUNT(*) FILTER (WHERE requirement_level = 'preferred' AND skill_id = ANY(v_seeker_skill_ids))
  INTO v_total_required, v_matched_required, v_total_preferred, v_matched_preferred
  FROM public.job_skills
  WHERE job_id = p_job_id;

  -- Base score from required skills (full weight)
  v_skills := LEAST(
    20,
    ROUND(
      20.0 * v_matched_required::numeric / GREATEST(v_total_required, 1)
    )::int
  );

  -- Preferred skills add 60% weight (bonus on top, capped at 20)
  IF v_total_preferred > 0 THEN
    v_skills := LEAST(
      20,
      v_skills + ROUND(
        20.0 * 0.6 * v_matched_preferred::numeric / v_total_preferred
      )::int
    );
  END IF;

  -- --------------------------------------------------------
  -- Salary (10 pts)
  -- --------------------------------------------------------
  IF v_seeker.min_salary IS NULL THEN
    v_salary := 10;
  ELSIF v_job.salary_max IS NULL THEN
    v_salary := 5;
  ELSIF v_job.salary_max >= v_seeker.min_salary THEN
    v_salary := 10;
  ELSE
    -- Partial: loses pts proportional to gap
    v_salary := GREATEST(
      0,
      10 - ROUND(
        10.0 * (v_seeker.min_salary - v_job.salary_max)::numeric / v_seeker.min_salary
      )::int
    );
  END IF;

  -- --------------------------------------------------------
  -- Visa (5 pts)
  -- --------------------------------------------------------
  IF v_seeker.visa_status IN ('nz_citizen', 'permanent_resident') THEN
    v_visa := 5;
  ELSIF v_seeker.visa_status IN ('working_holiday', 'needs_sponsorship')
        AND v_job.visa_sponsorship = true
  THEN
    v_visa := 5;
  END IF;

  -- --------------------------------------------------------
  -- Couples bonus (+5 pts)
  -- --------------------------------------------------------
  IF v_seeker.couples_seeking = true AND v_job.couples_welcome = true THEN
    v_couples := 5;
  END IF;

  -- --------------------------------------------------------
  -- Total (base sum, before recency multiplier)
  -- --------------------------------------------------------
  v_total := v_shed + v_location + v_accommodation + v_skills + v_salary + v_visa + v_couples;

  -- --------------------------------------------------------
  -- Recency multiplier: x1.1 for jobs posted within 7 days, cap at 100
  -- --------------------------------------------------------
  IF v_job.created_at > now() - interval '7 days' THEN
    v_total := LEAST(100, ROUND(v_total::numeric * 1.1)::int);
  END IF;

  RETURN jsonb_build_object(
    'total_score', v_total,
    'breakdown',   jsonb_build_object(
      'shed_type',      v_shed,
      'location',       v_location,
      'accommodation',  v_accommodation,
      'skills',         v_skills,
      'salary',         v_salary,
      'visa',           v_visa,
      'couples',        v_couples
    )
  );
END;
$$;

-- ============================================================
-- 7. compute_match_scores_batch(p_seeker_id uuid, p_job_ids uuid[])
-- Batch scoring to avoid N+1 on the search page
-- Returns TABLE(job_id uuid, total_score int, breakdown jsonb)
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_match_scores_batch(
  p_seeker_id uuid,
  p_job_ids   uuid[]
)
RETURNS TABLE(job_id uuid, total_score int, breakdown jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id  uuid;
  v_result  jsonb;
BEGIN
  FOREACH v_job_id IN ARRAY p_job_ids LOOP
    v_result := public.compute_match_score(p_seeker_id, v_job_id);
    job_id      := v_job_id;
    total_score := (v_result->>'total_score')::int;
    breakdown   := v_result->'breakdown';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 8. Seeker profile RLS — already covered by FOR ALL policy in 002
-- The "seeker_profiles: seekers manage own" policy uses FOR ALL
-- which includes SELECT, INSERT, UPDATE, DELETE. No additional
-- UPDATE policy needed.
-- ============================================================
