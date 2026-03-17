---
phase: 03-seeker-demand-side
plan: "00"
subsystem: testing
tags: [vitest, testing-library, jsdom, react, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: vite.config.ts with @ path alias and TypeScript config
provides:
  - vitest test infrastructure with jsdom environment
  - 5 stub test files covering 73 todo tests across all Phase 3 requirements
  - Automated test command: npx vitest run --reporter=dot
affects:
  - 03-seeker-demand-side (all subsequent plans — executors fill in assertions)

# Tech tracking
tech-stack:
  added:
    - "@testing-library/user-event ^14"
    - "jsdom"
    - "@testing-library/jest-dom"
  patterns:
    - "vitest mergeConfig pattern — inherits vite.config.ts resolve.alias for @ imports"
    - "it.todo() stubs define test contract; executors fill in assertions"
    - "tests/setup.ts with cleanup afterEach for testing-library"

key-files:
  created:
    - vitest.config.ts
    - tests/setup.ts
    - tests/seeker-onboarding.test.tsx
    - tests/job-search.test.tsx
    - tests/applications.test.ts
    - tests/pipeline-transitions.test.ts
    - tests/seeker-profile.test.ts
  modified:
    - .planning/phases/03-seeker-demand-side/03-VALIDATION.md

key-decisions:
  - "vitest mergeConfig(viteConfig) pattern used so @ alias from vite.config.ts is inherited automatically — no duplicate path alias config"
  - "CSS disabled in test environment (css: false) to avoid Tailwind v4 parsing overhead"
  - "@testing-library/jest-dom installed for toBeInTheDocument() and other DOM matchers"

patterns-established:
  - "Wave 0 runs before all feature plans — establishes test contract via it.todo() stubs"
  - "Each test describe block maps to a requirement ID (SONB-01, SRCH-01, APPL-01, etc.)"
  - "pipeline-transitions.test.ts is the only stub with expect imported — state machine logic is immediately testable once domain types exist"

requirements-completed: [SONB-01, SRCH-01, APPL-01, APPL-05, SONB-07]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 3 Plan 00: Vitest Test Infrastructure Summary

**vitest 3 with jsdom + 5 stub test files (73 todos) covering all Phase 3 requirements across SONB, SRCH, and APPL domains**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-16T11:15:00Z
- **Completed:** 2026-03-16T11:18:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Configured vitest with jsdom environment, merging vite.config.ts to inherit @ path alias
- Installed @testing-library/user-event, jsdom, and @testing-library/jest-dom
- Created 5 stub test files covering 73 todo tests: SONB-01–08, SRCH-01–11, APPL-01–06, APPL-05 state machine, SONB-07 profile CRUD
- All tests run in 1.25s with 0 failures; Wave 0 requirements checked off in 03-VALIDATION.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Vitest config + setup + install missing deps** - `a91eb99` (chore)
2. **Task 2: Create all 5 stub test files** - `8ee8eb9` (test)

## Files Created/Modified

- `vitest.config.ts` — mergeConfig(viteConfig) with jsdom environment, globals, css: false
- `tests/setup.ts` — jest-dom matchers import + cleanup afterEach
- `tests/seeker-onboarding.test.tsx` — SONB-01 through SONB-08 (22 todos)
- `tests/job-search.test.tsx` — SRCH-01 through SRCH-11 + URL sync (17 todos)
- `tests/applications.test.ts` — APPL-01 through APPL-06 (13 todos)
- `tests/pipeline-transitions.test.ts` — APPL-05 state machine (11 todos)
- `tests/seeker-profile.test.ts` — SONB-07 profile CRUD (10 todos)
- `.planning/phases/03-seeker-demand-side/03-VALIDATION.md` — wave_0_complete: true, all Wave 0 items checked

## Decisions Made

- Used `mergeConfig(viteConfig)` rather than duplicating the alias configuration — ensures @ path always stays in sync with vite.config.ts
- CSS parsing disabled (`css: false`) to prevent Tailwind v4 plugin from running in test environment
- @testing-library/jest-dom included for full DOM matcher support (toBeInTheDocument, toHaveTextContent, etc.)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete — all subsequent Phase 3 plans can reference test files in their verify blocks
- Executors for plans 01–06 fill in assertions as features are implemented
- `npx vitest run --reporter=dot` is the standard after-task verification command for all Phase 3 plans

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*

## Self-Check: PASSED

All 7 output files exist and both task commits verified on disk.
