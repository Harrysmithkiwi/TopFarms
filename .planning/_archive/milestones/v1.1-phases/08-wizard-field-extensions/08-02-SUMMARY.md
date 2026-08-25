---
phase: 08-wizard-field-extensions
plan: 02
subsystem: employer-onboarding
tags: [wizard, chips, form, onboarding, accommodation, career-dev, billing, completion-screen]
dependency_graph:
  requires: [08-01]
  provides: [EONB-01, EONB-02, EONB-03, EONB-04, EONB-05, EONB-06, EONB-07, EONB-08, EONB-09]
  affects: [employer-onboarding-wizard, Step2FarmDetails, Step3Culture, Step4Accommodation, Step7Preview, Step8Complete]
tech_stack:
  patterns: [ChipSelector, InfoBox, Toggle, react-hook-form Controller, zod refine]
key_files:
  modified:
    - src/pages/onboarding/steps/Step2FarmDetails.tsx
    - src/pages/onboarding/steps/Step3Culture.tsx
    - src/pages/onboarding/steps/Step4Accommodation.tsx
    - src/pages/onboarding/steps/Step7Preview.tsx
    - src/pages/onboarding/steps/Step8Complete.tsx
    - src/pages/onboarding/EmployerOnboarding.tsx
decisions:
  - "Step2 ownership_type widened from string to string[] to support multi-select ChipSelector; backward compat via Array.isArray check in defaultValues"
  - "Step4 merged career dev + accommodation + salary into one step (Work & Accommodation) per SPEC EONB-04/06/07"
  - "Step8Complete no longer uses onComplete/Link — uses useNavigate for CTAs; EmployerOnboarding removes navigate from handleStepComplete last-step path"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 3
  files_modified: 6
requirements: [EONB-01, EONB-02, EONB-03, EONB-04, EONB-05, EONB-06, EONB-07, EONB-08, EONB-09]
---

# Phase 08 Plan 02: Wizard Field Extensions — Step UI Updates Summary

**One-liner:** ChipSelectors for farm/ownership/shed types, culture char limits 175/400, career dev + accommodation extras chips, salary range, billing toggle, and two-column completion screen across 5 wizard steps.

## What Was Built

### Task 1: Step 2 + Step 3

**Step2FarmDetails.tsx:**
- Replaced 3-option Checkbox shed_type with 6-option `ChipSelector` (inline, multi-select) using `SHED_TYPES` from domain.ts
- Added `farm_types` ChipSelector (2-column, multi-select) using `FARM_TYPE_OPTIONS` — 6 farm type options
- Added `ownership_type` ChipSelector (2-column, multi-select) using `OWNERSHIP_TYPE_OPTIONS` — replacing old single-select dropdown
- Schema updated: `farm_types` required (min 1), `ownership_type` as `string[]`, `shed_type` required (min 1)
- `defaultValues` handles backward compat for old single-string `ownership_type`

**Step3Culture.tsx:**
- Char limits reduced from 2000 to 175 (culture_description) and 400 (about_farm) — SPEC v3.0 requirement
- Added `calving_system` via Controller + Select (CALVING_SYSTEM_OPTIONS: Spring/Autumn/Split/Year Round)
- Added `nearest_town` text Input
- Added `distance_from_town_km` via Controller + Select (DISTANCE_OPTIONS)
- Conditional `InfoBox variant="hay"` when distance is `>30km` or `>50km`
- Watch on `distance_from_town_km` feeds `showDistanceWarning` flag

### Task 2: Step 4 + Step 7

**Step4Accommodation.tsx** (fully rebuilt — "Work & Accommodation"):
- Removed all `Checkbox` imports and usage
- Added career development `ChipSelector` (2-column, CAREER_DEV_OPTIONS: 6 options)
- Added hiring frequency Select (HIRING_FREQUENCY_OPTIONS)
- Added couples welcome Toggle with conditional partner role Select
- Blue InfoBox stat: "76% of seekers need accommodation — listings with it get 2x more applications"
- Accommodation extras replaced 4 Checkboxes with ChipSelector (2-column, ACCOMMODATION_EXTRAS_OPTIONS: 8 items)
- Vehicle provided Toggle with conditional vehicle_types ChipSelector (inline)
- Broadband available Toggle
- Salary range: two-column min/max Number Inputs with zod refine cross-validation (max > min)
- Second blue InfoBox: "Market rate for Farm Manager: $55k-$75k NZD"

**Step7Preview.tsx:**
- Added `billingPeriod` state (defaults to profileData.billing_period ?? 'monthly')
- Monthly/Annual Toggle with "Save 20%" badge shown when annual is active
- `onComplete` now passes `{ billing_period: billingPeriod }`

### Task 3: Step 8 Completion Screen

**Step8Complete.tsx** (fully rebuilt):
- Two-column grid (`grid-cols-1 md:grid-cols-2`) — single column on mobile
- Left column: CheckCircle icon (hay-lt background, fern color) + h2 in Fraunces/soil, 4-item completeness checklist with fern/fog indicators, 3 CTAs (Post Your First Job [primary], Go to Dashboard [outline], Edit Profile [text link])
- Right column (hidden on mobile): mini farm preview card with soil header, region, farm_types chips, accommodation badge, about_farm preview
- Uses `useNavigate` for CTA navigation — no more Link components

**EmployerOnboarding.tsx:**
- Passes `profileData` subset to `Step8Complete`
- Removed `navigate('/dashboard/employer')` from last-step handler (Step8 handles own navigation)
- Removed unused `useNavigate` import

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `navigate` and `useNavigate` from EmployerOnboarding**
- **Found during:** Task 3
- **Issue:** After removing the `navigate('/dashboard/employer')` call from `handleStepComplete`, the `navigate` variable and `useNavigate` import became unused — TypeScript would emit a "declared but never read" error
- **Fix:** Removed both the import and the variable declaration
- **Files modified:** src/pages/onboarding/EmployerOnboarding.tsx
- **Commit:** 6474a9f

## Self-Check: PASSED

All 6 modified files confirmed present on disk. All 3 task commits verified in git log. TypeScript compiles cleanly with zero errors.
