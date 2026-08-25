---
phase: 20-super-admin-dashboard
plan: 07
subsystem: ui
tags: [react, vite, supabase, admin, AdminTable, ProfileDrawer, stripe]

# Dependency graph
requires:
  - phase: 20-04
    provides: AdminLayout + ProtectedRoute admin gate + 5 placeholder routes
  - phase: 20-05
    provides: AdminTable + ProfileDrawer composition contract; pagination prop names
  - phase: 20-06
    provides: Canonical EmployerList drawer-wiring pattern; page-level drawer state convention
provides:
  - JobsManagement page composing admin_list_jobs RPC with status/applicant/days-live columns
  - ProfileDrawer wired on JobsManagement (CONTEXT.md MVP scope item 6 — drawer on view 4)
  - PlacementPipeline page with overdue Tag (>14d) + hire confirmation Tag + Stripe click-through
  - Stripe URL no-prefix pattern (RESEARCH.md Pitfall 6) — works in both test and live without coupling
  - Real-bodied admin-jobs-list and admin-placement-list shape-contract tests
affects: [20-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JobsManagement drill-down — clicking job row opens ProfileDrawer for the job's employer (drawer-on-view-4 pattern, initialActive=true safe default)"
    - "PlacementPipeline read-only pattern — no drawer (placements are not people); Stripe click-through replaces profile drill-down"
    - "Stripe URL no-prefix builder — invoice link preferred, customer fallback; relies on dashboard's last-active mode"

key-files:
  created:
    - src/pages/admin/JobsManagement.tsx
    - src/pages/admin/PlacementPipeline.tsx
  modified:
    - src/main.tsx
    - tests/admin-jobs-list.test.ts
    - tests/admin-placement-list.test.ts

key-decisions:
  - "Phase 20-07: JobsManagement drawer wiring uses initialActive={true} as safe default — JobRow has no employer is_active flag and ProfileDrawer refetches via admin_get_user_profile on mount. CONTEXT.md MVP scope item 6 honored (drawer on rows in views 2/3/4)."
  - "Phase 20-07: PlacementPipeline does NOT wire ProfileDrawer — placements are not people. Stripe click-through replaces the profile drill-down for view 5 (read-only fee pipeline)."
  - "Phase 20-07: Stripe URLs use no-prefix form per RESEARCH.md Pitfall 6 — Stripe routes test/live based on the dashboard's last-active mode, avoiding the Phase 18 carryforward #13 trap of hard-coding test-mode paths that would 404 in live."
  - "Phase 20-07: Phase-wide admin test coverage is now 11 of 14 admin test files with real bodies. The 3 still-todo files (admin-rpc-gate, admin-rpc-shapes, admin-rls-not-widened) are integration tests requiring live Supabase + admin role; per plan 20-05 decision, deferred to plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1). Plan 20-07's 'ALL 14 admin tests have real bodies' note was inaccurate — corrected here for traceability."

patterns-established:
  - "Pattern: List view with drawer-on-row (employer-behind-job) — JobsManagement composes AdminTable + ProfileDrawer where row.employer_id is the drawer target rather than row.id"
  - "Pattern: List view without drawer (read-only pipeline) — PlacementPipeline composes AdminTable only; click-through to external dashboard replaces profile drill-down"
  - "Pattern: External dashboard URL builder — invoice-preferred, customer-fallback, no environment-mode prefix"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-05-04
---

# Phase 20 Plan 07: Jobs + Placement Pipeline Summary

**JobsManagement and PlacementPipeline admin pages composed from AdminTable + (optional) ProfileDrawer, completing all 5 admin routes in main.tsx with no remaining DailyBriefing placeholders.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-04T22:14:49Z
- **Completed:** 2026-05-04T22:19:06Z
- **Tasks:** 2
- **Files created:** 2 (JobsManagement.tsx, PlacementPipeline.tsx)
- **Files modified:** 3 (main.tsx, admin-jobs-list.test.ts, admin-placement-list.test.ts)

## Accomplishments

- **JobsManagement page (view 4):** Searchable jobs list composing AdminTable<JobRow> against `admin_list_jobs` RPC with status Tag (active/filled/expired/archived variants), applicant count, employer name, days live, and last applicant date. Wires `onRowClick → setDrawerUserId(row.employer_id)` so clicking a job opens ProfileDrawer for the employer behind that job (CONTEXT.md MVP scope item 6 — drawer on rows in views 2/3/4).
- **PlacementPipeline page (view 5):** Read-only fee pipeline composing AdminTable<PlacementRow> against `admin_list_placements` RPC (no search — RPC takes only p_limit + p_offset). Overdue Tag (warn variant) at >14 days since ack, Hired vs Pending Tag, and Stripe click-through anchor with `target="_blank" rel="noopener noreferrer"`. ProfileDrawer NOT wired — placements are not people.
- **Stripe URL pattern locked:** `stripeUrl()` helper builds no-prefix URLs (`https://dashboard.stripe.com/{invoices,customers}/<id>`). Prefers invoice link when available; falls back to customer page. Avoids Phase 18 carryforward #13's hard-coded test-mode trap.
- **main.tsx wiring complete:** All 5 admin routes (`/admin`, `/admin/employers`, `/admin/seekers`, `/admin/jobs`, `/admin/placements`) now point to their real components — exactly 1 occurrence of each component reference, 5 distinct components.
- **Real-bodied shape-contract tests:** ADMIN-VIEW-JOBS green (3 assertions: row shape, search arg pass-through, total count semantics); ADMIN-VIEW-PLAC green (3 assertions: shape with confirmed_at NULL, >14d → is_overdue=true, stripe_customer_id + stripe_invoice_id columns present).

## Task Commits

Each task was committed atomically:

1. **Task 1: JobsManagement.tsx + ProfileDrawer wiring + main.tsx /admin/jobs route + admin-jobs-list test** — `aab57e1` (feat)
2. **Task 2: PlacementPipeline.tsx + main.tsx /admin/placements route + admin-placement-list test** — `1863507` (feat)

## Files Created/Modified

- **Created:** `src/pages/admin/JobsManagement.tsx` (137 lines) — searchable jobs list with employer-behind-job drawer wiring; STATUS_VARIANT map for active/filled/expired/archived Tag rendering; initialActive={true} safe default since JobRow has no employer is_active flag
- **Created:** `src/pages/admin/PlacementPipeline.tsx` (151 lines) — read-only placement pipeline with overdue Tag at >14d, Hired/Pending Tag, Stripe click-through; stripeUrl() helper with no-prefix invoice-preferred customer-fallback pattern
- **Modified:** `src/main.tsx` — appended 2 imports (JobsManagement, PlacementPipeline), swapped 2 route elements from `<DailyBriefing />` placeholder to real components. Per-component verification: 5 distinct refs in main.tsx (DailyBriefing × 1, EmployerList × 1, SeekerList × 1, JobsManagement × 1, PlacementPipeline × 1)
- **Modified:** `tests/admin-jobs-list.test.ts` — replaced 3 it.todo stubs with real shape-contract assertions; ADMIN-VIEW-JOBS now green
- **Modified:** `tests/admin-placement-list.test.ts` — replaced 3 it.todo stubs with real shape-contract assertions; ADMIN-VIEW-PLAC now green

## Verification

- **`pnpm test -- tests/admin-jobs-list.test.ts tests/admin-placement-list.test.ts --run`:** 6 tests pass (3 + 3)
- **`pnpm tsc --noEmit`:** exit 0 (no type errors)
- **All 5 admin routes in main.tsx:** exactly 1 occurrence of each of DailyBriefing, EmployerList, SeekerList, JobsManagement, PlacementPipeline (verified with `grep -oE | sort -u | wc -l = 5`)
- **JobsManagement drawer wiring verified:** `<ProfileDrawer ` × 1, `onRowClick=` × 1, `row.employer_id` × 2 (passed to setDrawerUserId from onRowClick callback), `drawerUserId` × 2 (state declaration + setter usage)
- **PlacementPipeline drawer absence verified:** `grep -c 'ProfileDrawer' src/pages/admin/PlacementPipeline.tsx` returns 0
- **Stripe URL hygiene:** `grep -c '/test/' src/pages/admin/PlacementPipeline.tsx` returns 0 after Rule 3 docstring cleanup (see Deviations below)

## Decisions Made

- **JobsManagement drawer initialActive default:** Set to `true` because JobRow does not include the employer's is_active flag. ProfileDrawer's first toggle interaction reflects the actual state via admin_get_user_profile refetch on mount. Per CONTEXT.md MVP scope item 6 the drawer on view 4 is a "light" inspector, not a primary mutation surface — the visual flicker on first toggle is acceptable.
- **No onActiveChanged callback on JobsManagement drawer:** Unlike EmployerList/SeekerList, JobsManagement does not display the employer's is_active state in the table, so there's nothing to refresh after toggle. Keeping the callback omitted matches "drawer-light" intent.
- **PlacementPipeline searchable=false:** Matches the live RPC signature in migration 023 (admin_list_placements takes only p_limit + p_offset; no p_search). Adding a search input would create a dead UI affordance.
- **e.stopPropagation on Stripe anchor onClick:** Defensive — there's no row-level handler in PlacementPipeline today, but matches the composition consistency expected if a drawer were ever wired in a future Phase 21 iteration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PlacementPipeline.tsx docstring contained literal "/test/" strings**
- **Found during:** Task 2 acceptance criteria check
- **Issue:** The `stripeUrl()` docstring originally cited "/test/ prefix per RESEARCH.md Pitfall 6" twice in prose to explain the no-prefix rationale. The plan's acceptance criterion `grep -c "/test/" src/pages/admin/PlacementPipeline.tsx returns 0` was meant to catch hard-coded test URLs; the literal docstring matches were a false-positive but still violated the as-written criterion.
- **Fix:** Rewrote the docstring to use "no mode prefix" instead of "no /test/ prefix" — preserves the rationale link to RESEARCH.md Pitfall 6 and Phase 18 carryforward #13 without using the literal substring. Actual Stripe URL strings (lines 32 and 35) were already correct (no `/test/`).
- **Files modified:** src/pages/admin/PlacementPipeline.tsx (docstring lines 18, 23 only)
- **Verification:** `grep -c '/test/' src/pages/admin/PlacementPipeline.tsx` returns 0; `grep -n 'dashboard.stripe.com' ...` confirms only 3 lines (1 docstring example + 2 real URLs), all clean
- **Committed in:** 1863507 (Task 2 commit; pre-commit edit before stage+commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — acceptance-criterion grep collision)
**Impact on plan:** Pure cosmetic adjustment to docstring wording. No code behavior change. Rationale and reference link to RESEARCH.md Pitfall 6 preserved.

## Issues Encountered

- **Plan's phase-wide assertion "ALL 14 admin test files have real bodies" is inaccurate.** After plan 20-07 completes, 11 of 14 admin test files have real bodies; 3 remain as `it.todo`:
  - `tests/admin-rpc-gate.test.ts` — ADMIN-GATE-BE-1..3 (live anon/employer/seeker JWT calls into admin_* RPCs)
  - `tests/admin-rpc-shapes.test.ts` — ADMIN-GATE-BE-4 (live admin JWT call)
  - `tests/admin-rls-not-widened.test.ts` — ADMIN-RLS-NEG-1, ADMIN-RLS-NEG-2 (live seeker/employer JWT row-count baselines)
  
  These are integration tests that require a live Supabase connection + assigned admin role to execute — exactly the surfaces plan 20-05 decision deferred to **plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1)**. Plan 20-07's success criterion `grep -l "it.todo" tests/admin-*.test.{ts,tsx} 2>/dev/null | wc -l returns 0` is therefore inaccurate as written, but the underlying intent — "all tests that CAN run as shape contracts have real bodies" — is satisfied. Documented here for plan 20-08 to pick up.

## User Setup Required

None — pure frontend composition + test file work.

## Next Phase Readiness

- All 5 admin pages now real (DailyBriefing, EmployerList, SeekerList, JobsManagement, PlacementPipeline). Wave 5 list-views complete.
- Plan 20-08 (next) can proceed with manual UAT scaffold:
  - Studio SQL admin-role bootstrap for Harry's auth.users.id
  - ADMIN-BOOTSTRAP-1 sign-out + sign-in cycle to refresh cached role
  - Live RPC integration test pass for the 3 still-todo admin test files (admin-rpc-gate, admin-rpc-shapes, admin-rls-not-widened)
  - End-to-end smoke check of all 5 admin routes against live data
  - get-resend-stats Edge Function deployment + RESEND_API_KEY secret + 15-min cron schedule (close MAIL-02 visible side; live-data half remains v2.0 carryforward)

## Self-Check: PASSED

- All 2 created files exist on disk (JobsManagement.tsx, PlacementPipeline.tsx)
- Both task commits present in `git log` (aab57e1, 1863507)
- All 3 modified files present (src/main.tsx, tests/admin-jobs-list.test.ts, tests/admin-placement-list.test.ts) — verified via `git status` and final commit
- SUMMARY.md created at `.planning/phases/20-super-admin-dashboard/20-07-SUMMARY.md`

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*
