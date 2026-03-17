---
phase: 02-employer-supply-side
plan: "02"
subsystem: ui
tags: [react, supabase, react-hook-form, zod, wizard, onboarding]

# Dependency graph
requires:
  - phase: 02-01
    provides: StepIndicator, useWizard hook, Toggle, Checkbox, Select, TierCard, VerificationBadge, employer_profiles table columns, domain types
  - phase: 01-foundation
    provides: DashboardLayout, ProtectedRoute, useAuth hook, supabase client, routing with createBrowserRouter

provides:
  - 8-screen employer onboarding wizard at /onboarding/employer
  - EmployerOnboarding wizard shell with resume-from-saved-step and auto-save on each step
  - Step1FarmType: farm type selection (dairy/sheep & beef)
  - Step2FarmDetails: farm name, region, herd size, shed type, milking frequency, breed, property size, ownership type
  - Step3Culture: work culture description, team size, about farm with character counters
  - Step4Accommodation: toggle + conditional accommodation details
  - Step5Verification: informational verification introduction screen
  - Step6Pricing: pricing tier preview with first-listing-free badges
  - Step7Preview: read-only profile summary with per-section Edit navigation
  - Step8Complete: success screen with toast and Post Your First Job CTA
  - Updated EmployerDashboard with actual onboarding progress and post-onboarding CTA

affects: [02-03, 02-04, employer-verification, job-posting-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wizard shell owns all database persistence (useWizard hook is navigation-only)
    - Per-step Zod schemas with zodResolver for react-hook-form
    - Supabase upsert with onConflict: 'user_id' for idempotent profile saves
    - Profile loaded on mount via PGRST116 check (no rows = new user, not error)
    - onGoToStep prop pattern for Step7Preview to navigate back to specific steps

key-files:
  created:
    - src/pages/onboarding/EmployerOnboarding.tsx
    - src/pages/onboarding/steps/Step1FarmType.tsx
    - src/pages/onboarding/steps/Step2FarmDetails.tsx
    - src/pages/onboarding/steps/Step3Culture.tsx
    - src/pages/onboarding/steps/Step4Accommodation.tsx
    - src/pages/onboarding/steps/Step5Verification.tsx
    - src/pages/onboarding/steps/Step6Pricing.tsx
    - src/pages/onboarding/steps/Step7Preview.tsx
    - src/pages/onboarding/steps/Step8Complete.tsx
  modified:
    - src/main.tsx
    - src/pages/dashboard/EmployerDashboard.tsx

key-decisions:
  - "Wizard shell owns all Supabase persistence — each step fires upsert with onboarding_step incremented, last step also sets onboarding_complete: true"
  - "PGRST116 error code used to distinguish no-rows (new user) from real DB error — only PGRST116 is silently ignored"
  - "Step5 (Verification) and Step6 (Pricing) pass empty object to onComplete — both are informational screens with no required data collection"
  - "Step7Preview uses onGoToStep prop passed from wizard shell — preserves linear-order architecture while allowing targeted back-navigation"
  - "Step8Complete fires toast.success on mount via useEffect — wizard marks onboarding_complete before rendering step 8"

patterns-established:
  - "StepProps interface pattern: { onComplete: (data) => void; onBack?: () => void; defaultValues?: Partial<Data> }"
  - "Controller wrapper for Radix/custom form controls (Select, Toggle, Checkbox) alongside register() for native inputs"
  - "Conditional field sections: watch() the toggle value, conditionally render dependent fields below"

requirements-completed: [EONB-01, EONB-02, EONB-03, EONB-04, EONB-05, EONB-06]

# Metrics
duration: 4min
completed: "2026-03-15"
---

# Phase 2 Plan 02: Employer Onboarding Wizard Summary

**8-screen employer onboarding wizard with per-step Zod validation, Supabase auto-save via upsert, and resume-from-last-step capability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T11:32:01Z
- **Completed:** 2026-03-15T11:36:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Complete 8-screen wizard shell that loads existing profile on mount, resumes from saved step, and upserts on each step completion
- Steps 1-4 cover farm type, farm details, culture, and accommodation with Zod validation and defaultValues pre-filling
- Steps 5-8 cover verification introduction, pricing preview, profile review with edit navigation, and success completion
- Routing wired: /onboarding/employer now renders EmployerOnboarding inside ProtectedRoute
- EmployerDashboard updated to query actual onboarding progress, shows percentage progress bar and "Continue Setup" or "Post a Job" CTA based on completion state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wizard shell and first 4 onboarding steps** - `8fac068` (feat)
2. **Task 2: Create remaining 4 steps and wire routing** - `25297cb` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/pages/onboarding/EmployerOnboarding.tsx` - Wizard shell: loads profile, owns step state, upserts to employer_profiles
- `src/pages/onboarding/steps/Step1FarmType.tsx` - Farm type radio cards (dairy/sheep & beef)
- `src/pages/onboarding/steps/Step2FarmDetails.tsx` - Farm details form: name, region, herd size, shed type, milking frequency, breed, property size, ownership type
- `src/pages/onboarding/steps/Step3Culture.tsx` - Culture/team form: textareas with char counter, team size
- `src/pages/onboarding/steps/Step4Accommodation.tsx` - Accommodation toggle + conditional details (type, pets, couples, family, utilities)
- `src/pages/onboarding/steps/Step5Verification.tsx` - Verification introduction screen (informational, non-blocking)
- `src/pages/onboarding/steps/Step6Pricing.tsx` - Pricing tier preview with first-listing-free badges
- `src/pages/onboarding/steps/Step7Preview.tsx` - Read-only summary with per-section Edit/goToStep navigation
- `src/pages/onboarding/steps/Step8Complete.tsx` - Success screen: toast on mount, Post Your First Job CTA
- `src/main.tsx` - Replaced OnboardingPlaceholder with real EmployerOnboarding component
- `src/pages/dashboard/EmployerDashboard.tsx` - Added onboarding progress query and dynamic CTA based on completion

## Decisions Made

- Wizard shell owns all Supabase persistence — each step fires upsert with `onboarding_step` incremented; last step also sets `onboarding_complete: true`
- PGRST116 error code used to distinguish no-rows (new user) from real DB error — only PGRST116 is silently ignored
- Step5 (Verification) and Step6 (Pricing) pass empty object to onComplete — both are informational screens
- Step7Preview uses `onGoToStep` prop from wizard shell — enables targeted back-navigation while preserving linear-order architecture

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Employer onboarding wizard complete — employers can navigate all 8 screens, data auto-saves to employer_profiles
- Plan 03 (employer verifications) can build on Step5's verification cards, implementing actual OTP/NZBN/document flows
- Plan 04 (job posting wizard) can use /jobs/new route already linked from Step8Complete CTA
- EmployerDashboard ready to show real job listings once Plan 04 delivers them

## Self-Check: PASSED

All created files exist. All task commits verified:
- 8fac068: Task 1 commit (wizard shell + steps 1-4)
- 25297cb: Task 2 commit (steps 5-8 + routing + dashboard)
- TypeScript: passes with 0 errors

---
*Phase: 02-employer-supply-side*
*Completed: 2026-03-15*
