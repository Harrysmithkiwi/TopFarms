---
phase: 20-super-admin-dashboard
plan: 01
subsystem: testing
tags: [vitest, testing-library, scaffolding, admin, validation]

# Dependency graph
requires:
  - phase: 19-v2-brand-migration
    provides: vitest 3.1.1 + @testing-library/react 16.3.0 + jsdom test infrastructure (vitest.config.ts, tests/setup.ts)
provides:
  - 14 vitest test files covering all 22 ADMIN-* test IDs from 20-VALIDATION.md (parse-clean, todos only)
  - tests/admin-bootstrap-UAT.md manual UAT script for ADMIN-BOOTSTRAP-1 (Studio SQL + sign-in/out + run-record template)
  - it.todo() pattern for unimplemented assertions across the entire admin suite (zero failing tests, zero broken imports)
affects: [20-02-rpc-implementation, 20-03-ui-pages, 20-04-route-wiring, 20-verify-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "it.todo('ADMIN-XXX-N: behavior') for scaffolded tests so vitest reports todos rather than skips/fails (visible scaffolding signal)"
    - "One vitest file per VALIDATION.md test-ID-prefix grouping (admin-protected-route owns FE-1..4, admin-rpc-shapes owns BE-4 across 5 RPCs, etc.)"
    - "Manual UAT scripts live as tests/*-UAT.md alongside vitest files for traceability when the test must remain manual"

key-files:
  created:
    - tests/admin-protected-route.test.tsx
    - tests/admin-rpc-gate.test.ts
    - tests/admin-rpc-shapes.test.ts
    - tests/admin-daily-briefing.test.ts
    - tests/admin-employer-list.test.ts
    - tests/admin-seeker-list.test.ts
    - tests/admin-jobs-list.test.ts
    - tests/admin-placement-list.test.ts
    - tests/admin-suspend.test.ts
    - tests/admin-notes.test.ts
    - tests/admin-rls-not-widened.test.ts
    - tests/admin-drawer-shape.test.ts
    - tests/admin-audit.test.ts
    - tests/admin-resend-cache.test.ts
    - tests/admin-bootstrap-UAT.md
  modified: []

key-decisions:
  - "Scaffolds use bare-minimum imports (describe + it from vitest) — no premature mock setup; later waves add @/lib/supabase + @/hooks/useAuth mocks as test bodies need them"
  - "Verify command runs vitest with --run flag (pnpm test -- --run tests/admin-*) so CI-style execution exits cleanly; the plan's documented command (pnpm test -- tests/admin-*) defaults to watch mode and would hang"
  - "Manual UAT bootstrap script flagged as such in tests/admin-bootstrap-UAT.md per CLAUDE.md §2 — Studio SQL bypasses MCP --read-only and is not automatable"

patterns-established:
  - "Wave 0 scaffold pattern: every VALIDATION.md test ID gets a stub in a vitest file (or UAT markdown) before any implementation. Later waves only fill bodies — no scavenger hunt."
  - "Test-ID naming convention: ADMIN-{CATEGORY}-{N|SUBCAT} (e.g., ADMIN-GATE-FE-1, ADMIN-MUT-SUS, ADMIN-RLS-NEG-1) — preserved verbatim in it.todo() string for grep traceability"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 20 Plan 01: Wave 0 Test Scaffold Summary

**14 vitest scaffold files + 1 UAT markdown covering all 22 ADMIN-* test IDs from 20-VALIDATION.md, parse-clean with zero failures and todos-only reporting**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-04T11:31:54Z
- **Completed:** 2026-05-04T11:35:13Z
- **Tasks:** 2
- **Files modified:** 15 (all created)

## Accomplishments

- 14 vitest test files created with `it.todo()` stubs for every behavior in VALIDATION.md per-task verification map
- 1 manual UAT markdown (`tests/admin-bootstrap-UAT.md`) for ADMIN-BOOTSTRAP-1 with Studio SQL bootstrap script + sign-out/sign-in steps + run-record template
- All 22 unique ADMIN-* test IDs traceable via single grep: `grep -h "it.todo\|ADMIN-BOOTSTRAP-1" tests/admin-* | grep -oE "ADMIN-[A-Z-]+(-[0-9]+)?" | sort -u | wc -l` → 22
- Critical RLS-not-widened test scaffold (ADMIN-RLS-NEG-1/2) flagged with comment marker so future implementers know it's the most important test in the phase

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold frontend gate + RPC test files (8 files)** — `8296aee` (test)
2. **Task 2: Scaffold mutation + RLS + drawer + audit + resend test files (6 files) + bootstrap UAT** — `45381f6` (test)

**Plan metadata commit:** to be created after this SUMMARY (separate from per-task commits)

## Files Created/Modified

### Frontend gate + RPC backend scaffolds (Task 1)
- `tests/admin-protected-route.test.tsx` — 4 it.todo (ADMIN-GATE-FE-1..4)
- `tests/admin-rpc-gate.test.ts` — 3 it.todo (ADMIN-GATE-BE-1..3)
- `tests/admin-rpc-shapes.test.ts` — 5 it.todo (ADMIN-GATE-BE-4 across 5 RPCs)

### View list scaffolds (Task 1)
- `tests/admin-daily-briefing.test.ts` — 3 it.todo (ADMIN-VIEW-DAILY)
- `tests/admin-employer-list.test.ts` — 3 it.todo (ADMIN-VIEW-EMPL)
- `tests/admin-seeker-list.test.ts` — 3 it.todo (ADMIN-VIEW-SEEK)
- `tests/admin-jobs-list.test.ts` — 3 it.todo (ADMIN-VIEW-JOBS)
- `tests/admin-placement-list.test.ts` — 3 it.todo (ADMIN-VIEW-PLAC)

### Mutation + RLS + drawer + audit + resend scaffolds (Task 2)
- `tests/admin-suspend.test.ts` — 5 it.todo (ADMIN-MUT-SUS, ADMIN-MUT-REA)
- `tests/admin-notes.test.ts` — 4 it.todo (ADMIN-MUT-NOTE)
- `tests/admin-rls-not-widened.test.ts` — 4 it.todo (ADMIN-RLS-NEG-1..2) **CRITICAL**
- `tests/admin-drawer-shape.test.ts` — 4 it.todo (ADMIN-DRAWER)
- `tests/admin-audit.test.ts` — 3 it.todo (ADMIN-AUDIT)
- `tests/admin-resend-cache.test.ts` — 3 it.todo (ADMIN-VIEW-RESEND)

### Manual UAT (Task 2)
- `tests/admin-bootstrap-UAT.md` — Studio SQL one-shot admin role assignment + sign-in/out steps + run-record sign-off block (ADMIN-BOOTSTRAP-1)

## Decisions Made

- **Bare-minimum scaffold imports:** Each file imports only `describe, it` from vitest. The plan's `<interfaces>` block shows fuller mock patterns (vi.mock for `@/lib/supabase` + `@/hooks/useAuth`), but those are needed only when test bodies fill in later waves. Adding them now would introduce unused-import warnings without serving Wave 0's parse-clean goal.
- **Verify command uses `--run`:** The plan's documented verify command (`pnpm test -- tests/admin-...`) defaults to vitest watch mode (since `package.json` `"test": "vitest"`). Used `pnpm test -- --run tests/admin-...` to force run-once execution for the verify step. This is a verify-tooling adjustment, not a test-content change — no deviation from plan content.

## Deviations from Plan

None — plan executed exactly as written. Both tasks created the exact file bodies specified in the plan's `<action>` blocks. The only minor adjustment was using `--run` flag in the verify command (rationale above) — file content is byte-identical to plan spec.

## Issues Encountered

- **vitest default watch mode:** First instinct was to run the plan's verify command verbatim, which would have hung in watch mode with no output. Recognized this from `package.json` (`"test": "vitest"`) and added `--run` flag immediately. No time lost.

## User Setup Required

None — Wave 0 is pure test-file scaffolding. No external services touched. The ADMIN-BOOTSTRAP-1 manual UAT (Studio SQL admin role assignment) is documented in `tests/admin-bootstrap-UAT.md` for execution AFTER Plan 20-04 (route registration) lands; not required for any subsequent Wave to proceed with implementation.

## Next Phase Readiness

- **Plan 20-02** (RPC implementation) can begin: every backend test ID has a target file (admin-rpc-gate, admin-rpc-shapes, admin-rls-not-widened, admin-suspend, admin-notes, admin-drawer-shape, admin-audit, admin-resend-cache, admin-daily-briefing, admin-employer-list, admin-seeker-list, admin-jobs-list, admin-placement-list)
- **Plan 20-03** (UI pages) can begin: frontend gate test target (admin-protected-route.test.tsx) exists and can be filled when ProtectedRoute requiredRole union extension lands
- **Plan 20-04** (route wiring + Studio SQL) terminates with the manual ADMIN-BOOTSTRAP-1 UAT recorded in tests/admin-bootstrap-UAT.md

**No blockers.** All 22 VALIDATION.md test IDs have a parse-clean home for their bodies in subsequent waves.

## Self-Check: PASSED

Verification:
- `tests/admin-protected-route.test.tsx` — FOUND
- `tests/admin-rpc-gate.test.ts` — FOUND
- `tests/admin-rpc-shapes.test.ts` — FOUND
- `tests/admin-daily-briefing.test.ts` — FOUND
- `tests/admin-employer-list.test.ts` — FOUND
- `tests/admin-seeker-list.test.ts` — FOUND
- `tests/admin-jobs-list.test.ts` — FOUND
- `tests/admin-placement-list.test.ts` — FOUND
- `tests/admin-suspend.test.ts` — FOUND
- `tests/admin-notes.test.ts` — FOUND
- `tests/admin-rls-not-widened.test.ts` — FOUND
- `tests/admin-drawer-shape.test.ts` — FOUND
- `tests/admin-audit.test.ts` — FOUND
- `tests/admin-resend-cache.test.ts` — FOUND
- `tests/admin-bootstrap-UAT.md` — FOUND
- Commit `8296aee` (Task 1) — FOUND
- Commit `45381f6` (Task 2) — FOUND
- Plan-level success criteria #1 (15 files): VERIFIED via `find tests -name 'admin-*.test.*' -o -name 'admin-*-UAT.md' | wc -l` → 15
- Plan-level success criteria #2 (`pnpm test -- --run tests/admin-` exits 0): VERIFIED — output shows "Test Files 11 passed | 21 skipped" with 163 todos and 0 failures
- Plan-level success criteria #3 (≥22 unique IDs): VERIFIED — `grep | sort -u | wc -l` returned 22

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*
