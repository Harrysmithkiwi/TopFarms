---
phase: 08-wizard-field-extensions
plan: "03"
subsystem: post-job-wizard
tags: [wizard, form, chips, compensation, step-extensions]
dependency_graph:
  requires: ["08-01"]
  provides: [post-job-wizard-full-fieldset]
  affects: [JobStep1Basics, JobStep2FarmDetails, JobStep3Skills, JobStep4Compensation, JobStep5Description, JobStep8Success, PostJob]
tech_stack:
  added: []
  patterns: [ChipSelector-multi, InfoBox-hay-warning, two-column-stats-panel, react-hook-form-controller]
key_files:
  created: []
  modified:
    - src/pages/jobs/steps/JobStep1Basics.tsx
    - src/pages/jobs/steps/JobStep2FarmDetails.tsx
    - src/pages/jobs/steps/JobStep3Skills.tsx
    - src/pages/jobs/steps/JobStep4Compensation.tsx
    - src/pages/jobs/steps/JobStep5Description.tsx
    - src/pages/jobs/steps/JobStep8Success.tsx
    - src/pages/jobs/PostJob.tsx
decisions:
  - "Step 1 sector field converted from enum radio cards to Select using FARM_TYPE_OPTIONS to support expanded sectors (cropping, deer, mixed, other)"
  - "JobStep3Skills uses useState rather than react-hook-form for new fields — SkillsPicker already controls async DB submission, simpler to manage new fields with local state"
  - "Step 8 stats are static placeholder numbers — Phase 11 wires real data"
metrics:
  duration_seconds: 219
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
  completed_date: "2026-03-21"
---

# Phase 8 Plan 3: Wizard Field Extensions — Step Content Summary

All post job wizard steps extended with full SPEC v3.0 field set. Step 1 has two-column layout with soil stats panel, step 2 has ChipSelector shed type plus 6 new farm detail fields, step 3 adds experience/qualification/visa chips, step 4 has compensation details, step 5 enforces SPEC char limits (175/400), and step 8 shows a stats grid.

## Tasks Completed

### Task 1: Steps 1-3 — Two-column basics, farm details + chips, skills + qualifications

**Commit:** 612ab1f

**JobStep1Basics.tsx (PJOB-01):**
- Restructured to `grid-cols-[280px_1fr]` two-column layout
- Left panel with `var(--color-soil)` background and stats: 85% / 500+ / 92%
- Right panel with `var(--color-cream)` background containing form
- Sector changed from enum radio cards to `Select` using `FARM_TYPE_OPTIONS` (supports all 6 sector types)

**JobStep2FarmDetails.tsx (PJOB-02, PJOB-03):**
- Replaced `Checkbox` shed type controls with `ChipSelector` using `SHED_TYPES` (6 options, inline, multi)
- Added: breed (Input), milking_frequency (Select), calving_system (Select using `CALVING_SYSTEM_OPTIONS`)
- Added: farm_area_ha (Input with hectares hint), nearest_town (Input)
- Added: distance_from_town_km (Select using `DISTANCE_OPTIONS`) with InfoBox hay warning for `>30km`/`>50km`
- Schema extended with all new fields via `z.string().optional()`

**JobStep3Skills.tsx (PJOB-04):**
- Added `MIN_DAIRY_EXPERIENCE_OPTIONS` and `SENIORITY_OPTIONS` Select fields
- Added `QUALIFICATION_OPTIONS` ChipSelector (2-col, multi)
- Added `VISA_CHIP_OPTIONS` ChipSelector (2-col, multi)
- `onComplete` signature changed from `() => void` to `(data: Record<string, unknown>) => void`
- New field data passed back via `onComplete({ min_dairy_experience, seniority_level, qualifications, visa_requirements })`

**PostJob.tsx:**
- JobStep3Skills now receives `defaultValues` with all 4 new fields
- `onComplete` callback passes data to `handleStepComplete(data as Partial<JobPostingData>, 2)`

---

### Task 2: Steps 4-5 + Step 8 — Compensation details, char limits, success stats

**Commit:** 0f2f3fc

**JobStep4Compensation.tsx (PJOB-05):**
- Added `PAY_FREQUENCY_OPTIONS` Select (weekly/fortnightly/monthly)
- Added on_call_allowance Toggle (with `var(--color-mid)` description)
- Added hours_min/hours_max side-by-side Inputs in `grid-cols-2`
- Added `WEEKEND_ROSTER_OPTIONS` Select
- Added `InfoBox variant="blue"` market rate hint ($55k-$75k NZD)
- Refine updated to `salary_min < salary_max` (strict less-than per SPEC)
- `trigger('salary_max')` on salary_max blur
- `onComplete` passes all new fields through

**JobStep5Description.tsx (PJOB-06):**
- `description_overview`: changed from `.max(5000)` to `.max(175, 'Maximum 175 characters')`
- `description_daytoday`, `description_offer`, `description_ideal`: changed from `.max(3000)` to `.max(400, 'Maximum 400 characters')`
- All `maxLength` attributes on textareas updated to match

**JobStep8Success.tsx (PJOB-08):**
- Added 3-column stats grid: "avg days to first applicant" (3), "seekers in match pool" (120+), "actively looking" (85%)
- Stats use `var(--color-moss)` numbers and `var(--color-mid)` labels
- Positioned above Actions section, full-width with `max-w-md`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Step 1 sector radio cards removed in favor of Select**

- **Found during:** Task 1
- **Issue:** Plan specified expanding `sector` to include new values from `FARM_TYPE_OPTIONS`, but the existing radio card UI hard-coded only `dairy` and `sheep_beef`. The `SECTORS` array would need to be extended AND the enum constraint changed to `z.string()`. Rather than maintaining a parallel radio card array alongside `FARM_TYPE_OPTIONS`, the field was converted to a `Select` component — which is cleaner, handles all 6 options without UI sprawl, and matches the pattern used for all other single-choice fields in the wizard.
- **Fix:** Replaced radio card buttons with `<Select options={FARM_TYPE_OPTIONS} />` using `Controller`. Schema changed from `z.enum([...])` to `z.string().min(1)`.
- **Files modified:** `src/pages/jobs/steps/JobStep1Basics.tsx`
- **Commit:** 612ab1f

No other deviations — plan executed as written for all remaining items.

## Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors
- No `<Checkbox` for shed type remains in JobStep2FarmDetails
- All 8 PJOB requirements (PJOB-01 through PJOB-08) addressed
- New fields in handleStepComplete update payloads (already wired in plan 01)
- JobStep3Skills returns new field data via onComplete callback

## Self-Check: PASSED

Files confirmed present:
- src/pages/jobs/steps/JobStep1Basics.tsx — FOUND
- src/pages/jobs/steps/JobStep2FarmDetails.tsx — FOUND
- src/pages/jobs/steps/JobStep3Skills.tsx — FOUND
- src/pages/jobs/steps/JobStep4Compensation.tsx — FOUND
- src/pages/jobs/steps/JobStep5Description.tsx — FOUND
- src/pages/jobs/steps/JobStep8Success.tsx — FOUND
- src/pages/jobs/PostJob.tsx — FOUND

Commits confirmed:
- 612ab1f — feat(08-03): Steps 1-3
- 0f2f3fc — feat(08-03): Steps 4-5 + Step 8
