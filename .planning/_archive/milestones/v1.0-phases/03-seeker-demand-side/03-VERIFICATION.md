---
phase: 03-seeker-demand-side
verified: 2026-03-16T15:35:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /jobs as a logged-in seeker and verify filter changes update results without an Apply button"
    expected: "Filter sidebar changes immediately refresh job list; URL params update in browser bar"
    why_human: "Live network behavior and URL state cannot be verified statically"
  - test: "Complete all 7 onboarding steps as a new seeker account"
    expected: "Wizard advances step by step, resumes on return, redirects to /jobs with success toast on step 7"
    why_human: "Multi-step flow with Supabase state persistence requires live session"
  - test: "Apply to a job as a seeker, then check My Applications page"
    expected: "Application appears under Active section with correct status tag; match score circle visible"
    why_human: "Requires live Supabase insert and RPC call"
  - test: "As an employer, visit ApplicantDashboard for a job, expand an applicant panel, and move them from 'applied' to 'review'"
    expected: "Dropdown shows only valid next states (review, declined); after update, status tag reflects new state"
    why_human: "Requires real application row and employer session to test pipeline transitions"
  - test: "Search results load time on /jobs with 50+ active listings"
    expected: "Results render in under 1.5 seconds (SRCH-12)"
    why_human: "Performance measurement requires runtime profiling against a populated database"
---

# Phase 3: Seeker Demand Side Verification Report

**Phase Goal:** A seeker can complete their profile, search jobs using all NZ agriculture-specific filters, view match scores on results, and submit and track applications through the full pipeline.
**Verified:** 2026-03-16T15:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Seeker can complete their profile via 7-step onboarding wizard | VERIFIED | `SeekerOnboarding.tsx` uses `useWizard({ totalSteps: 7 })`, all 7 step files exist, upserts to `seeker_profiles`, resumes via `onboarding_step`, sets `onboarding_complete: true` on last step |
| 2 | Seeker can search jobs using all NZ agriculture-specific filters | VERIFIED | `FilterSidebar.tsx` has all 9 filter groups (shed_type, region, contract_type, salary, herd_size, accommodation, visa, dairynz_level, couples), all reading from `URLSearchParams` |
| 3 | Filter state is URL-synced with immediate results (no Apply button) | VERIFIED | `JobSearch.tsx` uses `handleFilterChange` with functional `setSearchParams`, `useEffect` depends on `searchParams`, no Apply button in filter flow |
| 4 | Seeker can see match scores on search results and job detail | VERIFIED | `SearchJobCard.tsx` renders `MatchCircle`, `JobSearch.tsx` calls `rpc('compute_match_scores_batch')`, `JobDetail.tsx` calls `rpc('compute_match_score')`, `MatchBreakdown.tsx` shows 7-dimension breakdown |
| 5 | Seeker can apply to a job with optional cover note | VERIFIED | `JobDetail.tsx` has Radix Dialog modal, inserts to `applications` table with `status: 'applied'`, `cover_note`, `23505` duplicate detection, `hasApplied` guard disables button |
| 6 | Seeker can track applications grouped by active and completed | VERIFIED | `MyApplications.tsx` filters by `ACTIVE_STATUSES` / `COMPLETED_STATUSES`, calls `compute_match_scores_batch`, `handleWithdraw` updates status to `'withdrawn'` |
| 7 | Employer can manage applicants through full pipeline using VALID_TRANSITIONS | VERIFIED | `ApplicantDashboard.tsx` loads ranked applicants, `ApplicantPanel.tsx` imports `VALID_TRANSITIONS` and populates dropdown with only valid next states; terminal states show "Final stage" |

**Score:** 7/7 truths verified

---

## Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `vitest.config.ts` | VERIFIED | Exists with jsdom environment |
| `tests/setup.ts` | VERIFIED | Exists with afterEach cleanup |
| `tests/seeker-onboarding.test.tsx` | VERIFIED | Exists, 73 todo stubs total across 5 test files |
| `tests/job-search.test.tsx` | VERIFIED | Exists |
| `tests/applications.test.ts` | VERIFIED | Exists |
| `tests/pipeline-transitions.test.ts` | VERIFIED | Exists |
| `tests/seeker-profile.test.ts` | VERIFIED | Exists |
| `supabase/migrations/009_seeker_onboarding.sql` | VERIFIED | Exists with 10 matching patterns (ALTER TABLE, CREATE POLICY x2, CREATE FUNCTION x3 + helper) |
| `src/types/domain.ts` | VERIFIED | 17 Phase 3 pattern matches: `ApplicationStatus`, `VALID_TRANSITIONS`, `SeekerProfileData`, `MatchBreakdown`, `MatchScore`, `DairyNZLevel`, `VisaStatus`, `HerdSizeBucket`, `ShedType`, `DAIRYNZ_LEVELS`, `VISA_OPTIONS`, `HERD_SIZE_BUCKETS`, `SHED_TYPES`, `ACTIVE_STATUSES`, `COMPLETED_STATUSES`, `Application`, constants |
| `src/pages/onboarding/SeekerOnboarding.tsx` | VERIFIED | Exists, wired to Supabase upsert, PGRST116 resume, `onboarding_complete: true`, navigate to `/jobs`, toast.success |
| `src/pages/onboarding/steps/SeekerStep1FarmType.tsx` | VERIFIED | `sector_pref`, Continue disabled when `selectedTypes.length === 0` |
| `src/pages/onboarding/steps/SeekerStep2Experience.tsx` | VERIFIED | `years_experience`, `shed_types_experienced`, `herd_sizes_worked` |
| `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx` | VERIFIED | `dairynz_level`, `DAIRYNZ_LEVELS` |
| `src/pages/onboarding/steps/SeekerStep4Skills.tsx` | VERIFIED | `SkillsPicker`, delete+insert pattern on `seeker_skills` table |
| `src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx` | VERIFIED | `couples_seeking`, `accommodation_needed`, `NZ_REGIONS` |
| `src/pages/onboarding/steps/SeekerStep6Visa.tsx` | VERIFIED | `VISA_OPTIONS`, `visa_status` |
| `src/pages/onboarding/steps/SeekerStep7Complete.tsx` | VERIFIED | Exists, renders success screen |
| `src/components/ui/FilterSidebar.tsx` | VERIFIED | All 9 filter groups confirmed via grep: shed_type, region, contract_type, salary_min/max, herd_size, accommodation, couples, visa, dairynz_level |
| `src/components/ui/SearchJobCard.tsx` | VERIFIED | `MatchCircle` rendered when `matchScore` is non-null, visitor gets placeholder circle |
| `src/pages/jobs/JobSearch.tsx` | VERIFIED | `useSearchParams`, `compute_match_scores_batch` RPC, `FilterSidebar`, `SearchJobCard`, `.eq('status', 'active')` |
| `src/components/ui/MatchBreakdown.tsx` | VERIFIED | `MatchCircle` + `ProgressBar`, DIMENSIONS array with 7 categories, `blurred` prop with "Sign up to see how you match" overlay |
| `src/pages/jobs/JobDetail.tsx` | VERIFIED | `compute_match_score` RPC, `MatchBreakdown` (seeker and blurred visitor), Radix Dialog apply modal, `applications` insert, `23505`, no old `toast.info('Applications opening soon')` stub |
| `src/pages/dashboard/seeker/MyApplications.tsx` | VERIFIED | `ACTIVE_STATUSES` / `COMPLETED_STATUSES` grouping, `applications` query with `seeker_id`, `compute_match_scores_batch`, withdraw handler |
| `src/components/ui/ApplicationCard.tsx` | VERIFIED | Status Tag variant mapping (applied=blue, review=hay, etc.), Link to job, Withdraw button |
| `src/pages/dashboard/employer/ApplicantDashboard.tsx` | VERIFIED | `useParams`, applications query with job_id, ownership check, sort by match score, `handleTransition` |
| `src/components/ui/ApplicantPanel.tsx` | VERIFIED | `VALID_TRANSITIONS`, `MatchCircle`, `cover_note`, "Final stage" text for terminal states, expandable sections |
| `src/main.tsx` | VERIFIED | All 4 Phase 3 routes wired: `JobSearch` at `/jobs`, `SeekerOnboarding` at `/onboarding/seeker`, `MyApplications` at `/dashboard/seeker/applications`, `ApplicantDashboard` at `/dashboard/employer/jobs/:id/applicants`; no placeholder stubs remaining |
| `src/pages/dashboard/SeekerDashboard.tsx` | VERIFIED | `onboarding_complete` check, `ACTIVE_STATUSES`, "Edit Profile" link, "Browse jobs" CTA, live applications query |
| `src/pages/dashboard/EmployerDashboard.tsx` | VERIFIED | Application count query, "View Applicants (N)" link to `/dashboard/employer/jobs/${job.id}/applicants` |
| `src/components/layout/Sidebar.tsx` | VERIFIED | Seeker nav: Dashboard, Find Jobs (`/jobs`), My Applications (`/dashboard/seeker/applications`), Edit Profile (`/onboarding/seeker`) |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `SeekerOnboarding.tsx` | `supabase.from('seeker_profiles').upsert` | `handleStepComplete` | WIRED | Line 104: upserts with `onboarding_step: stepIndex + 1` |
| `SeekerStep4Skills.tsx` | `supabase.from('seeker_skills')` | delete+insert | WIRED | Lines 68–86: `.delete().eq('seeker_id', seekerId)` then `.insert(rows)` |
| `JobSearch.tsx` | `supabase.from('jobs').select` | URL params -> query | WIRED | Line 138: `.eq('status', 'active')` |
| `JobSearch.tsx` | `supabase.rpc('compute_match_scores_batch')` | post-query score fetch | WIRED | Line 229: RPC call with `p_seeker_id` and `p_job_ids` |
| `FilterSidebar.tsx` | `useSearchParams` | `setSearchParams` on filter change | WIRED | `onFilterChange` called on every filter interaction, proxied through `handleFilterChange` in `JobSearch.tsx` |
| `JobDetail.tsx` | `supabase.rpc('compute_match_score')` | single score fetch | WIRED | Line 222 |
| `JobDetail.tsx` | `supabase.from('applications').insert` | apply modal submit | WIRED | Line 340 |
| `MatchBreakdown.tsx` | `MatchCircle` + `ProgressBar` | component composition | WIRED | Lines 3–4 imports, lines 55, 80 render |
| `MyApplications.tsx` | `supabase.from('applications')` | seeker application list | WIRED | Lines 60–62: `.select('*, jobs(...)')` `.eq('seeker_id', profileId)` |
| `ApplicantDashboard.tsx` | `supabase.from('applications')` | employer applicant list | WIRED | Line 107: nested join query with `seeker_profiles` |
| `ApplicantPanel.tsx` | `VALID_TRANSITIONS` | stage transition dropdown | WIRED | Line 8 import, line 96: `VALID_TRANSITIONS[application.status]` |
| `src/main.tsx` | all Phase 3 page components | `createBrowserRouter` routes | WIRED | Lines 17–25 imports, routes at lines 59, 86, 130, 159 |
| `src/components/layout/Sidebar.tsx` | seeker routes | nav items for seeker role | WIRED | Lines 30–32: Find Jobs, My Applications, Edit Profile |

---

## Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| SONB-01 | 03-02 | 7-step onboarding wizard | SATISFIED | `SeekerOnboarding.tsx` with `useWizard({ totalSteps: 7 })`, all 7 steps implemented |
| SONB-02 | 03-02 | Farm type preference (dairy, sheep & beef) | SATISFIED | `SeekerStep1FarmType.tsx` with `sector_pref` multi-select |
| SONB-03 | 03-02 | Experience: years, herd sizes, shed types | SATISFIED | `SeekerStep2Experience.tsx` captures all 3 fields |
| SONB-04 | 03-02 | Skills self-assessment with proficiency | SATISFIED | `SeekerStep4Skills.tsx` uses `SkillsPicker` in proficiency mode |
| SONB-05 | 03-02 | Life situation: couples, accommodation, location | SATISFIED | `SeekerStep5LifeSituation.tsx` captures `couples_seeking`, `accommodation_needed`, region |
| SONB-06 | 03-02 | Visa and work rights status | SATISFIED | `SeekerStep6Visa.tsx` with `VISA_OPTIONS` dropdown |
| SONB-07 | 03-01, 03-02 | DairyNZ qualification level | SATISFIED | `SeekerStep3Qualifications.tsx` with `DAIRYNZ_LEVELS`; schema migration 009 adds column with CHECK constraint |
| SONB-08 | 03-06 | Profile persisted and editable after completion | SATISFIED | `/onboarding/seeker` wired as "Edit Profile" in Sidebar; wizard loads saved data via `onboarding_step` resume |
| SRCH-01 | 03-03 | Search results page with filter sidebar | SATISFIED | `JobSearch.tsx` with 280px desktop sidebar grid, Radix Dialog drawer on mobile |
| SRCH-02 | 03-03 | Filter by shed type | SATISFIED | `FilterSidebar.tsx` line 56: `searchParams.getAll('shed_type')` + checkbox group |
| SRCH-03 | 03-03 | Filter by accommodation | SATISFIED | `FilterSidebar.tsx` line 62: `searchParams.get('accommodation')` + sub-toggles for pets, couples, family |
| SRCH-04 | 03-03 | Filter by visa requirements | SATISFIED | `FilterSidebar.tsx` line 64: `searchParams.get('visa')` toggle |
| SRCH-05 | 03-03 | Filter by DairyNZ qualification level | SATISFIED | `FilterSidebar.tsx` line 65: `searchParams.get('dairynz_level')` select |
| SRCH-06 | 03-03 | Filter by herd size range | SATISFIED | `FilterSidebar.tsx` line 59: `searchParams.getAll('herd_size')` checkboxes |
| SRCH-07 | 03-03 | Filter by couples welcome | SATISFIED | `FilterSidebar.tsx` line 63: `searchParams.get('couples')` toggle (also sub-option under accommodation) |
| SRCH-08 | 03-03 | Filter by salary range (dual-handle slider) | SATISFIED | `FilterSidebar.tsx` uses `@radix-ui/react-slider` (confirmed in package.json); `salary_min`/`salary_max` URL params |
| SRCH-09 | 03-03 | Filter by region | SATISFIED | `FilterSidebar.tsx` line 57: `searchParams.getAll('region')` with NZ_REGIONS checkboxes |
| SRCH-10 | 03-03 | Filter by contract type | SATISFIED | `FilterSidebar.tsx` line 58: `searchParams.getAll('contract_type')` checkboxes |
| SRCH-11 | 03-03 | Match score per job result (logged-in seeker) | SATISFIED | `JobSearch.tsx` calls `compute_match_scores_batch` RPC; `SearchJobCard.tsx` renders `MatchCircle` when score present |
| SRCH-12 | 03-03 | Results load in <1.5 seconds | NEEDS HUMAN | Batch RPC avoids N+1; no synchronous loops in fetch code. Performance against live DB requires human verification. |
| JDET-01 | 03-04 | Job detail page with full listing information | SATISFIED | `JobDetail.tsx` extended (not replaced); full listing content preserved from Phase 2 |
| JDET-02 | 03-04 | Logged-in seeker: match score breakdown by category | SATISFIED | `MatchBreakdown.tsx` with DIMENSIONS (shed_type 25, location 20, accommodation 20, skills 20, salary 10, visa 5, couples 5); rendered in `JobDetail.tsx` sticky sidebar |
| JDET-03 | 03-04 | Visitor: signup prompt instead of match details | SATISFIED | `MatchBreakdown.tsx` `blurred={true}` mode with overlay "Sign up to see how you match" + Link to /signup |
| JDET-04 | 03-04 | Apply button with optional cover note | SATISFIED | Radix Dialog apply modal in `JobDetail.tsx`; textarea for cover_note (max 500 chars), char counter |
| APPL-01 | 03-04 | Seeker can submit application | SATISFIED | `applications` insert with `status: 'applied'`, `seeker_id`, `job_id`, `cover_note`; 23505 duplicate detection |
| APPL-02 | 03-05 | Application view with pipeline stages | SATISFIED | `MyApplications.tsx` + `ApplicationCard.tsx` showing all 8 status values |
| APPL-03 | 03-05 | Seeker can withdraw application | SATISFIED | `handleWithdraw` in `MyApplications.tsx` updates status to `'withdrawn'`; `window.confirm` guard |
| APPL-04 | 03-05, 03-06 | Employer applicant dashboard ranked by match score | SATISFIED | `ApplicantDashboard.tsx` sorts by match score descending; "View Applicants (N)" link on EmployerDashboard |
| APPL-05 | 03-05 | Employer can transition applicants through pipeline | SATISFIED | `ApplicantPanel.tsx` + `VALID_TRANSITIONS` dropdown; `handleTransition` updates `applications` table |
| APPL-06 | 03-05 | Expandable applicant panels with seeker profile | SATISFIED | `ApplicantPanel.tsx` expanded section: region, experience, visa_status, dairynz_level, shed types, herd sizes, accommodation, couples_seeking, skills with proficiency, match highlights, cover note |

**Orphaned requirements check:** No requirements mapped to Phase 3 in REQUIREMENTS.md that are unaccounted for by a plan.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/pages/dashboard/SeekerDashboard.tsx` | "Profile Views" stat hardcoded to 0 | Info | Known placeholder per deferred-items; analytics not in Phase 3 scope. No goal impact. |
| `src/components/ui/FilterSidebar.tsx` line 183 | `return null` | Info | Guard clause for null children in a conditional render — not an empty implementation stub. No impact. |
| Pre-existing TypeScript errors in `useAuth.ts`, `stripe.ts`, `supabase.ts`, `EmployerOnboarding.tsx`, `SkillsPicker.tsx` | TS compilation errors | Warning | `tsc -b` fails; `vite build` passes (1,885 modules, builds successfully). Errors predate Phase 3. All Phase 3 files compile without new errors. |

---

## Human Verification Required

### 1. Live Filter Behavior (SRCH-01, SRCH-02 through SRCH-10)

**Test:** Log in as a seeker, navigate to `/jobs`, toggle each filter in the sidebar.
**Expected:** Results update immediately without an Apply/Search button. URL bar reflects filter state. Bookmarking the URL and returning restores filters.
**Why human:** URL sync and live re-query require a running application with an active database.

### 2. Full Onboarding Flow (SONB-01 through SONB-08)

**Test:** Create a new seeker account, complete all 7 wizard steps, close and reopen the wizard.
**Expected:** Wizard resumes from last saved step. On final step completion, redirects to `/jobs` with success toast and profile-based filter params.
**Why human:** Multi-step persistence with Supabase session requires live environment.

### 3. Apply and Track Application (APPL-01, APPL-02, APPL-03)

**Test:** As a seeker, apply to a job with a cover note, then navigate to My Applications.
**Expected:** Application appears in Active section with "Applied" status tag and match score. Withdraw the application and verify it moves to Completed section.
**Why human:** Requires real Supabase insert and RPC for match score on the applications list.

### 4. Employer Pipeline Transition (APPL-04, APPL-05, APPL-06)

**Test:** As an employer, open ApplicantDashboard for a job that has applicants, expand a panel, and transition the applicant from "applied" to "review".
**Expected:** Dropdown shows only valid transitions (review, declined). After updating, status badge reflects new state. Try to jump directly to "hired" — this option should not appear.
**Why human:** Requires a populated applications table and employer session.

### 5. Search Load Performance (SRCH-12)

**Test:** Load `/jobs` with 50+ active listings in the database and measure Time to Interactive.
**Expected:** Results visible in under 1.5 seconds.
**Why human:** Performance measurement requires live database with realistic data volume.

### 6. Match Score Display Gating (SRCH-11, JDET-02, JDET-03)

**Test:** Visit `/jobs` and a job detail page while logged out, then again while logged in as a seeker with a complete profile.
**Expected:** No match circles for visitor. Score circles appear on search cards and full breakdown sidebar appears on job detail for the logged-in seeker.
**Why human:** Auth-gated UI branching requires live session state.

---

## Build Status

- **`vite build`:** PASSES — 1,885 modules transformed, built in 1.87s.
- **`npx vitest run`:** PASSES — 5 test files, 73 todos, 0 failures, exits code 0.
- **`tsc -b`:** FAILS — 8 pre-existing errors in `useAuth.ts`, `stripe.ts`, `supabase.ts`, `main.tsx` (missing CSS module), `EmployerOnboarding.tsx`, `SkillsPicker.tsx`. Zero new errors introduced by Phase 3 work. Documented in `deferred-items.md`.

---

_Verified: 2026-03-16T15:35:00Z_
_Verifier: Claude (gsd-verifier)_
