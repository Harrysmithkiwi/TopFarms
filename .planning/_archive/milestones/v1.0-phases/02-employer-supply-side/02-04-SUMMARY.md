---
phase: 02-employer-supply-side
plan: "04"
subsystem: ui
tags: [react, react-hook-form, zod, supabase, wizard, job-posting]

# Dependency graph
requires:
  - phase: 02-employer-supply-side
    provides: SkillsPicker, useWizard, StepIndicator, employer_profiles table, EmployerOnboarding pattern
  - phase: 02-employer-supply-side
    provides: employer_profiles onboarding_complete flag for gate redirect
provides:
  - PostJob wizard shell with 6-step job posting flow
  - JobStep1Basics: inserts draft job on first submit
  - JobStep2FarmDetails: pre-fills from employer profile, saves farm operation details
  - JobStep3Skills: saves to job_skills junction table using SkillsPicker in requirementMode
  - JobStep4Compensation: salary range + benefits checkboxes stored as jsonb
  - JobStep5Description: 4 textareas with live character counters
  - JobStep6Preview: read-only summary loaded from DB with per-section Edit buttons
  - Routes /jobs/new and /jobs/:id/edit in main.tsx
affects: [02-05-payment, 03-seeker-search, seeker-job-detail-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wizard shell inserts on step 1, updates on all subsequent steps — job draft lifecycle
    - URL updated with replaceState after insert to enable browser back and refresh
    - Step 3 uses delete+insert pattern for job_skills to handle edits cleanly
    - requirementMode in SkillsPicker maps SelectedSkill.proficiency to required/preferred
    - Preview step loads from DB (not in-memory state) for accuracy

key-files:
  created:
    - src/pages/jobs/PostJob.tsx
    - src/pages/jobs/steps/JobStep1Basics.tsx
    - src/pages/jobs/steps/JobStep2FarmDetails.tsx
    - src/pages/jobs/steps/JobStep3Skills.tsx
    - src/pages/jobs/steps/JobStep4Compensation.tsx
    - src/pages/jobs/steps/JobStep5Description.tsx
    - src/pages/jobs/steps/JobStep6Preview.tsx
  modified:
    - src/main.tsx

key-decisions:
  - "PostJob shell does INSERT on step 1 (no jobId), UPDATE on re-visit (jobId present from URL param)"
  - "URL updated via replaceState after draft insert so /jobs/:id/edit works on reload without losing state"
  - "JobStep3Skills deletes all job_skills then re-inserts on each submit — simple and correct for edit flow"
  - "requirementMode SkillsPicker maps proficiency field: 'advanced' -> required, else -> preferred (with direct pass-through for requirementMode values)"
  - "JobStep6Preview loads from Supabase with job_skills join rather than using wizard state — ensures accuracy"
  - "Onboarding guard: redirect to /onboarding/employer with toast if onboarding_complete is false"

patterns-established:
  - "Job wizard: insert on step 1 to get ID, update for all subsequent steps"
  - "URL sync: use window.history.replaceState after auto-insert to keep URL accurate"
  - "Skills junction: delete+insert pattern for job_skills edits"

requirements-completed: [JPOS-01, JPOS-02, JPOS-03, JPOS-04]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 2 Plan 4: Job Posting Wizard Summary

**6-step job posting wizard inserting draft jobs into Supabase on step 1 and auto-saving on subsequent steps, with SkillsPicker requirementMode saving to job_skills and a DB-loaded preview screen**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T11:38:59Z
- **Completed:** 2026-03-15T11:43:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- PostJob wizard shell with 7-step indicator (6 content + 1 payment placeholder), onboarding guard, and employer profile pre-fill
- Steps 1-3: draft job creation (INSERT) on step 1, farm details + accommodation, skills picker with required/preferred requirement levels saved to job_skills
- Steps 4-6: salary/benefits, 4 description textareas with character counters, read-only preview with Edit buttons per section loaded from DB
- Routes /jobs/new and /jobs/:id/edit wired into main.tsx with employer ProtectedRoute

## Task Commits

Each task was committed atomically:

1. **Task 1: Job posting wizard shell and steps 1-3** - `6db5500` (feat)
2. **Task 2: Create steps 4-6 (compensation, description, preview) and wire routing** - `e282c9a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/jobs/PostJob.tsx` - Wizard shell: loads employer profile, guards onboarding, manages jobId state, owns all DB persistence
- `src/pages/jobs/steps/JobStep1Basics.tsx` - Title, sector radio cards, role_type, contract_type, start_date, region with Zod validation
- `src/pages/jobs/steps/JobStep2FarmDetails.tsx` - Shed type checkboxes, herd size min/max, visa/couples toggles, accommodation section (pre-filled from employer profile)
- `src/pages/jobs/steps/JobStep3Skills.tsx` - SkillsPicker in requirementMode, delete+insert to job_skills on submit
- `src/pages/jobs/steps/JobStep4Compensation.tsx` - Salary range inputs with cross-field validation, benefits checkboxes with free-text Other
- `src/pages/jobs/steps/JobStep5Description.tsx` - 4 textareas with live character counters (overview required, rest optional)
- `src/pages/jobs/steps/JobStep6Preview.tsx` - Full DB fetch with job_skills join, read-only sections with per-section Edit buttons
- `src/main.tsx` - Added /jobs/new and /jobs/:id/edit routes with employer ProtectedRoute

## Decisions Made
- **INSERT on step 1**: No pre-created draft row — job is created atomically on first form submission with status=draft
- **URL sync**: After INSERT, window.history.replaceState updates URL to /jobs/:id/edit so subsequent reloads work correctly
- **Delete+insert for skills**: Simpler and more correct than trying to diff existing records
- **requirementMode skill mapping**: SkillsPicker proficiency field carries 'required'/'preferred' values in requirementMode — passed through to job_skills.requirement_level
- **Preview from DB**: Step 6 re-fetches from Supabase to ensure preview reflects saved state (not stale wizard state)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Job posting wizard complete — employer can create and save a full draft job through 6 content steps
- Plan 05 will add tier selection and payment on step 7 (payment step already included in StepIndicator labels)
- /jobs/:id/edit route enables returning to draft jobs from dashboard (Plan 02-06 adds dashboard draft list)

---
*Phase: 02-employer-supply-side*
*Completed: 2026-03-15*
