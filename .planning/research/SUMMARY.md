# Project Research Summary

**Project:** TopFarms v1.1 — SPEC Compliance UI Gap-Closing
**Domain:** Niche vertical job marketplace — NZ agricultural sector (dairy + sheep & beef)
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

TopFarms v1.1 is a gap-closing milestone on a working MVP, not greenfield development. The existing React 19 + Supabase + Tailwind v4 stack is locked and proven; this research covers only the delta needed to close ~70 UI/UX gaps identified in SPEC v3.0 across eight product surfaces: onboarding wizards (employer + seeker), post-job wizard, job search, job detail, applicant dashboard, seeker My Applications, and the landing page. The competitive baseline remains a NZ agricultural Facebook group — every feature decision should be judged against "is this better than a Facebook post?", not against Seek or LinkedIn. Three net-new npm packages are required: `motion`, `react-intersection-observer`, and `@radix-ui/react-tabs`. Everything else — chips, pagination, star rating, timeline, map placeholder — is build-from-scratch with existing primitives already in the lockfile.

The recommended build approach is wave-based, driven by component dependencies rather than screen-by-screen delivery. Wave 1 builds nine primitive UI components (ChipSelector, RangeSlider, StatusBanner, Breadcrumb, etc.) that unblock all subsequent work in parallel. Wave 2 extends all three wizards simultaneously once primitives exist. Wave 3 handles page-level integrations (job search, job detail, applicant dashboard). Wave 4 is the landing page — fully independent, can run alongside any other wave at any time.

The highest risks are procedural rather than architectural. Wizard interface and DB schema must be extended before any step-level UI work, or new field data is silently lost and never reaches Supabase. Checkbox-to-chip upgrades require schema type verification before writing any component — existing boolean columns cannot accept string[] output without a migration. The applicant dashboard AI summaries must be pre-generated and cached in a DB column; calling Claude synchronously on dashboard load produces 3–10s blank screens. Scope creep is the meta-risk: every file touched in this milestone contains working v1.0 logic that is a regression target. An additions-only rule with diff review per phase is the primary defence.

---

## Key Findings

### Recommended Stack

The core stack requires no changes for v1.1. Only three packages are net-new additions; the rationale for avoiding additional libraries is explicit and important.

**Net-new dependencies:**
- `motion` ^12.0.0 — staggered fadeUp animations; CSS alone cannot orchestrate sibling sequencing; import from `motion/react` (not the legacy `framer-motion` name — they are different packages)
- `react-intersection-observer` ^9.0.0 — scroll-triggered `triggerOnce` inView for multiple animated sections; the existing custom `useInView` hook in `CountersSection.tsx` stays as-is to avoid unnecessary refactors
- `@radix-ui/react-tabs` ^1.1.0 — WCAG-compliant tab panels for expandable job search cards and the applicant dashboard; native `<details>` cannot meet the ARIA tablist/tabpanel + keyboard navigation requirement

**Key existing packages used in new ways:**
- `@radix-ui/react-slider` ^1.3.6 — already in FilterSidebar; extract salary slider into reusable `RangeSlider` component (no new dep)
- `react-dropzone` ^15.0.0 — already in `FileDropzone.tsx`; reuse for seeker document upload
- `lucide-react` ^0.487.0 — `Star` icon for StarRating; no rating library needed

**Install command for new deps only:**
```bash
npm install motion react-intersection-observer @radix-ui/react-tabs
```

**Do not add:** react-select, react-paginate, react-rating, leaflet, any CSS animation library, @radix-ui/react-accordion (native `<details>` already works in FilterSidebar).

See `.planning/research/STACK.md` for full rationale and alternatives rejected.

### Expected Features

**Must have (table stakes — missing these makes the product feel below any modern job board):**
- Search hero with keyword input + region dropdown above results
- Expandable result cards (accordion pattern, mobile-first standard)
- Status variant banners for shortlisted / interview / offer / declined application states
- Employer CTA band and final CTA section on landing page (two-sided marketplace requirement)
- Breadcrumb navigation on job detail (WCAG 2.1 AA requirement)
- Filter toolbar + sidebar nav on applicant dashboard (expected by anyone who has used Seek Employer)
- All ~30 missing form fields across wizards — a posting wizard without breed, milking frequency, and visa details produces the same information quality as a Facebook post

**Should have (TopFarms differentiators that justify switching from Facebook groups):**
- My Match tab in expandable search cards with per-dimension score breakdown
- AI candidate summaries per applicant (employer perspective, cached in DB column)
- Match pool estimate in live preview sidebar ("14 seekers in Waikato match this role") — no NZ agricultural platform provides this at posting time
- Farm response indicator ("Viewed by employer X hours ago") — reduces anxiety that currently drives seekers back to Facebook
- Agriculture-specific quick-filter pills ("House included", "Couples welcome", "Top match >=80%")
- Seeker completion screen showing top 3 matched jobs immediately post-onboarding

**Defer (within v1.1 or to v1.x):**
- Match pool RPC for live preview sidebar — new backend piece; ship sidebar without pool estimate first
- Interview scheduling tab — shell only, no calendar wiring (explicitly excluded in PROJECT.md)
- In-app messaging — Growth Phase per PROJECT.md; render as coming-soon affordance, not dead button
- Save search + email alerts — separate Resend Edge Function system; defer entirely or ship UI shell as coming-soon
- CV Builder nav item — entirely separate product surface; not in the ~70 gap items
- Seeker document upload — requires new private Storage bucket + RLS; not blocking any other gap; defer to end of milestone
- Numbered pagination — load-more is functional; pagination is polish; defer if time-constrained

See `.planning/research/FEATURES.md` for full feature dependency graph and complexity assessment by gap category.

### Architecture Approach

All v1.1 work is additive to the existing architecture. The three wizard shells (EmployerOnboarding, SeekerOnboarding, PostJob) all use an identical accumulate-and-upsert pattern via `useWizard`, with URL-synced filter state in JobSearch and a DashboardLayout shell shared across employer and seeker views. New fields integrate via four-touch changes: extend TypeScript interface → add to upsert payload → pass as defaultValues → step renders new component. No new hooks, no new context, no changes to useWizard. FilterSidebar's existing `onFilterChange(key, value)` interface handles all new filter groups without modification.

**New components to build (net-new files):**
1. `ChipSelector` — drop-in checkbox replacement; must use `string[]` value shape to avoid schema conflicts; used in 6+ wizard steps
2. `RangeSlider` — extracted from FilterSidebar's salary block; wraps existing Radix Slider dep; used in FilterSidebar, SeekerStep5, JobStep4
3. `ExpandableCardTabs` — Radix Tabs wrapper for job search cards; lazy-render active tab only (conditional render, not CSS visibility)
4. `StatusBanner` — variant-mapped banner driven by `applications.status`; all colours already in Tailwind v4 `@theme`
5. `LivePreviewSidebar` — reads PostJob wizard state via prop; no Supabase fetch; shown only on step 5 via conditional layout class in PostJob shell (`hidden md:block` for mobile)
6. Five landing page sections (AiMatchingSection, FarmTypesSection, EmployerCtaSection, TrustedBySection, FinalCtaSection) — fully independent of wizard/dashboard
7. `ApplicantDashboard` rebuild — highest complexity; left sidebar nav + filter toolbar + 4-tab panels + bulk actions + AI summary cached in `Map<applicantId, string>`

**Key architectural rules:**
- Primitive components receive props only; all Supabase fetches stay in page-level components or hooks
- `ActiveFilterPills` reads from URLSearchParams (single source of truth); never owns a copy of filter state
- PostJob two-column layout only on step 5; all other steps keep existing `max-w-2xl mx-auto` wrapper

See `.planning/research/ARCHITECTURE.md` for full wave-based build order, component prop contracts, and data flow diagrams.

### Critical Pitfalls

1. **Wizard interface/DB out of sync** — Adding fields to step components before updating `JobPostingData` interface and the Supabase INSERT call silently drops new field data. Users fill in breed information, see a success screen, but the jobs row has NULL. Prevention: extend interface + run DB migration first, before any step UI work; verify by inspecting the actual Supabase row after submission.

2. **Checkbox-to-chip schema mismatch** — Existing boolean columns (`visa_nz_citizen: boolean`) are incompatible with chip `string[]` output. Prevention: check column type before writing any chip component; write a `booleanColumnsToChipArray()` mapping utility for defaultValues on edit flows; migrate boolean columns to `text[]` in the same phase as the UI upgrade. Test by logging in as a v1.0 user and verifying chips pre-populate from saved boolean data.

3. **URL filter state replacement** — Naive `setSearchParams({ newParam: value })` replaces all existing params, silently clearing active filters when a new one is applied. Prevention: always use the merge pattern (`setSearchParams(prev => ({ ...Object.fromEntries(prev), newParam: value }))`); audit existing calls before adding any new filter; reset page param to 1 on every filter change.

4. **AI summaries blocking dashboard load** — Calling Claude Edge Function synchronously on dashboard load creates 3–10s blank screens. Prevention: pre-generate summaries async (store in `applications.ai_summary` text column); trigger regeneration on application status change; dashboard reads cache only; show "Generating..." skeleton for fresh applications without a cached summary.

5. **Scope creep breaking v1.0 logic** — Touching wizard step files to add SPEC fields creates temptation to improve adjacent code. A single field name change to an existing accommodation field breaks the scoring trigger. Prevention: additions-only rule per phase; diff review before any phase closes; run full happy-path wizard flow (employer onboarding, post-job, seeker onboarding, search, apply) after every phase.

See `.planning/research/PITFALLS.md` for full pitfall details, phase-specific warnings table, regression prevention checklist, and recovery strategies.

---

## Implications for Roadmap

Research points to a dependency-ordered wave structure, not a screen-by-screen sequence. Building primitives first unlocks all subsequent work to proceed in parallel. Five suggested phases:

### Phase 1: Foundation Primitives

**Rationale:** ChipSelector alone unblocks 6+ wizard steps across all three wizards. Building all nine primitive UI components first means wizard work and page integrations can proceed in parallel without inter-phase blocking. This is the highest-leverage work in the entire milestone — one component, six consumers.
**Delivers:** ChipSelector, RangeSlider, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, ActiveFilterPills, Pagination
**Addresses:** All chip-based form field upgrades (all wizards), application status banners (My Applications), job detail structural components, search pagination
**Avoids:** Schema mismatch pitfall — ChipSelector built once with correct `string[]` contract before any wizard step uses it; wrong data shape not possible if the component is reviewed before use

### Phase 2: Wizard Field Extensions (all three wizards in parallel)

**Rationale:** All three wizards follow the same four-touch change pattern and share no inter-dependencies. Within each wizard, interface extension must precede step-level work to prevent silent data loss — this sequencing must be enforced in the phase plan.
**Delivers:** ~30 new form fields across employer onboarding (career dev chips, nearest town, distance to town, accommodation internet extras), seeker onboarding (licences chips, certifications chips, salary range, availability date, notice period), and post-job wizard (breed, milking frequency, seniority, dairy experience, qualifications chips, visa chips, pay frequency, hours, roster); chip upgrades replacing boolean checkboxes
**Uses:** ChipSelector, RangeSlider (Phase 1); existing useWizard, react-hook-form, zod
**Avoids:** Wizard interface/DB sync pitfall — interface + migration run first within each wizard sub-track; boolean-to-chip schema mismatch — column type verified before each upgrade with booleanColumnsToChipArray() utility written upfront

### Phase 3: Page-Level Integrations

**Rationale:** Depends on Phase 1 primitives; does not require Phase 2 wizard work. Job search, job detail, My Applications, and applicant dashboard improvements are page-level consumers of Phase 1 components. These are the highest-visibility changes for seekers and employers.
**Delivers:** FilterSidebar new filter groups + RangeSlider refactor; ExpandableCardTabs in SearchJobCard (lazy-render); SearchHero + ActiveFilterPills + Pagination in JobSearch; Breadcrumb + StatsStrip + Timeline + farm profile card + similar jobs in JobDetail; StatusBanner integration in ApplicationCard + MyApplications; full ApplicantDashboard rebuild with sidebar nav, filter toolbar, 4-tab panels, bulk actions, and AI summary caching
**Implements:** ExpandableCardTabs with conditional render (not CSS visibility); ApplicantDashboard `Map<applicantId, string>` cache for AI summaries; `hidden md:block` pattern for mobile-safe preview sidebar; URLSearchParams merge pattern for all new filter additions
**Avoids:** URL filter replacement pitfall; expandable card DOM bloat (80 hidden blocks for 20-card page); AI summary blocking load; double-sidebar conflict on applicant dashboard (clarify SPEC intent before implementing)

### Phase 4: Landing Page Sections

**Rationale:** Fully independent of all other work — no dependency on wizard, search, or dashboard changes. Can run in parallel with any other phase or be batched as a standalone marketing delivery.
**Delivers:** AiMatchingSection, FarmTypesSection, EmployerCtaSection, TrustedBySection, FinalCtaSection; HeroSection staggered fadeUp animation; stat blocks in TestimonialsSection; live pulsing dot on counters
**Uses:** `motion` ^12.0.0, `react-intersection-observer` ^9.0.0 (only new packages required for this phase)
**Avoids:** LCP regression — CSS/motion animation only, no video or unoptimised large SVG; lazy-load images on new sections; Lighthouse gate after each section addition

### Phase 5: Deferred High-Complexity Backend Items

**Rationale:** Items requiring new backend infrastructure (match pool RPC, seeker document Storage bucket) or explicitly excluded in PROJECT.md. Ship after core gaps are closed and validated in production.
**Delivers:** LivePreviewSidebar match pool estimate (new Supabase RPC: `estimate_match_pool(shed_type[], region, accommodation) → INT`, debounced 500ms); seeker document upload (new private `seeker-documents` Storage bucket + RLS: seeker can upload, employer can read only after active application + shortlist); seeker completion screen matched-jobs query with async polling (30s timeout before "calculating" message); numbered pagination if load-more is validated as insufficient
**Avoids:** Completion screen "0 matches" pitfall — async polling with timeout; document identity leak — dedicated private bucket with correct RLS from the start, never the employer photos bucket

### Phase Ordering Rationale

- Primitives before all page/wizard work because ChipSelector is the highest-count shared dependency; building it once correctly eliminates the biggest class of inter-phase blocking
- Phase 2 and Phase 3 can run in parallel teams; wizard extensions and page integrations share no dependencies once Phase 1 primitives exist
- Phase 4 (landing) can run at any time — assign to a separate track if team size allows
- Phase 5 deferred because it contains the only genuinely new backend pieces and two items (interview tab, in-app messaging) are explicitly excluded in PROJECT.md for this milestone

### Research Flags

Phases needing explicit pre-implementation checks (not full research-phase, but verified decisions before code):
- **Phase 3 (ApplicantDashboard):** Clarify before writing any code whether the SPEC sidebar nav replaces DashboardLayout's shell sidebar or is an in-content secondary nav. Double sidebar at tablet viewports is a layout bloat risk. One question, one answer — do not assume.
- **Phase 2 (checkbox-to-chip upgrades):** Each chip upgrade is a per-field schema type audit. Plan this explicitly into the phase — it is not implicit in "replace checkbox with ChipSelector."
- **Phase 5 (match pool RPC):** The only genuinely novel backend piece in the milestone. Estimate separately from UI work; the debounced live-query pattern on a partial form state is non-trivial.

Phases with standard patterns (safe to proceed without deeper research):
- **Phase 1 (primitives):** All nine components have clear prop contracts in ARCHITECTURE.md; patterns are straightforward Tailwind + React
- **Phase 4 (landing):** Static content + motion animation; well-documented pattern; all new packages verified compatible with React 19 + Tailwind v4

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified against package.json (ground truth); new package versions from prior STACK.md research (2026-03-15); Tailwind v4 data attribute variant pattern confirmed from live codebase |
| Features | HIGH | Primary sources are SPEC v3.0, WIREFRAME_SPECS_FULL.md, and PROJECT.md — authoritative; table stakes classification drawn from well-established platform patterns (Seek, Greenhouse, Lever) using training data |
| Architecture | HIGH | Based on direct codebase inspection of all wizard shells, FilterSidebar, and full component inventory; confirmed patterns from live files, not inferred |
| Pitfalls | HIGH | Derived from actual codebase analysis of PostJob.tsx interface pattern, FilterSidebar setSearchParams usage, and ApplicantDashboard structure; not speculative |

**Overall confidence: HIGH**

### Gaps to Address

- **`applications.status` column constraint type:** Before adding StatusBanner variants, confirm whether the status column uses a PostgreSQL ENUM or a CHECK constraint on text — determines the migration type. Check Supabase schema before Phase 3.
- **ApplicantDashboard SPEC sidebar intent:** SPEC shows a sidebar nav on the applicant dashboard; DashboardLayout already renders a shell sidebar. Clarify intent before Phase 3 implementation — double sidebar breaks tablet layout.
- **match_scores trigger timing:** The seeker completion screen requires match scores to exist immediately after onboarding. Verify whether the existing scoring trigger fires synchronously or asynchronously — determines whether the polling strategy in Phase 5 is required or scores are available instantly.
- **New package version re-verification:** `motion` ^12.0.0, `react-intersection-observer` ^9.0.0, `@radix-ui/react-tabs` ^1.1.0 were last verified 2026-03-15. Re-verify on npm before installing — 5 days is low risk but worth a quick check.

---

## Sources

### Primary (HIGH confidence)
- TopFarms SPEC v3.0 — authoritative feature and UI requirements
- `WIREFRAME_SPECS_FULL.md` (2026-03-17) — gap-by-gap reference for all ~70 items
- `WIREFRAME_SPECS.md` — as-built component audit (existing component inventory)
- `PROJECT.md` — milestone definition, explicit out-of-scope items, constraints
- `package.json` — ground truth for all installed package versions
- Direct codebase inspection: `PostJob.tsx`, `EmployerOnboarding.tsx`, `SeekerOnboarding.tsx`, `JobSearch.tsx`, `FilterSidebar.tsx`, `CountersSection.tsx`, `FileDropzone.tsx`, full `src/components/ui/` inventory

### Secondary (MEDIUM confidence)
- Training data: UI pattern classification for job boards, ATS platforms, two-sided marketplaces (Seek, LinkedIn Jobs, Greenhouse, Lever, Workable, Glassdoor, Airbnb, Indeed) — web research tools unavailable during this research session; patterns are well-established pre-August 2025
- Prior STACK.md research (2026-03-15) — version numbers for three new packages; not re-verified at time of this research (5-day-old data)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
