---
phase: 04-match-scoring-engine
plan: "03"
subsystem: ui
tags: [react, typescript, supabase, match-scoring, ai-explanation]

# Dependency graph
requires:
  - phase: 04-01
    provides: match_scores table with pre-computed scores and triggers
  - phase: 04-02
    provides: generate-match-explanation edge function producing explanation text
  - phase: 03-04
    provides: MatchBreakdown component, MatchScore type, JobDetail score rendering
provides:
  - MatchScore type with optional explanation field
  - MatchBreakdown component with conditional AI explanation section
  - All 4 frontend pages reading from match_scores table (not RPC)
  - JobDetail fire-and-forget async explanation trigger for missing explanations
affects:
  - 04-04
  - future phases using MatchScore type or MatchBreakdown component

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Direct table read with maybeSingle() instead of RPC for single-row score lookup
    - Batch .in() query replacing N sequential RPC calls for employer applicant scoring
    - Fire-and-forget supabase.functions.invoke().catch(() => {}) for async explanation generation

key-files:
  created: []
  modified:
    - src/types/domain.ts
    - src/components/ui/MatchBreakdown.tsx
    - src/pages/jobs/JobDetail.tsx
    - src/pages/jobs/JobSearch.tsx
    - src/pages/dashboard/employer/ApplicantDashboard.tsx
    - src/pages/dashboard/seeker/MyApplications.tsx

key-decisions:
  - "maybeSingle() used in JobDetail score fetch to avoid PGRST116 when no score row exists yet for a seeker-job pair"
  - "JobDetail triggers generate-match-explanation fire-and-forget when score exists without explanation — enables progressive explanation delivery"
  - "ApplicantDashboard explanation field stored in scoreMap for future rendering when ApplicantPanel is extended with MatchBreakdown"
  - "JobSearch and MyApplications omit explanation from select — these pages show score circles only, not full breakdowns"

patterns-established:
  - "Read match_scores table directly for pre-computed scores — never call compute_match_score or compute_match_scores_batch RPC from frontend"
  - "Conditional AI explanation section: score.explanation && renders section — null/undefined/empty all suppress section cleanly"

requirements-completed: [MTCH-04, MTCH-06]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 4 Plan 03: Frontend Switch to Pre-Computed Scores Summary

**MatchScore type extended with explanation field; all 4 pages switched from query-time RPC scoring to direct match_scores table reads; MatchBreakdown renders conditional AI explanation section**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-16T08:52:01Z
- **Completed:** 2026-03-16T08:56:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `explanation?: string | null` to `MatchScore` interface in domain.ts — flows through all consumers via TypeScript
- `MatchBreakdown` now renders "Why this match" section conditionally below dimension rows when explanation is present — correct typography, border-t separator, inside blur scope for visitors
- All 4 pages (JobDetail, JobSearch, ApplicantDashboard, MyApplications) read from `match_scores` table — zero RPC calls to `compute_match_score` or `compute_match_scores_batch` remain in `src/`
- `ApplicantDashboard` replaced N sequential RPC calls with a single `IN` query — significant performance improvement for employers with many applicants
- `JobDetail` triggers `generate-match-explanation` edge function fire-and-forget when score exists but explanation is missing — enables progressive explanation delivery without blocking page load

## Task Commits

Each task was committed atomically:

1. **Task 1: Update MatchScore type and MatchBreakdown component with AI explanation section** - `f909697` (feat)
2. **Task 2: Switch all 4 pages from RPC scoring to match_scores table reads** - `1090741` (feat)

**Plan metadata:** `(pending)` (docs: complete plan)

## Files Created/Modified
- `src/types/domain.ts` - Added `explanation?: string | null` to MatchScore interface
- `src/components/ui/MatchBreakdown.tsx` - Added conditional "Why this match" AI explanation section below dimension rows
- `src/pages/jobs/JobDetail.tsx` - Reads from match_scores with maybeSingle(), triggers async explanation generation
- `src/pages/jobs/JobSearch.tsx` - Reads from match_scores with .in() batch query
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` - Reads from match_scores with single .in() query, stores explanation in scoreMap
- `src/pages/dashboard/seeker/MyApplications.tsx` - Reads from match_scores with .in() batch query

## Decisions Made
- `maybeSingle()` used in JobDetail score fetch to avoid PGRST116 error when no score row exists yet for a seeker-job pair
- `JobDetail` triggers `generate-match-explanation` fire-and-forget when score exists without explanation — enables progressive explanation delivery
- `ApplicantDashboard` explanation stored in scoreMap even though `ApplicantPanel` doesn't render it yet — ready for future extension
- `JobSearch` and `MyApplications` omit explanation from select — these pages show score circles only, keeping queries minimal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Frontend integration of Phase 4 complete — users see instant pre-computed scores, AI explanations appear on job detail when available
- Phase 4 plan 04 (if any) can proceed with full scoring infrastructure in place
- TypeScript compiles cleanly with no errors

---
*Phase: 04-match-scoring-engine*
*Completed: 2026-03-16*
