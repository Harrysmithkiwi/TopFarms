---
phase: 20-super-admin-dashboard
plan: 04
subsystem: ui
tags: [react-router, react, vite, lucide-react, vitest, protected-route, layout]

# Dependency graph
requires:
  - phase: 20-01
    provides: VALIDATION test scaffold (it.todo stubs in tests/admin-protected-route.test.tsx)
  - phase: 20-02
    provides: SECURITY DEFINER admin RPC layer (migration 023) — server-side gate, frontend chrome-only
provides:
  - ProtectedRoute requiredRole union widened to include 'admin' (one-line type extension)
  - AdminSidebar component (240px wide rail, 5 nav items + back-to-app escape)
  - AdminLayout shell (omits top Nav per UI-SPEC, single-sidebar Stripe/Linear pattern)
  - DailyBriefing.tsx placeholder (full implementation lands in plan 20-06)
  - 5 /admin/* routes registered in main.tsx, all gated by requiredRole="admin"
  - 4 ADMIN-GATE-FE test assertions replacing it.todo stubs (all green)
affects:
  - 20-05 (drawer + AdminTable will compose inside AdminLayout)
  - 20-06 (DailyBriefing + EmployerList replace placeholder route components)
  - 20-07 (Seekers + Jobs + Placements replace placeholder route components)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin route gate: requiredRole='admin' wraps every /admin/* route; security boundary is RPC layer, frontend is UI chrome only"
    - "AdminLayout omits <Nav /> per UI-SPEC anti-chrome rule (single-sidebar Stripe/Linear pattern, vs DashboardLayout's Nav+Sidebar)"
    - "Placeholder-route pattern: 4 list-view routes temporarily render DailyBriefing; 20-06/20-07 swap each as real components land"

key-files:
  created:
    - src/components/layout/AdminSidebar.tsx
    - src/components/layout/AdminLayout.tsx
    - src/pages/admin/DailyBriefing.tsx
  modified:
    - src/components/layout/ProtectedRoute.tsx (one-line union extension)
    - tests/admin-protected-route.test.tsx (it.todo stubs → 4 real assertions)
    - src/main.tsx (2 imports + 5 admin route entries)

key-decisions:
  - "ProtectedRoute union widened from 'employer' | 'seeker' to 'employer' | 'seeker' | 'admin' as a pure type-only change — line-62 redirect logic already handles all 4 cases by structure"
  - "AdminSidebar uses w-60 (240px) matching existing Sidebar.tsx for chrome consistency; brand-active state uses rgba(22,163,74,0.08) per UI-SPEC color spec"
  - "Back-to-app fallback ships admin operator to /dashboard/seeker when role='admin' (the bootstrap overwrites the legacy seeker row); operator can navigate from there"
  - "4 of 5 admin list-view routes temporarily render DailyBriefing as placeholder — swap pattern documented in main.tsx admin route block comment"

patterns-established:
  - "Admin route registration pattern: <ProtectedRoute requiredRole='admin'><AdminLayout>{Page}</AdminLayout></ProtectedRoute>"
  - "Test mock pattern for ProtectedRoute: vi.mock('@/lib/supabase') + vi.mock('@/hooks/useAuth') + mockAuth helper (mirrors tests/protected-route-oauth.test.tsx)"

requirements-completed: []  # plan 20-04 has empty requirements frontmatter; ADMIN-GATE-FE is a VALIDATION test ID, not a REQUIREMENTS.md requirement

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 20 Plan 04: Admin Route Tree Foundation Summary

**Single-sidebar AdminLayout (no top Nav), 5 /admin/* routes gated by requiredRole='admin', AdminSidebar with 5 nav items + back-to-app escape, and 4 admin-gate vitest assertions replacing it.todo stubs**

## Performance

- **Duration:** ~4 min (257s)
- **Started:** 2026-05-04T21:45:46Z
- **Completed:** 2026-05-04T21:50:03Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 edited)

## Accomplishments

- ProtectedRoute requiredRole union now accepts 'admin' (one-line change at line 7)
- 4 ADMIN-GATE-FE test assertions land green: anonymous→/login, employer→/dashboard/employer, seeker→/dashboard/seeker, admin→sees protected content
- AdminSidebar (240px) with 5 brand-active nav items (Daily Briefing, Employers, Seekers, Jobs, Placement Pipeline) + ArrowLeft "Back to app" escape
- AdminLayout shell composes AdminSidebar + max-w-[1200px] inner content; omits top &lt;Nav /&gt; per UI-SPEC anti-chrome contract
- DailyBriefing.tsx placeholder (Title + muted "Loading admin metrics…" copy) — 20-06 fills the real implementation
- 5 routes registered in main.tsx: `/admin`, `/admin/employers`, `/admin/seekers`, `/admin/jobs`, `/admin/placements` (the 4 list views temporarily render DailyBriefing as placeholder)
- `pnpm tsc --noEmit` exits 0 with the union widening flowing through main.tsx callsites

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen ProtectedRoute union + replace it.todo stubs** — `b52b80c` (feat)
2. **Task 2: Create AdminSidebar component** — `95a97e9` (feat)
3. **Task 3: AdminLayout + DailyBriefing placeholder + register routes in main.tsx** — `9ad86d5` (feat)

**Plan metadata:** _(pending — final commit at end of state-update step)_

_Note: Task 1 had `tdd="true"`; runtime tests were already green after the union widening (existing line-62 redirect logic handles all 4 cases by structure). Single combined commit was sufficient because the type-only widening + new test assertions are conceptually one change, and there was no intermediate failing-test state to capture as a separate RED commit (vitest in this repo doesn't typecheck the tests directory — see Deviations §1)._

## Files Created/Modified

**Created:**
- `src/components/layout/AdminSidebar.tsx` (89 lines) — w-60 left rail, 5 NavLink items with brand-active state, ArrowLeft back-to-app escape, "Admin" eyebrow label
- `src/components/layout/AdminLayout.tsx` (22 lines) — clones DashboardLayout pattern; omits &lt;Nav /&gt;; AdminSidebar + main with max-w-[1200px] mx-auto + px-6 py-8
- `src/pages/admin/DailyBriefing.tsx` (12 lines) — placeholder; renders 20px Title + 13px muted copy; replaced in plan 20-06

**Modified:**
- `src/components/layout/ProtectedRoute.tsx:7` — `requiredRole?: 'employer' | 'seeker'` → `requiredRole?: 'employer' | 'seeker' | 'admin'`
- `tests/admin-protected-route.test.tsx` — replaced 4 `it.todo` stubs with full `it()` assertions using vi.mock pattern (mirrors `tests/protected-route-oauth.test.tsx`); added `mockAuth` helper for terse role-state setup
- `src/main.tsx` — 2 new imports (AdminLayout, DailyBriefing); 5 new route entries appended after `/onboarding/seeker`, each `<ProtectedRoute requiredRole="admin"><AdminLayout><DailyBriefing /></AdminLayout></ProtectedRoute>`; admin route block has explanatory comment about RPC-layer-is-the-real-gate + placeholder-swap plan

## Decisions Made

- **TDD red-state captured implicitly, not as separate commit.** Plan called for `tdd="true"` on Task 1, but vitest in this repo runs without strict tsc on `tests/` (only `src/` is in `tsconfig.app.json` include), so the runtime test passes regardless of union state — the meaningful RED state would have been a tsc error in src/main.tsx (Task 3). Single combined feat commit (test + impl) is the honest representation; no test-only RED commit was created. Documented in Task Commits section.
- **Plan-supplied comment in main.tsx contains literal `requiredRole="admin"` substring**, causing the AC's `grep -c 'requiredRole="admin"'` to return 6 instead of the expected 5. The 5 *functional* JSX uses are correct; the 6th hit is the explanatory comment from the plan body. Treating substantive AC as met (5 routes registered, 1 comment reference). See Deviations §1.
- **DailyBriefing as placeholder for the 4 list-view routes** is a transition pattern, not a final state. Plan 20-06 swaps EmployerList; plan 20-07 swaps Seekers/Jobs/Placements. The shared placeholder reduces noise in this commit while keeping the route tree complete and TypeScript-valid.
- **AdminSidebar `min-h-screen`** (vs Sidebar.tsx's `min-h-[calc(100vh-56px)]`) because AdminLayout has no top &lt;Nav /&gt; (which is 56px tall). Sidebar fills the full viewport in the admin shell; this is the chrome-difference that follows from the AdminLayout decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan-supplied comment expands AC grep result] Comment in main.tsx contains `requiredRole="admin"` literal**

- **Found during:** Task 3 (main.tsx route registration verification)
- **Issue:** Plan-supplied admin route block prefix-comment contains the explanatory line `// /admin/* routes are gated by ProtectedRoute requiredRole="admin". The actual...`. The acceptance check `grep -c 'requiredRole="admin"' src/main.tsx` returned 6 (5 JSX uses + 1 comment hit) where the plan AC stated "returns 5".
- **Fix:** None applied — the deviation is in the plan AC's grep, not the code. Comment is plan-mandated content. Documented as the 5 functional uses being correct; AC substantively met.
- **Files modified:** none (no fix needed)
- **Verification:** `grep -n 'requiredRole="admin"' src/main.tsx` shows 6 lines: 1 comment (line 203) + 5 JSX uses (lines 211, 221, 231, 241, 251)
- **Committed in:** 9ad86d5 (Task 3 commit, captures the comment as plan-supplied)

---

**Total deviations:** 1 documentation-only (plan AC grep miscount; no code change)
**Impact on plan:** Zero functional impact. The 5 routes register exactly as the plan specifies; the AC's expected grep count was off-by-one due to the plan's own comment text matching the grep pattern. No scope creep.

## Issues Encountered

None. The plan was tightly scoped, all dependencies (Sidebar.tsx pattern, useAuth hook, lucide-react icons, Phase 19 design tokens) already in place. Execution was a straight-through implementation.

## User Setup Required

None — no external service configuration required. Plan 20-04 is pure frontend chrome (no migrations, no Edge Functions, no env vars). Harry's existing Studio-SQL bootstrap (handled in 20-02) already assigns `role='admin'` to his auth.users row; navigating to `/admin` after this plan ships will render the AdminLayout shell with the placeholder DailyBriefing.

## Next Phase Readiness

- **Plan 20-05** (drawer + reusable AdminTable) is unblocked. AdminLayout now exists for AdminTable to render inside; ProfileDrawer can be wired to compose with the layout.
- **Plan 20-06** (DailyBriefing impl + EmployerList) is unblocked. Will swap `<DailyBriefing />` placeholder at `/admin` with the real StatsStrip + Card-grid implementation, and replace `/admin/employers` placeholder with `<EmployerList />`.
- **Plan 20-07** (Seekers + Jobs + Placements) is unblocked. Will swap remaining 3 placeholder routes (`/admin/seekers`, `/admin/jobs`, `/admin/placements`).
- **No blockers.**

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*

## Self-Check: PASSED

All claimed files and commits exist:
- FOUND: src/components/layout/AdminSidebar.tsx
- FOUND: src/components/layout/AdminLayout.tsx
- FOUND: src/pages/admin/DailyBriefing.tsx
- FOUND: src/components/layout/ProtectedRoute.tsx (modified)
- FOUND: tests/admin-protected-route.test.tsx (rewritten)
- FOUND: src/main.tsx (modified)
- FOUND: .planning/phases/20-super-admin-dashboard/20-04-SUMMARY.md
- FOUND: commit b52b80c (Task 1)
- FOUND: commit 95a97e9 (Task 2)
- FOUND: commit 9ad86d5 (Task 3)

Verifications run:
- `pnpm test -- --run tests/admin-protected-route.test.tsx` → 4/4 passing (no `it.todo` remaining)
- `pnpm tsc --noEmit` → exit 0
- `grep -c 'requiredRole="admin"' src/main.tsx` → 6 (5 functional + 1 plan-supplied comment; see Deviations §1)
- `grep -c '<AdminLayout>' src/main.tsx` → 5
- `grep -c '<Nav />' src/components/layout/AdminLayout.tsx` → 0 (UI-SPEC contract honoured)

