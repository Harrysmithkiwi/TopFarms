---
phase: 09-page-level-integrations
plan: 03
subsystem: ui
tags: [react, accordion, tabs, supabase, optimistic-ui]

# Dependency graph
requires:
  - phase: 09-01
    provides: useSavedJobs hook and saved_jobs table
  - phase: 09-02
    provides: JobSearch page with filter/pagination foundation
provides:
  - ExpandableCardTabs component with Details/My Match/Apply tabs
  - SearchJobCard as accordion card (no longer a Link wrapper)
  - JobSearch accordion state with single-expansion-at-a-time pattern
  - Inline quick-apply (applications insert) from job search results
  - Bookmark toggle wired to useSavedJobs with optimistic UI
affects: [09-04, job-detail-page, applications-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - expandedId string | null state for single-accordion-at-a-time pattern
    - Always-rendered hidden accordion area using max-h/opacity CSS transition (no mount/unmount flicker)
    - e.stopPropagation() on inner interactive elements inside accordion to prevent header toggle

key-files:
  created:
    - src/components/ui/ExpandableCardTabs.tsx
  modified:
    - src/components/ui/SearchJobCard.tsx
    - src/pages/jobs/JobSearch.tsx

key-decisions:
  - "SearchJobCard outer wrapper changed from Link to div — navigation via 'View Full Listing' link inside Details tab instead"
  - "ExpandableCardTabs always rendered (not conditional) so CSS max-h transition is smooth with no layout jump"
  - "hasApplied hardcoded to false in JobSearch — batch application status check deferred to a future plan"
  - "handleInlineApply collapses the card (setExpandedId(null)) after successful submission for clear UX feedback"

patterns-established:
  - "Accordion-at-a-time: single string|null expandedId state in parent, toggled by onToggle callback in child"
  - "Inline apply from search: seeker_profiles lookup + applications insert without leaving the page"

requirements-completed: [SRCH-06]

# Metrics
duration: 20min
completed: 2026-03-22
---

# Phase 9 Plan 03: SearchJobCard Accordion + Inline Apply Summary

**Accordion-style job cards with Details/My Match/Apply tabs, bookmark toggle via useSavedJobs, and quick-apply inserting directly into applications table from the search page**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-22T00:00:00Z
- **Completed:** 2026-03-22T00:20:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `ExpandableCardTabs` with conditional Details/My Match/Apply tabs, dimension progress bars, and inline textarea apply
- Converted `SearchJobCard` from a navigating Link to an accordion div with bookmark icon and CSS-transition expand area
- Wired `JobSearch` with `expandedId` state, `useSavedJobs` hook, `handleInlineApply` function, and full prop threading through `ResultsArea`

## Task Commits

Each task was committed atomically:

1. **Task 1: ExpandableCardTabs component** - `97d0783` (feat)
2. **Task 2: Wire accordion + saved jobs into JobSearch** - `1092b46` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/ui/ExpandableCardTabs.tsx` - Three-tab component: Details (description + View Full Listing link), My Match (MatchCircle + top 3 dimension bars), Apply (textarea + Apply Now button)
- `src/components/ui/SearchJobCard.tsx` - Converted to accordion; outer div not Link; header is clickable button; Bookmark icon with stopPropagation; always-rendered tab area with CSS transition
- `src/pages/jobs/JobSearch.tsx` - Added expandedId state, useSavedJobs hook, handleInlineApply (applications insert), passed accordion props to ResultsArea and SearchJobCard

## Decisions Made
- SearchJobCard outer wrapper changed from Link to div — navigation moved to "View Full Listing" link inside Details tab, preserving navigability without full-card navigation on click
- ExpandableCardTabs always rendered (not conditional) so max-h/opacity CSS transition works smoothly without mount/unmount layout jump
- hasApplied hardcoded to false — batch application status check deferred to future plan to avoid N+1 query on search page load
- handleInlineApply collapses the card after successful submission (setExpandedId(null)) to provide clear feedback that apply succeeded

## Deviations from Plan

None - plan executed exactly as written. SearchJobCard was already partially updated prior to this execution context; Task 2 focused on JobSearch.tsx wiring as the remaining work.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Job search page now has full accordion expansion, bookmark toggle, and inline apply
- Ready for Phase 9 Plan 04 (Job Detail page with sidebar components)
- hasApplied batch check can be added in a future plan to show "Applied" badge on cards

---
*Phase: 09-page-level-integrations*
*Completed: 2026-03-22*
