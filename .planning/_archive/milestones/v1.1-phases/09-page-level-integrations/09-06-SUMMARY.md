---
phase: 09-page-level-integrations
plan: "06"
subsystem: ui
tags: [react, supabase, typescript, status-banners, sidebar, saved-jobs]

# Dependency graph
requires:
  - phase: 09-01
    provides: migration 015 (viewed_at column), useSavedJobs hook, hideSidebar prop on DashboardLayout
provides:
  - StatusBanner integration per ApplicationCard variant (shortlisted/interview/offer/declined)
  - FarmResponseIndicator showing employer view timestamp or "Not yet viewed"
  - MyApplicationsSidebar with status summary, filter tabs, saved jobs list, profile strength nudge
  - MyApplications page redesign with hideSidebar, sidebar filter, and single filteredApplications list
affects: [09-07, 09-08, 09-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STATUS_TO_BANNER partial record maps ApplicationStatus to banner variant for conditional card rendering"
    - "Sidebar filter (all/active/shortlisted/closed) controls filteredApplications derived from full list"
    - "profileStrength computed client-side by counting non-null seeker_profiles fields (0-100)"
    - "Saved job details fetched separately from saved_jobs with join to jobs/employer_profiles"

key-files:
  created:
    - src/components/ui/FarmResponseIndicator.tsx
    - src/components/ui/MyApplicationsSidebar.tsx
  modified:
    - src/components/ui/ApplicationCard.tsx
    - src/pages/dashboard/seeker/MyApplications.tsx

key-decisions:
  - "StatusBanner uses hardcoded title/body from bannerVariants in StatusBanner.tsx — ApplicationCard only passes variant, not text, avoiding duplication"
  - "Interview Accept action fires a toast (not a DB write) since interview_accepted status not in schema — Decline writes declined status to DB"
  - "filteredApplications replaces separate active/completed section split — sidebar filter tabs are the single control for list view"

patterns-established:
  - "ApplicationCard StatusBanner: rendered at card top, outside p-4 body div, card uses overflow-hidden to clip rounded corners"
  - "Sidebar filter pattern: sidebarFilter state in page, passed to MyApplicationsSidebar onFilterChange, filteredApplications derived via .filter()"

requirements-completed: [MAPP-01, MAPP-02, MAPP-03]

# Metrics
duration: 25min
completed: 2026-03-22
---

# Phase 9 Plan 06: My Applications StatusBanner + Sidebar Integration Summary

**StatusBanner per card variant, FarmResponseIndicator, and 260px MyApplicationsSidebar with filter tabs, saved jobs, and profile strength on the redesigned My Applications page**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-22T04:12:00Z
- **Completed:** 2026-03-22T04:37:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ApplicationCard now shows contextual StatusBanner at card top for shortlisted/interview/offer/declined status, with Accept/Decline buttons on interview cards
- FarmResponseIndicator renders below applied date showing "Viewed by employer X hours/days ago" or "Not yet viewed" (italic)
- MyApplicationsSidebar provides 260px sidebar with status summary (colored dots + counts), filter tabs (All/Active/Shortlisted/Closed), saved jobs list with remove, and profile strength progress bar
- MyApplications page redesigned: DashboardLayout shell sidebar hidden, single filteredApplications list controlled by sidebar filter tabs, saved job details and profileStrength loaded from Supabase
- Withdraw confirmation dialog updated to include job title

## Task Commits

Each task was committed atomically:

1. **Task 1: FarmResponseIndicator + MyApplicationsSidebar components** - `1bfcd65` (feat)
2. **Task 2: Extend ApplicationCard with StatusBanner + integrate sidebar into MyApplications** - `00bd7f6` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/components/ui/FarmResponseIndicator.tsx` - Eye icon + time-ago for employer view status; italic "Not yet viewed" fallback
- `src/components/ui/MyApplicationsSidebar.tsx` - 260px sidebar with status summary, filter tabs, saved jobs, profile strength
- `src/components/ui/ApplicationCard.tsx` - Added StatusBanner at card top, FarmResponseIndicator below date, Accept/Decline interview buttons, viewed_at/onAcceptInterview/onDeclineInterview props
- `src/pages/dashboard/seeker/MyApplications.tsx` - hideSidebar DashboardLayout, useSavedJobs, sidebar filter state, savedJobDetails + profileStrength queries, filteredApplications list, updated empty state copy

## Decisions Made
- StatusBanner uses hardcoded title/body from `bannerVariants` in StatusBanner.tsx — ApplicationCard only passes `variant`, keeping text in one place and avoiding duplication.
- Interview Accept action fires a success toast rather than writing to DB, since `interview_accepted` is not a valid ApplicationStatus in the schema. Decline writes `declined` to DB.
- The old active/completed section split is replaced by a single `filteredApplications` list controlled by the sidebar filter tabs, simplifying the page structure.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- My Applications page is fully integrated with status-aware banners, farm response indicator, and sidebar
- ApplicationCard is ready for any further status-driven UI additions
- hideSidebar prop on DashboardLayout confirmed working for custom sidebar layouts

---
*Phase: 09-page-level-integrations*
*Completed: 2026-03-22*
