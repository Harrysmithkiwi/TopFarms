---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: 02
subsystem: ui
tags: [react, adminTable, vitest, RTL, admin-analytics, skills-taxonomy]

# Dependency graph
requires:
  - phase: 23-skills-taxonomy-consolidation-admin-analytics/23-01
    provides: admin_skill_coverage RPC + admin_list_analytics_events RPC in live DB (migration 034)
provides:
  - AdminSkillCoverage page at /admin/skills rendering per-competency supply/demand via admin_skill_coverage
  - AdminListRpc union extended with 'admin_skill_coverage' and 'admin_list_analytics_events'
  - AdminSidebar Skills nav item linking to /admin/skills
  - /admin/skills route wired through ProtectedRoute(requiredRole='admin') + AdminLayout
affects: [phase-24, future-analytics-consumer, admin-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AdminTable<TRow> generic consumption pattern for non-paginated read-only views (pageSize=100, searchable=false)"
    - "AdminListRpc manually-maintained union extended for each new SECURITY DEFINER RPC (Phase 23 Pitfall 4)"
    - "RTL getByText strictness: avoid prose containing test assertion regex patterns in same render scope"

key-files:
  created:
    - src/pages/admin/AdminSkillCoverage.tsx
  modified:
    - src/components/admin/AdminTable.tsx
    - src/components/layout/AdminSidebar.tsx
    - src/main.tsx

key-decisions:
  - "AdminListRpc extended with both 'admin_skill_coverage' AND 'admin_list_analytics_events' in one phase — type-wires ANLY-03 RPC ahead of its future consumer so future analytics-events work never needs to touch AdminTable"
  - "pageSize=100 with searchable=false for AdminSkillCoverage — 24 ag-broad competencies render in a single page, no pagination needed; admin_skill_coverage takes no p_search param"
  - "CATEGORY_LABELS inline map for ag-broad slugs — renders friendly labels without importing shared constants that don't yet exist"

patterns-established:
  - "Non-paginated admin read-only view: AdminTable<TRow> + pageSize=100 + searchable=false + no onRowClick"

requirements-completed: [ANLY-01, ANLY-02, ANLY-03]

# Metrics
duration: 15min
completed: 2026-05-30
---

# Phase 23 Plan 02: Admin Analytics Page Summary

**AdminSkillCoverage page at /admin/skills renders per-competency seeker (supply) and job (demand) counts from admin_skill_coverage RPC through AdminTable; AdminListRpc union extended with both Phase 23 RPC names; all 4 Wave 0 guard tests GREEN**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-30T23:55:00Z
- **Completed:** 2026-05-30T23:57:30Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified + 1 created)

## Accomplishments
- AdminSkillCoverage page created at `src/pages/admin/AdminSkillCoverage.tsx` — renders the 24 ag-broad competencies with supply (seeker_count) and demand (job_count) columns via AdminTable consuming admin_skill_coverage RPC
- AdminListRpc union in AdminTable.tsx extended with both `'admin_skill_coverage'` and `'admin_list_analytics_events'` — type-wires both Phase 23 RPCs so neither page needs an `as never` cast
- AdminSidebar gains a Skills nav item (BarChart2 icon) linking to /admin/skills; /admin/skills route added to main.tsx behind ProtectedRoute(requiredRole='admin') + AdminLayout
- All 4 Phase 23 Wave 0 guard tests GREEN; full Vitest suite 55 passed / 0 failed; typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AdminListRpc union + AdminSidebar Skills item + /admin/skills route** - `00b6974` (feat)
2. **Task 2: Build AdminSkillCoverage page** - `2bc2024` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/admin/AdminSkillCoverage.tsx` - Named export AdminSkillCoverage; AdminTable<SkillCoverageRow> with 4 columns; CATEGORY_LABELS map; no mutations, no row-click
- `src/components/admin/AdminTable.tsx` - AdminListRpc union extended with 'admin_skill_coverage' and 'admin_list_analytics_events'
- `src/components/layout/AdminSidebar.tsx` - BarChart2 import; { to: '/admin/skills', label: 'Skills', icon: BarChart2 } appended to adminItems
- `src/main.tsx` - AdminSkillCoverage import; /admin/skills route with ProtectedRoute(requiredRole='admin') + AdminLayout

## Decisions Made
- Extended AdminListRpc with both RPCs at once (not just admin_skill_coverage) — satisfies the Wave 0 sidebar guard test contract and means ANLY-03's consumer (future plan) doesn't touch AdminTable again
- pageSize=100 for the competency table — all 24 rows render in one pass, avoiding fake pagination for a bounded-size dataset
- CATEGORY_LABELS inline map — no shared constant needed yet; readable labels without cross-module dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rephrased intro paragraph to avoid RTL getByText(/seekers/i) duplicate-element error**
- **Found during:** Task 2 (AdminSkillCoverage page) — first test run
- **Issue:** The intro `<p>` text "seekers holding each skill" contained the word "seekers", causing `getByText(/seekers/i)` to match both the paragraph and the `<th>` column header, throwing "Found multiple elements"
- **Fix:** Rephrased intro to "Supply counts how many candidates hold each skill" — removes the literal word "seekers" from prose without losing meaning
- **Files modified:** src/pages/admin/AdminSkillCoverage.tsx
- **Verification:** `npx vitest run tests/admin-skill-coverage.test.tsx` 2/2 GREEN
- **Committed in:** 2bc2024 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug causing test strictness collision)
**Impact on plan:** Fix required for correctness; no scope creep. The rephrased copy is equally descriptive.

## Issues Encountered
None beyond the auto-fixed prose/regex collision above.

## User Setup Required
None - pure frontend changes; DB RPCs already live from plan 23-01.

## Next Phase Readiness
- Phase 23 is complete (plans 00 + 01 + 02 all committed). Ready for phase verifier.
- /admin/skills is reachable in the live app once the admin user visits it; the admin_skill_coverage RPC (migration 034, applied in 23-01) returns real data.
- Future ANLY-03 consumer: admin_list_analytics_events is already in the AdminListRpc union — future plan only needs to create the page and wire the route.

---
*Phase: 23-skills-taxonomy-consolidation-admin-analytics*
*Completed: 2026-05-30*
