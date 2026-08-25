---
phase: 17-saved-search
plan: 01
type: execute
wave: 1
depends_on:
  - "17-00"
files_modified:
  - supabase/migrations/024_saved_searches.sql
  - src/types/domain.ts
  - src/lib/savedSearch.ts
autonomous: true
requirements:
  - SRCH-13
must_haves:
  truths:
    - "saved_searches table exists in production with 4 RLS policies (SELECT/INSERT/UPDATE/DELETE), each scoped by auth.uid() = user_id"
    - "snapshotFilters and deriveAutoName pure functions exist in src/lib/savedSearch.ts and round-trip lossless via URLSearchParams"
    - "SavedSearch TypeScript interface is exported from src/types/domain.ts"
    - "tests/saved-search-snapshot.test.ts is GREEN (todos replaced with passing assertions)"
  artifacts:
    - path: supabase/migrations/024_saved_searches.sql
      provides: "saved_searches table + 4 RLS policies + 2 indexes"
      contains: "CREATE TABLE public.saved_searches"
    - path: src/types/domain.ts
      provides: "SavedSearch interface"
      contains: "export interface SavedSearch"
    - path: src/lib/savedSearch.ts
      provides: "snapshotFilters + deriveAutoName + FILTER_KEYS constant"
      exports:
        - snapshotFilters
        - deriveAutoName
        - FILTER_KEYS
    - path: tests/saved-search-snapshot.test.ts
      provides: "GREEN assertions covering snapshotFilters + deriveAutoName"
      contains: "expect(snapshotFilters"
  key_links:
    - from: "saved_searches table"
      to: "auth.users(id)"
      via: "user_id FK ON DELETE CASCADE"
      pattern: "REFERENCES auth.users\\(id\\)"
    - from: "src/lib/savedSearch.ts"
      to: "URLSearchParams (web standard)"
      via: "snapshotFilters returns URLSearchParams.toString()"
      pattern: "URLSearchParams"
---

<objective>
Foundation wave: ship the database table, the TypeScript interface, and the two pure functions (snapshotFilters + deriveAutoName) that Wave 2-4 compose. Migration applied via Supabase Studio SQL Editor (CLAUDE §2). One atomic commit covering migration + types + lib + 1 GREEN test file.

Purpose: Without this wave, no downstream plan can compile (SavedSearch type missing) or talk to the DB (table missing). The pure functions are also the cleanest TDD candidates — turn `tests/saved-search-snapshot.test.ts` GREEN within this plan.

Output: 1 migration applied to production, 1 TypeScript interface added, 1 new lib file with 2 pure functions, 1 test file GREEN.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/17-saved-search/17-CONTEXT.md
@.planning/phases/17-saved-search/17-RESEARCH.md
@.planning/phases/17-saved-search/17-VALIDATION.md
@CLAUDE.md
@supabase/migrations/019_seeker_documents.sql
@supabase/migrations/015_phase9_schema.sql
@src/types/domain.ts
@src/pages/jobs/JobSearch.tsx
@tests/saved-search-snapshot.test.ts

<interfaces>
<!-- Existing types/exports the executor needs (extracted from src/types/domain.ts): -->

```typescript
// src/types/domain.ts existing exports (relevant only):
export type ShedType = 'rotary' | 'herringbone' | 'ams' | 'swing_over' | 'tiestall' | 'other'
export const SHED_TYPES: { value: ShedType; label: string }[] = [...]
// SHED_TYPES has objects of shape { value, label }; lookup via .find(s => s.value === key)?.label

export interface Application { ... }       // sibling shape — model SavedSearch on this
export interface SeekerDocument { ... }    // sibling shape

// Filter param keys (authoritative — copied from src/pages/jobs/JobSearch.tsx:170-176 handleClearAll):
//   role_type, mentorship, vehicle, dairynz_pathway, posted_recent,
//   shed_type, region, contract_type, herd_size,
//   salary_min, salary_max, accommodation_type,
//   visa, dairynz_level, page
// `page` is EXCLUDED from saved snapshot. `sort` is INCLUDED (user-meaningful).
```

<!-- Existing migration RLS shape (copied from supabase/migrations/019_seeker_documents.sql:60-92): -->
<!-- - 019 uses per-operation policies (SELECT/INSERT/UPDATE/DELETE) — Phase 17 mirrors this -->
<!-- - 019 includes `get_user_role(auth.uid()) = 'seeker'` clause for documents -->
<!-- - Phase 17 OMITS the role check — saved_searches doesn't need role-gating; ownership via auth.uid() = user_id is sufficient. Mirrors saved_jobs (015) precedent which is also pure-ownership. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create + apply migration 024_saved_searches.sql via Supabase Studio SQL Editor</name>
  <files>supabase/migrations/024_saved_searches.sql</files>
  <read_first>
    - supabase/migrations/019_seeker_documents.sql (per-operation policy pattern; copy the SELECT/INSERT/UPDATE/DELETE policy structure but DROP the get_user_role clause)
    - supabase/migrations/015_phase9_schema.sql (saved_jobs precedent — pure-ownership RLS shape; FK to auth.users)
    - .planning/phases/17-saved-search/17-RESEARCH.md §1 (ready-to-paste SQL skeleton; design notes; pitfall avoidance)
    - CLAUDE.md §1 (project ref `inlagtgpynemhipnqvty`), §2 (Studio SQL Editor preferred; --read-only ON; Studio-applied migrations don't write registry rows — verify via runtime artefacts)
    - supabase/migrations/NAMING.md (registry repair convention if Studio-applied)
  </read_first>
  <action>
**Step 1 — Write the migration to disk.** Create `supabase/migrations/024_saved_searches.sql` with the EXACT body below (copied verbatim from 17-RESEARCH.md §1, with comments aligned to existing migration style):

```sql
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
```

**Step 2 — Apply via Supabase Studio SQL Editor** (CLAUDE §2 preferred path because MCP `--read-only` is ON by default and flag flips require Claude Code restart):

Resume signal to user (this is an `auto` task per Phase 17 plan-shape — but the apply step requires operator copy/paste because the executor cannot write to a `--read-only` MCP). Surface as inline narrative in the executor's commit message:

1. Open Supabase Studio → SQL Editor for project `inlagtgpynemhipnqvty`
2. Paste the entire migration body above (between BEGIN and COMMIT inclusive)
3. Click Run
4. If Studio reports "Success. No rows returned." the migration applied cleanly. If it reports an error, capture the message and abort — do NOT silent-edit the SQL.

**Step 3 — Verify via read-only MCP** (per CLAUDE §2 sub-finding — Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows; verify via runtime artefacts instead). Run these read-only SELECTs via the Supabase MCP `execute_sql` tool:

```sql
-- 3a. Table exists
SELECT to_regclass('public.saved_searches') IS NOT NULL AS table_exists;
-- expect: t

-- 3b. RLS enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'saved_searches';
-- expect: t

-- 3c. 4 policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'saved_searches' ORDER BY policyname;
-- expect 4 rows: users delete own / users insert own / users select own / users update own saved_searches

-- 3d. 2 indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'saved_searches' AND schemaname = 'public' ORDER BY indexname;
-- expect: saved_searches_pkey, saved_searches_user_id_created_at_idx, saved_searches_user_id_idx

-- 3e. FK CASCADE on auth.users(id)
SELECT conname, confdeltype FROM pg_constraint
WHERE conrelid = 'public.saved_searches'::regclass AND contype = 'f';
-- expect: confdeltype = 'c' (CASCADE)
```

**Step 4 — Registry note in commit message.** Per CLAUDE §2 + supabase/migrations/NAMING.md: the migration is functionally live but registry-rowless after Studio apply. Document this in the commit message body (e.g., "024 applied via Studio SQL Editor; runtime artefacts verified via pg_class/pg_policies/pg_indexes; supabase_migrations.schema_migrations row not written — see NAMING.md lookup table").

Do NOT edit NAMING.md in this task — it's a separate process artefact and Phase 18 will sweep registry/disk drift in bulk.
  </action>
  <verify>
    <automated>test -f supabase/migrations/024_saved_searches.sql && grep -q "CREATE TABLE.*public.saved_searches" supabase/migrations/024_saved_searches.sql && grep -c "auth.uid() = user_id" supabase/migrations/024_saved_searches.sql | grep -q "^[4-9]"</automated>
  </verify>
  <done>
    - supabase/migrations/024_saved_searches.sql exists on disk
    - SQL body matches the verbatim text above
    - Studio Apply succeeded (Studio reports "Success" — captured in commit message)
    - MCP verification SELECTs (3a-3e) all return expected results
    - Commit message documents Studio-applied + registry-rowless state
  </done>
  <acceptance_criteria>
    - File supabase/migrations/024_saved_searches.sql exists
    - File contains exact string `CREATE TABLE IF NOT EXISTS public.saved_searches`
    - File contains exact string `auth.uid() = user_id` (≥ 4 occurrences — one per RLS policy USING/WITH CHECK clause)
    - File contains `REFERENCES auth.users(id) ON DELETE CASCADE`
    - File contains `CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx`
    - File contains `CREATE INDEX IF NOT EXISTS saved_searches_user_id_created_at_idx`
    - File contains `CHECK (length(trim(name)) > 0 AND length(name) <= 100)`
    - File contains `ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY`
    - MCP `execute_sql` for `SELECT to_regclass('public.saved_searches')` returns non-null
    - MCP `execute_sql` for policy count returns 4 rows
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add SavedSearch interface to domain.ts + create src/lib/savedSearch.ts with snapshotFilters + deriveAutoName + turn snapshot test GREEN</name>
  <files>
    src/types/domain.ts
    src/lib/savedSearch.ts
    tests/saved-search-snapshot.test.ts
  </files>
  <read_first>
    - src/types/domain.ts (find the right insertion point; SeekerDocument interface is the closest sibling shape at ~line 202)
    - src/pages/jobs/JobSearch.tsx:170-176 (authoritative FILTER_KEYS list — copy verbatim, add 'sort', remove 'page')
    - src/pages/jobs/JobSearch.tsx:107-145 (handleFilterChange — confirms how params are written)
    - .planning/phases/17-saved-search/17-RESEARCH.md §2 (snapshotFilters reference impl + filter param key table)
    - .planning/phases/17-saved-search/17-RESEARCH.md §3 (deriveAutoName algorithm — priority axes: shed_type → role_type → region → accommodation → visa)
    - tests/saved-search-snapshot.test.ts (the 13 .todo stubs from Wave 0 — these become real assertions)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-snapshot.test.ts:

    snapshotFilters:
    - Round-trips a typical filter set lossless: input URLSearchParams `shed_type=rotary&region=Waikato&page=2&sort=match` → output text `shed_type=rotary&region=Waikato&sort=match` (page stripped)
    - Excludes the `page` param even when present (always strip)
    - Preserves multi-valued params: `shed_type=rotary&shed_type=herringbone` round-trips with both values via getAll()
    - Preserves sort param (user-meaningful)
    - Returns empty string when no FILTER_KEYS values are present (`new URLSearchParams().toString()` === `''`)

    deriveAutoName:
    - Single shed_type: `shed_type=rotary` → "Rotary" (label lookup via SHED_TYPES)
    - Single region: `region=Waikato` → "in Waikato"
    - Combined: `shed_type=rotary&region=Waikato` → "Rotary in Waikato"
    - Accommodation: append "+ accommodation" when accommodation_type present
    - Visa: append "+ visa sponsorship" when visa=true
    - Empty: returns "Saved search YYYY-MM-DD" with current ISO date
    - Truncation: when concat > 50 chars, return first 47 chars trimEnd + "…"
    - Multi-valued shed_type: `shed_type=rotary&shed_type=herringbone&shed_type=ams` → "3 shed types"
  </behavior>
  <action>
**Step 1 — Add `SavedSearch` interface to `src/types/domain.ts`.** Insert after the existing `SeekerDocument` interface (around line 202; the executor should grep `export interface SeekerDocument` and place the new interface immediately after its closing brace):

```typescript
/**
 * Phase 17 SRCH-13/14/15 — saved-search row shape.
 * Mirrors the saved_searches table from migration 024.
 * search_params is a URLSearchParams.toString() snapshot (see src/lib/savedSearch.ts).
 */
export interface SavedSearch {
  id: string
  user_id: string
  name: string
  search_params: string
  created_at: string
  updated_at: string
}
```

**Step 2 — Create `src/lib/savedSearch.ts`** with these exports (copy verbatim from 17-RESEARCH.md §2 + §3, lightly adapted):

```typescript
import { SHED_TYPES } from '@/types/domain'

/**
 * Authoritative list of filter keys snapshotted into a saved search.
 * MUST mirror src/pages/jobs/JobSearch.tsx:170-176 handleClearAll() filterKeys
 * EXCEPT 'page' is excluded (saved searches always start at page 1)
 * AND 'sort' is included (user-meaningful per Phase 17 RESEARCH §2 recommendation).
 *
 * Drift risk: if JobSearch.tsx adds/renames a filter key without updating this
 * list, saved searches silently lose that filter. Pitfall 6 in 17-RESEARCH.md.
 */
export const FILTER_KEYS = [
  'role_type',
  'mentorship',
  'vehicle',
  'dairynz_pathway',
  'posted_recent',
  'shed_type',
  'region',
  'contract_type',
  'herd_size',
  'salary_min',
  'salary_max',
  'accommodation_type',
  'visa',
  'dairynz_level',
  'sort',
] as const

/**
 * Snapshot the filter keys from URL searchParams into a stable string.
 * Output round-trips lossless via `new URLSearchParams(snapshotted)`.
 * Excludes `page` per locked decision (saved searches start at page 1 on load).
 */
export function snapshotFilters(searchParams: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    for (const value of searchParams.getAll(key)) {
      next.append(key, value)
    }
  }
  return next.toString()
}

/**
 * Derive a human-readable name from filter values.
 * Priority axes: shed_type → role_type → region → accommodation_type → visa.
 * Truncates to 50 chars with ellipsis.
 * Falls back to "Saved search YYYY-MM-DD" when no filters.
 */
export function deriveAutoName(searchParams: URLSearchParams): string {
  const parts: string[] = []

  // 1. Shed type — primary axis (defines farming domain)
  const shedTypes = searchParams.getAll('shed_type')
  if (shedTypes.length === 1) {
    const label = SHED_TYPES.find((s) => s.value === shedTypes[0])?.label
    if (label) parts.push(label)
  } else if (shedTypes.length > 1) {
    parts.push(`${shedTypes.length} shed types`)
  }

  // 2. Role type — fallback primary if no shed_type
  if (parts.length === 0) {
    const roleTypes = searchParams.getAll('role_type')
    if (roleTypes.length === 1) {
      // Lightly format snake_case → "Snake Case"
      parts.push(
        roleTypes[0]
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      )
    } else if (roleTypes.length > 1) {
      parts.push(`${roleTypes.length} roles`)
    }
  }

  // 3. Region — location qualifier
  const regions = searchParams.getAll('region')
  if (regions.length === 1) {
    parts.push(`in ${regions[0]}`)
  } else if (regions.length > 1) {
    parts.push(`in ${regions.length} regions`)
  }

  // 4. Accommodation flag
  if (searchParams.getAll('accommodation_type').length > 0) {
    parts.push('+ accommodation')
  }

  // 5. Visa flag
  if (searchParams.get('visa') === 'true') {
    parts.push('+ visa sponsorship')
  }

  // Fallback
  if (parts.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return `Saved search ${today}`
  }

  // Truncate to 50 chars
  const name = parts.join(' ')
  if (name.length <= 50) return name
  return `${name.slice(0, 47).trimEnd()}…`
}

/**
 * Predicate for "Save search" button visibility.
 * Returns true when at least one FILTER_KEYS value is set (excluding page/sort defaults).
 * Mirrors FilterSidebar.tsx:117 `hasActiveFilters` semantics — Phase 18 may extract
 * a single canonical helper.
 */
export function hasActiveFilters(searchParams: URLSearchParams): boolean {
  for (const key of FILTER_KEYS) {
    if (key === 'sort') continue // default sort is not a "filter applied" signal
    if (searchParams.getAll(key).length > 0) return true
  }
  return false
}
```

**Step 3 — Replace `it.todo` bodies with real assertions in `tests/saved-search-snapshot.test.ts`.** Reference structure (replace each .todo with a real `it(...)`):

```typescript
import { describe, it, expect } from 'vitest'
import { snapshotFilters, deriveAutoName, FILTER_KEYS } from '@/lib/savedSearch'

describe('snapshotFilters', () => {
  it('round-trips a typical filter set lossless via URLSearchParams', () => {
    const input = new URLSearchParams('shed_type=rotary&region=Waikato&sort=match')
    const out = snapshotFilters(input)
    expect(new URLSearchParams(out).get('shed_type')).toBe('rotary')
    expect(new URLSearchParams(out).get('region')).toBe('Waikato')
    expect(new URLSearchParams(out).get('sort')).toBe('match')
  })

  it('excludes the page param even when present', () => {
    const input = new URLSearchParams('shed_type=rotary&page=3')
    const out = snapshotFilters(input)
    expect(out).not.toContain('page=')
    expect(new URLSearchParams(out).get('shed_type')).toBe('rotary')
  })

  it('preserves multi-valued params', () => {
    const input = new URLSearchParams('shed_type=rotary&shed_type=herringbone')
    const out = snapshotFilters(input)
    expect(new URLSearchParams(out).getAll('shed_type')).toEqual(['rotary', 'herringbone'])
  })

  it('preserves sort param (user-meaningful)', () => {
    const input = new URLSearchParams('sort=salary_desc')
    expect(snapshotFilters(input)).toBe('sort=salary_desc')
  })

  it('returns empty string when no filter keys are set', () => {
    expect(snapshotFilters(new URLSearchParams())).toBe('')
  })
})

describe('deriveAutoName', () => {
  it('returns shed-type label when single shed_type set', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary'))).toBe('Rotary')
  })

  it('returns "in <region>" qualifier when single region set', () => {
    expect(deriveAutoName(new URLSearchParams('region=Waikato'))).toBe('in Waikato')
  })

  it('joins shed_type + region as "Rotary in Waikato"', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary&region=Waikato'))).toBe('Rotary in Waikato')
  })

  it('appends "+ accommodation" when accommodation_type set', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary&accommodation_type=couples'))).toBe('Rotary + accommodation')
  })

  it('appends "+ visa sponsorship" when visa=true', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary&visa=true'))).toBe('Rotary + visa sponsorship')
  })

  it('falls back to "Saved search YYYY-MM-DD" when no filters set', () => {
    const result = deriveAutoName(new URLSearchParams())
    expect(result).toMatch(/^Saved search \d{4}-\d{2}-\d{2}$/)
  })

  it('truncates output to 50 chars with ellipsis when concat exceeds', () => {
    // 5 regions = "in 5 regions" (12), 5 shed types = "5 shed types" (12) — short on its own
    // Use long synthetic regions
    const params = new URLSearchParams()
    params.append('region', 'Aaaaaaaaaaaaaaaa')
    params.append('region', 'Bbbbbbbbbbbbbbbb')
    params.append('region', 'Cccccccccccccccc')
    params.append('region', 'Dddddddddddddddd')
    params.set('shed_type', 'rotary')
    // "Rotary in 4 regions" — short, won't truncate. Force truncation differently:
    const longParams = new URLSearchParams('shed_type=rotary&region=ALongRegionNameThatExceedsTheFiftyCharBudget')
    const result = deriveAutoName(longParams)
    expect(result.length).toBeLessThanOrEqual(50)
    if (result.length === 50) expect(result.endsWith('…')).toBe(true)
  })

  it('handles multi-valued shed_type as "<N> shed types"', () => {
    const params = new URLSearchParams('shed_type=rotary&shed_type=herringbone&shed_type=ams')
    expect(deriveAutoName(params)).toBe('3 shed types')
  })
})
```

Notes:
- The exact assertion shape is the executor's call (e.g., `toMatch` vs `toBe`); the BEHAVIOR is what matters. Fix any drift between deriveAutoName impl and assertion in the impl, not the test.
- DO NOT modify other tests/saved-search-*.test.tsx files — those stay red until Wave 2-4.

**Step 4 — Run vitest to confirm GREEN.**

```bash
pnpm test -- --run tests/saved-search-snapshot.test.ts
```

Expect: 13 passed, 0 failed, 0 todos.

**Step 5 — Run tsc to ensure no type drift.**

```bash
pnpm tsc --noEmit
```

Expect: 0 errors.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-snapshot.test.ts && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - src/types/domain.ts exports `SavedSearch` interface
    - src/lib/savedSearch.ts exists with `snapshotFilters`, `deriveAutoName`, `FILTER_KEYS`, `hasActiveFilters` named exports
    - tests/saved-search-snapshot.test.ts: 13 tests pass, 0 todos
    - pnpm tsc --noEmit clean
  </done>
  <acceptance_criteria>
    - `grep -q "export interface SavedSearch" src/types/domain.ts` exits 0
    - `grep -q "id: string" src/types/domain.ts` near the SavedSearch interface (within 10 lines after `export interface SavedSearch`)
    - `src/lib/savedSearch.ts` contains `export const FILTER_KEYS`
    - `src/lib/savedSearch.ts` contains `export function snapshotFilters`
    - `src/lib/savedSearch.ts` contains `export function deriveAutoName`
    - `src/lib/savedSearch.ts` contains `export function hasActiveFilters`
    - `src/lib/savedSearch.ts` does NOT contain the literal `'page'` inside the FILTER_KEYS array (verify via `grep "'page'" src/lib/savedSearch.ts | grep -v "// " | wc -l` returns 0)
    - `pnpm test -- --run tests/saved-search-snapshot.test.ts` exits 0 with "13 passed" in output
    - `pnpm tsc --noEmit` exits 0
    - tests/saved-search-snapshot.test.ts contains `import { snapshotFilters, deriveAutoName` from '@/lib/savedSearch'
    - No `it.todo(` calls remain in tests/saved-search-snapshot.test.ts (`grep -c "it.todo" tests/saved-search-snapshot.test.ts` returns 0)
  </acceptance_criteria>
</task>

</tasks>

<verification>
- Migration applied to production via Studio SQL Editor; runtime artefacts (table, 4 policies, 2 indexes, FK CASCADE) verified via MCP read-only SELECTs
- src/types/domain.ts compiles with new SavedSearch export
- src/lib/savedSearch.ts compiles
- tests/saved-search-snapshot.test.ts: 13/13 passing
- Full suite: `pnpm test -- --run` — expect 174 passed + ≈ 13 new passes + remaining todos; 0 failures
</verification>

<success_criteria>
- saved_searches table exists in production with 4 RLS policies + 2 indexes + FK CASCADE on auth.users
- TypeScript SavedSearch interface exported and compiles
- snapshotFilters + deriveAutoName + FILTER_KEYS + hasActiveFilters exported from src/lib/savedSearch.ts
- tests/saved-search-snapshot.test.ts is GREEN (was red after Wave 0)
- One atomic commit covers migration + types + lib + test (CLAUDE §4)
</success_criteria>

<output>
After completion, create `.planning/phases/17-saved-search/17-01-SUMMARY.md` covering:
- Migration apply method (Studio SQL Editor) + MCP verification SELECT outputs
- Files added (3) / modified (1)
- Test count delta (+13 green)
- Note: registry-rowless state per CLAUDE §2 sub-finding; supabase_migrations.schema_migrations row not written
</output>
