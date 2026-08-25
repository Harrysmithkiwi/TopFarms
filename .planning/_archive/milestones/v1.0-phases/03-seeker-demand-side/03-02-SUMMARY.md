---
phase: 03-seeker-demand-side
plan: 02
subsystem: ui
tags: [react, supabase, wizard, onboarding, seeker, skills]

# Dependency graph
requires:
  - phase: 03-01
    provides: "SeekerProfileData types, DAIRYNZ_LEVELS, VISA_OPTIONS, HERD_SIZE_BUCKETS, SHED_TYPES, seeker_profiles and seeker_skills DB schema"
  - phase: 02-01
    provides: "useWizard, StepIndicator, SkillsPicker, DashboardLayout, Checkbox, Toggle, Select, Input components"
provides:
  - "SeekerOnboarding 7-step wizard with Supabase seeker_profiles upsert and resume from saved step"
  - "SeekerStep1FarmType: multi-select sector_pref (dairy/sheep_beef)"
  - "SeekerStep2Experience: years_experience, shed_types_experienced, herd_sizes_worked checkboxes"
  - "SeekerStep3Qualifications: dairynz_level select with descriptions"
  - "SeekerStep4Skills: SkillsPicker proficiency mode with delete+insert to seeker_skills"
  - "SeekerStep5LifeSituation: couples toggle, accommodation toggle with sub-options, NZ region select"
  - "SeekerStep6Visa: visa_status select with privacy info box"
  - "SeekerStep7Complete: success screen shown during final save"
  - "/onboarding/seeker route wired to SeekerOnboarding (replacing placeholder)"
affects: [03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wizard shell owns seeker_profiles upsert; seekerProfileId tracked for skills step"
    - "Skills step uses delete+insert to seeker_skills (same as job skills pattern)"
    - "Multi-select farm type stored as sector_pref string array (vs employer single string)"

key-files:
  created:
    - src/pages/onboarding/SeekerOnboarding.tsx
    - src/pages/onboarding/steps/SeekerStep1FarmType.tsx
    - src/pages/onboarding/steps/SeekerStep2Experience.tsx
    - src/pages/onboarding/steps/SeekerStep3Qualifications.tsx
    - src/pages/onboarding/steps/SeekerStep4Skills.tsx
    - src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx
    - src/pages/onboarding/steps/SeekerStep6Visa.tsx
    - src/pages/onboarding/steps/SeekerStep7Complete.tsx
  modified:
    - src/main.tsx

key-decisions:
  - "SeekerOnboarding.tsx tracks seekerProfileId in state, set from first seeker_profiles upsert response — enables skills step to do delete+insert without requiring a pre-existing profile row"
  - "SkillsPicker sector prop: if only sheep_beef in sector_pref show sheep_beef skills, otherwise default to dairy — avoids type error and provides sensible default"
  - "SeekerStep6Visa is the last data step (index 5) — wizard shell navigates to /jobs with toast after this step; SeekerStep7Complete is a transient success screen"
  - "Post-onboarding navigation: /jobs?sector={firstSector}&region={region} using URLSearchParams for clean param handling"

patterns-established:
  - "Seeker wizard mirrors employer wizard exactly: useWizard, StepIndicator, handleStepComplete upsert pattern, PGRST116 resume"

requirements-completed: [SONB-01, SONB-02, SONB-03, SONB-04, SONB-05, SONB-06, SONB-07, SONB-08]

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 3 Plan 02: Seeker Onboarding Wizard Summary

**7-step seeker onboarding wizard with Supabase persistence, SkillsPicker proficiency mode, and post-completion redirect to /jobs with sector and region filters**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T01:41:23Z
- **Completed:** 2026-03-16T02:01:43Z
- **Tasks:** 2
- **Files modified:** 9 (8 created + main.tsx)

## Accomplishments
- SeekerOnboarding shell with upsert-per-step persistence, PGRST116 resume, and seekerProfileId tracking for skills step
- Steps 1-3: farm type multi-select (sector_pref), experience with shed/herd checkboxes, DairyNZ qualification select with level descriptions
- Steps 4-7: SkillsPicker with delete+insert to seeker_skills, life situation toggles with NZ region, visa status with privacy info, completion screen
- Route wired: /onboarding/seeker now renders SeekerOnboarding instead of placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: SeekerOnboarding wizard shell + steps 1-3** - `9aa3707` (feat)
2. **Task 2: Seeker onboarding steps 4-7** - `3f31243` (feat)
3. **[Deviation Rule 3] Wire route** - `0c5f8be` (feat)

## Files Created/Modified
- `src/pages/onboarding/SeekerOnboarding.tsx` - Wizard shell with 7-step navigation, supabase persistence, resume logic
- `src/pages/onboarding/steps/SeekerStep1FarmType.tsx` - Multi-select farm type preference
- `src/pages/onboarding/steps/SeekerStep2Experience.tsx` - Years experience + shed types + herd sizes
- `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx` - DairyNZ level select with descriptions
- `src/pages/onboarding/steps/SeekerStep4Skills.tsx` - SkillsPicker (proficiency mode) with seeker_skills delete+insert
- `src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx` - Couples/accommodation toggles, NZ region select
- `src/pages/onboarding/steps/SeekerStep6Visa.tsx` - Visa status select with privacy info box
- `src/pages/onboarding/steps/SeekerStep7Complete.tsx` - Success screen with spinner (shown during final save)
- `src/main.tsx` - SeekerOnboarding import + route wiring

## Decisions Made
- `seekerProfileId` tracked in wizard shell state, populated from upsert response — needed because seeker_skills requires seeker profile UUID (not user_id)
- SkillsPicker sector defaulting: sheep_beef if that's the only selection, otherwise dairy — prevents passing a union string type
- SeekerStep7Complete has no toast (wizard shell fires toast + navigation on step 6 completion); step 7 is a transient screen that shows the spinner while redirect happens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired /onboarding/seeker route to SeekerOnboarding**
- **Found during:** Post-task verification
- **Issue:** Route was pointing to `OnboardingPlaceholder` instead of the just-built SeekerOnboarding component
- **Fix:** Added SeekerOnboarding import to main.tsx and replaced OnboardingPlaceholder in route
- **Files modified:** src/main.tsx
- **Verification:** Build passes with no new errors
- **Committed in:** 0c5f8be (feat: wire route)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required for component to be reachable. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in useAuth.ts, supabase.ts, stripe.ts, main.tsx (import.meta.env type issues), and EmployerOnboarding.tsx — none caused by this plan. Build errors confirmed to not originate from any new SeekerOnboarding files.

## Next Phase Readiness
- Seeker onboarding complete — seekers can now build full profiles with sector, experience, qualifications, skills, life situation, and visa
- Ready for Phase 03-03: Job search / browse page (seekers can search with profile-based match scores)
- Seeker profile data (sector_pref, region) available for pre-filtering the jobs page post-onboarding

---
*Phase: 03-seeker-demand-side*
*Completed: 2026-03-16*
