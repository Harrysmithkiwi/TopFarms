---
phase: 03-seeker-demand-side
plan: 05
subsystem: ui
tags: [react, supabase, application-pipeline, match-scoring]

# Dependency graph
requires:
  - phase: 03-01
    provides: "ApplicationStatus, VALID_TRANSITIONS, ACTIVE_STATUSES, COMPLETED_STATUSES, compute_match_scores_batch RPC"
  - phase: 03-04
    provides: "MatchCircle, Tag, Select UI components; DashboardLayout"

provides:
  - "MyApplications page: seeker views and withdraws applications grouped by active/completed"
  - "ApplicationCard component: status-tagged card with match circle and withdraw button"
  - "ApplicantDashboard page: employer views ranked applicants per job with pipeline transitions"
  - "ApplicantPanel component: expandable accordion with seeker profile, skills, match highlights, stage dropdown"

affects:
  - 03-seeker-demand-side
  - main.tsx route wiring (routes needed for both pages)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase nested join returns array for foreign key joins — normalise with Array.isArray check"
    - "Batch match scores via compute_match_scores_batch RPC, build Map<id, MatchScore> for O(1) lookup"
    - "Applicant sorted by match score descending after loading all scores"
    - "Expand/collapse accordion: single expandedId state, only one open at a time"

key-files:
  created:
    - src/components/ui/ApplicationCard.tsx
    - src/pages/dashboard/seeker/MyApplications.tsx
    - src/components/ui/ApplicantPanel.tsx
    - src/pages/dashboard/employer/ApplicantDashboard.tsx
  modified: []

key-decisions:
  - "ApplicationCard withdraw: window.confirm() guard before calling onWithdraw callback — prevents accidental withdrawals"
  - "ApplicantDashboard scores: compute_match_scores_batch called per-seeker (not per-job) since function takes seeker_id + job_ids array"
  - "ApplicantPanel match highlights: top 3 highlights derived from MatchBreakdown thresholds (shed_type>15, location>=16, accommodation>15) not a full breakdown"
  - "VALID_TRANSITIONS empty array check renders 'Final stage' text instead of empty dropdown for hired/declined/withdrawn"
  - "Supabase seeker_profiles join returns array — normalised to object with Array.isArray(sp) ? sp[0] : sp pattern"

patterns-established:
  - "Status Tag variant mapping: applied=blue, review=hay, interview=orange, shortlisted=purple, offered/hired=green, declined=red, withdrawn=grey"
  - "Proficiency Tag variant: basic=grey, intermediate=hay, advanced=green"

requirements-completed: [APPL-02, APPL-03, APPL-04, APPL-05, APPL-06]

# Metrics
duration: 22min
completed: 2026-03-16
---

# Phase 3 Plan 05: Application Tracking Views Summary

**Seeker My Applications page (grouped active/completed with withdraw) and employer Applicant Dashboard (ranked applicants, expandable profiles, pipeline stage transitions)**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-16T03:51:25Z
- **Completed:** 2026-03-16T04:13:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Seeker can view all applications split into Active and Completed sections, see per-job match scores via batch RPC, and withdraw active applications with confirm dialog
- Employer can view ranked (by match score) applicants for any job, expand accordion panels to see full seeker profile details (region, experience, visa, DairyNZ level, shed types, herd sizes, accommodation, couples seeking), skills with proficiency tags, match highlights, and cover note
- Pipeline stage transitions enforce VALID_TRANSITIONS state machine — dropdown only shows valid next states; terminal stages show "Final stage" text instead

## Task Commits

1. **Task 1: Seeker My Applications page + ApplicationCard** - `aeb8e40` (feat)
2. **Task 2: Employer Applicant Dashboard + ApplicantPanel** - `1cab7e4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/ui/ApplicationCard.tsx` - Status-tagged card showing job title, farm name, applied date, match circle, withdraw button
- `src/pages/dashboard/seeker/MyApplications.tsx` - Full seeker applications view with batch match score loading and withdraw handler
- `src/components/ui/ApplicantPanel.tsx` - Accordion row: collapsed shows seeker summary + match circle + status; expanded shows profile grid, skills, match highlights, cover note, stage transition dropdown
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` - Employer applicants per job: ownership check, sorted by match score, handleTransition updates pipeline stage

## Decisions Made

- `ApplicationCard` withdraw uses `window.confirm()` guard before calling `onWithdraw` — prevents accidental withdrawals, consistent with plan spec
- `ApplicantDashboard` calls `compute_match_scores_batch` per seeker with the single job ID (function signature is `p_seeker_id + p_job_ids`) since the RPC is seeker-centric, not job-centric
- Match highlights derive 2-3 key insights from `MatchBreakdown` thresholds rather than showing raw scores — user-friendly summary per locked decision
- `VALID_TRANSITIONS[status].length === 0` triggers "Final stage" text for hired/declined/withdrawn — no empty dropdown shown

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase nested join returning array for seeker_profiles**
- **Found during:** Task 2 (ApplicantDashboard)
- **Issue:** Supabase returns `seeker_profiles` as an array (not object) for foreign key joins in `select()` queries, causing TypeScript type error and potential runtime issue
- **Fix:** Added `Array.isArray(sp) ? sp[0] : sp` normalisation when mapping appData to Applicant array
- **Files modified:** src/pages/dashboard/employer/ApplicantDashboard.tsx
- **Verification:** TypeScript error resolved, no errors in new files
- **Committed in:** 1cab7e4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessary for correct runtime behaviour with Supabase join response shape. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in useAuth.ts, stripe.ts, supabase.ts, main.tsx, EmployerOnboarding.tsx existed before this plan (12 errors) — our changes added 0 new errors (ended at 11 total, net improvement from removing unused seekerProfileId state)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Application pipeline views complete on both sides
- Routes for `/dashboard/seeker/applications` and `/dashboard/employer/jobs/:id/applicants` still need wiring in `main.tsx` (likely in plan 03-06 or similar route-wiring plan)
- Both components export named exports ready for route registration

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*
