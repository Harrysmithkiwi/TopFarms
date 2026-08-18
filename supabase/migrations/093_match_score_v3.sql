-- 093 — Match score v3: gates x points (Phase C)
--
-- Proposal and reasoning: .planning/MATCH-SCORE-V3-PROPOSAL.md (operator-approved 2026-08-18).
-- v2 read NEITHER role_type NOR contract_type. Four structural problems, not one missing field:
--
--   1. The largest weight was on the least important dimension. shed_type was 25 -- the biggest
--      single block -- while role_type was worth ZERO. A herringbone-vs-rotary difference is one
--      sector's equipment detail that a competent hand crosses in a week. The role is the job.
--
--   2. Percentages were not comparable across jobs, yet three surfaces sort by them. v_max was
--      per-pair (55 base, +25 shed, +20 skills, +5 couples), so a sparse listing was scored out
--      of 55 and a thorough one out of 100. A seeker fitting on location, accommodation, salary
--      and visa scored 100% on the EMPTY listing and at best ~80% on the detailed one. Seeker
--      search, the applicant list and the match-alert email all ORDER BY total_score DESC, so
--      the emptier listing won -- while we are asking employers to fill in more, not less.
--
--   3. Everything was additive, so nothing could be a dealbreaker. A migrant needing sponsorship
--      on a job that will not sponsor lost 5 points out of ~100. That is a legal fact, not a
--      gradient.
--
--   4. Entry-level was modelled as pure deficit, and ~35% of the 23-post corpus is green.
--
-- v3 = GATES (multiplicative) x POINTS (fixed denominator of 100).
--
-- Gates are multiplicative because the failure is CATEGORICAL: someone who cannot legally work
-- the job is not "80% as good", and an additive model can only express that with a weight so
-- large it distorts every other dimension. They also compose correctly -- two dealbreakers are
-- worse than one. They are NOT hard filters: hiding jobs is fatal at zero inventory, and people
-- negotiate. A heavy multiplier sinks the pair without vanishing it.
--
-- THE UNSTATED RULE: a dimension either side leaves blank pays 60% of its weight. A vague
-- listing lands mid-pack -- it cannot beat a listing that genuinely fits, and it cannot be gamed
-- by leaving fields empty, which is defect 2. A half-finished seeker profile is likewise not
-- punished, and not rewarded. The denominator stays 100, so every job is comparable.
--
-- TWO CORRECTIONS to the approved proposal, both from facts checked afterwards:
--   * SECTOR is a gate, not 6 points. trigger_recompute_job_scores already filters
--     `WHERE NEW.sector = ANY(sp.sector_pref)`, so every pair that reaches scoring already
--     matches on sector and 6 points would be a constant added to everyone. As a gate it costs
--     nothing there (multiplier 1.0) and keeps this function correct if called directly.
--   * SALARY was missing from the proposal table by oversight, not decision. Restored at 8.

BEGIN;

-- ── role adjacency, same shape as get_adjacent_regions ──────────────────────────────────
-- Mirrors ROLE_TYPES in src/lib/constants.ts. Adjacency is "would plausibly take, or grow
-- into" -- not a hierarchy. Deliberately NOT symmetric-by-accident: every pair below is
-- listed from both sides so the lookup direction cannot change the answer.
-- 'Other' is adjacent to nothing: it is the catch-all, and treating it as near anything would
-- make every unclassifiable job a decent match for everyone.
CREATE OR REPLACE FUNCTION public.get_adjacent_roles(p_role text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE p_role
    WHEN 'Farm Hand'         THEN ARRAY['General', 'Calf Rearer', 'Relief Milker', 'Shepherd']
    WHEN 'General'           THEN ARRAY['Farm Hand', 'Calf Rearer']
    WHEN 'Calf Rearer'       THEN ARRAY['Farm Hand', 'General', 'Relief Milker']
    WHEN 'Relief Milker'     THEN ARRAY['Farm Hand', 'Calf Rearer']
    WHEN 'Shepherd'          THEN ARRAY['Stock Manager', 'Farm Hand']
    WHEN 'Stock Manager'     THEN ARRAY['Shepherd', 'Herd Manager']
    WHEN '2IC'               THEN ARRAY['Herd Manager', 'Assistant Manager']
    WHEN 'Herd Manager'      THEN ARRAY['2IC', 'Farm Manager', 'Stock Manager']
    WHEN 'Assistant Manager' THEN ARRAY['2IC', 'Farm Manager']
    WHEN 'Farm Manager'      THEN ARRAY['Assistant Manager', 'Herd Manager']
    ELSE ARRAY[]::text[]
  END;
END;
$function$;

COMMENT ON FUNCTION public.get_adjacent_roles(text) IS
  'Roles a seeker would plausibly take or grow into, mirroring ROLE_TYPES in src/lib/constants.ts. Used by compute_match_score v3 for partial role credit. Other is adjacent to nothing on purpose.';

-- ── herd-size bucket overlap ────────────────────────────────────────────────────────────
-- seeker_profiles.herd_sizes_worked holds HERD_SIZE_BUCKETS tokens (<200, 200-500, 500-1000,
-- 1000+); jobs carry two integers. Comparing them needs the bucket expanded to a range, which
-- is exactly the kind of thing that gets written subtly differently at each call site.
CREATE OR REPLACE FUNCTION public._herd_bucket_overlaps(p_buckets text[], p_lo int, p_hi int)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(coalesce(p_buckets, ARRAY[]::text[])) AS b
    WHERE  coalesce(p_lo, 0) <= CASE b WHEN '<200' THEN 199 WHEN '200-500' THEN 500
                                       WHEN '500-1000' THEN 1000 ELSE 2147483647 END
      AND  coalesce(p_hi, 2147483647) >= CASE b WHEN '<200' THEN 0 WHEN '200-500' THEN 200
                                                WHEN '500-1000' THEN 500 ELSE 1000 END
  );
$$;

-- ── the score ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_match_score(p_seeker_id uuid, p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seeker record;
  v_job    record;

  -- points, 100 total when every dimension is stated
  v_role     numeric := 0;   -- 18
  v_contract numeric := 0;   -- 12
  v_skills   numeric := 0;   -- 15
  v_location numeric := 0;   -- 15
  v_accom    numeric := 0;   -- 10
  v_exp      numeric := 0;   -- 10
  v_salary   numeric := 0;   --  8
  v_timing   numeric := 0;   --  6
  v_herd     numeric := 0;   --  3
  v_shed     numeric := 0;   --  3

  -- gates: TRUE means BLOCKED
  v_gate_visa   boolean := false;
  v_gate_terms  boolean := false;
  v_gate_accom  boolean := false;
  v_gate_sector boolean := false;
  v_multiplier  numeric := 1.0;

  v_accom_available boolean;
  v_raw       numeric := 0;
  v_total     int;

  v_seeker_skill_ids  uuid[];
  v_total_required    int := 0;
  v_matched_required  int := 0;
  v_total_preferred   int := 0;
  v_matched_preferred int := 0;
  v_job_skill_count   int := 0;

  v_floor   int;    -- years of experience the job asks for
  v_ceiling int;    -- years above which the seeker is over-qualified for this seniority
  v_ready   date;   -- when the seeker can actually start
  v_late    int;
BEGIN
  SELECT * INTO v_seeker FROM public.seeker_profiles WHERE id = p_seeker_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb, 'algorithm_version', 3);
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'breakdown', '{}'::jsonb, 'algorithm_version', 3);
  END IF;

  v_accom_available := v_job.accommodation IS NOT NULL
                       AND (v_job.accommodation->>'available')::boolean = true;

  -- ── ROLE, 18 ──────────────────────────────────────────────────────────────────────────
  IF v_job.role_type IS NULL
     OR coalesce(array_length(v_seeker.role_type_pref, 1), 0) = 0 THEN
    v_role := 18 * 0.6;
  ELSIF v_job.role_type = ANY(v_seeker.role_type_pref) THEN
    v_role := 18;
  ELSIF EXISTS (
    SELECT 1 FROM unnest(v_seeker.role_type_pref) AS pref
    WHERE v_job.role_type = ANY(public.get_adjacent_roles(pref))
  ) THEN
    v_role := 11;
  END IF;

  -- ── CONTRACT TYPE, 12 ─────────────────────────────────────────────────────────────────
  -- The most common statement in the corpus: 9 of 23 posts ask for relief, part-time or
  -- short-term work. v2 scored it nowhere, so "relief only" ranked against permanent jobs.
  IF v_job.contract_type IS NULL
     OR coalesce(array_length(v_seeker.contract_type_pref, 1), 0) = 0 THEN
    v_contract := 12 * 0.6;
  ELSIF v_job.contract_type = ANY(v_seeker.contract_type_pref) THEN
    v_contract := 12;
  ELSE
    v_contract   := 0;
    v_gate_terms := true;
  END IF;

  -- ── SKILLS, 15 (v2's required/preferred maths, rescaled) ──────────────────────────────
  SELECT count(*) INTO v_job_skill_count FROM public.job_skills WHERE job_id = p_job_id;

  IF v_job_skill_count = 0 THEN
    v_skills := 15 * 0.6;
  ELSE
    SELECT coalesce(ARRAY_AGG(skill_id), ARRAY[]::uuid[]) INTO v_seeker_skill_ids
    FROM public.seeker_skills WHERE seeker_id = p_seeker_id;

    SELECT
      COUNT(*) FILTER (WHERE requirement_level = 'required'),
      COUNT(*) FILTER (WHERE requirement_level = 'required'  AND skill_id = ANY(v_seeker_skill_ids)),
      COUNT(*) FILTER (WHERE requirement_level = 'preferred'),
      COUNT(*) FILTER (WHERE requirement_level = 'preferred' AND skill_id = ANY(v_seeker_skill_ids))
    INTO v_total_required, v_matched_required, v_total_preferred, v_matched_preferred
    FROM public.job_skills WHERE job_id = p_job_id;

    IF v_total_required > 0 THEN
      v_skills := 15.0 * v_matched_required::numeric / v_total_required;
      IF v_total_preferred > 0 THEN
        v_skills := v_skills + 15.0 * 0.6 * v_matched_preferred::numeric / v_total_preferred;
      END IF;
    ELSIF v_total_preferred > 0 THEN
      v_skills := 15.0 * v_matched_preferred::numeric / v_total_preferred;
    END IF;
    v_skills := LEAST(15, v_skills);
  END IF;

  -- ── LOCATION, 15 ──────────────────────────────────────────────────────────────────────
  IF v_seeker.region IS NULL OR v_job.region IS NULL THEN
    v_location := 15 * 0.6;
  ELSIF v_seeker.region = v_job.region THEN
    v_location := 15;
  ELSIF v_seeker.open_to_relocate = true THEN
    v_location := 11;
  ELSIF v_job.region = ANY(public.get_adjacent_regions(v_seeker.region)) THEN
    v_location := 9;
  END IF;

  -- ── ACCOMMODATION, 10 — quality only; the binary is a gate ────────────────────────────
  IF v_seeker.accommodation_needed IS DISTINCT FROM true THEN
    -- They do not need housing, so this dimension constrains nothing. Full marks, not a
    -- neutral: an unconstrained seeker genuinely fits every job on this axis.
    v_accom := 10;
  ELSIF v_job.accommodation IS NULL THEN
    v_accom := 10 * 0.6;
  ELSIF v_accom_available THEN
    v_accom := 5;
    IF v_seeker.pets IS NOT NULL     AND (v_job.accommodation->>'pets')    = 'true' THEN v_accom := v_accom + 2; END IF;
    IF v_seeker.couples_seeking = true AND (v_job.accommodation->>'couples') = 'true' THEN v_accom := v_accom + 1; END IF;
    IF v_seeker.family IS NOT NULL   AND (v_job.accommodation->>'family')  = 'true' THEN v_accom := v_accom + 1; END IF;
    IF (v_job.accommodation->>'utilities_included') = 'true' THEN v_accom := v_accom + 1; END IF;
    v_accom := LEAST(v_accom, 10);
  ELSE
    v_accom      := 0;
    v_gate_accom := true;
  END IF;

  -- ── EXPERIENCE, 10 — TWO-SIDED ────────────────────────────────────────────────────────
  -- The fix for the corpus's loudest structural complaint: v2's min_dairy_experience and
  -- dairynz_level only ever SUBTRACTED, so a green seeker was pure deficit -- and ~35% of the
  -- sample is green, while for calf rearing and relief work keen-and-green is often what a
  -- farm actually wants. It also could not say that a 10-year herd manager applying for an
  -- entry Farm Assistant role is a poor match. They are: they leave in three months.
  v_floor := CASE v_job.min_dairy_experience
               WHEN 'none' THEN 0 WHEN '1_year' THEN 1 WHEN '2_years' THEN 2
               WHEN '3_years' THEN 3 WHEN '5_plus' THEN 5 ELSE NULL END;
  v_ceiling := CASE v_job.seniority_level
                 WHEN 'entry' THEN 3 WHEN 'mid' THEN 7 WHEN 'senior' THEN 12
                 ELSE NULL END;   -- 'management' and NULL: no ceiling

  IF v_seeker.years_experience IS NULL OR (v_floor IS NULL AND v_ceiling IS NULL) THEN
    v_exp := 10 * 0.6;
  ELSIF v_floor IS NOT NULL AND v_seeker.years_experience < v_floor THEN
    v_exp := GREATEST(0, 10 - 10.0 * (v_floor - v_seeker.years_experience) / GREATEST(v_floor, 1));
  ELSIF v_ceiling IS NOT NULL AND v_seeker.years_experience > v_ceiling THEN
    -- Gentler decay than under-qualification, and floored at 4 -- over-qualified is a known
    -- risk, which should rank below a genuine fit but is still a real candidate.
    v_exp := GREATEST(4, 10 - 6.0 * (v_seeker.years_experience - v_ceiling) / GREATEST(v_ceiling, 1));
  ELSE
    v_exp := 10;
  END IF;

  -- ── SALARY, 8 ─────────────────────────────────────────────────────────────────────────
  IF v_seeker.min_salary IS NULL OR v_job.salary_max IS NULL THEN
    v_salary := 8 * 0.6;
  ELSIF v_job.salary_max >= v_seeker.min_salary THEN
    v_salary := 8;
  ELSE
    v_salary := GREATEST(0, 8 - 8.0 * (v_seeker.min_salary - v_job.salary_max)::numeric / v_seeker.min_salary);
  END IF;

  -- ── TIMING, 6 ─────────────────────────────────────────────────────────────────────────
  -- Unscored in v2 entirely. One corpus seeker is lining up 2027; jobs expire, so an
  -- availability mismatch is noise in both directions.
  -- availability_date only. `notice_period` (int) has NO writer -- the onboarding step
  -- captures `notice_period_text` ('1_week', '2_months', ...), so the int column's unit is
  -- unestablished and adding it would be a guess. Map the text tokens here if the date turns
  -- out to be commonly blank.
  v_ready := v_seeker.availability_date;
  IF v_ready IS NULL OR v_job.start_date IS NULL THEN
    v_timing := 6 * 0.6;
  ELSE
    v_late := v_ready - v_job.start_date;
    IF v_late <= 0 THEN
      v_timing := 6;   -- free before it starts
    ELSE
      v_timing := GREATEST(0, 6 - 6.0 * LEAST(v_late, 90) / 90);
    END IF;
  END IF;

  -- ── HERD SIZE, 3 ──────────────────────────────────────────────────────────────────────
  IF coalesce(array_length(v_seeker.herd_sizes_worked, 1), 0) = 0
     OR (v_job.herd_size_min IS NULL AND v_job.herd_size_max IS NULL) THEN
    v_herd := 3 * 0.6;
  ELSIF public._herd_bucket_overlaps(v_seeker.herd_sizes_worked, v_job.herd_size_min, v_job.herd_size_max) THEN
    v_herd := 3;
  END IF;

  -- ── SHED TYPE, 3 (was 25 in v2 — see header) ──────────────────────────────────────────
  IF coalesce(array_length(v_job.shed_type, 1), 0) = 0
     OR coalesce(array_length(v_seeker.shed_types_experienced, 1), 0) = 0 THEN
    v_shed := 3 * 0.6;
  ELSIF v_seeker.shed_types_experienced && v_job.shed_type THEN
    v_shed := 3;
  ELSIF ('rotary'      = ANY(v_seeker.shed_types_experienced) AND 'herringbone' = ANY(v_job.shed_type))
     OR ('herringbone' = ANY(v_seeker.shed_types_experienced) AND 'rotary'      = ANY(v_job.shed_type)) THEN
    v_shed := 1;
  END IF;

  -- ── GATES ─────────────────────────────────────────────────────────────────────────────
  -- Visa: a legal fact, not a gradient. v2 charged 5 points out of ~100 for it.
  --
  -- ONLY 'needs_sponsorship'. The first draft of this gate also listed 'working_holiday' and
  -- 'student', and the rollback probe caught it: a green WHV backpacker scored 2-10 against
  -- EVERY job, because almost no farm sets visa_sponsorship. A working-holiday visa is the
  -- right to work here already -- that is what it is for -- so gating on it makes the single
  -- largest pool of seasonal farm labour unmatchable. A student visa is a limited-hours
  -- problem, which is a TERMS mismatch, not a sponsorship one; if that needs modelling it
  -- belongs against hours_min/hours_max, not here.
  IF v_seeker.visa_status = 'needs_sponsorship'
     AND v_job.visa_sponsorship IS DISTINCT FROM true THEN
    v_gate_visa := true;
  END IF;

  -- Sector: normally already true, because trigger_recompute_job_scores only creates rows
  -- WHERE NEW.sector = ANY(sp.sector_pref). Kept so a direct call is still correct.
  IF coalesce(array_length(v_seeker.sector_pref, 1), 0) > 0
     AND v_job.sector IS NOT NULL
     AND NOT (v_job.sector = ANY(v_seeker.sector_pref)) THEN
    v_gate_sector := true;
  END IF;

  IF v_gate_visa   THEN v_multiplier := v_multiplier * 0.15; END IF;
  IF v_gate_terms  THEN v_multiplier := v_multiplier * 0.40; END IF;
  IF v_gate_accom  THEN v_multiplier := v_multiplier * 0.25; END IF;
  IF v_gate_sector THEN v_multiplier := v_multiplier * 0.35; END IF;

  v_raw := v_role + v_contract + v_skills + v_location + v_accom
           + v_exp + v_salary + v_timing + v_herd + v_shed;

  v_total := LEAST(100, GREATEST(0, ROUND(v_raw * v_multiplier)::int));

  RETURN jsonb_build_object(
    'total_score', v_total,
    'algorithm_version', 3,
    'breakdown', jsonb_build_object(
      'role',          ROUND(v_role)::int,
      'contract',      ROUND(v_contract)::int,
      'skills',        ROUND(v_skills)::int,
      'location',      ROUND(v_location)::int,
      'accommodation', ROUND(v_accom)::int,
      'experience',    ROUND(v_exp)::int,
      'salary',        ROUND(v_salary)::int,
      'timing',        ROUND(v_timing)::int,
      'herd_size',     ROUND(v_herd)::int,
      'shed_type',     ROUND(v_shed)::int,
      -- TRUE means BLOCKED. Surfaced as blockers in the UI, not as lost points: "this farm
      -- will not sponsor a visa" is more use to a reader than "-40".
      'gates', jsonb_build_object(
        'visa',          v_gate_visa,
        'terms',         v_gate_terms,
        'accommodation', v_gate_accom,
        'sector',        v_gate_sector
      ),
      '_meta', jsonb_build_object(
        'raw_total',         ROUND(v_raw)::int,
        'applicable_max',    100,
        'gate_multiplier',   v_multiplier,
        'algorithm_version', 3
      )
    )
  );
END;
$function$;

COMMIT;
