# Domain Pitfalls

**Domain:** NZ agricultural job marketplace — v1.1 SPEC compliance (adding ~70 UI/UX enhancements to working MVP)
**Researched:** 2026-03-20
**Confidence:** HIGH — analysis of actual codebase (PostJob.tsx, wizard steps, component structure, JobPostingData interface) combined with well-established patterns for incremental UI enhancement to working React+Supabase apps.

---

## Critical Pitfalls

### Pitfall 1: Breaking Wizard State by Adding Fields to JobPostingData Interface

**What goes wrong:**
The post-job wizard accumulates form data in a shared `JobPostingData` interface (defined in `PostJob.tsx`). When new fields are added (breed, milking frequency, dairy experience, seniority, qualifications, visa chips, pay frequency, hours, roster), they are added to the TypeScript interface but the existing `useWizard` hook state shape, the Supabase `INSERT` call, and the `jobs` table schema all become inconsistent. The wizard submits but silently drops the new fields — they never reach the database. Alternatively, if the interface is changed but the step component's `onComplete` callback passes a different shape, TypeScript will catch it at compile time but runtime errors may still occur if `defaultValues` prop shapes aren't updated.

**Why it happens:**
The `JobPostingData` interface is the single source of truth for all wizard steps — each step receives `defaultValues?: Partial<FormData>` and calls `onComplete(data)`. Adding a field in Step 2's local Zod schema without adding it to `JobPostingData` means `onComplete` passes data that the parent `PostJob.tsx` doesn't know to accumulate into its state. The field is silently lost when the wizard merges step data.

**Consequences:**
New fields collected from users are never persisted. Users fill in breed information, submit the wizard, see a success screen, but the job listing shows no breed data. This requires a re-do of the entire submission flow to fix — the user's data is gone.

**Prevention:**
1. Update `JobPostingData` in `PostJob.tsx` FIRST before touching any step component — treat this interface as the migration document.
2. Add the new column to the Supabase `jobs` table migration BEFORE writing any UI code — the DB is the source of truth.
3. After adding fields to the interface, search for every location that destructures or spreads `JobPostingData` (the `INSERT` call in `PostJob.tsx`, any `defaultValues` mappings) and update them all in the same commit.
4. Add TypeScript strict mode checks — if `JobPostingData` has a required field and a step's `onComplete` doesn't include it, the compiler will catch it.

**Detection:**
- Submit the wizard in a browser and inspect the Supabase dashboard `jobs` table row — new columns should have values, not NULL.
- Log `wizardData` in `PostJob.tsx` before the final INSERT to confirm all expected fields are present.

**Phase to address:** Any phase that adds job posting fields — must be the first thing done in that phase before any UI work.

---

### Pitfall 2: Adding New Columns Without Schema Migrations That Match Existing Rows

**What goes wrong:**
A new column is added to the `jobs` or `employer_profiles` table (e.g., `breed`, `milking_frequency`, `pay_frequency`) via Supabase dashboard or a migration. Existing rows have NULL for these columns. When the new field is displayed on a job detail page or employer profile page, the UI either crashes (if it expects a non-null value) or silently shows nothing (if it handles null gracefully). More critically: match scoring triggers fire on existing rows but the new field contributes nothing to scores because all existing data is NULL — the scoring engine may treat NULL as "missing" and penalise existing jobs incorrectly.

**Why it happens:**
Adding a column via Supabase dashboard does not backfill existing data. The migration only affects schema, not data. The existing 14-table schema already has live data from v1.0 onboarding.

**Consequences:**
Existing employer profiles and job listings appear broken or incomplete on SPEC-compliant detail pages. Match score recalculations treat existing jobs as zero on new dimensions.

**Prevention:**
1. Every new nullable column migration must include a follow-up assessment: does NULL mean "not set" or "incompatible"? Document this in the migration comment.
2. For scoring-relevant columns (breed, milking_frequency, dairy_experience), update the scoring function to treat NULL as "neutral" (no bonus, no penalty) not "zero" — same pattern as the existing accommodation NULL handling.
3. For display-only columns (roster, pay_frequency), ensure the UI uses optional chaining and fallbacks rather than assuming data presence.
4. Run `SELECT COUNT(*) FROM jobs WHERE breed IS NULL` after migration and before any phase is marked complete — if existing data is NULL and the UI shows it, it should show an "edit to add" affordance, not blank space.

**Detection:**
- Open an existing job listing after adding new columns — all new fields should show gracefully degraded state (empty chip group, "Not specified" text) not undefined errors.
- Check the scoring function handles NULL in the new dimension without subtracting points.

**Phase to address:** Every phase that adds schema columns — migrations must precede UI work and include NULL-handling documentation.

---

### Pitfall 3: Live Preview Sidebar Breaking Existing Wizard Layout at Mobile Breakpoints

**What goes wrong:**
The SPEC requires a live preview sidebar in the post-job wizard. Adding a sidebar to an 8-step form that was designed as a single-column flow on mobile (320px minimum) creates a 2-column layout that breaks at small viewports. The sidebar, if implemented naively as `flex` siblings, pushes the form content to half the viewport width on mobile. More subtly: the wizard already uses `DashboardLayout` which has its own sidebar (`Sidebar.tsx`) — adding another preview sidebar creates a triple-column layout on desktop that overflows the container.

**Why it happens:**
The existing wizard layout assumes a full-width form area within `DashboardLayout`. Adding a preview sidebar without accounting for the existing shell layout causes layout nesting conflicts. Mobile-first was the original design constraint (320px minimum) but the preview sidebar adds content that has no sensible mobile representation below ~768px.

**Consequences:**
The wizard becomes unusable on mobile (the primary device for farm workers). Text overflows. The preview panel clips. The step indicator wraps unexpectedly.

**Prevention:**
1. The preview sidebar must be hidden on mobile (`hidden md:block`) and only appear at ≥768px breakpoints.
2. On mobile, provide a "Preview" step or a bottom sheet triggered by a "Preview" button — not a persistent sidebar.
3. Audit the existing `DashboardLayout` CSS to understand what max-width the main content area already occupies — the preview sidebar must subtract from that, not add to it.
4. Test at 320px, 375px, 768px, and 1280px before calling any phase complete.

**Detection:**
- Open the post-job wizard on a real iPhone (or Chrome DevTools 375px) after adding the preview sidebar — if the form fields are narrower than 280px readable width, the layout is broken.
- Check DevTools for horizontal scroll on any wizard step.

**Phase to address:** Post-job wizard phase — implement preview sidebar as `md:block hidden` from day one, never retrofit.

---

### Pitfall 4: Checkbox-to-Chip Upgrades Breaking Existing Form Validation and Data Shape

**What goes wrong:**
The SPEC requires upgrading several checkbox groups to chip selectors (e.g., visa chips, qualifications chips, career development chips). The existing components use `<Checkbox>` (a boolean input per item) and store data as `boolean` fields or simple arrays. Chip selectors may return a different data shape — multi-select chips typically return `string[]`, but if the existing Supabase column stores data as `boolean` (e.g., `visa_nz_citizen: boolean`, `visa_work_permit: boolean`) then changing the UI to a chip that returns `['nz_citizen', 'work_permit']` requires a schema change too, not just a component swap.

**Why it happens:**
Component upgrades feel like purely frontend work. Developers swap `<Checkbox>` for a chip component without checking what data the existing column expects. The Supabase schema may store visa options as discrete boolean columns, not as a text array. React Hook Form validation schemas (Zod) are also coupled to the field shape — changing from `boolean` to `string[]` breaks validation silently if the schema isn't updated.

**Consequences:**
The chip selection saves but the data is stored incorrectly (array coerced to string, or only the first value kept). Existing profile data (boolean columns) no longer maps to the new chip component's expected format on edit/resume, so returning users see their selections cleared.

**Prevention:**
1. Before upgrading any checkbox to chips, check the Supabase column type: `boolean` columns need a schema migration to `text[]` or a junction table; `text[]` columns can accept chip values directly.
2. Update the Zod schema in the step component at the same time as the component swap — never leave a type mismatch between the UI and the validation schema.
3. For edit flows (returning to fill an already-submitted onboarding form), verify that existing data (stored as booleans) is correctly transformed into the chip component's expected `string[]` format via a `defaultValues` mapping function.
4. Write a mapping utility: `booleanColumnsToChipArray(profile)` that converts `{ visa_nz_citizen: true, visa_work_permit: false }` → `['nz_citizen']` for the chip component's initial value.

**Detection:**
- Start the onboarding wizard as an existing user who completed v1.0 — chips should pre-populate from saved data, not show as blank.
- Submit the chip form and inspect the Supabase row — the column should contain the expected array, not `[object Object]` or a single stringified value.

**Phase to address:** Any phase upgrading checkboxes to chips — must check schema type before writing component code.

---

### Pitfall 5: Scope Creep from "While We're Here" Improvements

**What goes wrong:**
A developer adds the SPEC-required breed field to the post-job wizard Step 2 and notices the accommodation section "could be cleaner." They refactor the accommodation layout "while they're here." The refactor changes the field names passed to `onComplete`, which breaks the existing accommodation scoring trigger that expects specific column names. The original accommodation fields (`accommodation_pets`, `accommodation_couples`) now arrive with different keys. The scoring function silently receives `undefined` for previously working fields.

**Why it happens:**
SPEC compliance work requires touching the same screens as working v1.0 features. The temptation to improve adjacent code while the file is open is natural but dangerous — every working v1.0 feature in the files being touched is a regression risk.

**Consequences:**
A phase closes with new SPEC fields working, but previously working v1.0 fields broken. Regressions are discovered late (after the phase is marked done) because they affect existing data, not new fields.

**Prevention:**
1. Define strict phase boundaries: each phase only changes what the SPEC gap list specifies. Any "while we're here" idea goes into a separate issue/task, not the current phase.
2. Every file opened in a phase should have a diff review before the phase closes — the diff should only contain additions for the new SPEC fields, not modifications to existing field names or logic.
3. Run the full happy-path user flow (complete wizard as employer, complete wizard as seeker, post a job, search, apply) after every phase — not just the new features added.

**Detection:**
- `git diff` review: any line modifying (not adding) existing field names, Zod schema keys, or Supabase column references in a file that wasn't supposed to change is a red flag.
- Run the existing v1.0 E2E user flow after each phase closes.

**Phase to address:** All phases — enforce a "additions only" rule for files that contain working v1.0 logic.

---

### Pitfall 6: URL-Synced Filter State Breaking When New Filters Are Added

**What goes wrong:**
Job search already has 9 agriculture-specific filters with URL-synced state. Adding new filters (role type filter, extras filters, active filter pills, pagination) requires extending the URL parameter schema. If new filter params use the same key name as an existing one (e.g., `type` already means `role_type` in the URL but the new filter also wants to use `type`), the URL becomes ambiguous. More critically: if the URL state update for new filters triggers a full page re-render (replacing all URL params rather than merging), existing active filters are silently cleared when a new filter is applied.

**Why it happens:**
URL search params are typically managed with `useSearchParams` and `setSearchParams`. Naive implementations call `setSearchParams({ newParam: value })` which replaces the entire params object, clearing all existing filters. The existing 9-filter implementation works because it was written together. Adding filters piecemeal risks breaking the merge behavior.

**Consequences:**
A seeker applies a region filter, then applies the new role type filter — the region filter disappears. This is the most disruptive regression possible for search UX because it's invisible (no error) and defeats the purpose of multi-filter search.

**Prevention:**
1. Always use `setSearchParams(prev => ({ ...Object.fromEntries(prev), newParam: value }))` — merge pattern, never replace.
2. Audit the existing filter update code before adding any new filter — confirm it uses the merge pattern already.
3. New filter keys must be distinct from all existing keys — document the full URL parameter schema before writing code.
4. Pagination must reset to page 1 whenever any filter changes — handle this explicitly, not as an afterthought.

**Detection:**
- Apply any existing filter (e.g., region = Waikato), then apply a new filter — the region filter must still be active in the URL and the results must still be filtered by region.
- Inspect URL after applying multiple filters — all active filters should be present as separate params.

**Phase to address:** Job search phase — audit URL param handling before writing any new filter code.

---

## Moderate Pitfalls

### Pitfall 7: Applicant Dashboard Sidebar Nav Conflicting with DashboardLayout Sidebar

**What goes wrong:**
The SPEC requires a sidebar nav on the applicant dashboard. `DashboardLayout` already renders a `Sidebar.tsx` component. Adding another sidebar inside the dashboard content area creates two sidebars — the shell sidebar and the page-level sidebar. On tablet viewports, the combined width overflows the content area.

**Prevention:**
Determine whether the SPEC sidebar replaces the shell sidebar (use a layout variant without `DashboardLayout`'s sidebar for this page) or is an in-content secondary nav. Do not implement both simultaneously without explicit breakpoint management. Use a page-specific layout wrapper for the applicant dashboard rather than fighting `DashboardLayout`.

---

### Pitfall 8: Status Variant Banners in MyApplications Adding New Application States

**What goes wrong:**
The SPEC adds status variant banners for `shortlisted`, `interview`, `offer`, and `declined` states. The existing application pipeline has 8 stages managed via the `applications.status` column. If the banner variants are added as new status values that don't exist in the Supabase enum/check constraint, inserts/updates to those statuses will fail at the database level with a constraint violation — silently failing in the UI (toast shows but status doesn't persist).

**Prevention:**
Check the existing `status` column constraint on the `applications` table before adding any new banner — if it's a `text` column with a CHECK constraint listing allowed values, add the new values to the constraint in a migration before writing any UI code. If it's a PostgreSQL `ENUM` type, use `ALTER TYPE ... ADD VALUE` migration.

---

### Pitfall 9: Document Upload (Seeker Onboarding) Storage Bucket Permissions

**What goes wrong:**
The SPEC adds document upload to seeker onboarding (licences, certifications). If these are uploaded to the same Supabase Storage bucket as employer farm photos, the bucket's RLS policy may be too permissive — allowing any authenticated user to read any uploaded document. Licences and certifications are personal identity documents.

**Prevention:**
Create a dedicated private bucket for seeker documents (`seeker-documents`) separate from any existing employer bucket. Apply RLS: only the uploading seeker and any employer with an active application from that seeker can read the document. Never upload identity documents to a public bucket.

---

### Pitfall 10: AI Candidate Summaries in Applicant Dashboard Blocking Page Load

**What goes wrong:**
The SPEC adds AI candidate summaries to the applicant dashboard. If the AI summary is fetched synchronously on dashboard load (Claude API Edge Function called for each applicant), the dashboard takes 3-10 seconds to load with any applicants present. The employer sees a blank or spinning dashboard.

**Prevention:**
AI summaries must be pre-generated and cached (stored in `applications.ai_summary` text column, regenerated async when application status changes). The dashboard loads cached summaries instantly. A "Generating..." placeholder shows for fresh applications without a cached summary. Never call the Claude API in the page load critical path.

---

### Pitfall 11: Expandable Card Tabs in Job Search Adding Heavy DOM

**What goes wrong:**
The SPEC adds expandable card tabs to search result cards. If each card renders all tab content in the DOM simultaneously (just hidden with CSS), a page of 20 results with 4 tabs each renders 80 hidden content blocks. On mobile this causes jank and slow scrolling.

**Prevention:**
Render tab content lazily — only mount the active tab's content. Use conditional rendering (`{activeTab === 'details' && <DetailsTab />}`) not CSS visibility toggling. This keeps the DOM light for the common case (no tabs expanded).

---

## Minor Pitfalls

### Pitfall 12: Char Limit Alignment Breaking Existing Text Inputs

**What goes wrong:**
The SPEC requires char limit alignment (presumably character counters on text inputs). Adding a character counter to an existing `<Input>` component (`Input.tsx`) that didn't previously have one changes the component's visual height, which can break the spacing of any form that uses `Input` in a tight layout.

**Prevention:**
Add char counter as an optional prop (`maxLength?: number`) that defaults to undefined (no counter shown). Never change the default visual behavior of a shared component — opt-in only. Update existing usages only where SPEC explicitly requires it.

---

### Pitfall 13: Completion Screen "Matched Jobs" Query in Seeker Onboarding

**What goes wrong:**
The SPEC adds a completion screen with matched jobs to seeker onboarding. At the moment of completion, match scores may not yet be computed for the new seeker profile (the trigger runs asynchronously). The completion screen queries `match_scores` and finds zero results — showing "No matching jobs found" to a brand-new seeker.

**Prevention:**
On the completion screen, show a loading state for up to 30 seconds while polling for the first batch of match scores. If scores aren't ready after 30 seconds, show "Your matches are being calculated — check back shortly" rather than "No matches." Never show "0 matches" on a completion screen for a new user — it's the worst possible first impression.

---

### Pitfall 14: Landing Page Section Additions Increasing LCP

**What goes wrong:**
Adding 5 new landing page sections (AI matching, farm types, employer CTA, trusted-by, final CTA) plus a hero animation increases the page weight. If the hero animation is an unoptimised video or large SVG, the LCP (Largest Contentful Paint) exceeds the <2s target.

**Prevention:**
Hero animation should be CSS/Tailwind animation or a small Lottie JSON file (<50KB), not video. New landing sections should lazy-load their images (`loading="lazy"`). Run Lighthouse on the landing page after every section addition — catch LCP regressions early, not at launch.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Post-job wizard: new fields | `JobPostingData` interface + Supabase INSERT out of sync | Update interface and DB migration before any step component |
| Post-job wizard: live preview sidebar | Mobile layout breaks at 320-768px | `hidden md:block` from day one; test at 375px before PR |
| Post-job wizard: checkbox→chip upgrades | Boolean DB columns incompatible with chip string[] output | Check column type first; write mapping utility for defaultValues |
| Seeker onboarding: new fields | Match score triggered before new columns are in scoring function | Add new fields to scoring function in same phase as schema migration |
| Seeker onboarding: document upload | Identity documents in wrong bucket | New private bucket with seeker-only RLS before any upload UI |
| Seeker onboarding: completion screen | "0 matches" shown before async triggers fire | Poll with timeout; never show 0 matches on completion |
| Employer onboarding: new fields | Existing employer profiles show NULL for new required fields | Edit profile flow must handle NULL gracefully with "Add" prompts |
| Job search: new filters | URL param merge breaking clears existing filters | Audit existing setSearchParams calls; enforce merge pattern |
| Job search: pagination | Page param not resetting on filter change | Reset to page 1 on every filter change — explicit, not assumed |
| Job search: expandable card tabs | Full DOM rendered for all tabs × 20 cards | Lazy-render active tab only |
| Applicant dashboard: sidebar nav | Double sidebar with DashboardLayout | Use layout variant; clarify SPEC intent before implementing |
| Applicant dashboard: AI summaries | Claude API blocks dashboard load | Pre-generate and cache; dashboard reads cache only |
| My Applications: status banners | New statuses not in DB check constraint | Migrate constraint before UI; verify with constraint violation test |
| Landing page: hero animation | LCP regression >2s | CSS animation or Lottie <50KB; Lighthouse gate per section |
| Any phase: scope creep | Working v1.0 fields broken by "while we're here" refactors | Additions-only rule; diff review before phase closes |
| Any phase: component upgrades | Shared component changes break unrelated pages | Opt-in props only; no default behavior changes to shared components |

---

## Regression Prevention Checklist

Run this after every phase closes before marking it done.

- [ ] **Wizard happy path:** Complete the full employer onboarding wizard as a new user — reaches completion screen, profile saved in Supabase with all expected fields populated (not NULL for new fields).
- [ ] **Wizard happy path:** Complete the full post-job wizard — job saved in Supabase `jobs` table with all new columns populated, listing appears in search.
- [ ] **Seeker happy path:** Complete seeker onboarding wizard — profile saved, completion screen shows matched jobs (or loading state if async), new fields (licences, certifications) stored.
- [ ] **Search filters:** Apply 3+ filters simultaneously — all filters persist in URL, all remain active when additional filters are applied.
- [ ] **Mobile check:** Open wizard and search page at 375px — no horizontal scroll, no overlapping elements, no text overflow.
- [ ] **Existing employer profiles:** Log in as a v1.0 employer — new fields show graceful empty state, not undefined errors or crashes.
- [ ] **Chip/checkbox migration:** Log in as a v1.0 user whose profile has boolean checkbox data — upgraded chip components show pre-populated selections, not blank.
- [ ] **Match scores:** After any schema change to jobs or seeker_profiles, verify the scoring trigger still fires and produces non-null scores for a test job+seeker pair.
- [ ] **RLS check:** New tables or columns added in this phase must have RLS enabled and policies verified for both employer and seeker roles.
- [ ] **Shared components:** If `Input.tsx`, `Button.tsx`, `Checkbox.tsx`, or `Select.tsx` were modified, open a page that uses them but was NOT part of this phase — confirm it still renders correctly.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| New wizard fields not reaching Supabase | MEDIUM | Add missing fields to `JobPostingData`, update INSERT call, ask affected users to re-submit (or backfill via admin if data was partially captured) |
| Mobile layout broken by preview sidebar | LOW | Add `hidden md:block` to sidebar, add mobile "Preview" button — 1-2 hours |
| Chip upgrade broke boolean column data | MEDIUM | Write a one-off migration to convert existing boolean columns to text array format; update defaultValues mapping |
| URL filter merge broke — filters clear on new selection | LOW | Fix setSearchParams to use merge pattern; regression is pure frontend, no data loss |
| New status value not in DB constraint | LOW | ALTER TABLE/TYPE migration to add value; no data loss, 30 minutes |
| AI summaries blocking dashboard load | MEDIUM | Move Claude API call to async background Edge Function triggered on application status change; add `ai_summary` column to applications table |
| Scope creep broke existing accommodation fields | HIGH | Revert the unintentional field name changes; re-map affected Supabase columns; re-test scoring trigger; notify any users whose accommodation data was corrupted |

---

## Sources

- Codebase analysis: `/src/pages/jobs/PostJob.tsx` — `JobPostingData` interface and wizard accumulation pattern (HIGH confidence — direct code inspection)
- Codebase analysis: `/src/pages/jobs/steps/JobStep1Basics.tsx` — Zod schema + `onComplete` callback pattern (HIGH confidence — direct code inspection)
- Codebase analysis: `/src/components/ui/` — shared component inventory confirming `Input.tsx`, `Checkbox.tsx`, `Select.tsx` as shared primitives (HIGH confidence)
- `PROJECT.md` v1.1 milestone definition — confirmed 70 gaps across all 8 screens (HIGH confidence)
- React Hook Form + Zod patterns for wizard state accumulation — MEDIUM confidence (training data Aug 2025, well-established pattern unlikely to have changed)
- Supabase URL search params merge pattern (`setSearchParams`) — MEDIUM confidence (standard React Router v6 pattern)
- Supabase Storage bucket RLS for private documents — MEDIUM confidence (official Supabase storage docs, training data)

---
*Pitfalls research for: TopFarms v1.1 SPEC Compliance*
*Researched: 2026-03-20*
