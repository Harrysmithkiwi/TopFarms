---
phase: 09-page-level-integrations
plan: 05
subsystem: ui
tags: [react, tailwind, supabase, typescript]

# Dependency graph
requires:
  - phase: 09-01
    provides: "hideSidebar prop on DashboardLayout, generate-candidate-summary Edge Function, application and seeker schema"
provides:
  - "260px ApplicantDashboardSidebar with soil farm header, listing selector, and quick stats"
  - "AICandidateSummary with purple-lt styling, skeleton loading, cache-first invocation"
  - "BulkActionsBar with Shortlist Selected + CSV Export, sticky bottom"
  - "ApplicantPanel with 4-tab structure (CV / Match Breakdown / Interview / Notes)"
  - "ApplicantDashboard redesigned with hideSidebar, flex sidebar layout, filter toolbar, sort, view toggle, bulk actions, viewed_at tracking"
affects: [09-06, 10-employer-features, 11-post-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STATUS_LABELS map: DB enum values mapped to SPEC display labels (applied->New, review->Reviewed)"
    - "Cache-first AI summary: AICandidateSummary only invokes Edge Function if no cachedSummary and isExpanded"
    - "useSearchParams for job switching — sidebar job selector updates URL param and navigates to new route"
    - "viewed_at tracking: fires on first expand, updates local state optimistically to prevent re-firing"

key-files:
  created:
    - src/components/ui/ApplicantDashboardSidebar.tsx
    - src/components/ui/AICandidateSummary.tsx
    - src/components/ui/BulkActionsBar.tsx
  modified:
    - src/components/ui/ApplicantPanel.tsx
    - src/pages/dashboard/employer/ApplicantDashboard.tsx

key-decisions:
  - "STATUS_LABELS map in ApplicantDashboard maps DB status values (applied, review) to SPEC chip labels (New, Reviewed) — display text decoupled from DB values"
  - "ApplicantPanel 4-tab structure: existing expanded content moved to CV tab unchanged; MatchBreakdown moved to dedicated Match tab instead of duplicating in CV"
  - "viewed_at updates local state after firing to prevent re-triggering on subsequent toggles within same session"
  - "BulkActionsBar bulk shortlist iterates via handleTransition — preserves placement fee modal gate per applicant"

patterns-established:
  - "DashboardLayout hideSidebar pattern: pass hideSidebar prop to suppress shell nav sidebar, use dedicated in-page sidebar instead"
  - "Tab bar pattern: flex border-b with active tab styled as border-b-2 border-moss text-moss"
  - "Filter+sort toolbar pattern: flex items-center gap-3 flex-wrap with chip buttons using STATUS_LABELS, select for sort, button pair for view toggle"

requirements-completed: [ADSH-01, ADSH-02, ADSH-03, ADSH-04, ADSH-05]

# Metrics
duration: 25min
completed: 2026-03-22
---

# Phase 9 Plan 05: Applicant Dashboard Summary

**260px sidebar + filter toolbar with STATUS_LABELS chips + 4-tab ApplicantPanel (CV/Match/Interview/Notes) + AI summaries + bulk shortlist/export into ApplicantDashboard**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-22T00:10:00Z
- **Completed:** 2026-03-22T00:35:00Z
- **Tasks:** 2 (Task 1 previously committed as b381469; Task 2 committed as 2217296)
- **Files modified:** 5

## Accomplishments
- Redesigned ApplicantDashboard with DashboardLayout hideSidebar + 260px ApplicantDashboardSidebar showing farm header, listing selector, and applied/shortlisted/hired quick stats
- Added filter toolbar with search input, STATUS_LABELS status chips (All/New/Reviewed/Shortlisted/Declined), sort dropdown (Newest first / Match score), and list/grid view toggle
- Extended ApplicantPanel with 4-tab structure — CV tab preserves all existing content, Match Breakdown tab uses MatchBreakdown component, Interview tab shows coming-soon placeholder, Notes tab has editable textarea with save-to-DB button
- Integrated AICandidateSummary (purple-lt box with skeleton loading) above tab bar; BulkActionsBar at bottom with bulk shortlist pipeline gate and CSV export
- Employer view tracking: `viewed_at` fires on first panel expand, updates local state to prevent re-triggering

## Task Commits

Each task was committed atomically:

1. **Task 1: ApplicantDashboardSidebar + AICandidateSummary + BulkActionsBar components** - `b381469` (feat)
2. **Task 2: Extend ApplicantPanel with 4 tabs + integrate all into ApplicantDashboard** - `2217296` (feat)

## Files Created/Modified
- `src/components/ui/ApplicantDashboardSidebar.tsx` - 260px sidebar with soil farm header, listing selector dropdown, 3-stat quick stats grid
- `src/components/ui/AICandidateSummary.tsx` - Purple-lt AI summary box with skeleton loading, cache-first Edge Function invocation, error retry
- `src/components/ui/BulkActionsBar.tsx` - Sticky bottom bar with Shortlist Selected (primary) and Export (ghost), hidden when selectedCount=0
- `src/components/ui/ApplicantPanel.tsx` - Added 4-tab structure (cv/match/interview/notes), AICandidateSummary above tabs, checkbox for bulk selection, application_notes textarea
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` - Full redesign: hideSidebar, flex sidebar layout, filter toolbar, statusFilter/searchQuery/sortBy/viewMode state, filteredApplicants computed value, dashboardStats, employer jobs query, BulkActionsBar integration, viewed_at tracking

## Decisions Made
- STATUS_LABELS map decouples DB enum values (applied, review) from SPEC display labels (New, Reviewed) — chip buttons use the display labels throughout
- ApplicantPanel 4-tab: existing expanded content moved verbatim to CV tab; Match Breakdown component moved to its own tab rather than duplicated under CV
- viewed_at updates local applicants state after DB write to prevent re-firing on same-session re-toggles
- BulkActionsBar bulk shortlist calls handleTransition per applicant — this preserves the placement fee modal gate for each shortlist action

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compilation passed with zero errors on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Applicant dashboard fully implemented per SPEC; ready for Phase 10 employer features
- ApplicantPanel now exports all required props for future interview scheduling integration (Interview tab placeholder in place)
- AI summary cache stored in React state per session; persistent caching via DB column available if needed in Phase 10/11

---
*Phase: 09-page-level-integrations*
*Completed: 2026-03-22*
