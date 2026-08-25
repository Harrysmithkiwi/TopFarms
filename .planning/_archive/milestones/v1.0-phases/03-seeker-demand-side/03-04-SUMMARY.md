---
phase: 03-seeker-demand-side
plan: "04"
subsystem: ui
tags: [react, supabase, radix-ui, match-scoring, applications]

requires:
  - phase: 03-01
    provides: compute_match_score RPC + MatchBreakdown/MatchScore types in domain.ts
  - phase: 03-02
    provides: seeker_profiles table populated via onboarding flow
  - phase: 02-06
    provides: JobDetail.tsx base structure (existing sections, CTA bars, verifications)

provides:
  - MatchBreakdown component with 7-dimension progress bars + total score circle
  - Blurred visitor teaser mode with signup CTA overlay on MatchBreakdown
  - JobDetail match score sidebar for seekers (desktop sticky, mobile inline)
  - Apply modal (Radix Dialog) with optional cover note
  - Application insert to applications table with duplicate detection (23505)
  - hasApplied guard: seeker cannot apply twice to same job

affects:
  - 03-05 (application pipeline — applications table now populated by seekers)
  - 03-06 (seeker dashboard — applications count/status from same table)
  - 04 (employer app review — applications.seeker_id FK usage)

tech-stack:
  added: []
  patterns:
    - "blurred teaser: blur-sm + pointer-events-none + absolute overlay for visitor conversion"
    - "responsive grid: lg:grid lg:grid-cols-[1fr_280px] for content + sidebar layout"
    - "duplicate detection: 23505 Postgres unique violation code as client-side guard"
    - "seeker profile ID fetched inline in loadJob useEffect alongside other seeker data"

key-files:
  created:
    - src/components/ui/MatchBreakdown.tsx
  modified:
    - src/pages/jobs/JobDetail.tsx

key-decisions:
  - "MatchBreakdown uses DIMENSIONS const array for DRY dimension config — label, key, max in one place"
  - "Visitor teaser uses a hardcoded realistic score (78 total) to show meaningful blurred preview rather than empty state"
  - "JobDetail loadJob useEffect now depends on [jobId, session, role] to re-fetch seeker data on auth change"
  - "Apply button rendered but disabled (not hidden) when seekerProfileId is null — shows 'Apply Now' but shows toast on click"

requirements-completed: [JDET-01, JDET-02, JDET-03, JDET-04, APPL-01]

duration: 8min
completed: "2026-03-16"
---

# Phase 3 Plan 04: Job Detail Match Breakdown + Apply Modal Summary

**MatchBreakdown component with 7-category scoring bars, blurred visitor teaser, and Radix Dialog apply modal that inserts to the applications table with duplicate detection**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T03:35:54Z
- **Completed:** 2026-03-16T03:44:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `MatchBreakdown` component rendering total score circle (MatchCircle lg) + 7 dimension progress bars (shed_type 25, location 20, accommodation 20, skills 20, salary 10, visa 5, couples 5) with score/max text and low-score context strings
- Extended JobDetail to fetch match score via `compute_match_score` RPC + check prior applications, rendering breakdown in sticky desktop sidebar and inline on mobile
- Implemented Radix Dialog apply modal with optional cover note (max 500 chars), inserting to `applications` table with `seeker_id`, `job_id`, `cover_note`, `status: 'applied'`, and 23505 duplicate detection

## Task Commits

Each task was committed atomically:

1. **Task 1: MatchBreakdown component** - `d453efc` (feat)
2. **Task 2: Extend JobDetail with match breakdown + apply modal** - `e782f1d` (feat)

**Plan metadata:** (docs commit after summary)

## Files Created/Modified

- `src/components/ui/MatchBreakdown.tsx` - Match score card with 7 category progress bars, blurred visitor teaser mode, and signup overlay
- `src/pages/jobs/JobDetail.tsx` - Extended with seeker match score fetch, responsive sidebar grid, apply modal, and applications insert

## Decisions Made

- `MatchBreakdown` uses a `DIMENSIONS` const array (`as const`) so label, DB key, and max value are co-located — single source of truth for the 7 scoring dimensions
- Visitor teaser uses a hardcoded realistic score (78 total, `VISITOR_TEASER_SCORE` constant) rather than zeros — shows meaningful blurred breakdown to motivate signup
- JobDetail `useEffect` now has `[jobId, session, role]` as deps so seeker-specific data (score + prior app check) refetches if auth state changes post-mount
- Apply button is rendered with `disabled` rather than hidden when `seekerProfileId` is null — preserves layout, shows toast "Complete your profile before applying" on click

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `navigate` import from JobDetail**
- **Found during:** Task 2 (TypeScript build check)
- **Issue:** `useNavigate` imported but unused in the rewritten file — caused TS6133 error in the file I modified
- **Fix:** Removed `useNavigate` from the import line; the existing file already had it from Phase 2 but the route didn't use it
- **Files modified:** src/pages/jobs/JobDetail.tsx
- **Verification:** No TS errors in JobDetail.tsx; Vite build passes
- **Committed in:** e782f1d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - unused import bug)
**Impact on plan:** Minor fix, no scope change. Pre-existing TS errors in unrelated files (useAuth.ts, SkillsPicker.tsx, main.tsx, etc.) documented in deferred-items.md.

## Issues Encountered

`npm run build` (`tsc -b && vite build`) fails due to pre-existing TypeScript errors in files not touched by this plan. `vite build` alone passes. These errors were present before Phase 03 began and are documented in `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `applications` table now receives inserts from seeker apply flow — Phase 03-05 (application pipeline) can read these rows
- `MatchBreakdown` component available for reuse in seeker dashboard or any future match display context
- `hasApplied` state + 23505 guard prevents duplicate submissions at both UI and DB level

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*
