---
phase: 09-page-level-integrations
plan: "04"
subsystem: ui
tags: [react, tailwind, supabase, job-detail, sidebar, breadcrumb, stats-strip, timeline]

# Dependency graph
requires:
  - phase: 09-page-level-integrations
    provides: "09-01 foundation with useSavedJobs hook and Breadcrumb/StatsStrip/Timeline components"
provides:
  - "MapPlaceholder component (160px mist placeholder with distance badge)"
  - "JobDetailSidebar component (quick facts, deadline notice, similar jobs, farm profile card)"
  - "JobDetail.tsx upgraded to full SPEC compliance with all 9 JDET requirements"
affects: [10-employer-dashboard, 11-launch-prep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timeline component uses entries prop (title/date) not events prop (label/date)"
    - "Similar jobs query uses job.region (not employer_profiles.region) for filtering"
    - "JobDetailSidebar receives pre-computed isSaved boolean + onSaveToggle callback from parent"

key-files:
  created:
    - src/components/ui/MapPlaceholder.tsx
    - src/components/ui/JobDetailSidebar.tsx
  modified:
    - src/pages/jobs/JobDetail.tsx

key-decisions:
  - "Timeline component uses entries/title prop shape — plan specified events/label but actual component uses entries/title; JobDetail.tsx correctly matches component interface"
  - "Similar jobs fetched by job.region (top-level field) not employer_profiles.region — region is denormalized on the jobs table"
  - "JobDetailSidebar integrates into right column alongside MatchBreakdown (seekers see both stacked vertically)"

patterns-established:
  - "Sidebar pattern: sticky top-20 wrapper, space-y-4 between cards, white bg-white border-fog rounded-[12px] cards"
  - "Meadow dot bullets: flex items-start gap-2 li with absolute-positioned w-1.5 h-1.5 rounded-full span"
  - "Skills legend row: flex items-center gap-4 with w-2 h-2 rounded-full colored dots for Required/Preferred/Bonus"

requirements-completed: [JDET-01, JDET-02, JDET-03, JDET-04, JDET-05, JDET-06, JDET-07, JDET-08, JDET-09]

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 9 Plan 04: Job Detail Page SPEC Compliance Summary

**Full job detail page upgrade: Breadcrumb nav, StatsStrip, meadow-dot day-to-day bullets, skills legend, vertical Timeline, MapPlaceholder, and complete JobDetailSidebar covering all 9 JDET requirements**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T07:15:00Z
- **Completed:** 2026-03-22T07:30:00Z
- **Tasks:** 2 (Task 1 committed as 108dd2d, Task 2 committed as 56e284d)
- **Files modified:** 3

## Accomplishments

- Created MapPlaceholder (160px mist bg, MapPin icon, absolute-positioned distance badge) and JobDetailSidebar (quick facts list, deadline notice, similar jobs, farm profile card with bg-soil header and StarRating)
- Replaced old `<nav>` element with sticky Breadcrumb component; added StatsStrip with Applications/Views/Salary/Posted stats below the header
- Upgraded JobDetail.tsx: day-to-day uses meadow dot `<ul>`, skills section has 2-column grid with Required/Preferred/Bonus legend, Application Timeline uses vertical Timeline component, Location section uses MapPlaceholder, right sidebar uses JobDetailSidebar with similar jobs queried from Supabase

## Task Commits

Each task was committed atomically:

1. **Task 1: MapPlaceholder + JobDetailSidebar components** - `108dd2d` (feat)
2. **Task 2: Integrate components into JobDetail page** - `56e284d` (feat)

## Files Created/Modified

- `src/components/ui/MapPlaceholder.tsx` - 160px mist placeholder with MapPin icon and optional distance/region badge
- `src/components/ui/JobDetailSidebar.tsx` - 242-line sidebar with quick facts, deadline notice, similar jobs list, and farm profile card (bg-soil header)
- `src/pages/jobs/JobDetail.tsx` - Full SPEC integration: Breadcrumb, StatsStrip, meadow-dot day-to-day, skills legend, Timeline, MapPlaceholder, JobDetailSidebar, useSavedJobs hook, similarJobs/applicationCount state and Supabase queries

## Decisions Made

- Timeline component uses `entries` prop with `title` field (not `events`/`label` as the plan specified) — the actual component interface was correctly used, plan interface description was approximate
- Similar jobs are fetched by `job.region` (the denormalized top-level column on the jobs table) rather than `employer_profiles.region` — this reflects the actual DB schema
- MatchBreakdown is kept above JobDetailSidebar in the right column for seekers so match context is immediately visible before quick facts

## Deviations from Plan

None - plan executed exactly as written. Minor interface discrepancy (Timeline entries vs events) was handled correctly by reading the actual component before use.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 9 JDET requirements complete and visible on the job detail page
- JobDetailSidebar and MapPlaceholder are reusable components ready for other pages
- Phase 9 plans 05 and 06 (applicant dashboard integrations) can proceed

---
*Phase: 09-page-level-integrations*
*Completed: 2026-03-22*
