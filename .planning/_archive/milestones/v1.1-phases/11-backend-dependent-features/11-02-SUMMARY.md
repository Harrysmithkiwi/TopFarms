---
phase: 11-backend-dependent-features
plan: 02
subsystem: ui, onboarding, matching
tags: [supabase-rpc, polling, react-hooks, match-scores, live-preview]

# Dependency graph
requires:
  - phase: 11-backend-dependent-features
    plan: 01
    provides: estimate_match_pool RPC, match_scores table trigger

provides:
  - LivePreviewSidebar wired to estimate_match_pool RPC (debounced 500ms)
  - PostJob.tsx threads matchCriteria (region, shedTypes, hasAccommodation) to sidebar
  - SeekerStep7Complete polls match_scores every 3s for up to 30s after onboarding
  - Top 3 matched jobs displayed with MatchCircle score circles, farm name, salary range
  - Timeout fallback with Browse Jobs CTA after 30s

affects: [employer-job-posting-flow, seeker-onboarding-completion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounced RPC call: setTimeout 500ms in useEffect with clearTimeout cleanup"
    - "Polling hook: setInterval 3s with MAX_ATTEMPTS=10 ceiling and clearInterval cleanup"
    - "EstimateState machine: idle | loading | done | error for async UI feedback"

key-files:
  created: []
  modified:
    - src/components/ui/LivePreviewSidebar.tsx
    - src/pages/jobs/PostJob.tsx
    - src/pages/onboarding/steps/SeekerStep7Complete.tsx
    - src/pages/onboarding/SeekerOnboarding.tsx
    - tests/search-preview.test.tsx

key-decisions:
  - "LivePreviewSidebar idle state (no matchCriteria) shows 'Fill in fields to see estimates' — no RPC call fired until criteria present"
  - "SeekerStep7Complete shows loading spinner during poll even if seekerProfileId is null (hook returns loading=true until id provided)"
  - "Polling interval cleared immediately when data arrives or MAX_ATTEMPTS reached — no lingering timers"

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 11 Plan 02: Live Match Pool Estimate + Seeker Completion Polling Summary

**LivePreviewSidebar wired to estimate_match_pool RPC with 500ms debounce; SeekerStep7Complete polls match_scores every 3s for up to 30s displaying top 3 jobs with MatchCircle scores**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T22:29:38Z
- **Completed:** 2026-03-23T00:32:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- LivePreviewSidebar receives `matchCriteria` prop (region, shedTypes, hasAccommodation) and calls `estimate_match_pool` RPC via debounced 500ms useEffect — showing "Calculating..." during flight, live counts on success, "Post your listing to attract seekers in this area" for zero results, and "Fill in fields to see estimates" in idle state
- PostJob.tsx passes `matchCriteria` built from `jobData.region`, `jobData.shed_type`, and `jobData.accommodation?.available` to LivePreviewSidebar
- SeekerStep7Complete gains `seekerProfileId` prop and `useMatchScoresPoll` hook that polls `match_scores` table every 3 seconds for up to 30 seconds (10 attempts × 3s)
- Completion screen renders top 3 matched jobs with `MatchCircle` score, farm name, region, and salary range; shows timeout fallback with Browse Jobs link; shows "Browse all jobs" link when fewer than 3 matches exist
- SeekerOnboarding threads `seekerProfileId` state to SeekerStep7Complete
- Outdated search-preview tests updated to match new dynamic LivePreviewSidebar behaviour (107/107 pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire LivePreviewSidebar to RPC** - `02914a5` (feat)
2. **Task 2: Matched-jobs polling on SeekerStep7Complete** - `f0fbcda` (feat)

## Files Created/Modified

- `src/components/ui/LivePreviewSidebar.tsx` - Added MatchCriteria interface, matchCriteria prop, dynamic MatchPoolEstimate with debounced RPC call replacing hardcoded values
- `src/pages/jobs/PostJob.tsx` - Added matchCriteria prop threading to LivePreviewSidebar with region/shedTypes/hasAccommodation from jobData
- `src/pages/onboarding/steps/SeekerStep7Complete.tsx` - Added seekerProfileId prop, useMatchScoresPoll hook, live matched-job cards with MatchCircle, timeout fallback
- `src/pages/onboarding/SeekerOnboarding.tsx` - Added seekerProfileId prop to SeekerStep7Complete render
- `tests/search-preview.test.tsx` - Updated 2 outdated tests (static hardcoded values) to match new dynamic behaviour

## Decisions Made

- LivePreviewSidebar idle state (no matchCriteria) shows "Fill in fields to see estimates" — no RPC call fired until criteria are present, avoiding spurious API calls on mount
- Polling hook returns `loading=true` immediately so the spinner shows without flickering, even before seekerProfileId is available
- `clearInterval` called as soon as data arrives or timeout reached — no lingering intervals after component unmounts (cleanup in useEffect return)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale LivePreviewSidebar tests**
- **Found during:** Task 1 (post-implementation test run)
- **Issue:** `tests/search-preview.test.tsx` contained 2 tests asserting the old hardcoded values (47 seekers, 12 with shed, 8 actively looking, "Estimates available soon") which no longer exist in the component
- **Fix:** Replaced both assertions with a single test checking the new idle-state text "Fill in fields to see estimates"
- **Files modified:** `tests/search-preview.test.tsx`
- **Commit:** `02914a5` (included in Task 1 commit)

## Issues Encountered

None.

## User Setup Required

None — estimate_match_pool RPC was created in Plan 01 migration 016. The match_scores polling will return empty until the seeker_profile_match_rescore trigger fires after onboarding upsert, which requires migration 010 to be applied (part of phase 9).

## Next Phase Readiness

- Phase 11 is now complete — all 2 plans executed
- match_scores trigger timing depends on DB load; polling with 30s timeout handles async trigger delays
- document_urls display (signed URLs for seeker documents) remains deferred — stored paths are correct but viewing uploaded documents requires createSignedUrl calls

---
*Phase: 11-backend-dependent-features*
*Completed: 2026-03-23*

## Self-Check: PASSED

All files confirmed present and all commits verified in git history.
- FOUND: src/components/ui/LivePreviewSidebar.tsx
- FOUND: src/pages/jobs/PostJob.tsx
- FOUND: src/pages/onboarding/steps/SeekerStep7Complete.tsx
- FOUND: src/pages/onboarding/SeekerOnboarding.tsx
- FOUND: .planning/phases/11-backend-dependent-features/11-02-SUMMARY.md
- FOUND commit: 02914a5 (Task 1)
- FOUND commit: f0fbcda (Task 2)
