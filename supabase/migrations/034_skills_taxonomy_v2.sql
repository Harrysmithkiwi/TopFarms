-- ============================================================
-- 034_skills_taxonomy_v2.sql
-- TopFarms — Phase 23 Skills Taxonomy Consolidation + Admin Analytics
--
-- Converts the skills table from a dairy-scoped 40-skill model to an
-- agriculture-broad 24-competency taxonomy across 6 canonical categories.
-- Also stands up the admin analytics SQL surface (two SECURITY DEFINER
-- RPCs + analytics_events table) consumed by plan 23-02.
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2 — preferred path;
-- the pooler/`supabase db push` CI path is gated off per CLAUDE.md §6).
--
-- After Studio apply: backfill the migration registry row:
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
--   VALUES ('034', '034_skills_taxonomy_v2', ARRAY['-- see supabase/migrations/034_skills_taxonomy_v2.sql'])
--   ON CONFLICT (version) DO NOTHING;
--
-- ALL following sections MUST be run within this single transaction.
-- The DO $verify$ block at the end rolls back the entire transaction if
-- any post-state assertion fails — a clean run guarantees all invariants.
--
-- Sections:
--   1. Schema alterations (drop sector constraint/column, add discipline; drop OLD category CHECK)
--   2. Clear existing data (FK-safe order: seeker_skills → match_scores → skills)
--   3. Add NEW category CHECK + reseed 24 ag-broad competencies across 6 categories
--   4. Recompute match_scores backfill (skills dimension = 0 until seekers re-tag)
--   5. admin_skill_coverage RPC (ANLY-01 supply vs demand + ANLY-02 usage counts)
--   6. analytics_events table + admin_list_analytics_events RPC (ANLY-03)
--   7. DO $verify$ post-state assertions
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1 — Schema alterations
-- ============================================================

-- Drop the sector CHECK constraint (blocks subsequent column drop)
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_sector_check;

-- Drop the sector column (ag-broad taxonomy has no sector dimension at skill level)
ALTER TABLE public.skills DROP COLUMN IF EXISTS sector;

-- Add discipline column — all current competencies are agriculture-specific;
-- future verticals (horticulture, forestry) add freely via discipline value.
-- NO discipline CHECK constraint per CONTEXT.md decision #3 (verticals add freely).
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'agriculture';

-- Drop the OLD category CHECK. The NEW category CHECK is added in SECTION 3,
-- AFTER legacy rows are cleared in SECTION 2. Reason: legacy category values
-- (milking, qualification-tier, machinery, shearing, mustering, infrastructure,
-- management) do not match the new 6-slug enum, so adding the new CHECK
-- before clearing them raises Postgres error 23514.
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_category_check;

-- ============================================================
-- SECTION 2 — Clear existing data
-- FK-safe order: seeker_skills (FK → skills) first, then match_scores
-- (no FK to skills but logically coupled to seeker_skills), then skills.
-- Research Pitfall 2/3: explicit DELETE order avoids FK ambiguity.
-- This MUST run before the new category CHECK is added (Section 3) so the
-- CHECK validates only the upcoming reseed, not the legacy non-conforming rows.
-- ============================================================

DELETE FROM public.seeker_skills;
DELETE FROM public.match_scores;
DELETE FROM public.skills;

-- ============================================================
-- SECTION 3 — Add NEW category CHECK + reseed 24 ag-broad competencies
-- The new CHECK is added against the empty table (Section 2 cleared all rows)
-- so it validates only the upcoming INSERT — not the legacy categories.
-- discipline specified EXPLICITLY on every row (Research Pitfall 5:
-- do not rely on column DEFAULT in a multi-value INSERT — be explicit).
-- Names and category slugs are VERBATIM from CONTEXT.md decision #1.
-- ============================================================

ALTER TABLE public.skills ADD CONSTRAINT skills_category_check
  CHECK (category IN (
    'livestock',
    'cropping_agronomy',
    'machinery_equipment',
    'farm_operations_infrastructure',
    'management_business',
    'cross_cutting'
  ));

INSERT INTO public.skills (name, category, discipline) VALUES
  -- Livestock (5 competencies)
  ('Dairy cattle management',          'livestock',                     'agriculture'),
  ('Beef cattle management',           'livestock',                     'agriculture'),
  ('Sheep & lamb handling',            'livestock',                     'agriculture'),
  ('Animal health & husbandry',        'livestock',                     'agriculture'),
  ('Mustering & stockmanship',         'livestock',                     'agriculture'),

  -- Cropping & agronomy (4 competencies)
  ('Arable & grain production',        'cropping_agronomy',             'agriculture'),
  ('Vegetable & root crop production', 'cropping_agronomy',             'agriculture'),
  ('Pasture & forage management',      'cropping_agronomy',             'agriculture'),
  ('Agronomy & soil management',       'cropping_agronomy',             'agriculture'),

  -- Machinery & equipment (4 competencies)
  ('Tractor operation',                'machinery_equipment',            'agriculture'),
  ('Heavy machinery & harvest equipment', 'machinery_equipment',         'agriculture'),
  ('Spraying & application equipment', 'machinery_equipment',            'agriculture'),
  ('Farm vehicle handling',            'machinery_equipment',            'agriculture'),

  -- Farm operations & infrastructure (4 competencies)
  ('Fencing & yard construction',      'farm_operations_infrastructure', 'agriculture'),
  ('Irrigation & water systems',       'farm_operations_infrastructure', 'agriculture'),
  ('General farm maintenance',         'farm_operations_infrastructure', 'agriculture'),
  ('Fuel & chemical handling',         'farm_operations_infrastructure', 'agriculture'),

  -- Management & business (4 competencies)
  ('Farm planning & operations management', 'management_business',       'agriculture'),
  ('Staff supervision & leadership',   'management_business',            'agriculture'),
  ('Farm financial management',        'management_business',            'agriculture'),
  ('Compliance & record-keeping',      'management_business',            'agriculture'),

  -- Cross-cutting (3 competencies)
  ('Health & safety competency',       'cross_cutting',                  'agriculture'),
  ('Sustainable & regenerative practices', 'cross_cutting',              'agriculture'),
  ('Data & farm tech literacy',        'cross_cutting',                  'agriculture');

-- ============================================================
-- SECTION 4 — match_scores recompute backfill
-- Verbatim from 010_match_scores_precompute.sql lines 169-189.
-- seeker_skills is now empty, so the skills dimension of every score
-- will be 0. That is the EXPECTED post-reseed state (CONTEXT.md migration
-- data handling) — scores recover as the 3 test seekers re-tag themselves.
-- compute_match_score uses jobs.sector + seeker_profiles.sector_pref (not
-- skills.sector) — those fields are UNAFFECTED by this migration.
-- ============================================================

SET statement_timeout = '0';
INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
SELECT j.id, sp.id, (result->>'total_score')::int, result->'breakdown', now()
FROM public.jobs j
JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
WHERE j.status = 'active'
ON CONFLICT (job_id, seeker_id) DO UPDATE SET
  total_score = EXCLUDED.total_score, breakdown = EXCLUDED.breakdown, calculated_at = EXCLUDED.calculated_at;
RESET statement_timeout;

-- ============================================================
-- SECTION 5 — admin_skill_coverage RPC
-- ANLY-01 (supply vs demand) + ANLY-02 (usage counts) — single RPC
-- serves both. Returns {rows, total} matching AdminTable's contract.
-- LEFT JOIN seeker_skills (DISTINCT seeker_id = supply) and job_skills
-- (DISTINCT job_id = demand) onto skills WHERE discipline='agriculture'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_skill_coverage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.category, t.name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      s.id                                                          AS skill_id,
      s.name,
      s.category,
      s.discipline,
      COUNT(DISTINCT ss.seeker_id)                                  AS seeker_count,
      COUNT(DISTINCT js.job_id)                                     AS job_count
    FROM public.skills s
    LEFT JOIN public.seeker_skills ss ON ss.skill_id = s.id
    LEFT JOIN public.job_skills    js ON js.skill_id = s.id
    WHERE s.discipline = 'agriculture'
    GROUP BY s.id, s.name, s.category, s.discipline
    ORDER BY s.category, s.name
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', jsonb_array_length(v_rows));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_skill_coverage() TO authenticated;

-- ============================================================
-- SECTION 6 — analytics_events table + admin_list_analytics_events RPC
-- ANLY-03: persistent event store for product analytics (skill gap views,
-- directory entry views, etc.). Naming convention: '<domain>.<action>'
-- e.g. 'skill_gap.viewed' (Phase 24), 'directory.entry_viewed' (Phase 25).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,   -- naming convention: '<domain>.<action>'
  entity_id   uuid,                   -- optional reference to the entity being acted on
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient admin queries: filter by type + time, or by entity
CREATE INDEX IF NOT EXISTS analytics_events_type_idx
  ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_entity_idx
  ON public.analytics_events (entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;

-- Admin-read RLS policy — write path is via SECURITY DEFINER RPC (no INSERT policy needed)
DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_read" ON public.analytics_events
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- admin_list_analytics_events — paginated read with optional event_type filter
-- Returns {rows, total} matching AdminTable's contract.
-- Event naming convention: '<domain>.<action>'
--   skill_gap.viewed       = Phase 24 (skill gap analysis page)
--   directory.entry_viewed = Phase 25 (employer/seeker directory)
CREATE OR REPLACE FUNCTION public.admin_list_analytics_events(
  p_event_type text DEFAULT NULL,
  p_limit      int  DEFAULT 50,
  p_offset     int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total
  FROM public.analytics_events
  WHERE (p_event_type IS NULL OR event_type = p_event_type);

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT id, event_type, entity_id, metadata, created_at
    FROM public.analytics_events
    WHERE (p_event_type IS NULL OR event_type = p_event_type)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_analytics_events(text, int, int) TO authenticated;

-- ============================================================
-- SECTION 7 — DO $verify$ post-state assertions
-- Mirrors the pattern from 033_admin_doc_rpcs.sql §4.
-- Any failed assertion raises EXCEPTION, rolling back the entire
-- BEGIN/COMMIT transaction — a clean run means all invariants passed.
-- ============================================================

DO $verify$
DECLARE
  v_count    int;
  v_cat_count int;
  v_has_sector bool;
BEGIN
  -- 7.1 Exactly 24 skills seeded
  SELECT count(*) INTO v_count FROM public.skills;
  IF v_count != 24 THEN
    RAISE EXCEPTION 'Verify failed: expected 24 skills, got %', v_count;
  END IF;

  -- 7.2 All 24 skills have discipline = agriculture
  SELECT count(*) INTO v_count FROM public.skills WHERE discipline = 'agriculture';
  IF v_count != 24 THEN
    RAISE EXCEPTION 'Verify failed: expected 24 agriculture skills, got %', v_count;
  END IF;

  -- 7.3 Exactly 6 distinct categories
  SELECT count(DISTINCT category) INTO v_cat_count FROM public.skills;
  IF v_cat_count != 6 THEN
    RAISE EXCEPTION 'Verify failed: expected 6 distinct categories, got %', v_cat_count;
  END IF;

  -- 7.4 No sector column remains on public.skills
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'skills'
      AND column_name  = 'sector'
  ) INTO v_has_sector;
  IF v_has_sector THEN
    RAISE EXCEPTION 'Verify failed: sector column still present on public.skills after migration';
  END IF;

  -- 7.5 Both admin RPCs exist and are SECURITY DEFINER
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('admin_skill_coverage', 'admin_list_analytics_events')
    AND p.prosecdef = true;
  IF v_count != 2 THEN
    RAISE EXCEPTION 'Verify failed: expected 2 SECURITY DEFINER admin analytics RPCs, got %', v_count;
  END IF;

  -- 7.6 analytics_events table exists
  IF to_regclass('public.analytics_events') IS NULL THEN
    RAISE EXCEPTION 'Verify failed: analytics_events table does not exist';
  END IF;
END
$verify$;

COMMIT;
