-- ============================================================
-- 024_saved_searches.sql
-- TopFarms — Phase 17 SRCH-13/14/15 — saved searches CRUD
--
-- Sections:
--   1. saved_searches table (per-seeker, name + URL params snapshot)
--   2. RLS — seeker-only access via auth.uid() = user_id
--   3. Indexes (user_id for RLS perf; user_id + created_at desc for list query)
--   4. (No backfill — net-new feature)
--
-- Notes:
--   - Mirrors saved_jobs (015) pure-ownership RLS pattern (auth.uid() = user_id).
--     Per-operation policies (not FOR ALL) follow 019_seeker_documents precedent —
--     granular SELECT/INSERT/UPDATE/DELETE makes audit easier.
--   - get_user_role(auth.uid()) clause OMITTED — saved searches don't need
--     role-gating; ownership is sufficient. Anyone with auth can have saved searches
--     (employers don't, by UX choice — but RLS doesn't need to enforce that).
--   - 10-search soft cap NOT enforced at DB layer — see 17-RESEARCH §6 for the
--     client-side count check rationale (race tradeoff documented as acceptable).
--   - search_params stored as text (URLSearchParams.toString() output). Schemaless;
--     round-trips lossless via `new URLSearchParams(row.search_params)`.
--     Future-phase: add schema_version column if filter-key drift becomes a problem.
--   - Per Phase 18 carryforward (auth_rls_initplan lint): write policies in BARE
--     auth.uid() form to match the existing 33 instances. Phase 18 will sweep all
--     of them to (SELECT auth.uid()) at once.
-- ============================================================

BEGIN;

-- 1. Table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  search_params text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.saved_searches IS
  'Phase 17 SRCH-13/14/15. Per-seeker saved filter snapshots from /jobs. '
  'search_params is a URLSearchParams.toString() snapshot; future filter-key '
  'renames in JobSearch.tsx will silently invalidate old saved searches '
  '(Pitfall 6 in 17-RESEARCH.md). Add schema_version column if this becomes '
  'a problem.';

-- 2. RLS — pure ownership via auth.uid() = user_id
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own saved_searches"
ON public.saved_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users insert own saved_searches"
ON public.saved_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own saved_searches"
ON public.saved_searches FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own saved_searches"
ON public.saved_searches FOR DELETE
USING (auth.uid() = user_id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx
  ON public.saved_searches(user_id);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_created_at_idx
  ON public.saved_searches(user_id, created_at DESC);

COMMIT;
