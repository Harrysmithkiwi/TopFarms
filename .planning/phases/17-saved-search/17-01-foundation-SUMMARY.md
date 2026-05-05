---
phase: 17-saved-search
plan: "01"
subsystem: database
tags: [postgres, rls, supabase, urlsearchparams, saved-search, srch-13, wave-1, foundation]

# Dependency graph
requires:
  - phase: 17-saved-search
    provides: tests/saved-search-snapshot.test.ts (Wave 0 RED stubs that this wave turns GREEN)
  - phase: 15-edge-functions
    provides: Studio SQL Editor migration apply pattern (CLAUDE §2 sub-finding — registry-rowless state)
  - phase: 19-design-system-v2
    provides: Phase 19 v2 primitives (Wave 2 will compose Save modal from these — not used in this plan)
provides:
  - public.saved_searches table (live in production with 4 RLS policies + 2 indexes + FK CASCADE)
  - SavedSearch TypeScript interface (src/types/domain.ts)
  - FILTER_KEYS constant + snapshotFilters() + deriveAutoName() + hasActiveFilters() pure helpers (src/lib/savedSearch.ts)
  - 13 GREEN snapshot/auto-name assertions (tests/saved-search-snapshot.test.ts)
affects:
  - 17-02-save-flow (consumes SavedSearch type, snapshotFilters, deriveAutoName, hasActiveFilters; INSERTs into saved_searches)
  - 17-03-list-page (consumes SavedSearch type; SELECT/UPDATE/DELETE on saved_searches; reuses FILTER_KEYS for filter chip rendering)
  - 17-04-quick-load (consumes SavedSearch type; SELECT on saved_searches with limit 5)
  - 18-tech-debt (auth_rls_initplan sweep will rewrite this migration's bare auth.uid() to (SELECT auth.uid()) along with the other 33 instances)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URLSearchParams.toString() snapshot stored as text — schemaless filter persistence (round-trips lossless)"
    - "Pure-ownership RLS via auth.uid() = user_id (mirrors saved_jobs precedent — no role-gating overlay)"
    - "Per-operation RLS policies (SELECT/INSERT/UPDATE/DELETE separately; mirrors 019_seeker_documents — granular audit surface)"
    - "Studio SQL Editor migration apply per CLAUDE §2 — registry-rowless state verified via runtime artefacts (pg_class/pg_policies/pg_indexes), NOT supabase_migrations.schema_migrations"

key-files:
  created:
    - supabase/migrations/024_saved_searches.sql
    - src/lib/savedSearch.ts
  modified:
    - src/types/domain.ts (SavedSearch interface added after SeekerDocument at line 217)
    - tests/saved-search-snapshot.test.ts (13 it.todo() stubs swapped for GREEN assertions)

key-decisions:
  - "Migration applied via Supabase Studio SQL Editor (CLAUDE §2 preferred path — avoids the --read-only MCP restart cycle even though pg_net is not used here). Operator gate handled the SQL paste; orchestrator verified runtime artefacts via read-only MCP execute_sql before this executor was spawned."
  - "Registry-rowless state accepted (CLAUDE §2 sub-finding): supabase_migrations.schema_migrations row not written by Studio apply. Verified via pg_class.relrowsecurity=true, 4 rows in pg_policy, 3 rows in pg_indexes (including pkey). Phase 18 may sweep registry/disk drift in bulk; not a blocker for this plan."
  - "Pure-ownership RLS (auth.uid() = user_id) without get_user_role() overlay — saved searches don't need role-gating; ownership is sufficient. Mirrors saved_jobs (015) precedent. Employer accounts can technically own saved_searches rows — UX prevents creation but RLS doesn't enforce role (correct: enforcement belongs at the UI/route layer, not at RLS)."
  - "Bare auth.uid() form (not (SELECT auth.uid())) per Phase 18 carryforward — keeps migration consistent with the other 33 instances. Phase 18 will sweep all of them at once for the auth_rls_initplan lint."
  - "page param EXCLUDED from snapshotFilters output (locked decision — saved searches always start at page 1 on load); sort param INCLUDED (user-meaningful per RESEARCH §2 recommendation)."
  - "FILTER_KEYS exported as a const tuple (`as const`) so consumers can derive a union type if needed; mirrors src/types/domain.ts SHED_TYPES tuple-of-objects pattern."
  - "deriveAutoName fallback returns `Saved search YYYY-MM-DD` (ISO date slice) when no filters present — defence-in-depth even though the Save button is hidden in that state."

patterns-established:
  - "Pure-function pair (snapshotFilters + deriveAutoName) in src/lib/<feature>.ts module — testable without RTL, no React deps, mirrors src/lib/routing.ts (Phase 20.1) and src/lib/utils.ts (cn helper) light-utility precedent."
  - "Wave 1 atomic-commit pattern: migration + types + lib + test in one feat() commit per CLAUDE §4. Splitting into 4 commits would create 4 commits for one logically-coherent foundation; bundling matches the precedent set by 17-00 and earlier phases."
  - "deriveAutoName multi-axis priority pattern: shed_type (single label or N count) → role_type (fallback if no shed_type) → region (qualifier with `in`) → accommodation flag (`+ accommodation`) → visa flag (`+ visa sponsorship`). 50-char truncate with U+2026 ellipsis. Reusable for any future 'derive readable label from URL params' need."

requirements-completed: []
# Per CLAUDE §7 partial-close discipline: SRCH-13 has multiple gaps:
#   (a) DB foundation       — CLOSED by this plan (table + RLS + helpers + types)
#   (b) Save modal UI       — OPEN (Wave 2: 17-02-save-flow)
#   (c) 10-cap replace flow — OPEN (Wave 2: 17-02-save-flow)
#   (d) E2E manual UAT      — OPEN (after Waves 2-4 land)
# Foundation half is empirically closed but the requirement as a whole is not.
# Do NOT flip SRCH-13 to [x] in REQUIREMENTS.md off this summary.

# Metrics
duration: ~12min
completed: 2026-05-05
---

# Phase 17 Plan 01: Foundation Summary

**saved_searches table live in production with 4 RLS policies + 2 indexes; SavedSearch interface + snapshotFilters/deriveAutoName/hasActiveFilters helpers shipped; 13 snapshot tests turned GREEN.**

## Performance

- **Duration:** ~12 min (orchestrator-handed-off staged work; this executor verified, tested, and committed)
- **Started:** 2026-05-05T07:19:00Z (approx — staged work landed earlier; this executor began verification at handoff)
- **Completed:** 2026-05-05T07:31:18Z
- **Tasks:** 2 (migration + apply; types + lib + test → GREEN)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `public.saved_searches` table live in production (Studio-applied; CLAUDE §2 preferred path)
- 4 RLS policies (per-operation: SELECT/INSERT/UPDATE/DELETE) all scoped by `auth.uid() = user_id`
- 2 indexes: `saved_searches_user_id_idx` (RLS perf), `saved_searches_user_id_created_at_idx` (list-newest-first query)
- FK `user_id → auth.users(id) ON DELETE CASCADE` (user account deletion cleans up saved searches automatically)
- `SavedSearch` TypeScript interface exported from `src/types/domain.ts`
- `src/lib/savedSearch.ts` exports `FILTER_KEYS` (15-key tuple), `snapshotFilters`, `deriveAutoName`, `hasActiveFilters`
- 13 GREEN test assertions covering snapshotFilters round-trip + page exclusion + multi-value preservation + sort preservation + empty handling AND deriveAutoName label lookup + region qualifier + concat + accommodation/visa flags + ISO fallback + 50-char truncate + multi-shed-type
- Test suite delta: Wave 0 baseline 174 passed | 160 todo → after this commit 187 passed | 147 todo (+13 GREEN, -13 todos, zero failures)

## Migration Verification

Applied via Supabase Studio SQL Editor for project `inlagtgpynemhipnqvty` (CLAUDE §1 + §2). Verified by orchestrator via Supabase MCP `execute_sql` (read-only) at 2026-05-05 immediately before executor handoff:

**Table + RLS:** `pg_class WHERE relname='saved_searches'` returned `relrowsecurity=true`

**4 RLS policies (`pg_policy`):**

| polname                            | polcmd | using_expr             | check_expr             |
| ---------------------------------- | ------ | ---------------------- | ---------------------- |
| users delete own saved_searches    | d      | `auth.uid() = user_id` | NULL                   |
| users insert own saved_searches    | a      | NULL                   | `auth.uid() = user_id` |
| users select own saved_searches    | r      | `auth.uid() = user_id` | NULL                   |
| users update own saved_searches    | w      | `auth.uid() = user_id` | `auth.uid() = user_id` |

**Indexes (`pg_indexes`):**

- `saved_searches_pkey` (UNIQUE on id)
- `saved_searches_user_id_idx` (btree on user_id)
- `saved_searches_user_id_created_at_idx` (btree on user_id, created_at DESC)

All migration acceptance criteria from `17-01-foundation-PLAN.md <acceptance_criteria>` empirically met. Registry-rowless state per CLAUDE §2 sub-finding (Studio apply does not write `supabase_migrations.schema_migrations`); runtime artefacts are the load-bearing evidence.

## Task Commits

Each task / coherent unit was committed atomically per CLAUDE §4:

1. **Tasks 1+2 (migration + types + lib + test):** `1c6a0fc` (`feat(17-01): add saved_searches table + lib + types (foundation wave)`)

**Plan metadata:** [appended after metadata commit] (`docs(17-01): record foundation plan completion`)

_Note: Tasks 1 and 2 are bundled in a single atomic commit because they form one logical foundation unit (DB shape + types + helpers + tests-of-helpers). Splitting would produce 4 commits for what is logically one wave; CLAUDE §4 atomic-commit-per-plan precedent (Phase 20.1-04 TDD-bundle, Phase 17-00 scaffold) favors the single commit._

## Files Created/Modified

- `supabase/migrations/024_saved_searches.sql` — table DDL + 4 RLS policies + 2 indexes + COMMENT (75 lines, applied to remote DB via Studio per CLAUDE §2)
- `src/lib/savedSearch.ts` — FILTER_KEYS (15-key const tuple), snapshotFilters (URLSearchParams round-trip filter), deriveAutoName (multi-axis priority labeller with 50-char truncate), hasActiveFilters (Save-button visibility predicate) — 122 lines
- `src/types/domain.ts` — added SavedSearch interface (6 fields: id, user_id, name, search_params, created_at, updated_at) at line 217 immediately after SeekerDocument (the closest sibling shape per RESEARCH.md §1 Q&A)
- `tests/saved-search-snapshot.test.ts` — 13 it.todo() stubs swapped for real assertions covering snapshotFilters (5 tests) + deriveAutoName (8 tests); imports updated to pull from `@/lib/savedSearch`; vitest 13/13 GREEN

## Decisions Made

See `key-decisions` in frontmatter. Notable rationale called out here:

- **Migration applied via Studio, not MCP:** CLAUDE §2 + §1 preferred path. Even though no `pg_net` is used here, the Studio path matches recent precedent (Phase 20-02, 20-08) and avoids any `--read-only` MCP restart cycle. Trade: registry-rowless state (Phase 18 sweep target).
- **No role-gating in RLS:** Saved searches don't need role enforcement at the DB layer; ownership is sufficient. Mirrors saved_jobs (015) — pure-ownership pattern is the canonical CRUD shape.
- **Bare `auth.uid()` form:** Phase 18 will sweep all 33+ instances to `(SELECT auth.uid())` for the auth_rls_initplan lint. Pre-empting that one-at-a-time would create churn; bulk sweep is cleaner.
- **`as const` tuple for FILTER_KEYS:** lets consumers derive `(typeof FILTER_KEYS)[number]` if a union is needed in Wave 2-4. Cheap future-proofing.

## Deviations from Plan

None — plan executed exactly as written. The orchestrator's pre-handoff staged work matched the PLAN.md acceptance criteria byte-for-byte (verified by re-reading staged files against the plan's verbatim SQL/TS bodies):

- Migration body matches PLAN.md Task 1 verbatim (75 lines).
- `src/lib/savedSearch.ts` exports match PLAN.md Task 2 contract (FILTER_KEYS, snapshotFilters, deriveAutoName, hasActiveFilters all present).
- `SavedSearch` interface matches PLAN.md Task 2 6-field shape.
- Test bodies cover all 13 behaviours specified in PLAN.md `<behavior>` block (snapshotFilters: 5 cases; deriveAutoName: 8 cases).

No auto-fixes triggered. No checkpoints hit (the human-action gate for Studio apply happened before this executor was spawned; orchestrator handled the operator handshake and runtime verification).

## Issues Encountered

None during this executor's session. The earlier session hit the Studio-apply human-action gate (expected per PLAN.md Task 1 Step 2 — `--read-only` MCP can't apply DDL); orchestrator unblocked it and verified runtime artefacts before this executor resumed.

## Self-Check

Verified all post-implementation claims:

- `supabase/migrations/024_saved_searches.sql` — FOUND
- `src/lib/savedSearch.ts` — FOUND
- `src/types/domain.ts` (SavedSearch interface at line 217) — FOUND
- `tests/saved-search-snapshot.test.ts` — FOUND, 13 tests GREEN
- Commit `1c6a0fc` — FOUND in `git log`
- Migration runtime artefacts (table, 4 policies, 2 indexes) — verified by orchestrator via MCP read-only SELECTs (table reproduced above)
- `npx tsc --noEmit` — exit 0
- `npx vitest run` — 187 passed | 147 todo, zero failures

## Roadmap Update

Attempted `roadmap update-plan-progress 17 17-01` per orchestrator instruction — see metadata commit for outcome. If the gsd-tools command errors due to stale ROADMAP row format, reconciliation will be handled at `phase complete` time (not a blocker for this plan).

## Next Phase Readiness

- **17-02-save-flow** is unblocked: SavedSearch type compiles, table accepts INSERTs from authenticated seekers, FILTER_KEYS + snapshotFilters + deriveAutoName + hasActiveFilters all importable from `@/lib/savedSearch`.
- **17-03-list-page** is unblocked: SavedSearch type compiles; SELECT/UPDATE/DELETE work via authenticated supabase client (RLS auto-scopes by `auth.uid() = user_id`).
- **17-04-quick-load** is unblocked: same as 17-03 (depends only on 17-01 foundation).
- **17-02 + 17-03 can run in parallel** per ROADMAP wave structure (no shared file edits between save-flow and list-page).

**Blockers / concerns:** None. Foundation is empirically green at DB layer + helper layer + test layer.

**v2.0 launch carryforward:** SRCH-13 not yet flippable to [x] in REQUIREMENTS.md (see `requirements-completed: []` in frontmatter — partial-close per CLAUDE §7).

## Self-Check: PASSED

- `supabase/migrations/024_saved_searches.sql` — FOUND
- `src/lib/savedSearch.ts` — FOUND
- `.planning/phases/17-saved-search/17-01-foundation-SUMMARY.md` — FOUND
- Commit `1c6a0fc` — FOUND in `git log`
- Test suite: 187 passed | 147 todo | 0 failed (verified pre-commit)
- `npx tsc --noEmit` — exit 0 (verified pre-commit)
- Migration runtime artefacts (table, RLS, 4 policies, 2 indexes + pkey) — verified by orchestrator via MCP read-only SELECTs immediately before executor handoff

---
_Phase: 17-saved-search_
_Plan: 01-foundation_
_Completed: 2026-05-05_
