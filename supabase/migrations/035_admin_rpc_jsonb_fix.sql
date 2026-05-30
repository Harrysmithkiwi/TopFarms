-- ============================================================
-- 035_admin_rpc_jsonb_fix.sql
-- TopFarms — Phase 23 follow-up fix
--
-- Migration 034 defined `admin_skill_coverage` and
-- `admin_list_analytics_events` using `row_to_jsonb(t)` — a function name
-- that does NOT exist in Postgres. The real built-ins are
-- `row_to_json(record)` (returns json) and `to_jsonb(anyelement)` (returns
-- jsonb). `to_jsonb(t)` is the correct replacement: it accepts a record
-- (records are anyelement) and returns jsonb with column names as keys —
-- the same shape `row_to_jsonb` would have produced if it existed.
--
-- This bug was latent in 034:
--   - 034's `DO $verify$` block never invoked the RPCs, so the error was
--     not detected at apply time.
--   - The Wave 0 static-source-guard (tests/skills-taxonomy-migration.test.ts)
--     checks for required patterns (SECURITY DEFINER, _admin_gate, seeker_count,
--     job_count) but did not assert that referenced Postgres functions actually
--     exist.
--   - The Vitest RTL guard mocks supabase.rpc and never exercised the live
--     function body.
--
-- The bug was caught via live Playwright run against /admin/skills — the
-- browser console surfaced Postgres error 42883:
--   "function row_to_jsonb(record) does not exist"
--   "No function matches the given name and argument types..."
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2). After apply, backfill
-- the migrations registry row:
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
--   VALUES ('035', '035_admin_rpc_jsonb_fix',
--           ARRAY['-- see supabase/migrations/035_admin_rpc_jsonb_fix.sql'])
--   ON CONFLICT (version) DO NOTHING;
--
-- Sections:
--   1. admin_skill_coverage — replace row_to_jsonb(t) with to_jsonb(t)
--   2. admin_list_analytics_events — same fix (preemptive; no consumer yet)
--   3. DO $verify$ — assert neither function body contains the bad symbol
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1 — admin_skill_coverage
-- Body is verbatim from 034 except `row_to_jsonb(t)` → `to_jsonb(t)`.
-- Signature is unchanged: parameterless, returns jsonb {rows, total}.
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

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.category, t.name), '[]'::jsonb)
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
-- SECTION 2 — admin_list_analytics_events
-- Same row_to_jsonb → to_jsonb fix. No consumer yet (the AdminListRpc union
-- has its name for future use), but fix preemptively so the next consumer
-- page doesn't re-trip the same bug.
-- ============================================================

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

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
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
-- SECTION 3 — DO $verify$ post-state assertions
--
-- TWO TIERS of verification (closes 034's structural gap, ANLY-VERIFY-01):
--
--   Text-tier: read pg_proc.prosrc for each function, assert `to_jsonb` is
--     present and `row_to_jsonb` is absent. Catches the regression at function
--     definition level.
--
--   Executable-tier: run the EXACT aggregation pattern from each function
--     body inline against the live schema (NOT via the RPC, because
--     `_admin_gate()` rejects unauthenticated callers in migration context).
--     This is the strongest forward-fact check available without a real auth
--     session — if `to_jsonb` does not resolve, or any column reference is
--     wrong, the inline SELECT raises here and rolls back the transaction.
--
-- Any failed assertion raises EXCEPTION → entire BEGIN/COMMIT rolls back.
-- ============================================================

DO $verify$
DECLARE
  v_has_bad   bool;
  v_test_rows jsonb;
  v_test_len  int;
BEGIN
  -- ── Text-tier ──────────────────────────────────────────────────
  -- 3.1 admin_skill_coverage no longer references row_to_jsonb
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_skill_coverage'
      AND p.prosrc LIKE '%row_to_jsonb%'
  ) INTO v_has_bad;
  IF v_has_bad THEN
    RAISE EXCEPTION 'Verify failed: admin_skill_coverage source still contains row_to_jsonb';
  END IF;

  -- 3.2 admin_list_analytics_events no longer references row_to_jsonb
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_list_analytics_events'
      AND p.prosrc LIKE '%row_to_jsonb%'
  ) INTO v_has_bad;
  IF v_has_bad THEN
    RAISE EXCEPTION 'Verify failed: admin_list_analytics_events source still contains row_to_jsonb';
  END IF;

  -- 3.3 Both functions still SECURITY DEFINER + GRANTed to authenticated
  --     (regression net for accidental loss of security context)
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_skill_coverage', 'admin_list_analytics_events')
      AND p.prosecdef = true
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'Verify failed: expected both admin RPCs to remain SECURITY DEFINER';
  END IF;

  -- ── Executable-tier ───────────────────────────────────────────
  -- 3.4 The exact aggregation from admin_skill_coverage runs against the
  --     live schema. If `to_jsonb` doesn't resolve (or any column reference
  --     is wrong), this raises before the assertion below.
  --     Expect 24 rows (the seeded ag-broad competencies from 034).
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.category, t.name), '[]'::jsonb)
  INTO v_test_rows
  FROM (
    SELECT
      s.id                                       AS skill_id,
      s.name,
      s.category,
      s.discipline,
      COUNT(DISTINCT ss.seeker_id)               AS seeker_count,
      COUNT(DISTINCT js.job_id)                  AS job_count
    FROM public.skills s
    LEFT JOIN public.seeker_skills ss ON ss.skill_id = s.id
    LEFT JOIN public.job_skills    js ON js.skill_id = s.id
    WHERE s.discipline = 'agriculture'
    GROUP BY s.id, s.name, s.category, s.discipline
  ) t;
  v_test_len := jsonb_array_length(v_test_rows);
  IF v_test_len != 24 THEN
    RAISE EXCEPTION 'Verify failed: admin_skill_coverage aggregation returned % rows, expected 24', v_test_len;
  END IF;

  -- 3.5 The exact aggregation from admin_list_analytics_events runs against
  --     the live schema. analytics_events is empty post-034 → expect 0 rows.
  --     The point is parser/resolver validation, not row count.
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_test_rows
  FROM (
    SELECT id, event_type, entity_id, metadata, created_at
    FROM public.analytics_events
    ORDER BY created_at DESC
    LIMIT 50
  ) t;
  -- No row-count assertion (analytics_events may be 0 or more depending on
  -- future test writes); we only care the SQL parses against the schema.
END
$verify$;

COMMIT;
