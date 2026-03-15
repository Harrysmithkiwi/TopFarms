---
phase: 02-employer-supply-side
plan: "01"
subsystem: database, ui
tags: [react, supabase, postgres, react-dropzone, stripe, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: existing employer_profiles, jobs, skills tables; Button, Checkbox, Select UI components; useAuth hook; Tailwind v4 design system (moss/fern/fog/mist CSS variables)
provides:
  - 4 database migrations adding employer onboarding columns, employer_verifications table, paused job status, and storage buckets
  - StepIndicator component for wizard navigation
  - FileDropzone component with Supabase Storage upload
  - SkillsPicker component with grouped checklist and proficiency selection
  - TierCard component for listing tier comparison
  - JobCard component for dashboard job management
  - VerificationBadge component with expandable trust details
  - useWizard hook for multi-step navigation state
  - useVerifications hook with TrustLevel computation
  - Extended domain types: JobStatus, VerificationMethod, TrustLevel, SkillProficiency, EmployerVerification, Skill, SelectedSkill, JobListing, LISTING_TIERS
affects: [02-02-onboarding-wizard, 02-03-job-posting-wizard, 02-04-verification-system, 02-05-stripe-payment, 02-06-job-management]

# Tech tracking
tech-stack:
  added:
    - react-dropzone@15.0.0 (drag-and-drop file upload)
    - "@stripe/stripe-js@8.9.0 (Stripe.js browser loader)"
    - "@stripe/react-stripe-js@5.6.1 (PaymentElement React component)"
  patterns:
    - Per-step RHF form instances in wizard shell (parent owns step state, each step is standalone form)
    - Supabase Storage uploads via storage.from(bucket).upload() with upsert:true
    - Aggregate TrustLevel computed client-side from employer_verifications records
    - RLS path-scoping using storage.foldername(name)[1] = auth.uid()::text

key-files:
  created:
    - supabase/migrations/004_employer_profile_columns.sql
    - supabase/migrations/005_employer_verifications.sql
    - supabase/migrations/006_jobs_status_and_benefits.sql
    - supabase/migrations/007_storage_buckets.sql
    - src/hooks/useWizard.ts
    - src/hooks/useVerifications.ts
    - src/components/ui/StepIndicator.tsx
    - src/components/ui/FileDropzone.tsx
    - src/components/ui/SkillsPicker.tsx
    - src/components/ui/TierCard.tsx
    - src/components/ui/JobCard.tsx
    - src/components/ui/VerificationBadge.tsx
  modified:
    - src/types/domain.ts (extended with Phase 2 types)
    - package.json (3 new dependencies)

key-decisions:
  - "useWizard is 0-indexed with progress = (currentStep / (totalSteps - 1)) * 100 — wizard shell owns database persistence, hook only manages navigation state"
  - "employer_verifications uses UNIQUE(employer_id, method) — each method has one record per employer, upserted on verification event"
  - "TrustLevel computed from verifications: unverified → no verified records; basic → email; verified → email+phone; fully_verified → email+phone+(nzbn or document)+farm_photo"
  - "Storage buckets use path-scoped RLS via storage.foldername(name)[1] = auth.uid()::text to prevent path guessing even in public buckets"
  - "SkillsPicker's requirementMode prop allows reuse for both seeker proficiency (basic/intermediate/advanced) and job posting requirement (required/preferred)"
  - "JobCard's onPause handler is reused for Resume action (status-based conditional rendering determines which button appears)"

patterns-established:
  - "Pattern: Supabase Storage upload — storage.from(bucket).upload(filePath, file, { upsert: true }) then getPublicUrl(filePath)"
  - "Pattern: TrustLevel computation from Set of verified methods — Set membership check for unverified/basic/verified/fully_verified thresholds"
  - "Pattern: CSS variable colors in Tailwind — bg-moss, bg-fern, bg-fog, text-mid, text-light match project design system from Phase 1"

requirements-completed: [EONB-03, EONB-04, EONB-05, EONB-06, EVER-01, JPOS-06]

# Metrics
duration: 5min
completed: "2026-03-15"
---

# Phase 2 Plan 01: Foundation — Migrations, Shared Components, and Hooks Summary

**4 SQL migrations unblocking all Phase 2 features, plus 6 reusable UI components and 2 hooks for wizard navigation and verification state across the employer supply side**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-15T11:24:00Z
- **Completed:** 2026-03-15T11:28:32Z
- **Tasks:** 2
- **Files modified:** 13 (4 migrations, 6 UI components, 2 hooks, domain.ts, package.json)

## Accomplishments
- 4 database migrations created covering all Phase 2 schema gaps: employer profile columns (culture, accommodation, onboarding tracking, property size), employer_verifications table with full RLS, paused job status + benefits column, and Supabase Storage buckets with path-scoped RLS
- 6 shared UI components ready for use across onboarding and job posting wizards: StepIndicator, FileDropzone, SkillsPicker, TierCard, JobCard, VerificationBadge
- 2 reusable hooks: useWizard (generic step navigation) and useVerifications (verification state + TrustLevel computation)
- Extended domain types cover all Phase 2 contracts: JobStatus, VerificationMethod, TrustLevel, SkillProficiency, EmployerVerification, Skill, SelectedSkill, JobListing, LISTING_TIERS
- TypeScript compilation passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install new dependencies and create database migrations** - `cd85d21` (chore)
2. **Task 2: Create shared UI components, hooks, and extended domain types** - `6a80777` (feat)

## Files Created/Modified

- `supabase/migrations/004_employer_profile_columns.sql` - Adds culture_description, team_size, accommodation_* columns, onboarding_step, onboarding_complete, property_size_ha to employer_profiles
- `supabase/migrations/005_employer_verifications.sql` - Creates employer_verifications table with 5-method CHECK constraint, UNIQUE(employer_id, method), and RLS for employer/seeker/anon access
- `supabase/migrations/006_jobs_status_and_benefits.sql` - Drops and recreates jobs_status_check to include 'paused', adds benefits jsonb column
- `supabase/migrations/007_storage_buckets.sql` - Creates employer-documents (private) and employer-photos (public) buckets with path-scoped INSERT/SELECT RLS policies
- `src/hooks/useWizard.ts` - Generic multi-step wizard navigation with step guards, progress percentage, first/last step flags
- `src/hooks/useVerifications.ts` - Fetches employer_verifications from Supabase, computes TrustLevel from verified method set
- `src/components/ui/StepIndicator.tsx` - Numbered circles (1-N) with completed/active/future states, connector lines, optional labels, responsive mobile sizing
- `src/components/ui/FileDropzone.tsx` - react-dropzone wrapper with Supabase Storage upload, image thumbnail preview, PDF file icon, upload/error states
- `src/components/ui/SkillsPicker.tsx` - Loads skills from Supabase, groups by category, per-skill proficiency dropdown or requirement mode for job posting
- `src/components/ui/TierCard.tsx` - Tier comparison card with selection state, Best Value badge for tier 2, first-listing-free badge overlay
- `src/components/ui/JobCard.tsx` - Dashboard job card with status badge, salary, days remaining, conditional action buttons (pause/resume/edit/archive/mark filled)
- `src/components/ui/VerificationBadge.tsx` - Aggregate trust badge (unverified/basic/verified/fully_verified) with expandable popover listing all 5 verification methods
- `src/types/domain.ts` - Extended with Phase 2 types; LISTING_TIERS constant

## Decisions Made

- useWizard is 0-indexed with `progress = (currentStep / (totalSteps - 1)) * 100`. The wizard shell component owns database persistence; this hook only manages navigation state.
- employer_verifications uses `UNIQUE(employer_id, method)` so each verification method is a single row per employer, upserted on each verification event.
- TrustLevel computation uses Set membership: `fully_verified` requires email + phone + (nzbn OR document) + farm_photo all verified.
- Storage buckets use `storage.foldername(name)[1] = auth.uid()::text` for path-scoped RLS — prevents path guessing even in the public photos bucket.
- SkillsPicker's `requirementMode` prop reuses the component for both employer onboarding (proficiency levels) and job posting (required/preferred requirement levels).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. Storage buckets and migrations will be applied to Supabase via `npx supabase db push` (or manual application via the Supabase dashboard SQL editor). Stripe keys are not needed until plan 02-05.

## Next Phase Readiness

- All Phase 2 plans (02-02 through 02-06) are unblocked — schema, shared components, and hooks are in place
- StepIndicator ready for use in onboarding wizard (02-02) and job posting wizard (02-03)
- FileDropzone ready for verification document/photo upload screens (02-04)
- SkillsPicker ready for both onboarding (seeker skills profile) and job posting (required skills) — 02-03
- TierCard ready for listing tier selection step in job posting wizard (02-05)
- JobCard ready for employer dashboard job management view (02-06)
- VerificationBadge ready for trust badge on job listings (public) and verification status in dashboard (02-04)

---
*Phase: 02-employer-supply-side*
*Completed: 2026-03-15*
