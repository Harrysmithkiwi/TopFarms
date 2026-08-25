---
phase: 03-seeker-demand-side
plan: 01
subsystem: database
tags: [postgres, sql, typescript, rls, plpgsql, match-scoring]

# Dependency graph
requires:
  - phase: 02-employer-supply-side
    provides: "jobs table, employer_profiles, applications table, seeker_profiles, seeker_skills"
  - phase: 01-foundation
    provides: "Initial schema (001), RLS policies (002), skills table"
provides:
  - "Migration 009 with seeker onboarding columns (onboarding_step, onboarding_complete, dairynz_level)"
  - "shed_types_experienced and herd_sizes_worked columns on seeker_profiles"
  - "8-stage application pipeline status constraint"
  - "Fixed seeker_skills proficiency to basic/intermediate/advanced"
  - "Employer and seeker UPDATE RLS policies for applications"
  - "get_adjacent_regions() helper function for NZ region proximity"
  - "compute_match_score() SQL function implementing all 7 SPEC 9.1 scoring dimensions"
  - "compute_match_scores_batch() for N+1-free batch scoring on search page"
  - "Full Phase 3 TypeScript domain types (ApplicationStatus, SeekerProfileData, MatchScore, etc.)"
affects: [03-02, 03-03, 03-04, 03-05, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER SQL functions for match scoring (prevents direct table access)"
    - "Batch function pattern (compute_match_scores_batch) to avoid N+1 queries"
    - "CHECK constraint replacement via DROP IF EXISTS + ADD CONSTRAINT"
    - "TypeScript const arrays for enum options (DAIRYNZ_LEVELS, VISA_OPTIONS, etc.)"

key-files:
  created:
    - supabase/migrations/009_seeker_onboarding.sql
  modified:
    - src/types/domain.ts

key-decisions:
  - "Accommodation sub-scoring uses rounded int arithmetic (10 base + up to 10 from sub-scores) — avoids float precision issues in SQL"
  - "Location scoring: open_to_relocate=true gives 16pts (80%) which outranks adjacency (12pts/60%) — rewards flexibility explicitly"
  - "compute_match_score returns early with 0 score if seeker or job not found — prevents null reference errors in batch callers"
  - "Couples bonus is additive (not within accommodation) — reflects SPEC 9.1 as a separate +5 dimension"
  - "Recency multiplier applied after all dimension sums — prevents double-counting with individual dimension caps"

patterns-established:
  - "Match scoring: SQL function returns jsonb with total_score + breakdown object — batch function loops and returns TABLE"
  - "Phase 3 types: all seeker-side enums exported as const arrays with value/label shape for UI consumption"

requirements-completed: [SONB-01, SONB-07, APPL-01, APPL-02, APPL-05, SRCH-11]

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 3 Plan 1: Seeker Onboarding Foundation Summary

**SQL migration adding onboarding columns, 8-stage application pipeline, three SQL scoring functions (single + batch), and full TypeScript domain types for the seeker demand side**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T00:16:15Z
- **Completed:** 2026-03-16T00:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Schema migration 009 extends seeker_profiles with onboarding tracking + experience columns, fixes application status to 8-stage pipeline, fixes seeker_skills proficiency values, adds two application UPDATE RLS policies, and creates three SQL functions (get_adjacent_regions, compute_match_score, compute_match_scores_batch)
- compute_match_score implements all 7 SPEC 9.1 dimensions: shed type (25pts), location (20pts), accommodation (20pts), skills (20pts), salary (10pts), visa (5pts), couples (+5pts) with 7-day recency x1.1 multiplier
- domain.ts extended with 14 new exports covering ApplicationStatus + VALID_TRANSITIONS, seeker enums (DairyNZLevel, VisaStatus, HerdSizeBucket, ShedType), all enum option arrays, SeekerProfileData interface, MatchBreakdown + MatchScore interfaces, and Application interface

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration 009_seeker_onboarding.sql** - `8ed9d03` (feat)
2. **Task 2: Extend domain types for Phase 3** - `3b6ab84` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/009_seeker_onboarding.sql` - Seeker onboarding schema: new columns, fixed constraints, RLS UPDATE policies, get_adjacent_regions(), compute_match_score(), compute_match_scores_batch()
- `src/types/domain.ts` - Extended with all Phase 3 types: ApplicationStatus, VALID_TRANSITIONS, APPLICATION_STATUS_LABELS, ACTIVE_STATUSES, COMPLETED_STATUSES, DairyNZLevel, VisaStatus, HerdSizeBucket, ShedType, DAIRYNZ_LEVELS, VISA_OPTIONS, HERD_SIZE_BUCKETS, SHED_TYPES, SeekerProfileData, MatchBreakdown, MatchScore, Application

## Decisions Made
- Accommodation sub-scoring uses rounded int arithmetic — avoids float precision issues in SQL
- Location scoring: open_to_relocate gives 16pts (80%) which outranks adjacency (12pts/60%), rewarding flexibility
- compute_match_score returns early with 0 score if seeker or job not found — null-safety for batch callers
- Couples bonus stays separate from accommodation scoring per SPEC 9.1
- Recency multiplier applied after summing all dimensions to prevent double-counting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Migration 009 and domain types provide the complete foundation for all Phase 3 plans
- 03-02 (seeker onboarding wizard) can now save to onboarding_step, onboarding_complete, dairynz_level, shed_types_experienced, herd_sizes_worked
- 03-03 (application flow) can use the 8-stage ApplicationStatus pipeline and VALID_TRANSITIONS
- 03-04 (search/match) can call compute_match_score and compute_match_scores_batch from the frontend
- All Phase 3 components can import types from src/types/domain.ts

## Self-Check: PASSED

- FOUND: supabase/migrations/009_seeker_onboarding.sql
- FOUND: src/types/domain.ts
- FOUND: .planning/phases/03-seeker-demand-side/03-01-SUMMARY.md
- FOUND: commit 8ed9d03 (feat(03-01): add seeker onboarding schema migration 009)
- FOUND: commit 3b6ab84 (feat(03-01): extend domain types for Phase 3 seeker demand side)

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*
