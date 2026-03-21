---
phase: 08-wizard-field-extensions
plan: 01
subsystem: database, ui
tags: [supabase, react, typescript, wizard, migration, postgres]

# Dependency graph
requires:
  - phase: 07-ui-primitives
    provides: ChipSelector, LivePreviewSidebar, StatusBanner components
provides:
  - 013_phase8_wizard_fields.sql migration with all Phase 8 columns
  - booleanColumnsToChipArray() utility for backward-compat chip preloading
  - computeJobCompleteness() utility for LivePreviewSidebar progress
  - Extended EmployerProfileData interface with 14 Phase 8 fields
  - Extended JobPostingData interface with 15 Phase 8 fields
  - Extended SeekerProfileData interface with 5 Phase 8 fields
  - EmployerOnboarding.tsx shell with new field loading/saving
  - PostJob.tsx shell with LivePreviewSidebar grid layout for steps 2-5
affects:
  - 08-02-PLAN (employer wizard steps using new EmployerProfileData fields)
  - 08-03-PLAN (job wizard steps using new JobPostingData fields)
  - 08-04-PLAN (seeker wizard steps using new SeekerProfileData fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - booleanColumnsToChipArray pattern for migrating boolean columns to chip arrays with backward compat
    - computeJobCompleteness pattern for step-by-step completeness scoring in live preview
    - Phase 8 foundation-first: DB migration + interfaces + utilities before any step UI

key-files:
  created:
    - supabase/migrations/013_phase8_wizard_fields.sql
    - src/lib/wizardUtils.ts
  modified:
    - src/types/domain.ts
    - src/pages/onboarding/EmployerOnboarding.tsx
    - src/pages/jobs/PostJob.tsx

key-decisions:
  - "Boolean accommodation columns (accommodation_pets, accommodation_couples, accommodation_family, accommodation_utilities_included) dropped and migrated to text[] accommodation_extras — avoids dual-field confusion in downstream steps"
  - "booleanColumnsToChipArray() uses null-coalesce in loadProfile: accommodation_extras ?? booleanColumnsToChipArray(data) ensures v1.0 users see pre-populated chips when re-opening wizard"
  - "PostJob.tsx showSidebar = currentStep >= 1 && currentStep <= 4 — LivePreviewSidebar only shown on farm/skills/compensation/description steps, not basics or preview/payment/success"
  - "JobPostingData.sector changed from 'dairy' | 'sheep_beef' union to string to support new sector values (cropping, deer, mixed, other) added in jobs_sector_check constraint update"

patterns-established:
  - "Foundation-first pattern: DB migration + TypeScript interfaces + utility functions MUST precede all step-level UI work to prevent silent NULL persistence"
  - "Wizard shell loading pattern: new fields loaded from DB with null fallback, old boolean fields migrated via booleanColumnsToChipArray, all spread via upsert payload"

requirements-completed: [PJOB-07]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 8 Plan 01: Foundation — DB Migration, TypeScript Interfaces, Wizard Shell Updates Summary

**SQL migration adding 30+ columns across 3 tables with boolean-to-array accommodation migration, TypeScript interface extensions across all 3 wizards, booleanColumnsToChipArray/computeJobCompleteness utilities, and wizard shells updated with LivePreviewSidebar grid layout**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T09:29:09Z
- **Completed:** 2026-03-21T09:33:24Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `013_phase8_wizard_fields.sql` adding accommodation_extras, career_development, breed, milking_frequency, calving_system, qualifications, visa_requirements, pay_frequency, hours, weekend_roster, licence_types, certifications, preferred_regions and more — all Phase 8 columns in one migration with backward-compat boolean-to-array migration
- Expanded `src/types/domain.ts` with 10 new enum types, 15 option constant arrays, extended SeedType to 6 values, extended SeekerProfileData with 5 new fields
- Created `src/lib/wizardUtils.ts` with `booleanColumnsToChipArray()` for legacy profile backward compat and `computeJobCompleteness()` for LivePreviewSidebar completeness display
- Updated `EmployerOnboarding.tsx` shell: removed old boolean accommodation fields, added 14 Phase 8 fields to interface and loadProfile, passes new defaultValues to steps 2-4
- Updated `PostJob.tsx` shell: added 15 Phase 8 fields to JobPostingData, LivePreviewSidebar grid layout for steps 2-5, all new fields persisted in handleStepComplete update payload

## Task Commits

1. **Task 1: DB migration + TypeScript interfaces + wizardUtils** - `04ce19b` (feat)
2. **Task 2: Update wizard shell orchestrators with new field loading/saving** - `3ec184a` (feat)

## Files Created/Modified

- `supabase/migrations/013_phase8_wizard_fields.sql` - All Phase 8 DB columns for employer_profiles, jobs, seeker_profiles; boolean-to-array migration for accommodation
- `src/types/domain.ts` - Expanded ShedType, added Phase 8 enums and option constants, extended SeekerProfileData
- `src/lib/wizardUtils.ts` - booleanColumnsToChipArray() and computeJobCompleteness() utilities
- `src/pages/onboarding/EmployerOnboarding.tsx` - Extended EmployerProfileData, updated loadProfile and step defaultValues
- `src/pages/jobs/PostJob.tsx` - Extended JobPostingData, LivePreviewSidebar grid, updated handleStepComplete

## Decisions Made

- Boolean accommodation columns dropped and migrated to `accommodation_extras text[]` — eliminates dual-field confusion for downstream Phase 8 step components
- `booleanColumnsToChipArray()` used as fallback in `loadProfile` so v1.0 users see their previous boolean selections as selected chips
- `JobPostingData.sector` widened from union type to `string` to support new sector values (cropping, deer, mixed, other) added in migration constraint update
- LivePreviewSidebar shown only on steps 2-5 (`showSidebar = currentStep >= 1 && currentStep <= 4`) — basics step and preview/payment/success steps use single-column layout

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Database migration `013_phase8_wizard_fields.sql` must be applied to Supabase before any Phase 8 wizard step changes go live. Run via Supabase dashboard or CLI: `supabase db push`.

## Next Phase Readiness

- All Phase 8 DB columns exist and are ready for step-level UI to write to them
- EmployerProfileData, JobPostingData, SeekerProfileData interfaces are fully extended
- booleanColumnsToChipArray() available for plans 02-04 step components to use
- computeJobCompleteness() drives LivePreviewSidebar — plans 02-04 can trust it updates in real-time as jobData state updates
- Plans 02-04 (employer steps, job steps, seeker steps) can now proceed without risk of silent NULL persistence

## Self-Check: PASSED

- FOUND: supabase/migrations/013_phase8_wizard_fields.sql
- FOUND: src/lib/wizardUtils.ts
- FOUND: .planning/phases/08-wizard-field-extensions/08-01-SUMMARY.md
- FOUND commit 04ce19b: feat(08-01): DB migration, TypeScript interfaces, and wizardUtils foundation
- FOUND commit 3ec184a: feat(08-01): update wizard shell orchestrators with Phase 8 field loading/saving

---
*Phase: 08-wizard-field-extensions*
*Completed: 2026-03-21*
