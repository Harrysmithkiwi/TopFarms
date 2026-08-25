---
phase: 20-super-admin-dashboard
plan: 06
subsystem: ui
tags: [react, vite, supabase, vitest, rtl, admin, security-definer-rpc]

# Dependency graph
requires:
  - phase: 20-04
    provides: AdminLayout + AdminSidebar + ProtectedRoute admin role + DailyBriefing placeholder + 5 admin route registrations in main.tsx
  - phase: 20-05
    provides: AdminTable + ProfileDrawer + AdminNotesField composition primitives + 11 shape-contract tests
  - phase: 20-02
    provides: migration 023 admin RPCs (admin_get_daily_briefing, admin_get_system_alerts, admin_list_employers, admin_list_seekers, admin_get_user_profile, admin_get_user_audit, admin_set_user_active, admin_add_note)
provides:
  - DailyBriefing.tsx full implementation (StatsStrip + System Alerts + Email Delivery + Revenue cards)
  - EmployerList.tsx searchable paginated employers table with tier Tag mapping + drawer integration
  - SeekerList.tsx searchable paginated seekers table with onboarding/scores Tag mapping + drawer integration
  - main.tsx routes /admin/employers and /admin/seekers wired to real components
  - ResendIndicator with fresh/stale/unavailable branches + literal MAIL-02 honest-copy
  - 4 shape-contract tests filled (admin-daily-briefing, admin-employer-list, admin-seeker-list, admin-resend-cache)
  - 1 RTL render test asserting honest-copy literal string for unavailable Resend cache state
affects: [20-07, 20-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted for vi.mock factories that close over const"
    - "Composition-only admin pages: page = AdminTable + ProfileDrawer + Tag, no architectural decisions"
    - "Honest-copy proof pattern: RTL render-test asserts literal copy string under failure-mode mock"

key-files:
  created:
    - src/pages/admin/EmployerList.tsx
    - src/pages/admin/SeekerList.tsx
    - tests/admin-daily-briefing-render.test.tsx
  modified:
    - src/pages/admin/DailyBriefing.tsx
    - src/main.tsx
    - tests/admin-daily-briefing.test.ts
    - tests/admin-employer-list.test.ts
    - tests/admin-seeker-list.test.ts
    - tests/admin-resend-cache.test.ts

key-decisions:
  - "ResendIndicator branches structurally on { unavailable | stale | fresh } so the literal MAIL-02 honest-copy string surfaces as the explicit unavailable branch — not a fall-through default — making the RTL render-test assertion load-bearing rather than coincidental"
  - "EmployerList + SeekerList hold drawer state (drawerUserId + drawerActive) at the page level so it survives row re-renders and reflects the freshest is_active boolean from the row that opened the drawer"
  - "main.tsx imports added cleanly above existing AdminLayout/DailyBriefing imports so plan 20-07 can extend with JobsManagement + PlacementPipeline imports without import-block churn"
  - "Trimmed JSDoc reference to the literal Delivery-data-unavailable string so grep returns exactly 1 occurrence in production (acceptance criterion compliance) — JSDoc paraphrases the copy to keep the file self-explanatory"

patterns-established:
  - "vi.hoisted for RTL tests that statically import the component under test: const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() })); vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))"
  - "Drawer-from-list-page pattern: page-level useState for { drawerUserId, drawerActive } passed to <ProfileDrawer initialActive={...} onActiveChanged={...} onClose={...}/>; row click setDrawerUserId; backdrop click setDrawerUserId(null)"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-05-04
---

# Phase 20 Plan 06: List-View Pages Summary

**DailyBriefing replaced with full StatsStrip + System Alerts + Email Delivery + Revenue layout, EmployerList + SeekerList composed from AdminTable + ProfileDrawer + Tag with locked UI-SPEC copy, and a render-level RTL test that empirically proves the MAIL-02 honest-copy string surfaces when Resend cache is unavailable.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-04T22:05:12Z
- **Completed:** 2026-05-04T22:11:00Z
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- Three admin pages now real (DailyBriefing, EmployerList, SeekerList) — not placeholders. All compose from Wave 4 primitives (AdminTable, ProfileDrawer) per Pattern 5 in 20-RESEARCH.md.
- ResendIndicator handles all three cache shapes (fresh / stale / unavailable). The unavailable branch renders the literal MAIL-02 honest-copy string `Delivery data unavailable. Check Resend dashboard.` — the visible side of the v2.0 Phase 15 carryforward.
- Five test files green: admin-daily-briefing (3), admin-employer-list (3), admin-seeker-list (3), admin-resend-cache (3), admin-daily-briefing-render (1 RTL render test). Total: 13 new admin assertions replacing 12 it.todo stubs from plan 20-01 + 1 net-new RTL render test.
- main.tsx route table updated: /admin/employers and /admin/seekers now point at real components (no longer DailyBriefing placeholders); /admin/jobs and /admin/placements remain placeholders for plan 20-07 to swap.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build DailyBriefing.tsx with StatsStrip + System Alerts + Resend + Revenue** - `d7b7f0d` (feat)
2. **Task 2: Build EmployerList.tsx + SeekerList.tsx + wire main.tsx** - `ac22cc2` (feat)

**Plan metadata:** [pending] (docs: complete plan 20-06)

## Files Created/Modified

- `src/pages/admin/DailyBriefing.tsx` — replaced 14-line placeholder with 279-line full implementation: StatsStrip (4 yesterday counts), System Alerts card (compact webhook failures table, 5-row cap), Email Delivery card (ResendIndicator), Revenue card. Calls admin_get_daily_briefing + admin_get_system_alerts in parallel via Promise.all on mount.
- `src/pages/admin/EmployerList.tsx` — 133 lines. Composes <AdminTable rpc="admin_list_employers"> with verification-tier Tag (unverified/email/nzbn/featured → grey/blue/green/warn) + active vs suspended Tag + click-row-opens <ProfileDrawer/>. Exact UI-SPEC copy.
- `src/pages/admin/SeekerList.tsx` — 127 lines. Composes <AdminTable rpc="admin_list_seekers"> with onboarding Tag (Complete vs "Step N of 7") + match-scores Tag (Ready vs Pending) + region + drawer integration.
- `src/main.tsx` — 2 imports added (EmployerList, SeekerList); 2 route element swaps from <DailyBriefing/> placeholder to real components.
- `tests/admin-daily-briefing.test.ts` — 3 it.todo stubs replaced with shape-contract assertions on admin_get_daily_briefing payload (counts + revenue_snapshot subkeys + non-negative integers).
- `tests/admin-employer-list.test.ts` — 3 it.todo stubs replaced with shape-contract assertions on admin_list_employers (paginated rows + total + search arg pass-through + locked verification_tier enum).
- `tests/admin-seeker-list.test.ts` — 3 it.todo stubs replaced with shape-contract assertions on admin_list_seekers (paginated rows + 9-key shape + search pass-through + onboarding_step in [1,7]).
- `tests/admin-resend-cache.test.ts` — 3 it.todo stubs replaced with shape-contract assertions on resend_stats discriminant (fresh / stale / unavailable shapes).
- `tests/admin-daily-briefing-render.test.tsx` — NEW. RTL render test that mounts <DailyBriefing/> with admin_get_daily_briefing mocked to return resend_stats={unavailable: true} and asserts the literal copy `Delivery data unavailable. Check Resend dashboard.` appears in the DOM via screen.getByText. ADMIN-VIEW-RESEND honest-copy proof + MAIL-02 carryforward motivation.

## Decisions Made

- **vi.hoisted for the render test's mock factory.** The first attempt at admin-daily-briefing-render.test.tsx used the conventional `const rpcMock = vi.fn(); vi.mock('@/lib/supabase', ...)` pattern that the shape-contract tests use. That pattern works for shape tests because they call `await import('@/lib/supabase')` lazily — the static `import { DailyBriefing } from '@/pages/admin/DailyBriefing'` at the top of the render test triggers the supabase mock factory before `rpcMock` is initialized (vi.mock is hoisted above all const declarations). Switched to `const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))` which is the documented pattern for this case. Auto-fix Rule 1 (Bug) — fixed inline before commit.
- **Honest-copy literal appears exactly once in production.** Initial DailyBriefing.tsx had the literal string in both a JSDoc reference and the rendered JSX (2 occurrences). Plan acceptance criterion specifies grep returns exactly 1. Trimmed the JSDoc to paraphrase ("renders the honest 'Delivery data unavailable' copy below") so the literal string lives only in the JSX. The render test still asserts the full string from the production component — no test fragility.
- **Page-level drawer state.** EmployerList + SeekerList hold `{drawerUserId, drawerActive}` at the page component level rather than threading through context. Reasoning: the drawer reads is_active from the row that opened it (initialActive prop) and dispatches onActiveChanged so the page can refresh that row's tag without refetching the whole table. Page-level state keeps this contract local + testable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted for static-import RTL test**
- **Found during:** Task 1 (initial run of tests/admin-daily-briefing-render.test.tsx)
- **Issue:** vi.mock is hoisted above all top-level statements, including the const that holds the rpcMock instance the factory closes over → ReferenceError: Cannot access 'rpcMock' before initialization. The shape-contract tests don't hit this because they import supabase via `await import()` lazily; the render test imports DailyBriefing statically, which transitively pulls supabase before the const exists.
- **Fix:** Replace `const rpcMock = vi.fn()` with `const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))`. vi.hoisted gives the factory a reference that's lifted to the same hoist position as vi.mock.
- **Files modified:** tests/admin-daily-briefing-render.test.tsx
- **Verification:** test re-ran — 1 passed (expected), no TDZ error. Total suite: 21 passed, 12 skipped (preserved).
- **Committed in:** d7b7f0d (Task 1 commit, fixed before initial commit landed)

**2. [Rule 1 - Spec compliance] Trimmed JSDoc to keep honest-copy literal at grep-count = 1**
- **Found during:** Task 2 (post-Task-2 plan-success-criteria check)
- **Issue:** Plan success criterion 4 specifies `grep -c "Delivery data unavailable. Check Resend dashboard." src/pages/admin/DailyBriefing.tsx returns 1`. Initial DailyBriefing.tsx had the literal in both the JSX render AND the ResendIndicator JSDoc reference (count = 2).
- **Fix:** Paraphrased the JSDoc reference to "renders the honest 'Delivery data unavailable' copy below" — keeps the JSDoc explanatory but stops the grep from double-counting. The rendered JSX still carries the full literal that the render test asserts.
- **Files modified:** src/pages/admin/DailyBriefing.tsx
- **Verification:** `grep -c "Delivery data unavailable. Check Resend dashboard." src/pages/admin/DailyBriefing.tsx` returns 1; render test still passes.
- **Committed in:** ac22cc2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs / spec compliance, 0 missing critical, 0 blocking, 0 architectural)
**Impact on plan:** Both auto-fixes were small, in-scope adjustments to honour test/spec contracts. No scope creep.

## Issues Encountered

- One vi.mock hoisting issue (above) — diagnosed and fixed in one iteration.
- PostToolUse hook flagged Next.js `"use client"` directives on Vite SPA components 4 times. False positives — this project is a Vite SPA (createBrowserRouter from react-router), not Next.js App Router; the `pages/` directory naming is conventional, not Next.js Pages Router. Acknowledged and ignored per CLAUDE.md §3 (Diagnose before fix — confirmed via main.tsx that there is no Next.js boundary).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 20-07 (next):** JobsManagement.tsx + PlacementPipeline.tsx + main.tsx wiring for /admin/jobs and /admin/placements. main.tsx imports were added in this plan with isolated, well-spaced changes — 20-07 can append two more imports below `import { SeekerList }` and swap the two remaining placeholder routes without churn.
- **Plan 20-08 (after that):** End-to-end UAT including ADMIN-BOOTSTRAP-1 (one-shot Studio SQL + sign-out/sign-in role refresh) and live Resend cache verification (the empirical other half of ADMIN-VIEW-RESEND beyond shape-contract).
- **MAIL-02 carryforward visible:** the literal `Delivery data unavailable. Check Resend dashboard.` is now empirically proven to render via the render test. When plan 20-08 captures the live Resend cache → fresh-state path, ADMIN-VIEW-RESEND closes both halves.

## Self-Check: PASSED

Verified existence of all created files and commits:

```
FOUND: src/pages/admin/EmployerList.tsx
FOUND: src/pages/admin/SeekerList.tsx
FOUND: tests/admin-daily-briefing-render.test.tsx
FOUND: src/pages/admin/DailyBriefing.tsx (modified, 279 lines)
FOUND: src/main.tsx (modified, 2 imports + 2 route swaps)
FOUND: tests/admin-daily-briefing.test.ts (modified, 0 it.todo)
FOUND: tests/admin-employer-list.test.ts (modified, 0 it.todo)
FOUND: tests/admin-seeker-list.test.ts (modified, 0 it.todo)
FOUND: tests/admin-resend-cache.test.ts (modified, 0 it.todo)
FOUND: commit d7b7f0d (Task 1)
FOUND: commit ac22cc2 (Task 2)
```

All 5 plan-level success criteria empirically verified:
1. `pnpm test -- tests/admin-daily-briefing.test.ts tests/admin-employer-list.test.ts tests/admin-seeker-list.test.ts tests/admin-resend-cache.test.ts tests/admin-daily-briefing-render.test.tsx` → 21 passed, 12 skipped (other admin tests still it.todo, expected)
2. `pnpm tsc --noEmit` → exit 0
3. `grep -cE "<EmployerList />|<SeekerList />" src/main.tsx` → 2
4. `grep -c "Delivery data unavailable. Check Resend dashboard." src/pages/admin/DailyBriefing.tsx` → 1
5. `grep -c "Delivery data unavailable. Check Resend dashboard." tests/admin-daily-briefing-render.test.tsx` → 2; `grep -c "unavailable: true" tests/admin-daily-briefing-render.test.tsx` → 2

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*
