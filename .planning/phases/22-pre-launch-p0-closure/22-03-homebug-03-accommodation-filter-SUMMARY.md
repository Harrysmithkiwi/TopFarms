---
phase: 22-pre-launch-p0-closure
plan: "03"
subsystem: ui
tags: [react, react-router, supabase, postgrest, filters, lookup-table, search]

# Dependency graph
requires:
  - phase: 22-pre-launch-p0-closure
    provides: "Wave 0 RED spec tests/jobsearch-accommodation-remap.test.ts (commit 7bf7c9a from plan 22-00)"
  - phase: 08-employer-onboarding
    provides: "supabase/migrations/013_phase8_wizard_fields.sql Title Case writer for employer_profiles.accommodation_extras"
provides:
  - "Layer 2 remap from lowercase/snake_case URL params to Title Case DB values for accommodation_extras filter on /jobs"
  - "ACCOMMODATION_FILTER_TO_DB module-level lookup constant (reusable shape for future filter-mismatch fixes)"
  - "22-03-DIAGNOSIS.md — 3-layer evidence document with empirical Management API proof (raw 'couples' → 0 rows; 'Couples welcome' → 1 row)"
affects: [22-04-p0-prod-smoke, post-launch-jobs-search, future-accommodation-type-filter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level Record<string, string> lookup constant + .map(v => LOOKUP[v]).filter(Boolean) before passing to PostgREST .overlaps() — Layer 2 remap pattern for URL-param-to-DB-value drift"
    - "Inner length-check (dbValues.length > 0) after filter — guards against all-undefined-key input scenarios so .overlaps() is never called with an empty array"

key-files:
  created:
    - .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md
  modified:
    - src/pages/jobs/JobSearch.tsx

key-decisions:
  - "house and cottage values intentionally NOT remapped in ACCOMMODATION_FILTER_TO_DB — they map to employer_profiles.accommodation_type (singular text column) not accommodation_extras (array). Out of scope per research §Open Question 1; documented in code comment + diagnosis doc. Future plan can add a separate handler for the TYPE column if needed."
  - "Module-level Record<string, string> chosen over React state — lookup never changes between renders so per-render allocation is wasteful. Mirrors RESEARCH §Don't Hand-Roll table row 3."
  - "Diagnosed via Supabase Management API read-only SELECTs (not browser DevTools Network) — three queries confirm column type (text[]), prod sample values (Title Case), and raw-vs-remapped query result delta (0 rows vs 1 row). Continuation-agent pattern from 21-01/21-02 STATE precedent applied to in-session executor."
  - "Atomic Tasks 1+2 single-commit landing per CLAUDE §4 + plan §verification line 420 — diagnosis doc + code fix logically one Wave 1 unit. Matches Phase 17-01..21-08 atomic-bundle precedent (1c6a0fc, 171d49e, 33a590b, e349655, 7f61a74, 1d68769, 0dcda8a, b4c6b4c, bb4bc82, etc.)."

patterns-established:
  - "Three-layer mismatch diagnosis template: Layer 1 (UI emission) + Layer 2 (handler) + Layer 3 (DB column state) with empirical SQL proof for the failing-shape vs fix-shape delta. Reusable for any future case where URL params drift from DB-stored values."
  - "Lookup-then-filter handler shape: const dbValues = rawValues.map(v => LOOKUP[v]).filter(Boolean) — composes cleanly with the existing `if (length > 0)` guard and the inner branch keeps the .overlaps() call from receiving an empty array if all input values lack a lookup entry."

requirements-completed: [HOMEBUG-03]

# Metrics
duration: 14 min
completed: 2026-05-20
---

# Phase 22 Plan 03: HOMEBUG-03 Accommodation Filter Summary

**Layer 2 remap from lowercase/snake_case URL params to Title Case DB values closes the silent /jobs accommodation filter breaker — ACCOMMODATION_FILTER_TO_DB lookup constant + 3-line handler change in JobSearch.tsx**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-05-20T20:12:00Z (approx)
- **Completed:** 2026-05-20T20:26:13Z
- **Tasks:** 2 (1 diagnosis + 1 code fix)
- **Files modified:** 1 (src/pages/jobs/JobSearch.tsx)
- **Files created:** 1 (22-03-DIAGNOSIS.md)
- **Total LOC delta:** +155 / -1 (atomic commit 231d17b)

## Accomplishments

- Diagnosed Layer 1/2/3 mismatch empirically via Supabase Management API (project ref `inlagtgpynemhipnqvty`, read-only) — confirmed raw `'couples'` returns 0 rows and `'Couples welcome'` returns 1 row, matching the migration 013 + domain.ts Title Case shape
- Added module-level `ACCOMMODATION_FILTER_TO_DB: Record<string, string>` constant with 3 mappings (couples → 'Couples welcome', family → 'Family welcome', pet_friendly → 'Pets allowed')
- Wired the lookup into the fetchJobs accommodation handler: `accommodationTypes.map(v => ACCOMMODATION_FILTER_TO_DB[v]).filter(Boolean)` before `.overlaps()`, with inner length-check guarding against all-undefined-key inputs
- Wave 0 RED spec `tests/jobsearch-accommodation-remap.test.ts` flips 4/4 RED → GREEN
- JOBS-01 regression guard (`tests/saved-search-load-integration.test.tsx`) still passes — fetchJobs useEffect `[searchParams, authLoading]` deps array unchanged
- Zero new TypeScript errors in JobSearch.tsx (grep filter post-`tsc -b`)
- `house` / `cottage` intentionally NOT in lookup — out of scope per research §Open Question 1; documented in code comment + diagnosis doc + this summary

## Task Commits

Both tasks landed in ONE atomic commit per CLAUDE §4 + plan §verification line 420:

1. **Tasks 1+2 (atomic):** Diagnosis + lookup constant + handler remap — `231d17b` (fix)

_Note: Wave 0 RED spec was already committed by sibling plan 22-00 executor at `7bf7c9a` during my Task 1 — not part of plan 22-03's commit scope._

## Files Created/Modified

- `.planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` — 3-layer evidence document (Layer 1 UI emission table from FilterSidebar:43-49, Layer 2 handler source quote with REST request shape, Layer 3 column type + sample values + failing-vs-fix-shape SQL proof from Management API)
- `src/pages/jobs/JobSearch.tsx` — added 20-line module-level `ACCOMMODATION_FILTER_TO_DB` constant with docblock at lines 45-64 (Constants section); replaced 7-line accommodation handler at lines 281-295 (was 273-279 pre-edit) with the remap-then-overlaps shape; existing `!inner` hint at line 215 untouched

## Decisions Made

See `key-decisions` frontmatter above. Brief recap:

1. **`house` / `cottage` out of scope** — singular text column vs array column; future plan owns
2. **Module-level Record<string, string>** — no per-render allocation
3. **Management API diagnostic** — read-only SELECTs, no Studio cycle needed; matches 21-01/21-02 continuation-agent precedent
4. **Atomic 1-commit landing** — Tasks 1+2 logically one Wave 1 unit per plan §verification

## Deviations from Plan

None - plan executed exactly as written.

The plan's `<plan_specific_guidance>` for `house` / `cottage` (out of scope per research §Open Question 1) was honored verbatim. The verification expectation for `.overlaps()` being fed remapped values was met. All 11 acceptance criteria across Tasks 1+2 (7 for Task 1 + at least 9 grep + 3 test/tsc gates for Task 2) PASS.

## Issues Encountered

**1. Wave 0 RED spec timing — sibling executor in parallel (RESOLVED, not a blocker)**

When Task 2 began, the test file `tests/jobsearch-accommodation-remap.test.ts` did not exist on disk and the sibling Wave 0 plan 22-00 had not yet committed. Two options were considered:

- (a) Create the test file inline as a Rule 3 (blocking) deviation, using the spec body from 22-00 PLAN.md verbatim
- (b) Wait for the sibling executor to land Wave 0

Option (a) was selected — the Wave 0 spec body is published canonically in 22-00 PLAN.md `<task 3>` `<action>` block, so creating it during plan 22-03 would have been a faithful execution of the published spec, not a freelance addition.

Before applying option (a), I re-checked disk state and the sibling 22-00 executor had landed the file (commit `7bf7c9a`) during my Task 1 (Diagnosis doc creation). No Rule 3 deviation was needed — the file was tracked, and I proceeded directly to running the RED state spec (4/4 fail confirmed) and then the GREEN fix (4/4 pass confirmed).

**Process improvement:** Parallel Wave 0 (scaffold) + Wave 1 (fix) execution introduces a race window where Wave 1 may start before Wave 0's commit lands. Recoverable in this session via mid-Task-2 re-check; future phases that interleave parallel waves should consider adding an explicit wait/poll gate at the start of each Wave 1 plan, OR sequence Wave 0 → Wave 1 strictly.

**2. Full-suite RED state from sibling Wave 0 specs (NOT my regression)**

`pnpm test --run` reports 3 failures across `tests/featured-listings-tier-type.test.ts` (2) and `tests/signup-toast-persistence.test.tsx` (1). Per SCOPE BOUNDARY in execute-plan.md: these are NOT caused by my changes — they are intentional RED state in sibling Wave 0 specs awaiting their Wave 1 plans (22-02 + 22-01) to flip them GREEN. Confirmed by:
- Plan-scoped test (`tests/jobsearch-accommodation-remap.test.ts`) 4/4 PASS
- Sibling regression guard (`tests/saved-search-load-integration.test.tsx`) 3/3 PASS
- The 2 RED files target FeaturedListings.tsx + SignUp.tsx — files I never touched in this plan

Out of scope; deferred to plans 22-01 + 22-02 (parallel Wave 1 siblings).

**3. Vercel-plugin posttooluse hook noise — Next.js + shadcn + react-best-practices recommendations (dismissed)**

12 RECOMMENDED + 14 SUGGESTION validation messages claiming `searchParams` is async in Next.js 16 + components need `"use client"` directive. ALL false positives — TopFarms is **Vite + React Router v7 SPA** on Supabase (verified via `package.json` no-Next-dep + `src/main.tsx` `createBrowserRouter`), NOT Next.js. `useSearchParams` here is the synchronous react-router hook returning `[URLSearchParams, SetURLSearchParams]`. `"use client"` is inert in Vite. shadcn skill not applicable — `src/components/ui/` contains hand-rolled primitives, no `components.json` generator config.

Dismissed as no-deviation event matching established STATE.md precedent across Phase 17-02/03/04 + 18.1-02/03 + 20.1-02 + 21-00..08. For future executors who see the same hook output on `src/pages/**` or `src/components/ui/**` reads/edits: do not run Skill(nextjs) / Skill(shadcn) — they would produce changes incompatible with the SPA architecture.

## User Setup Required

None - no external service configuration required. Fix is purely code-side. Wave 2 plan 22-04 Step 3 UAT verifies the deployed prod frontend returns 200 (not 400 / empty) against `/jobs?accommodation_type=couples&accommodation_type=pet_friendly` — operator-driven post-deploy check.

## Next Phase Readiness

- Plan 22-03 ready for verification — `/gsd:verify-work 22` may run after all Wave 1 plans (22-01 + 22-02 + 22-03) ship
- Wave 2 (plan 22-04 prod smoke battery) blocked on all 3 Wave 1 fixes + push to main + Vercel deployment confirmation
- Per CLAUDE §7 partial-close discipline: HOMEBUG-03 stays `[ ]` in REQUIREMENTS.md until plan 22-04 Step 3 UAT empirically confirms the deployed prod frontend returns 200 against the accommodation filter URL. Marking `[x]` here would only close the app-layer gap; the empirical-proof gap remains. Plan 22-04 owns the carryforward closure.

## Self-Check: PASSED

- `[ -f .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md ]` → FOUND
- `[ -f src/pages/jobs/JobSearch.tsx ]` → FOUND
- `git log --oneline --all | grep 231d17b` → FOUND
- `pnpm test tests/jobsearch-accommodation-remap.test.ts --run` → 4/4 PASS
- `pnpm test tests/saved-search-load-integration.test.tsx --run` → 3/3 PASS (JOBS-01 guard intact)
- `grep -cE "ACCOMMODATION_FILTER_TO_DB" src/pages/jobs/JobSearch.tsx` → 3 (≥2 ✓)
- `grep -cE "\.overlaps\('employer_profiles\.accommodation_extras', accommodationTypes\)" src/pages/jobs/JobSearch.tsx` → 0 (pre-fix shape gone ✓)
- `grep -cE "\.overlaps\('employer_profiles\.accommodation_extras', dbValues\)" src/pages/jobs/JobSearch.tsx` → 1 (post-fix shape present ✓)

---
*Phase: 22-pre-launch-p0-closure*
*Plan: 03*
*Completed: 2026-05-20*
