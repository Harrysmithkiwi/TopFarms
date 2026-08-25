---
phase: 03-seeker-demand-side
plan: 03
subsystem: ui
tags: [react, supabase, radix-ui, url-params, match-scores, job-search, filters]

requires:
  - phase: 03-01
    provides: compute_match_scores_batch RPC, match score types
  - phase: 03-02
    provides: seeker_profiles table, SeekerOnboarding redirect to /jobs

provides:
  - FilterSidebar component with 9 ag-specific filter groups, URL-synced state
  - JobSearch page at /jobs with live filtering, batch match scores, responsive layout
  - SearchJobCard component with MatchCircle and ag-specific tags

affects:
  - 03-04 (applications page reads from /jobs route)
  - 03-05 (seeker dashboard links back to /jobs)

tech-stack:
  added:
    - "@radix-ui/react-slider@^1.3.6 (dual-handle salary range slider)"
  patterns:
    - "URL-synced filter state: useSearchParams + handleFilterChange (functional setSearchParams update)"
    - "__salary__ special key for atomic salary_min + salary_max batch update"
    - "Batch RPC for match scores avoids N+1 — single compute_match_scores_batch call per page load"
    - "Employer verification trust level computed client-side from verifications array"

key-files:
  created:
    - src/components/ui/FilterSidebar.tsx
    - src/components/ui/SearchJobCard.tsx
    - src/pages/jobs/JobSearch.tsx
  modified:
    - src/main.tsx (wire JobSearch to /jobs route)
    - package.json (add @radix-ui/react-slider)

key-decisions:
  - "__salary__ special key used in onFilterChange to atomically set salary_min + salary_max via functional setSearchParams update — avoids race condition from two sequential calls on same searchParams snapshot"
  - "handleFilterChange uses functional setSearchParams(prev => ...) to ensure each call reads latest state"
  - "Employer verifications fetched after job query and stored in Map<employerId, {verifications, trustLevel}> — avoids per-card queries"
  - "Route wiring auto-fixed: /jobs wired to JobSearch (previously Placeholder)"

patterns-established:
  - "Filter sidebar reads URL params via searchParams.getAll() / searchParams.get() — no local state for filter values"
  - "Mobile filter drawer uses Radix Dialog with bottom sheet positioning"
  - "SearchJobCard is a Link wrapper — entire card is clickable to /jobs/:id"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, SRCH-09, SRCH-10, SRCH-11, SRCH-12]

duration: 20min
completed: 2026-03-16
---

# Phase 03 Plan 03: Job Search Page Summary

**URL-synced job search page with 9 ag-specific filter groups, Radix slider, batch match scores via RPC, and mobile bottom-drawer filter UX**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-16T03:47:41Z
- **Completed:** 2026-03-16T04:07:09Z
- **Tasks:** 2 (+ 1 auto-fix)
- **Files modified:** 5

## Accomplishments
- FilterSidebar with 9 filter groups (shed type, region, contract type, salary range, herd size, accommodation+sub-toggles, visa, DairyNZ level, couples) all URL-param synced
- JobSearch page with live filtering, batch RPC match scores sorted best-first, 12-job pagination, skeleton loading, empty state
- SearchJobCard with MatchCircle, VerificationBadge, ag-specific Tag components, visitor placeholder circle
- Desktop 280px sidebar grid + mobile bottom drawer via Radix Dialog

## Task Commits

1. **Task 1: FilterSidebar component** - `5af69cf` (feat)
2. **Task 2: JobSearch page + SearchJobCard** - `f5ed2ac` (feat)
3. **Auto-fix: Route wiring** - `a5f56b2` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/components/ui/FilterSidebar.tsx` - 9 filter groups, URL params, mobile drawer mode, Radix Slider
- `src/components/ui/SearchJobCard.tsx` - Horizontal job card with MatchCircle, VerificationBadge, ag tags
- `src/pages/jobs/JobSearch.tsx` - Main search page with filter state, batch scores, responsive grid
- `src/main.tsx` - Wired JobSearch to /jobs route (replaced Placeholder)
- `package.json` - Added @radix-ui/react-slider

## Decisions Made
- Used `__salary__` special key in `onFilterChange` to atomically update both `salary_min` and `salary_max` via a single functional `setSearchParams` call — avoids race condition when two calls read the same `searchParams` snapshot
- `handleFilterChange` uses functional form `setSearchParams(prev => ...)` for all updates — ensures serial calls read latest state
- Employer verifications fetched in a single batch query after job results load, stored in a `Map<employerId, {verifications, trustLevel}>` to avoid per-card queries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired /jobs route to JobSearch**
- **Found during:** Task 2 (reviewing router config after creating JobSearch page)
- **Issue:** `/jobs` route was pointing to `<Placeholder title="Find Work" />` — JobSearch page would be inaccessible without wiring
- **Fix:** Imported `JobSearch` and replaced `Placeholder` element at `/jobs` route in `main.tsx`
- **Files modified:** `src/main.tsx`
- **Verification:** Vite build passes ✓
- **Committed in:** `a5f56b2`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Route wiring is essential for the page to be accessible. No scope creep.

## Issues Encountered
- Salary slider requires atomic update of two URL params (`salary_min` + `salary_max`). Since `onFilterChange` signature only accepts one key, a special `__salary__` key convention was established and handled in `handleFilterChange` using functional `setSearchParams` update. This keeps the FilterSidebar interface clean while solving the batching problem.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/jobs` route is live and functional with all 9 filters
- `SearchJobCard` ready to be used in seeker dashboard and other listings
- Match scores display when seeker is logged in — Phase 3-04 (applications) can build on this foundation
- FilterSidebar's `onFilterChange` pattern established for reuse

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*
