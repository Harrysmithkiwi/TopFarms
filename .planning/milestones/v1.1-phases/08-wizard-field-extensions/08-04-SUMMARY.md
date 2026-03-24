---
phase: 08-wizard-field-extensions
plan: "04"
subsystem: seeker-onboarding
tags: [seeker, onboarding, wizard, chip-selector, completion-screen]
dependency_graph:
  requires: [08-01]
  provides: [SONB-01, SONB-03, SONB-04, SONB-05, SONB-06, SONB-07]
  affects: [seeker-profiles, phase-11-matching]
tech_stack:
  added: []
  patterns: [ChipSelector multi-select, react-hook-form Controller, InfoBox]
key_files:
  created: []
  modified:
    - src/pages/onboarding/steps/SeekerStep1FarmType.tsx
    - src/pages/onboarding/steps/SeekerStep3Qualifications.tsx
    - src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx
    - src/pages/onboarding/steps/SeekerStep7Complete.tsx
    - src/pages/onboarding/SeekerOnboarding.tsx
decisions:
  - "Step 7 completion screen stays mounted — shell no longer auto-navigates to /jobs on last step; CTAs on step 7 handle navigation"
  - "region field backward-compat preserved: region set to first element of preferred_regions array in onSubmit"
  - "SeekerStep5 drops pets/family/vehicle_parking schema fields; housing_sub_options ChipSelector replaces all three"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-21"
  tasks_completed: 2
  files_modified: 5
requirements: [SONB-01, SONB-03, SONB-04, SONB-05, SONB-06, SONB-07]
---

# Phase 8 Plan 04: Seeker Steps 1, 3, 5, 7 Field Extensions Summary

**One-liner:** Six-sector ChipSelector farm types, inline licence/cert chips, salary/availability/housing/region chips, and two-column completion screen with match loading state.

## What Was Built

### Task 1: Steps 1, 3, 5 — Field Extensions (commit aa7c244)

**SeekerStep1FarmType.tsx (SONB-01)**
- Removed: 2-card layout with emoji icons and descriptions, `FARM_TYPES` constant
- Added: `ChipSelector` with `FARM_TYPE_OPTIONS` (6 sectors: Dairy, Sheep & Beef, Cropping, Deer, Mixed, Other), `columns={2}` grid
- Kept: existing `useState` pattern per plan (single-field step, no react-hook-form needed)

**SeekerStep3Qualifications.tsx (SONB-03)**
- Extended zod schema: added `licence_types: z.array(z.string()).optional()` and `certifications: z.array(z.string()).optional()`
- Added: NZ driver's licence ChipSelector (inline, 4 classes: Class 1–5)
- Added: Certifications ChipSelector (inline: ATV, tractor, 4WD, first aid, growsafe, chainsaw)
- Both new fields passed through `onComplete` and accepted as `defaultValues`

**SeekerStep5LifeSituation.tsx (SONB-04, SONB-05, SONB-06)**
- Removed: `pets_dogs`, `family_has_children`, `vehicle_parking` from schema and render
- Removed: single-region `Select` component
- Added: `housing_sub_options: z.array(z.string())` ChipSelector (6 items, 2-column), shown when accommodation toggle on
- Added: `preferred_regions: z.array(z.string())` ChipSelector (8 NZ regions, 2-column)
- Added: `min_salary` number input, `availability_date` date input, `notice_period_text` Select (5 options)
- Added: `InfoBox variant="blue"` with "30% more views" copy
- `region` backward-compat: set from `preferred_regions[0]` in `onSubmit`

**SeekerOnboarding.tsx**
- Loads new fields from DB: `licence_types`, `certifications`, `housing_sub_options`, `preferred_regions`, `notice_period_text`
- Passes new fields as `defaultValues` to steps 3 and 5
- Removed auto-navigate-to-/jobs on final step completion — completion screen handles its own CTAs
- Removed unused `useNavigate` import and `navigate` variable
- Passes `profileData` prop to `SeekerStep7Complete`

### Task 2: Step 7 — Two-column Completion Screen (commit 40027ff)

**SeekerStep7Complete.tsx (SONB-07)**
- Full rebuild from single-column loading stub to two-column completion screen
- Left column: success icon (CheckCircle from lucide-react) + heading "Your profile is ready!" + subtitle "We're finding your best matches"
- Profile completeness checklist: 4 items (Farm type preferences set, Experience added, Qualifications complete, Life situation details added) with green/grey dot indicators
- Match loading state: animate-spin spinner + "We're calculating your matches" — static for now, Phase 11 wires real data
- CTAs: Browse Jobs (primary, navigates to /jobs) + Edit Profile (outline, navigates back to /onboarding/seeker)
- Right column (hidden md:block): mini candidate card preview showing location, sector tags, years experience, accommodation badge, visa status

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: `npx tsc --noEmit` passes with 0 errors
- All 6 SONB requirements covered (SONB-02 document upload remains deferred to Phase 11)
- No boolean housing checkboxes remain in Step 5
- Single region Select replaced by multi-select ChipSelector

## Self-Check: PASSED

Files exist:
- src/pages/onboarding/steps/SeekerStep1FarmType.tsx — FOUND
- src/pages/onboarding/steps/SeekerStep3Qualifications.tsx — FOUND
- src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx — FOUND
- src/pages/onboarding/steps/SeekerStep7Complete.tsx — FOUND
- src/pages/onboarding/SeekerOnboarding.tsx — FOUND

Commits:
- aa7c244 — feat(08-04): extend seeker steps 1, 3, 5 with ChipSelector fields — FOUND
- 40027ff — feat(08-04): rebuild seeker step 7 as two-column completion screen — FOUND
