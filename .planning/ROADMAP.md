# Roadmap: TopFarms

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-17)
- 🚧 **v1.1 SPEC Compliance** — Phases 7-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-15
- [x] Phase 2: Employer Supply Side (6/6 plans) — completed 2026-03-15
- [x] Phase 3: Seeker Demand Side (7/7 plans) — completed 2026-03-16
- [x] Phase 4: Match Scoring Engine (4/4 plans) — completed 2026-03-16
- [x] Phase 5: Revenue Protection (4/4 plans) — completed 2026-03-17
- [x] Phase 6: Landing Page and Launch (2/2 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 SPEC Compliance (In Progress)

**Milestone Goal:** Close all gaps between built MVP and SPEC v3.0 so every screen matches the wireframe specification — missing fields, missing UI sections, layout deviations, and component upgrades.

- [ ] **Phase 7: UI Primitives** — Build the 9 shared components that unblock all subsequent wizard and page work
- [ ] **Phase 8: Wizard Field Extensions** — Add ~30 missing form fields across all three wizards (employer, job posting, seeker)
- [ ] **Phase 9: Page-Level Integrations** — Upgrade job search, job detail, applicant dashboard, and My Applications with SPEC-compliant UI
- [ ] **Phase 10: Landing Page** — Add 5 missing sections, hero animation, stat blocks, and pulsing live indicator
- [ ] **Phase 11: Backend-Dependent Features** — Wire match pool RPC, seeker document upload Storage bucket, and completion screen matched-jobs query

## Phase Details

### Phase 7: UI Primitives
**Goal**: The 9 shared primitive components exist with correct prop contracts, ready for consumption by wizard steps and page integrations
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: PRIM-01, PRIM-02, PRIM-03, PRIM-04, PRIM-05, PRIM-06, PRIM-07, PRIM-08, PRIM-09
**Success Criteria** (what must be TRUE):
  1. ChipSelector renders single and multi-select states with moss border, rgba background, and checkmark — importable by any wizard step
  2. StatusBanner renders all four application status variants (shortlisted hay-lt, interview green, offer green, declined red-lt at 60% opacity)
  3. Breadcrumb, StatsStrip, Timeline, StarRating, and Pagination each render correctly in isolation with their documented prop shapes
  4. SearchHero renders gradient background with search bar, region select, and quick-filter pills
  5. LivePreviewSidebar renders sticky 320px sidebar with completeness meter, mini card preview, and a static match pool placeholder (backend wired in Phase 11)
**Plans**: 3 plans

Plans:
- [ ] 07-01: ChipSelector, StatusBanner (highest-dependency primitives first)
- [ ] 07-02: Breadcrumb, StatsStrip, Timeline, StarRating, Pagination
- [ ] 07-03: SearchHero, LivePreviewSidebar

### Phase 8: Wizard Field Extensions
**Goal**: All three wizards capture the full field set specified in SPEC v3.0 and persist every new field to Supabase without data loss
**Depends on**: Phase 7
**Requirements**: EONB-01, EONB-02, EONB-03, EONB-04, EONB-05, EONB-06, EONB-07, EONB-08, EONB-09, PJOB-01, PJOB-02, PJOB-03, PJOB-04, PJOB-05, PJOB-06, PJOB-07, PJOB-08, SONB-01, SONB-03, SONB-04, SONB-05, SONB-06, SONB-07
**Success Criteria** (what must be TRUE):
  1. Employer onboarding steps 2-5 show all SPEC fields (farm type chips, calving system, nearest town, distance warning, career development chips, accommodation extras chip grid, salary range inputs, annual/monthly billing toggle) and the submitted employer row in Supabase contains every new field value
  2. Post job wizard steps 2-5 show all SPEC fields (breed, milking frequency, dairy experience, seniority, qualifications chips, visa chips, pay frequency, hours range, weekend roster) with the LivePreviewSidebar visible on steps 2-5, and the submitted jobs row contains every new field value
  3. Seeker onboarding step 1 shows all 6 sector chips; step 3 shows licence and certification chips; step 5 shows salary input, availability date, notice period, housing sub-option chips, and preferred regions multi-select chip grid
  4. Employer onboarding completion screen (step 8) and seeker completion screen (step 7) render the SPEC two-column layout with success checklist, CTAs, and matched content
  5. A v1.0 user can re-open any wizard and chips pre-populate correctly from saved data (no blank chips from boolean-to-string[] conversion errors)
**Plans**: TBD

Plans:
- [ ] 08-01: Employer onboarding — extend TypeScript interface + DB migration, then steps 2-5 field additions
- [ ] 08-02: Post job wizard — extend TypeScript interface + DB migration, then steps 2-5 field additions + LivePreviewSidebar integration
- [ ] 08-03: Seeker onboarding — extend TypeScript interface + DB migration, then steps 1, 3, 5 field additions + completion screen

### Phase 9: Page-Level Integrations
**Goal**: Job search, job detail, applicant dashboard, and My Applications match the SPEC layout and functionality for both seekers and employers
**Depends on**: Phase 7
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, JDET-01, JDET-02, JDET-03, JDET-04, JDET-05, JDET-06, JDET-07, JDET-08, JDET-09, ADSH-01, ADSH-02, ADSH-03, ADSH-04, ADSH-05, MAPP-01, MAPP-02, MAPP-03
**Success Criteria** (what must be TRUE):
  1. Job search shows the SearchHero section above results, active filter pills above the results list that dismiss on click, and numbered pagination at the bottom replacing the load-more button
  2. Job search sidebar includes role type filter with counts, extras toggle filters, and expanded accommodation multi-option filter — all applied filters merge into URL params without clearing existing active filters
  3. Each job card expands to show Details, My Match, and Apply tabs — the My Match tab displays per-dimension score breakdown for logged-in seekers
  4. Job detail page shows breadcrumb bar with Save/Share buttons, 4-column stats strip, application timeline, location map placeholder, similar jobs sidebar card, and farm profile sidebar card with 3-stat grid and rating
  5. Applicant dashboard shows 260px sidebar with listing selector, a filter toolbar with status chips, expandable 4-tab panels per applicant (CV / Match breakdown / Interview / Notes), AI candidate summary box per applicant, and a bulk actions bar
  6. My Applications page shows status variant banners matching the application state, a farm response indicator showing employer view time, and the sidebar with status summary and filter tabs
**Plans**: TBD

Plans:
- [ ] 09-01: Job search — SearchHero, ActiveFilterPills, pagination, new filter groups
- [ ] 09-02: Job search cards — ExpandableCardTabs with Details / My Match / Apply
- [ ] 09-03: Job detail — Breadcrumb, StatsStrip, Timeline, location map, sidebars
- [ ] 09-04: Applicant dashboard — sidebar nav, filter toolbar, 4-tab panels, AI summaries, bulk actions
- [ ] 09-05: My Applications — StatusBanner variants, farm response indicator, sidebar

### Phase 10: Landing Page
**Goal**: The landing page includes all SPEC sections and animations that communicate TopFarms' value proposition to both employers and seekers
**Depends on**: Phase 7 (for motion library install; otherwise fully independent)
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10
**Success Criteria** (what must be TRUE):
  1. Hero headline uses SPEC copy with staggered fadeUp animation on page load — each line animates in sequence, not simultaneously
  2. Live counter strip shows an animated pulsing green "Live" dot badge alongside the existing counters
  3. AI matching section renders a mock browser window with 4 feature bullet points; farm types strip shows 5 sector cards with listing counts; employer CTA band shows mini dashboard preview with 4-point checklist
  4. Testimonials section includes 4 connected stat blocks alongside existing testimonials; trusted-by strip and final CTA section render with correct copy and dual buttons
  5. Featured job listing cards show match score circles; CTA fork card has 14px border radius and SPEC button copy
**Plans**: TBD

Plans:
- [ ] 10-01: Hero animation, live counter pulse dot, featured listings match scores, CTA fork fix
- [ ] 10-02: AI matching section, farm types strip, employer CTA band
- [ ] 10-03: Social proof stat blocks, trusted-by strip, final CTA section

### Phase 11: Backend-Dependent Features
**Goal**: LivePreviewSidebar shows a live match pool estimate, seeker document upload works against a private Storage bucket, and the seeker completion screen surfaces matched jobs immediately after onboarding
**Depends on**: Phase 8 (wizard fields must exist before match pool RPC can use them; document upload Storage bucket needs seeker schema extended)
**Requirements**: SONB-02
**Success Criteria** (what must be TRUE):
  1. An employer filling out the post job wizard sees the match pool estimate update in the LivePreviewSidebar as they fill in shed type, region, and accommodation fields — estimate is debounced 500ms and shows "Calculating..." while the RPC is in flight
  2. A seeker can drag-and-drop or click to upload CV, certificates, and references in step 3 of seeker onboarding — files are stored in a private `seeker-documents` bucket and are not accessible via the employer photos bucket
  3. The seeker completion screen shows the top 3 matched jobs with scores within 30 seconds of onboarding finishing — if match scores have not yet computed, the screen shows a "We're calculating your matches" message instead of 0 results
**Plans**: TBD

Plans:
- [ ] 11-01: Match pool RPC (Supabase function + LivePreviewSidebar wiring)
- [ ] 11-02: Seeker document upload (private Storage bucket + RLS + step 3 integration)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-15 |
| 2. Employer Supply Side | v1.0 | 6/6 | Complete | 2026-03-15 |
| 3. Seeker Demand Side | v1.0 | 7/7 | Complete | 2026-03-16 |
| 4. Match Scoring Engine | v1.0 | 4/4 | Complete | 2026-03-16 |
| 5. Revenue Protection | v1.0 | 4/4 | Complete | 2026-03-17 |
| 6. Landing Page and Launch | v1.0 | 2/2 | Complete | 2026-03-17 |
| 7. UI Primitives | v1.1 | 0/3 | Not started | - |
| 8. Wizard Field Extensions | v1.1 | 0/3 | Not started | - |
| 9. Page-Level Integrations | v1.1 | 0/5 | Not started | - |
| 10. Landing Page | v1.1 | 0/3 | Not started | - |
| 11. Backend-Dependent Features | v1.1 | 0/2 | Not started | - |
