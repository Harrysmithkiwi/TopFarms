# Phase 3: Seeker Demand Side - Research

**Researched:** 2026-03-16
**Domain:** React wizard pattern, Supabase PostgreSQL filtering, URL-synced filter state, match scoring SQL, application pipeline
**Confidence:** HIGH

## Summary

Phase 3 is the seeker-facing counterpart to Phase 2. The codebase already has significant scaffolding: `SeekerDashboard` (shell only), `JobDetail` (employer-gated Apply stub), `seeker_profiles` table with full schema, `seeker_skills` table, `match_scores` table, `applications` table, and all RLS policies. The `/onboarding/seeker` and `/jobs` routes exist as placeholders in `main.tsx`.

The critical architectural work is: (1) the seeker onboarding wizard following the `EmployerOnboarding` pattern exactly, (2) a SQL function for computing match scores at query time (Phase 3 approach, pre-computed engine is Phase 4), (3) a job search page with live URL-synced filters, and (4) the application pipeline UI for both seekers and employers. Three schema migrations are required before any application code: `seeker_profiles` needs `onboarding_step`, `onboarding_complete`, and `dairynz_level`; `applications` status enum must be expanded from `('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')` to the 8-stage pipeline; and `seeker_skills.proficiency` values in the existing table differ from the SPEC.

**Primary recommendation:** Build in the same plan structure as Phase 2 — schema migration first, then wizard (with reuse of `useWizard`, `StepIndicator`, `SkillsPicker`), then search page, then job detail seeker view, then application pipeline.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search & Filter UX**
- Live filtering — results update instantly as each filter changes, no "Apply" button
- Filter state syncs to URL for shareable/bookmarkable searches
- Default sort: match score (best matches first), secondary sort by recency
- Rich cards for search results: job title, farm name, region, salary range, match score circle, key tags (shed type, accommodation, contract type), trust badge. ~120px tall. Reuses existing JobCard component pattern
- Mobile: bottom drawer for filters — filter icon in sticky header opens full-height drawer with "Show X results" button at bottom to close and apply

**Application Flow**
- One-click apply with optional cover note — "Apply" button opens lightweight modal with optional textarea, one more click to confirm. Seeker's profile IS the application
- Seeker "My Applications" view: card list with status badges (reusing JobCard), grouped by active vs completed, withdraw button on active applications
- Employer applicant dashboard: ranked list by match score with expandable panels. Each row shows name, match score circle, key skills overlap, application date. Expanded panel shows full seeker profile, cover note, and stage transition controls
- Pipeline transitions via dropdown on expanded panel — shows valid next stages (e.g., Applied -> Review or Declined), select to transition with optional note

**Seeker Onboarding**
- Reuses existing wizard pattern: linear, auto-save, numbered step bar (useWizard hook + StepIndicator component)
- Experience capture: simple fields — total years (number input), herd sizes worked with (multi-select checkboxes: <200, 200-500, 500-1000, 1000+), shed types experienced (multi-select: rotary, herringbone, other). No farm history timeline
- DairyNZ qualification: single dropdown (None, Level 1, Level 2, Level 3, Level 4) with tooltip explaining each level
- Life situation: grouped toggles + fields — "Seeking work as a couple?" toggle (if yes: partner name), "Need on-farm accommodation?" toggle (if yes: pets, children, vehicle parking sub-options), region preference as multi-select of NZ regions
- Post-onboarding landing: job search page with success toast ("Profile complete! Here are jobs matching your skills"), filters pre-set from profile (farm type, region). Immediate value — they came to find work

**Match Scores (Pre-Engine)**
- Basic scoring implemented in Phase 3 as a Supabase PostgreSQL function — computes scores from seeker profile + job fields at query time. Phase 4 replaces with optimized pre-computed engine
- Job detail match breakdown: sidebar card with category rows (Shed Type, Location, Accommodation, Skills, Salary, Visa) as horizontal progress bars per category, total score circle at top (reusing MatchCircle component)
- Visitor teaser: match breakdown card shown but blurred/locked with overlay "Sign up to see how you match" — drives signups
- No competitive signals — seeker sees only their own match breakdown, no percentile or comparison to other seekers
- Low scores shown honestly with brief context (e.g., "0/25 Shed Type — Different shed type experience"). Not alarming, not patronizing
- Scores refresh on next search/job detail load after profile edit — no background recalculation in Phase 3 (Phase 4 adds trigger-based staleness)
- Employer applicant dashboard: total match score circle per applicant in list, expanded view shows 2-3 key match highlights (e.g., "Rotary shed experience", "Accommodation match") rather than full category breakdown

### Claude's Discretion
- Loading skeletons and transition animations
- Exact spacing, typography, and responsive breakpoints within design system
- Error state handling and messaging
- Empty state designs (no search results, no applications yet)
- Skills self-assessment step UX details (reuses SkillsPicker with proficiency levels)
- Visa status capture format
- Search result pagination/infinite scroll approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SONB-01 | 8-step onboarding wizard: account setup, farm type preference, experience, skills with proficiency, life situation, visa status, completion, profile management | EmployerOnboarding pattern: useWizard + StepIndicator + upsert per step. Seeker shell needs `onboarding_step` + `onboarding_complete` columns (migration needed) |
| SONB-02 | Farm type preference selection (dairy cattle, sheep & beef) | Reuse same chip/card selector pattern from employer onboarding Step1FarmType. Writes to `seeker_profiles.sector_pref` (text[]) |
| SONB-03 | Experience capture: years, herd sizes worked with, shed types experienced | Number input for `years_experience`, multi-select checkboxes for herd size buckets and shed types. No columns missing — all in existing seeker_profiles |
| SONB-04 | Skills self-assessment with proficiency levels from master skills table | SkillsPicker reuse (proficiency mode, not requirementMode). Writes to `seeker_skills` table. Note: existing proficiency CHECK is `('learning', 'competent', 'experienced', 'expert')` — verify alignment with UI options |
| SONB-05 | Life situation: couples seeking, accommodation requirements (pets, family), location preferences | Fields: `couples_seeking`, `accommodation_needed`, `pets` jsonb, `family` jsonb, `region` (multi-select → store first pref, or extend). Existing schema supports all |
| SONB-06 | Visa and work rights status | `seeker_profiles.visa_status` text field with CHECK constraint values. Dropdown with 5 options |
| SONB-07 | DairyNZ qualification level capture | `dairynz_level` column does NOT exist in current schema — migration required to add it to `seeker_profiles` |
| SONB-08 | Seeker profile persisted and editable after completion | Same upsert-on-step pattern as employer wizard. Profile edit accessible from dashboard |
| SRCH-01 | Job search results page with filter sidebar (280px desktop, drawer on mobile) | New page at `/jobs`. Radix Dialog or Sheet for mobile drawer. CSS grid: 280px sidebar + 1fr results |
| SRCH-02 | Filter by shed type | Array overlap on `jobs.shed_type` (GIN indexed). Supabase: `.overlaps('shed_type', ['rotary'])` |
| SRCH-03 | Filter by accommodation (available/not, pets, couples, family) | `jobs.accommodation` is jsonb. Query: `.contains('accommodation', {available: true})` or join to employer_profiles |
| SRCH-04 | Filter by visa requirements | `jobs.visa_sponsorship` bool. Mapping seeker status → filter value logic needed |
| SRCH-05 | Filter by DairyNZ qualification level | No `dairynz_level` on jobs table currently — check if it's captured in job_skills or if jobs needs a new column |
| SRCH-06 | Filter by herd size range | `jobs.herd_size_min` / `jobs.herd_size_max` columns exist. Use `.gte` / `.lte` |
| SRCH-07 | Filter by couples welcome | `jobs.couples_welcome` bool direct filter |
| SRCH-08 | Filter by salary range (dual-handle slider) | `jobs.salary_min` / `salary_max`. Slider: custom range input or install `@radix-ui/react-slider` |
| SRCH-09 | Filter by region (NZ regions) | `jobs.region` text. `NZ_REGIONS` constant already in `src/lib/constants.ts`. Multi-select checkboxes |
| SRCH-10 | Filter by contract type | `jobs.contract_type` text enum. Checkboxes |
| SRCH-11 | Search results display match score per job (when logged in as seeker) | SQL function `compute_match_score(seeker_id, job_id)` called per row. Or LEFT JOIN match_scores if pre-computed. Phase 3: compute at query time via RPC |
| SRCH-12 | Search results load in <1.5 seconds | Requires indexed queries + score computation kept lightweight. Avoid N+1: compute scores in a single batch RPC call, not per-card |
| JDET-01 | Job detail page with full listing information | Already built in `JobDetail.tsx`. Phase 3 adds seeker-specific sections |
| JDET-02 | Logged-in seeker view: match score breakdown by category | Add sidebar card using `MatchCircle` (lg) + `ProgressBar` per dimension. Scores fetched from SQL function or match_scores table |
| JDET-03 | Visitor view: signup prompt instead of match details | Already implemented as blurred card. Phase 3 enhances this with the proper breakdown card (blurred) |
| JDET-04 | Apply button with optional cover note | Replace current "toast stub" in JobDetail.tsx seeker CTA. Modal with optional textarea → INSERT to applications |
| APPL-01 | Seeker can submit application to a job listing | INSERT into `applications` (job_id, seeker_id, cover_note). applications.status needs migration from old enum to 8-stage |
| APPL-02 | Seeker application view with pipeline stages | New route `/dashboard/seeker/applications`. Card list + stage track UI. Reuse DashboardLayout |
| APPL-03 | Seeker can withdraw application | UPDATE applications SET status = 'withdrawn'. RLS: seekers update own applications |
| APPL-04 | Employer applicant dashboard with ranked candidates by match score | New route `/dashboard/employer/jobs/:id/applicants`. Ranked list by match score, expandable panels |
| APPL-05 | Employer can transition applicants through pipeline stages | Dropdown per applicant panel. Valid transitions enforced in UI logic. UPDATE via employer RLS policy |
| APPL-06 | Expandable applicant panels showing seeker profile details | Accordion/collapsible. Load seeker_profiles + seeker_skills on expand |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 18 / 5 | UI components | Project baseline |
| react-router@7 | 7.x | Routing, URL state | Established in project |
| Supabase JS | 2.x | Database queries, RPC | Established in project |
| Tailwind CSS v4 | 4.x | Styling | Established (@tailwindcss/vite, CSS-first) |
| Radix UI primitives | latest | Accessible drawer, dialog, select | Established in project |
| sonner | latest | Toast notifications | Already used in JobDetail |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-slider | latest | Dual-handle salary range slider | SRCH-08 — don't hand-roll |
| lucide-react | latest | Icons | Established in project |
| tailwind-merge | 3.x | Class merging | Established via cn() util |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @radix-ui/react-slider | Custom HTML range input | Two-thumb salary slider is non-trivial — use Radix |
| Radix Sheet (mobile drawer) | Custom CSS slide-in | Radix handles focus trap, a11y, escape key — use it |

**Installation (if not already present):**
```bash
npm install @radix-ui/react-slider @radix-ui/react-dialog
```
Note: Check `package.json` — Radix primitives may already be installed via the design system.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   ├── onboarding/
│   │   ├── SeekerOnboarding.tsx         # wizard shell (mirrors EmployerOnboarding)
│   │   └── steps/
│   │       ├── SeekerStep1FarmType.tsx
│   │       ├── SeekerStep2Experience.tsx
│   │       ├── SeekerStep3Qualifications.tsx
│   │       ├── SeekerStep4Skills.tsx
│   │       ├── SeekerStep5LifeSituation.tsx
│   │       ├── SeekerStep6Visa.tsx
│   │       ├── SeekerStep7Complete.tsx
│   │       └── SeekerStep8Profile.tsx
│   ├── jobs/
│   │   ├── JobSearch.tsx                # /jobs — search + filter page
│   │   └── JobDetail.tsx                # extend existing
│   └── dashboard/
│       ├── SeekerDashboard.tsx          # extend existing shell
│       └── seeker/
│           └── MyApplications.tsx       # /dashboard/seeker/applications
│       └── employer/
│           └── ApplicantDashboard.tsx   # /dashboard/employer/jobs/:id/applicants
├── components/
│   └── ui/
│       ├── FilterSidebar.tsx            # search filter sidebar
│       ├── SearchJobCard.tsx            # search result card (extends JobCard pattern)
│       ├── MatchBreakdown.tsx           # match score category bars + circle
│       ├── ApplicationCard.tsx          # seeker's application status card
│       └── ApplicantPanel.tsx           # employer's expandable applicant row
└── supabase/migrations/
    └── 009_seeker_onboarding.sql        # required schema additions
```

### Pattern 1: Seeker Wizard Shell (mirrors EmployerOnboarding exactly)
**What:** Shell component owns Supabase persistence. `useWizard` hook owns navigation state. Each step receives `onComplete(data)` callback. Shell upserts `seeker_profiles` on each step completion.
**When to use:** All 8 seeker onboarding steps.
**Example:**
```typescript
// Pattern from EmployerOnboarding.tsx
async function handleStepComplete(stepData: Partial<SeekerProfileData>, stepIndex: number) {
  const updatedData = { ...profileData, ...stepData }
  setProfileData(updatedData)
  const isLastStep = stepIndex === TOTAL_STEPS - 1
  await supabase.from('seeker_profiles').upsert({
    user_id: session.user.id,
    ...updatedData,
    onboarding_step: stepIndex + 1,
    ...(isLastStep ? { onboarding_complete: true } : {}),
  }, { onConflict: 'user_id' })
  wizard.nextStep()
}
```

### Pattern 2: URL-Synced Filter State
**What:** Filter state lives in URL search params. `useSearchParams` from react-router reads and writes params. Each filter change calls `setSearchParams` — triggers re-fetch via `useEffect([searchParams])`. No "Apply" button needed.
**When to use:** JobSearch page filter sidebar.
**Example:**
```typescript
// react-router@7 URL sync pattern
const [searchParams, setSearchParams] = useSearchParams()

function handleFilterChange(key: string, value: string | string[] | null) {
  const next = new URLSearchParams(searchParams)
  if (value === null || (Array.isArray(value) && value.length === 0)) {
    next.delete(key)
  } else if (Array.isArray(value)) {
    next.delete(key)
    value.forEach(v => next.append(key, v))
  } else {
    next.set(key, value)
  }
  setSearchParams(next, { replace: true })
}

useEffect(() => {
  fetchJobs(buildQueryFromParams(searchParams))
}, [searchParams])
```

### Pattern 3: Match Score SQL Function (Phase 3 at-query-time)
**What:** A Supabase PostgreSQL function `compute_match_score(p_seeker_id uuid, p_job_id uuid)` that returns `(total_score int, breakdown jsonb)`. Called via `supabase.rpc('compute_match_score', {p_seeker_id, p_job_id})`. For search results, a batch function returns scores for multiple jobs at once to avoid N+1.
**When to use:** Job search result cards (scores) and job detail match breakdown.
**Example:**
```sql
-- Scoring dimensions per SPEC Section 9.1
-- shed_type: 25pts, location: 20pts, accommodation: 20pts,
-- skills: 20pts, salary: 10pts, visa: 5pts, couples bonus: +5pts, recency ×1.1
CREATE OR REPLACE FUNCTION compute_match_score(p_seeker_id uuid, p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seeker seeker_profiles%ROWTYPE;
  v_job    jobs%ROWTYPE;
  v_shed_score    int := 0;
  v_location_score int := 0;
  v_accommodation_score int := 0;
  v_skills_score  int := 0;
  v_salary_score  int := 0;
  v_visa_score    int := 0;
  v_couples_bonus int := 0;
  v_total         int;
BEGIN
  SELECT * INTO v_seeker FROM seeker_profiles WHERE id = p_seeker_id;
  SELECT * INTO v_job    FROM jobs         WHERE id = p_job_id;
  -- ... dimension scoring logic ...
  v_total := v_shed_score + v_location_score + v_accommodation_score
           + v_skills_score + v_salary_score + v_visa_score + v_couples_bonus;
  -- Recency multiplier
  IF v_job.created_at > now() - interval '7 days' THEN
    v_total := LEAST(100, ROUND(v_total * 1.1));
  END IF;
  RETURN jsonb_build_object(
    'total_score', v_total,
    'breakdown', jsonb_build_object(
      'shed_type', v_shed_score,
      'location', v_location_score,
      'accommodation', v_accommodation_score,
      'skills', v_skills_score,
      'salary', v_salary_score,
      'visa', v_visa_score,
      'couples', v_couples_bonus
    )
  );
END;
$$;
```

### Pattern 4: Seeker Skills — delete+insert
**What:** When saving skills step, DELETE existing `seeker_skills` rows for the seeker then INSERT fresh rows. Same as `JobStep3Skills` pattern in Phase 2 (`job_skills` delete+insert).
**When to use:** SeekerStep4Skills `onComplete` handler.

### Pattern 5: Application Status Transitions (employer)
**What:** A fixed state machine for valid transitions. Defined as a client-side constant. Dropdown shows only valid next states. UPDATE via Supabase with RLS ensuring employer owns the job.
**When to use:** ApplicantDashboard stage transition control.
```typescript
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied:     ['review', 'declined'],
  review:      ['interview', 'shortlisted', 'declined'],
  interview:   ['shortlisted', 'declined'],
  shortlisted: ['offered', 'declined'],
  offered:     ['hired', 'declined'],
  hired:       [],
  declined:    [],
  withdrawn:   [],
}
```

### Anti-Patterns to Avoid
- **Computing scores client-side:** Never calculate match scores in JavaScript. All scoring logic must live in the Supabase SQL function. Client-side is guessable and incorrect.
- **N+1 score fetches:** Do not call `compute_match_score` once per job card. Use a batch RPC that returns scores for all visible jobs in one call.
- **Filter debounce without URL sync:** Don't debounce filter changes separately from URL updates. Let `setSearchParams` trigger the single `useEffect` — this handles debouncing naturally via React render cycle.
- **Applying without seeker profile:** Check that `seeker_profiles` row exists before showing Apply button. A seeker who skipped onboarding must not be able to apply.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual-handle salary slider | Custom two-thumb range input | `@radix-ui/react-slider` | Two thumbs, keyboard nav, a11y is hard |
| Mobile filter drawer | Custom CSS slide-in | Radix Sheet or Dialog | Focus trap, escape key, scroll lock |
| Step navigation | Custom index tracking | `useWizard` hook (already exists) | Established, tested pattern in this codebase |
| Skills picker | Custom grouped checklist | `SkillsPicker` component (already exists) | Loading, sector filtering, proficiency select already built |
| Match score display | Custom circle | `MatchCircle` (already exists) | Colour thresholds, sizing variants |
| Match bar display | Custom progress | `ProgressBar` (already exists) | Already styled to design system |

**Key insight:** Phase 2 built the component library Phase 3 consumes. Nearly every UI primitive needed already exists.

---

## Common Pitfalls

### Pitfall 1: Applications Status Enum Mismatch
**What goes wrong:** The existing `applications` table has a CHECK constraint for `('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')`. The SPEC and CONTEXT require 8 stages: `('applied', 'review', 'interview', 'shortlisted', 'offered', 'hired', 'declined', 'withdrawn')`.
**Why it happens:** Schema was created with a simplified status set in Phase 1. Phase 3 is the first phase that writes to this table.
**How to avoid:** Migration 009 must drop the old CHECK constraint and add the correct one before any application INSERT.
**Warning signs:** Supabase `insert` to `applications` returning `23514 check_violation` error.

### Pitfall 2: seeker_profiles Missing Columns
**What goes wrong:** `onboarding_step` and `onboarding_complete` do not exist on `seeker_profiles` (they were only added to `employer_profiles` in migration 004). The `dairynz_level` field required for SONB-07 also does not exist.
**Why it happens:** Migration 004 only extended employer_profiles.
**How to avoid:** Migration 009 must add these three columns before the wizard shell can upsert them.
**Warning signs:** Supabase upsert returning `42703 undefined_column` error for `onboarding_step`.

### Pitfall 3: seeker_skills Proficiency Enum Drift
**What goes wrong:** `seeker_skills.proficiency` CHECK is `('learning', 'competent', 'experienced', 'expert')` in migration 001. The SPEC says `'confident' | 'learning' | 'entry'` and SkillsPicker offers `'basic' | 'intermediate' | 'advanced'`. All three are inconsistent.
**Why it happens:** Schema evolved through multiple drafts before settling.
**How to avoid:** Migration 009 must align the CHECK constraint with the UI values. Decision: use `('basic', 'intermediate', 'advanced')` to match the existing SkillsPicker component constants (`PROFICIENCY_OPTIONS`). Update the constraint.
**Warning signs:** Insert to `seeker_skills` returning `23514 check_violation`.

### Pitfall 4: Filter Accommodation Mapping
**What goes wrong:** `jobs.accommodation` is a `jsonb` column but the structure may vary. Filtering with `.contains()` requires consistent key naming.
**Why it happens:** `accommodation` was defined as generic jsonb in Phase 2.
**How to avoid:** Check Phase 2 PostJob step 4 to confirm the exact jsonb keys written (`available`, `type`, `pets`, `couples`, `family`). Use those same keys in filter queries.
**Warning signs:** Filter for `accommodation: pets` returning no results despite jobs having pets-allowed.

### Pitfall 5: Score N+1 on Search Page
**What goes wrong:** Fetching job list (12 results) then calling `compute_match_score` 12 times produces 13 Supabase round trips. With network latency this will blow the <1.5s budget (SRCH-12).
**Why it happens:** Natural code path when adding scores to existing per-card fetch.
**How to avoid:** Write a batch RPC `get_jobs_with_scores(p_seeker_id, filter_params)` that returns jobs + scores in one query. Or use the `match_scores` table if it's been pre-populated (Phase 4 path).
**Warning signs:** Network tab showing 12+ separate RPC calls on search result load.

### Pitfall 6: Route Ordering for New Seeker Routes
**What goes wrong:** Adding `/dashboard/seeker/applications` after `/dashboard/seeker` can cause React Router to match incorrectly if not ordered properly.
**Why it happens:** The `/jobs/new` vs `/jobs/:id` conflict that Phase 2 already solved demonstrates this risk.
**How to avoid:** In `main.tsx`, declare more-specific routes before generic ones. `/dashboard/seeker/applications` before any catch-all seeker route.

### Pitfall 7: Seeker Profile ID vs User ID
**What goes wrong:** `applications.seeker_id` references `seeker_profiles.id` (not `auth.users.id`). Must look up `seeker_profiles.id` from `user_id = session.user.id` before inserting an application.
**Why it happens:** Same pattern as `employer_profiles.id` used in Phase 2 for `jobs.employer_id`.
**Warning signs:** Foreign key constraint error on application INSERT.

---

## Code Examples

Verified patterns from existing codebase:

### PGRST116 no-rows detection (wizard mount)
```typescript
// From EmployerOnboarding.tsx — use same pattern in SeekerOnboarding
const { data, error } = await supabase
  .from('seeker_profiles')
  .select('*')
  .eq('user_id', session.user.id)
  .single()

if (error && error.code !== 'PGRST116') {
  // Real error — log it
  console.error('Error loading seeker profile:', error)
}
// PGRST116 = no rows = new user, start from step 0
```

### Seeker profile ID lookup before application INSERT
```typescript
// Get seeker profile ID (not user ID) for FK reference
const { data: profile } = await supabase
  .from('seeker_profiles')
  .select('id')
  .eq('user_id', session.user.id)
  .single()

if (!profile) {
  toast.error('Complete your profile before applying')
  return
}

await supabase.from('applications').insert({
  job_id: jobId,
  seeker_id: profile.id,
  cover_note: coverNote || null,
  status: 'applied',
})
```

### URL-synced filter pattern (react-router@7)
```typescript
import { useSearchParams } from 'react-router'

const [searchParams, setSearchParams] = useSearchParams()
const region = searchParams.get('region') ?? ''
const shedTypes = searchParams.getAll('shed_type')

function setFilter(key: string, value: string) {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true })
}
```

### Array overlap filter (shed_type GIN index)
```typescript
// Supabase PostgREST — overlaps operator for text[]
const query = supabase
  .from('jobs')
  .select('*, employer_profiles(farm_name, region)')
  .eq('status', 'active')

if (shedTypes.length > 0) {
  query.overlaps('shed_type', shedTypes)  // uses GIN index
}
if (region) {
  query.eq('region', region)
}
if (salaryMin) {
  query.gte('salary_max', salaryMin)  // job can pay at least seeker's min
}
```

---

## Schema Migrations Required (Migration 009)

This is the most critical pre-work for Phase 3. All seeker-facing writes will fail without it.

```sql
-- 009_seeker_onboarding.sql

-- 1. Add wizard tracking columns to seeker_profiles (mirrors employer_profiles migration 004)
ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_complete bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dairynz_level       text;  -- 'none'|'level_1'|'level_2'|'level_3'|'level_4'

-- 2. Fix applications status enum to match 8-stage pipeline
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied', 'review', 'interview', 'shortlisted',
                    'offered', 'hired', 'declined', 'withdrawn'));

-- Update default
ALTER TABLE public.applications
  ALTER COLUMN status SET DEFAULT 'applied';

-- 3. Align seeker_skills proficiency with SkillsPicker component values
ALTER TABLE public.seeker_skills
  DROP CONSTRAINT IF EXISTS seeker_skills_proficiency_check;

ALTER TABLE public.seeker_skills
  ADD CONSTRAINT seeker_skills_proficiency_check
  CHECK (proficiency IN ('basic', 'intermediate', 'advanced'));

-- 4. Employer can update application status (for pipeline transitions)
CREATE POLICY IF NOT EXISTS "applications: employers update status for own jobs"
  ON public.applications FOR UPDATE
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
  );

-- 5. Seekers can update own application (withdraw)
CREATE POLICY IF NOT EXISTS "applications: seekers update own"
  ON public.applications FOR UPDATE
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `applications.status` simplified 5-value enum | 8-stage pipeline enum | Migration 009 | Pipeline transitions possible |
| Seeker onboarding placeholder | Full wizard shell | Phase 3 | Core seeker flow |
| `/jobs` placeholder | Live search page | Phase 3 | Core seeker value |
| "Apply Now" toast stub in JobDetail | Full apply modal | Phase 3 | First real application |

**Deprecated/outdated:**
- `OnboardingPlaceholder` at `/onboarding/seeker` in main.tsx: Replace with real `SeekerOnboarding` component
- `Placeholder title="Find Work"` at `/jobs`: Replace with `JobSearch` component

---

## Open Questions

1. **DairyNZ filter on jobs (SRCH-05)**
   - What we know: `dairynz_level` doesn't exist on the `jobs` table. The filter is listed in SRCH-05.
   - What's unclear: Was DairyNZ level intended to filter by _job requirement_ (jobs table) or filter by _seeker qualification_ (seeker profile, already present)? The SPEC doesn't clarify a `dairynz_level` column on jobs.
   - Recommendation: Add `dairynz_level_required` to jobs table in migration 009, OR interpret SRCH-05 as filtering jobs by the seeker's DairyNZ level (i.e., "show me jobs I qualify for"). The latter requires no schema change — compute eligibility in the score function. Default to the latter (no schema change) unless wireframe shows an explicit DairyNZ filter UI on the search page.

2. **Seeker region multi-select vs single value**
   - What we know: `seeker_profiles.region` is a single `text` column. CONTEXT says life situation includes "region preference as multi-select of NZ regions."
   - What's unclear: Should we store as `text[]` array or keep as single text and use the onboarding value as a pre-set filter on search (not stored as multi-select)?
   - Recommendation: For Phase 3, store region as single text (no schema change). The onboarding pre-sets the search filter URL param. True multi-region preference is Phase 4 territory. This keeps migration 009 minimal.

3. **Employer applicant dashboard — route with job ID**
   - What we know: Employer needs to see applicants per job. The natural route is `/dashboard/employer/jobs/:id/applicants`.
   - What's unclear: `EmployerDashboard` currently shows all jobs in one view. Do we add applicant counts to the existing job cards, or create a new page per job?
   - Recommendation: New page `/dashboard/employer/jobs/:id/applicants` per CONTEXT ("Employer applicant dashboard: ranked list by match score"). Add "View Applicants (N)" button to existing `JobCard` component in `EmployerDashboard`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files present in project |
| Config file | None — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` (after setup) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SONB-01 | Wizard advances through 8 steps | unit | `npx vitest run tests/seeker-onboarding.test.tsx` | ❌ Wave 0 |
| SONB-07 | DairyNZ level saves to seeker_profiles | integration | `npx vitest run tests/seeker-profile.test.ts` | ❌ Wave 0 |
| SRCH-01 | Filter sidebar renders all filter groups | unit | `npx vitest run tests/job-search.test.tsx` | ❌ Wave 0 |
| SRCH-12 | Search results load in <1.5s | smoke | Manual — measure network tab | manual-only |
| APPL-01 | Application INSERT succeeds with valid seeker | integration | `npx vitest run tests/applications.test.ts` | ❌ Wave 0 |
| APPL-03 | Withdraw sets status = 'withdrawn' | unit | `npx vitest run tests/applications.test.ts` | ❌ Wave 0 |
| APPL-05 | Employer transitions status through valid stages only | unit | `npx vitest run tests/pipeline-transitions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/seeker-onboarding.test.tsx` — covers SONB-01 through SONB-08
- [ ] `tests/job-search.test.tsx` — covers SRCH-01 through SRCH-11
- [ ] `tests/applications.test.ts` — covers APPL-01 through APPL-06
- [ ] `tests/pipeline-transitions.test.ts` — state machine logic for APPL-05
- [ ] `vitest.config.ts` + `tests/setup.ts` — framework install and config
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom` — if not already in package.json

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/hooks/useWizard.ts`, `src/pages/onboarding/EmployerOnboarding.tsx`, `src/components/ui/SkillsPicker.tsx`, `src/components/ui/JobCard.tsx`, `src/components/ui/MatchCircle.tsx`, `src/components/ui/ProgressBar.tsx`, `src/main.tsx`
- `supabase/migrations/001_initial_schema.sql` — authoritative schema, confirms tables, columns, CHECK constraints, indexes
- `supabase/migrations/002_rls_policies.sql` — existing RLS, gaps identified for application UPDATE policies
- `supabase/migrations/004_employer_profile_columns.sql` — confirms onboarding_step/onboarding_complete do NOT yet exist on seeker_profiles
- `SPEC.md` sections 6.6–6.9, 8.3–8.11, 9.1–9.4 — scoring formula, schema specs, wireframe descriptions
- `.planning/phases/03-seeker-demand-side/03-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `src/pages/jobs/JobDetail.tsx` — confirms "Apply Now" stub, seeker CTA structure for Phase 3 extension
- `src/lib/constants.ts` — confirms NZ_REGIONS array exists and covers all 16 regions

### Tertiary (LOW confidence)
- `@radix-ui/react-slider` recommendation — based on Radix UI being the established primitive library in this project and the general ecosystem standard for accessible sliders. Version not verified against current package.json.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — all patterns verified against existing Phase 2 implementations
- Schema gaps: HIGH — identified by direct comparison of migration files vs SPEC requirements
- Pitfalls: HIGH — three confirmed by direct schema inspection (enum mismatches, missing columns)
- Scoring function: MEDIUM — formula from SPEC is clear, SQL implementation is new work not yet verified against Supabase RPC

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack, 30 days)
