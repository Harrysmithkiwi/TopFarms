# Architecture Patterns

**Domain:** TopFarms v1.1 SPEC Compliance — UI/UX gap-closing on existing React+Supabase app
**Researched:** 2026-03-20
**Confidence:** HIGH — based on direct codebase inspection of all relevant files

---

## Existing Architecture (Confirmed from Codebase)

### Confirmed Component Inventory

```
src/
  components/
    ui/           — Button, Card, Tag, MatchCircle, InfoBox, ProgressBar, Input, Toggle,
                    Checkbox, Select, StepIndicator, FileDropzone, SkillsPicker, TierCard,
                    JobCard, VerificationBadge, FilterSidebar, SearchJobCard, ApplicationCard,
                    MatchBreakdown, ApplicantPanel
    layout/       — DashboardLayout, AuthLayout, Nav, Sidebar, ProtectedRoute
    landing/      — HeroSection, CountersSection, HowItWorksSection, FeaturedListings,
                    TestimonialsSection, LandingFooter
    stripe/       — PaymentForm
  pages/
    auth/         — Login, SignUp, ForgotPassword, ResetPassword, VerifyEmail
    onboarding/
      EmployerOnboarding.tsx    — 8-step wizard shell (useWizard hook, upsert-per-step pattern)
      steps/                    — Step1FarmType … Step8Complete
      SeekerOnboarding.tsx      — 7-step wizard shell (same pattern, uses SeekerProfileData from types/domain)
      steps/                    — SeekerStep1 … SeekerStep7Complete
    jobs/
      PostJob.tsx               — 8-step wizard shell (INSERT on step 1, UPDATE on steps 2–7)
      steps/                    — JobStep1Basics … JobStep8Success
      JobSearch.tsx             — URL-synced filters via useSearchParams, Radix Dialog mobile sidebar
      JobDetail.tsx
    dashboard/
      EmployerDashboard.tsx, SeekerDashboard.tsx
      employer/   — ApplicantDashboard, PlacementFeeModal, HireConfirmModal
      seeker/     — MyApplications
  hooks/          — useAuth, useWizard (confirmed in codebase)
  types/          — domain.ts (SeekerProfileData, JobListing, MatchScore, EmployerVerification, TrustLevel)
  lib/            — supabase.ts, constants.ts (NZ_REGIONS), utils.ts (cn)
```

### Wizard Pattern (Canonical — All Three Wizards)

```
WizardShell (EmployerOnboarding | SeekerOnboarding | PostJob)
  ├── State: profileData/jobData (TypeScript interface, accumulated across all steps)
  ├── useWizard({ totalSteps, initialStep }) → { currentStep, nextStep, prevStep, goToStep }
  ├── loadProfile() on mount — reads existing row, sets initialStep from onboarding_step field
  ├── handleStepComplete(stepData, stepIndex):
  │     merge stepData into accumulated state
  │     → upsert/update Supabase row
  │     → wizard.nextStep()
  └── Renders: StepIndicator + conditional {currentStep === N && <StepN />}
```

PostJob differs from the two onboarding wizards: Step 1 does INSERT (creates the row and gets jobId), steps 2–7 do UPDATE. `jobId` is then threaded as a prop to steps that need direct DB access (JobStep3Skills, JobStep6Preview, JobStep7Payment).

### Filter Pattern (FilterSidebar — Confirmed)

URL-synced via React Router `useSearchParams`. `onFilterChange(key, value)` bubbles to `JobSearch.tsx` which calls `setSearchParams`. FilterSidebar reads all state from `searchParams` props — no internal filter state. Radix Slider (`@radix-ui/react-slider`) already imported for salary range. Radix Dialog (`@radix-ui/react-dialog`) used in JobSearch for mobile sidebar.

---

## New Components Required (v1.1)

### Primitive UI Components (src/components/ui/)

| Component | Responsibility | Props Contract |
|-----------|---------------|----------------|
| `ChipSelector` | Multi-select chip group, replaces checkbox lists where SPEC requires chips | `options: {value,label}[], value: string[], onChange: (v: string[]) => void` |
| `RangeSlider` | Dual-thumb slider, extracted from FilterSidebar salary block | `min, max, step: number, value: [number,number], onChange, formatLabel?` |
| `StarRating` | 1–5 star input (experience/seniority indicator) | `value: number, onChange: (v: number) => void, readonly?: boolean` |
| `Breadcrumb` | Route hierarchy nav strip | `items: {label: string, href?: string}[]` |
| `StatsStrip` | Horizontal stat pills (herd size, shed type, location) | `stats: {icon?, label: string, value: string}[]` |
| `LivePreviewSidebar` | Real-time job card preview in PostJob wizard | `jobData: JobPostingData` (reads from in-memory state, no Supabase fetch) |
| `ExpandableCardTabs` | Tabbed expansion panel mounted inside SearchJobCard | `tabs: {label,content}[], defaultTab?: string` |
| `StatusBanner` | Variant-styled banner for application status | `variant: 'shortlisted'|'interview'|'offer'|'declined'|'pending', message?: string` |
| `Timeline` | Vertical step timeline for application stages | `stages: {label,date?,active,completed}[]` |
| `ActiveFilterPills` | Removable pill row showing active filters | `searchParams: URLSearchParams, onRemove: (key,value) => void` |
| `Pagination` | Page navigation (prev/next + page numbers) | `page, totalPages: number, onPageChange: (p: number) => void` |

### Landing Page Section Components (src/components/landing/)

| Component | Responsibility |
|-----------|---------------|
| `AiMatchingSection` | Explains AI scoring, illustration + copy |
| `FarmTypesSection` | Dairy vs sheep/beef sector cards |
| `EmployerCtaSection` | Employer-facing CTA with platform stats |
| `TrustedBySection` | Trust signals / partner logos |
| `FinalCtaSection` | Bottom CTA above footer |

Landing sections are self-contained and import nothing from the wizard/dashboard layer. They can be built in any order, parallel to all other work.

---

## Existing Components Requiring Modification

### Wizard Shells — Interface and Upsert Changes

The interfaces declared in wizard shells control what data flows through all steps. These must be extended before step-level work begins.

| Wizard | Interface | New Fields to Add | Upsert Change Complexity |
|--------|-----------|-------------------|-------------------------|
| `EmployerOnboarding.tsx` | `EmployerProfileData` | `career_dev_interests?: string[]`, `salary_range_min?: number`, `salary_range_max?: number`, `accommodation_internet?: boolean`, `accommodation_broadband?: boolean`, `calving_system?: string`, `nearest_town?: string`, `distance_to_town_km?: number` | Low — add to upsertPayload spread |
| `PostJob.tsx` | `JobPostingData` | `breed?: string`, `milking_frequency?: string`, `dairy_experience_years?: number`, `seniority_level?: string`, `required_qualifications?: string[]`, `visa_types?: string[]`, `pay_frequency?: string`, `hours_per_week?: number`, `roster_type?: string` | Low — add to update() call |
| `SeekerOnboarding.tsx` | `SeekerProfileData` (in types/domain.ts) | `licences?: string[]`, `certifications?: string[]`, `salary_expectation_min?: number`, `salary_expectation_max?: number`, `availability_date?: string`, `notice_period?: string` | Low — add to upsert |

### Employer Onboarding Steps

| Step File | Current Fields | Required Change | Complexity |
|-----------|---------------|-----------------|------------|
| `Step2FarmDetails.tsx` | farm_name, region, herd_size, shed_type, milking_frequency, breed, property_size_ha, ownership_type | Add `nearest_town` Input, `distance_to_town_km` RangeSlider | Low |
| `Step3Culture.tsx` | culture_description, team_size, about_farm | Add `career_dev_interests` ChipSelector | Low |
| `Step4Accommodation.tsx` | accommodation_available, type, pets, couples, family, utilities_included | Add internet/broadband/wifi Toggles; add `calving_system` Select | Low |

### Post Job Wizard Steps

| Step File | Current Fields | Required Change | Complexity |
|-----------|---------------|-----------------|------------|
| `JobStep1Basics.tsx` | title, sector, role_type, contract_type, start_date, region | Add `seniority_level` Select | Low |
| `JobStep2FarmDetails.tsx` | shed_type, herd_size_min/max, visa_sponsorship, couples_welcome, accommodation | Add `breed` Select, `milking_frequency` Select | Low |
| `JobStep3Skills.tsx` | job_skills junction table (direct DB writes with jobId prop) | Add `dairy_experience_years` (RangeSlider or Select), `required_qualifications` ChipSelector | Medium — introduces new field types alongside existing DB-direct skills flow |
| `JobStep4Compensation.tsx` | salary_min, salary_max, benefits[] | Add `pay_frequency` ChipSelector, `hours_per_week` Input, `roster_type` ChipSelector | Low |
| `JobStep6Preview.tsx` (+ PostJob shell layout) | Full-screen preview fetches from Supabase by jobId | Integrate LivePreviewSidebar — PostJob shell conditionally renders two-column layout on step 5 only | Medium — layout change in shell |

### Seeker Onboarding Steps

| Step File | Current Fields | Required Change | Complexity |
|-----------|---------------|-----------------|------------|
| `SeekerStep2Experience.tsx` | Experience fields | Add document upload section (FileDropzone already exists in ui/) | Low |
| `SeekerStep3Qualifications.tsx` | DairyNZ levels, existing qualifications | Add `licences` ChipSelector, `certifications` ChipSelector | Low |
| `SeekerStep5LifeSituation.tsx` | accommodation, couples, family | Add `salary_expectation` RangeSlider, `availability_date` Input, `notice_period` Select | Low |
| `SeekerStep7Complete.tsx` | Completion screen | Add matched jobs fetch from match_scores + jobs; render top 3–5 matched JobCards | Medium — new Supabase query |

### Search and Job Pages

| Component | Current State | Required Change | Complexity |
|-----------|--------------|-----------------|------------|
| `FilterSidebar.tsx` | shed_type, region, contract_type, herd_size, salary Radix Slider | Add role_type filter, accommodation toggle, visa filter groups; refactor salary block to use new RangeSlider component | Medium — salary refactor + 3 new groups |
| `SearchJobCard.tsx` | Fixed summary row with match circle | Add `isExpanded` local state; conditionally render ExpandableCardTabs below summary row | Medium — structural addition |
| `JobSearch.tsx` | FilterSidebar + job card grid layout | Add SearchHero above sidebar/grid, ActiveFilterPills between hero and results, Pagination below results | Low — additive sections |
| `JobDetail.tsx` | Full detail layout | Add Breadcrumb at top, StatsStrip below title, Timeline in sidebar area, similar jobs section, location map placeholder | Medium — 5 additions to existing layout |
| `ApplicationCard.tsx` | Shows application status and stage | Integrate StatusBanner variant | Low |
| `MyApplications.tsx` | Lists seeker applications | Add StatusBanner variants, farm response indicator, sidebar layout | Medium |
| `ApplicantDashboard.tsx` | Flat applicant list per job | Full rebuild: left sidebar nav, filter toolbar, 4-tab expandable panels per applicant, bulk action bar, AI summary fetch | High |

### Landing Page

| Component | Required Change | Complexity |
|-----------|-----------------|------------|
| `Home.tsx` | Import and render 5 new section components in correct SPEC order | Low |
| `HeroSection.tsx` | Add animation (CSS keyframes within existing component) | Low |
| `CountersSection.tsx` | Verify stat blocks match SPEC layout | Low |

---

## Data Flow Changes

### Pattern: Additive Field Addition to Wizard (No Structural Change)

The wizard accumulation pattern absorbs new fields cleanly. All three wizards follow the same four-touch change:

```
Touch 1: Extend TypeScript interface in wizard shell
  export interface EmployerProfileData {
    career_dev_interests?: string[]   // NEW
  }

Touch 2: Add to upsertPayload in handleStepComplete
  career_dev_interests: updatedData.career_dev_interests ?? null

Touch 3: Pass as defaultValues to relevant step
  <Step3Culture defaultValues={{ career_dev_interests: profileData.career_dev_interests }} />

Touch 4: Step renders ChipSelector, includes field in onComplete(data) call
```

No new hooks, no new context, no changes to useWizard — purely additive.

### LivePreviewSidebar Data Flow

PostJob currently uses single-column layout (`max-w-2xl mx-auto`) for all 8 steps. The preview step (step 5, JobStep6Preview) needs a two-column layout with LivePreviewSidebar alongside it.

```
PostJob shell layout logic:
  currentStep < 5 or currentStep > 5:
    <div className="max-w-2xl mx-auto">   ← existing layout, unchanged
  currentStep === 5:
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 max-w-5xl mx-auto">
      <div>{/* step form (JobStep6Preview content) */}</div>
      <LivePreviewSidebar jobData={jobData} />   ← reads in-memory state, no fetch
    </div>
```

LivePreviewSidebar receives `jobData: JobPostingData` as a prop. It renders a live JobCard preview from the accumulated wizard state — no Supabase query needed.

### FilterSidebar Extension

The existing `onFilterChange(key: string, value: string | string[] | null)` interface handles all new filter groups without modification. New groups (role_type, accommodation, visa) use the same collapsible section pattern as existing groups.

RangeSlider extraction: the existing inline salary slider code in FilterSidebar becomes `<RangeSlider>` with identical props. No functional change — refactor only.

### ExpandableCardTabs in SearchJobCard

```
SearchJobCard (before):
  [summary row — always visible]

SearchJobCard (after):
  [summary row — always visible]
  [chevron toggle button]
  {isExpanded && <ExpandableCardTabs tabs={[overview, requirements, match]} />}
```

`isExpanded` is local state in SearchJobCard. Tab selection is local state inside ExpandableCardTabs. No URL state, no context — card expansion is ephemeral.

### ApplicantDashboard Architecture Change (Highest Complexity)

Current `ApplicantDashboard.tsx` is a flat list component. The SPEC requires:

```
ApplicantDashboard
  ├── Left sidebar nav (job selector or pipeline stage navigation)
  ├── Main area:
  │     ├── Filter toolbar (stage filter, search input, sort control)
  │     ├── Applicant list
  │     │     └── Each applicant row → expandable 4-tab panel:
  │     │           Tab 1: Profile
  │     │           Tab 2: Match breakdown (MatchBreakdown component already exists)
  │     │           Tab 3: AI Summary (fetch from Claude Edge Function)
  │     │           Tab 4: Application history
  │     └── Bulk action bar (floats when ≥1 applicant selected)
  └── [Existing PlacementFeeModal and HireConfirmModal remain]
```

AI Summary tab is the only location where a new data fetch pattern is needed: call the existing Claude Edge Function with the applicant's match breakdown, cache the result locally in component state per applicant to avoid re-fetching on tab switch.

---

## Patterns to Follow

### Pattern 1: ChipSelector as Drop-In Checkbox Replacement

ChipSelector must accept the same value shape as existing checkbox groups (`string[]`) and the same onChange signature. This makes targeted substitution possible without changing the parent step's form state.

```typescript
// New component contract
interface ChipSelectorProps {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (selected: string[]) => void
  className?: string
}

// Usage — replaces a group of Checkbox components
<ChipSelector
  options={CAREER_DEV_OPTIONS}
  value={form.career_dev_interests ?? []}
  onChange={(v) => setForm({ ...form, career_dev_interests: v })}
/>
```

### Pattern 2: RangeSlider Wrapping Existing Radix Dependency

`@radix-ui/react-slider` is already imported in FilterSidebar. Extract the salary slider pattern into a reusable component that works both in FilterSidebar and in wizard steps (SeekerStep5, JobStep4).

```typescript
interface RangeSliderProps {
  min: number
  max: number
  step: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatLabel?: (v: number) => string
}
```

No new npm dependency needed — Radix Slider is already in the lockfile.

### Pattern 3: StatusBanner Variant System

Map application pipeline stages to the existing design palette:

```typescript
type StatusVariant = 'shortlisted' | 'interview' | 'offer' | 'declined' | 'pending'

const VARIANT_STYLES: Record<StatusVariant, string> = {
  shortlisted: 'bg-moss/10 text-moss border-moss/20',
  interview:   'bg-fern/10 text-fern border-fern/20',
  offer:       'bg-hay/20 text-soil border-hay/40',
  declined:    'bg-soil/10 text-soil border-soil/20',
  pending:     'bg-fog text-mid border-fog',
}
```

All colours already defined in the Tailwind v4 `@theme` block — no new CSS variables.

### Pattern 4: Breadcrumb (Prop-Driven, No Router Coupling)

JobDetail constructs the items array inline from its own data. Breadcrumb does not read from `useLocation` — it renders whatever it receives. This keeps it testable and reusable.

```typescript
// In JobDetail.tsx
<Breadcrumb items={[
  { label: 'Jobs', href: '/jobs' },
  { label: job.title },  // no href = current page (not clickable)
]} />
```

### Pattern 5: Conditional Layout in PostJob Shell

Only the Preview step gets the two-column layout. All other steps keep the existing `max-w-2xl mx-auto` wrapper.

```typescript
// In PostJob.tsx
const isPreviewStep = currentStep === 5

return (
  <DashboardLayout>
    <div className={isPreviewStep
      ? 'grid lg:grid-cols-[1fr_380px] gap-6 max-w-5xl mx-auto'
      : 'max-w-2xl mx-auto space-y-8'
    }>
      {/* StepIndicator and step content */}
      {isPreviewStep && <LivePreviewSidebar jobData={jobData} />}
    </div>
  </DashboardLayout>
)
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Refactoring Wizard State Management While Adding Fields

**What:** Converting wizard state to useReducer, Zustand, or React context at the same time as adding new fields.
**Why bad:** The accumulation + upsert pattern across all three wizards is consistent and proven in 22 step files. Refactoring introduces regression risk across the entire wizard layer with no user-visible benefit.
**Instead:** Add fields additively to existing interfaces and upsert payloads. The flat interface pattern handles 20+ fields without issues.

### Anti-Pattern 2: Fetching Data Inside New Primitive Components

**What:** ChipSelector, Breadcrumb, StatsStrip, StatusBanner, Timeline fetching their own data from Supabase.
**Why bad:** These components become untestable in isolation, create duplicate network calls, and couple display to data concerns.
**Instead:** All Supabase fetches stay in page-level components or hooks. Every new primitive component receives props only.

### Anti-Pattern 3: Duplicating Filter State for ActiveFilterPills

**What:** Creating a separate state variable (or context) to track active filters, keeping it in sync with URL params.
**Why bad:** FilterSidebar already reads from URLSearchParams which is the single source of truth. Duplicating it creates sync bugs when filters change via URL navigation.
**Instead:** `ActiveFilterPills` receives `searchParams: URLSearchParams` and an `onRemove` callback — it reads from the same URL state, never its own copy.

### Anti-Pattern 4: Global Two-Column Layout in PostJob

**What:** Switching PostJob to a two-column layout for all 8 steps to accommodate LivePreviewSidebar.
**Why bad:** Preview is only useful on the preview step. Two-column layout on form-entry steps (1–5) wastes space on desktop and breaks mobile layout.
**Instead:** Conditional layout class gated on `currentStep === 5`. Form steps keep existing single-column layout.

### Anti-Pattern 5: Replacing All Checkbox Usage with ChipSelector

**What:** Globally replacing every `<Checkbox>` with `<ChipSelector>` across the whole codebase.
**Why bad:** FilterSidebar uses checkboxes deliberately — they work well at sidebar density. Only the specific wizard fields the SPEC calls out as chips need changing.
**Instead:** Keep `Checkbox` in FilterSidebar untouched. Add ChipSelector as a new component. Update only where SPEC specifies chip UI.

### Anti-Pattern 6: Re-fetching AI Summaries on Every Tab Switch in ApplicantDashboard

**What:** Calling the Claude Edge Function every time the employer switches to the AI Summary tab for an applicant.
**Why bad:** Edge Function calls cost money, add 1–3s latency, and create flickering UX.
**Instead:** Cache the AI summary string in local component state (`Map<applicantId, string>`) after the first fetch. Show a loading skeleton on first open, then render from cache on subsequent tab switches.

---

## Build Order (Dependency Graph)

Dependencies flow one direction: primitives → composites → page integrations. Landing sections are independent of all other work.

### Wave 1 — Foundation Primitives (Parallel, No Dependencies)

Build first. Everything else depends on at least some of these.

| Order | Component | Why First |
|-------|-----------|-----------|
| 1 | `ChipSelector` | Used in 6+ wizard steps across all three wizards |
| 2 | `RangeSlider` | Used in FilterSidebar (refactor), SeekerStep5, JobStep4 |
| 3 | `StatusBanner` | Used in ApplicationCard + MyApplications |
| 4 | `Breadcrumb` | Used in JobDetail, no deps |
| 5 | `StatsStrip` | Used in JobDetail, no deps |
| 6 | `Timeline` | Used in JobDetail + MyApplications |
| 7 | `StarRating` | Used in seeker experience/seniority steps |
| 8 | `ActiveFilterPills` | Used in JobSearch, reads URLSearchParams only |
| 9 | `Pagination` | Used in JobSearch, no deps |

### Wave 2 — Wizard Interface Extensions (Parallel Across Wizards, Within Each Wizard Work Steps in Order)

Must happen after Wave 1 (steps use ChipSelector, RangeSlider). Interface extensions must happen before step-level work within each wizard.

**Employer Onboarding** (extend interface first, then steps):
1. Extend `EmployerProfileData` interface + upsert payload in `EmployerOnboarding.tsx`
2. `Step2FarmDetails`: nearest_town Input + distance_to_town RangeSlider
3. `Step3Culture`: career_dev_interests ChipSelector
4. `Step4Accommodation`: internet/broadband/wifi Toggles + calving_system Select

**Post Job Wizard** (extend interface first, then steps):
1. Extend `JobPostingData` interface + update payload in `PostJob.tsx`
2. `JobStep1Basics`: seniority_level Select
3. `JobStep2FarmDetails`: breed Select + milking_frequency Select
4. `JobStep3Skills`: dairy_experience_years RangeSlider + required_qualifications ChipSelector
5. `JobStep4Compensation`: pay_frequency ChipSelector + hours_per_week Input + roster_type ChipSelector
6. `LivePreviewSidebar` component creation + PostJob shell conditional layout (step 5 two-column)

**Seeker Onboarding** (extend SeekerProfileData type in types/domain.ts first, then steps):
1. Extend `SeekerProfileData` + upsert payload in `SeekerOnboarding.tsx`
2. `SeekerStep2Experience`: document upload (FileDropzone already exists)
3. `SeekerStep3Qualifications`: licences ChipSelector + certifications ChipSelector
4. `SeekerStep5LifeSituation`: salary_expectation RangeSlider + availability_date Input + notice_period Select
5. `SeekerStep7Complete`: matched jobs Supabase fetch + JobCard display

### Wave 3 — Page-Level Integrations (After Wave 1; Wizard Steps Not Required)

| Order | Component | Dependencies |
|-------|-----------|-------------|
| 1 | `FilterSidebar` additions + RangeSlider refactor | RangeSlider (Wave 1) |
| 2 | `ExpandableCardTabs` component creation | None |
| 3 | `SearchJobCard` + ExpandableCardTabs integration | Wave 3.2 |
| 4 | `JobSearch`: SearchHero + ActiveFilterPills + Pagination | ActiveFilterPills, Pagination (Wave 1); SearchJobCard (Wave 3.3) |
| 5 | `JobDetail`: Breadcrumb + StatsStrip + Timeline + similar jobs | Breadcrumb, StatsStrip, Timeline (Wave 1) |
| 6 | `ApplicationCard` + StatusBanner integration | StatusBanner (Wave 1) |
| 7 | `MyApplications` layout + StatusBanner + Timeline | StatusBanner, Timeline (Wave 1) |
| 8 | `ApplicantDashboard` rebuild | All primitives; ExpandableCardTabs (Wave 3.2); AI summary fetch |

### Wave 4 — Landing Page Sections (Fully Independent, Any Time)

All five new sections are self-contained. No dependency on wizard or dashboard work.

| Component | Notes |
|-----------|-------|
| `AiMatchingSection` | Static content + illustration |
| `FarmTypesSection` | Static sector cards |
| `EmployerCtaSection` | Static CTA with stats |
| `TrustedBySection` | Logo/text trust signals |
| `FinalCtaSection` | Static CTA above footer |
| `Home.tsx` import order | Add new sections to Home in SPEC order after all are built |
| HeroSection animation | Additive CSS change, any time |

---

## Scalability Considerations

| Concern | v1.1 Impact | Mitigation |
|---------|-------------|------------|
| Wizard interface growth | +8–12 fields per wizard (3 wizards) | Flat interface pattern handles 30+ fields without issue; no structural change needed |
| FilterSidebar group count | +3 new filter groups | No interface change needed; groups are internal; sidebar scrolls if needed on mobile |
| JobDetail page complexity | +5 new sections | Extract sections as named sub-components within the file if it exceeds ~400 lines; no new routing needed |
| ApplicantDashboard rebuild | Highest complexity item — tab state, bulk selection, AI fetch | Manage tab state per-applicant in a `Map` ref; bulk selection in local Set state; AI results cached in Map |
| Bundle size | RangeSlider uses existing Radix Slider dep | No new runtime dependencies if Radix Slider and Dialog are already in the lockfile |
| AI summary fetch cost | Multiple applicants on dashboard | Cache per applicant in component state; only fetch when tab first opened |

---

## Integration Points Summary

| Gap Category | Integration Point | Touch Points |
|-------------|-------------------|-------------|
| Employer onboarding fields | `EmployerProfileData` interface + upsert payload | 1 shell file + 3 step files |
| Post job wizard fields | `JobPostingData` interface + update payload | 1 shell file + 4 step files |
| Post job live preview | PostJob shell layout conditional + new LivePreviewSidebar | 1 shell file + 1 new component |
| Seeker onboarding fields | `SeekerProfileData` type (in domain.ts) + upsert payload | 1 type file + 1 shell file + 4 step files |
| Seeker completion screen | SeekerStep7Complete: new Supabase query for matched jobs | 1 step file |
| FilterSidebar new filters | `FilterSidebar` internal groups + RangeSlider refactor | 1 component file |
| Search page additions | `JobSearch` layout additions; SearchJobCard expansion | 2 page-level files + 2 new components |
| Job detail additions | `JobDetail` layout additions | 1 page file + 3 new primitive components |
| Application status banners | `ApplicationCard`, `MyApplications` | 2 files + 1 new StatusBanner component |
| Applicant dashboard | `ApplicantDashboard` full rebuild | 1 file + ExpandableCardTabs component |
| Landing sections | `Home.tsx` import additions | 5 new landing section files + 1 updated Home |

---

## Sources

- Codebase direct inspection (HIGH confidence):
  - `/Users/harrysmith/dev/topfarms/src/pages/onboarding/EmployerOnboarding.tsx`
  - `/Users/harrysmith/dev/topfarms/src/pages/jobs/PostJob.tsx`
  - `/Users/harrysmith/dev/topfarms/src/pages/onboarding/SeekerOnboarding.tsx`
  - `/Users/harrysmith/dev/topfarms/src/pages/jobs/JobSearch.tsx`
  - `/Users/harrysmith/dev/topfarms/src/components/ui/FilterSidebar.tsx`
  - Full component inventory via `src/components/ui/` and `src/pages/` glob
- Confirmed Radix dependencies: `@radix-ui/react-slider` (FilterSidebar line 2), `@radix-ui/react-dialog` (JobSearch line 3)
- Project context: `.planning/PROJECT.md` (v1.1 milestone targets confirmed)

*Architecture research for: TopFarms v1.1 SPEC Compliance milestone*
*Researched: 2026-03-20*
