# Requirements: TopFarms

**Defined:** 2026-03-20
**Core Value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides

## v1.1 Requirements

Requirements for SPEC v3.0 compliance. Each maps to roadmap phases.

### UI Primitives

- [ ] **PRIM-01**: ChipSelector component supports single/multi-select with selected state (moss border + rgba bg + checkmark)
- [ ] **PRIM-02**: StatusBanner component renders shortlisted (hay-lt), interview (green), offer (green), declined (red-lt, 60% opacity) variants
- [ ] **PRIM-03**: Breadcrumb component renders path with separator and active/inactive states
- [ ] **PRIM-04**: StatsStrip component renders 3-4 column stat grid with labels and values
- [ ] **PRIM-05**: Timeline component renders vertical timeline with meadow dots and connecting lines
- [ ] **PRIM-06**: StarRating component supports 1-5 star input with yellow/grey states
- [ ] **PRIM-07**: Pagination component renders numbered page buttons (34x34px, fog border, active = moss bg)
- [ ] **PRIM-08**: SearchHero component renders gradient hero with search bar, region select, and quick-filter pills
- [ ] **PRIM-09**: LivePreviewSidebar component renders sticky 320px sidebar with completeness meter, mini card preview, and match pool estimate

### Employer Onboarding

- [ ] **EONB-01**: Step 2 shows 6 farm types in 2x3 chip grid + 4 ownership structure chips
- [ ] **EONB-02**: Step 3 includes calving system select, nearest town input, distance-from-town select with >30km hay warning
- [ ] **EONB-03**: Step 3 shed type uses ChipSelector with 5 options (Rotary, Herringbone, AMS, Swing-Over, Tiestall)
- [ ] **EONB-04**: Step 4 includes career development chip grid, hiring frequency select, couples toggle with partner sub-select
- [ ] **EONB-05**: Step 4 textarea char limits match SPEC (175/400 for about farm)
- [ ] **EONB-06**: Step 5 includes blue info box ("76% of seekers need accommodation"), full 8+ extras chip grid, vehicle toggle with chips, broadband toggle
- [ ] **EONB-07**: Step 5 includes salary range min/max NZD inputs with market rate comparison hint
- [ ] **EONB-08**: Step 7 includes annual/monthly billing toggle with "Save 20%" messaging
- [ ] **EONB-09**: Step 8 shows two-col completion with success checklist, 3 CTAs, AI tip, and live profile preview

### Post Job Wizard

- [ ] **PJOB-01**: Step 1 uses two-column layout (soil left panel with stats, cream right form)
- [ ] **PJOB-02**: Step 2 includes breed select, milking frequency, calving system, farm area, nearest town, distance with warning
- [ ] **PJOB-03**: Step 2 shed type uses ChipSelector with 5 options instead of 3 checkboxes
- [ ] **PJOB-04**: Step 3 includes minimum dairy experience select, seniority level select, qualifications section, visa chip grid
- [ ] **PJOB-05**: Step 4 includes market rate salary comparison hint, pay frequency, on-call allowance, hours range, weekend roster
- [ ] **PJOB-06**: Step 5 textarea char limits match SPEC (175/400 for overview)
- [ ] **PJOB-07**: Steps 2-5 show LivePreviewSidebar with completeness meter, mini card preview, match pool estimate
- [ ] **PJOB-08**: Step 8 success screen shows stats grid (avg days to first applicant, seekers in match pool, actively looking)

### Seeker Onboarding

- [ ] **SONB-01**: Step 1 shows all 6 sector chips (+ Cropping, Deer, Mixed, Other beyond current 2)
- [ ] **SONB-02**: Step 3 includes document upload zone for CV/certificates/references (reuse FileDropzone)
- [ ] **SONB-03**: Step 3 includes NZ driver's licence chips and other certification chips (ATV, tractor, 4WD, first aid)
- [ ] **SONB-04**: Step 5 includes minimum salary input, availability date, notice period
- [ ] **SONB-05**: Step 5 housing sub-options use chip grid (Single, Couple working, Couple not working, Family, Working dogs, Pets)
- [ ] **SONB-06**: Step 5 preferred regions uses multi-select chip grid (8 NZ regions) instead of single select
- [ ] **SONB-07**: Step 7 completion shows success screen with profile checklist, match pool preview, top 3 matched jobs with scores

### Job Search

- [ ] **SRCH-01**: Search hero section with gradient background, headline, search bar + region select + quick-filter pills
- [ ] **SRCH-02**: Role type filter added to sidebar (8 options with counts)
- [ ] **SRCH-03**: Extras toggle filters added (mentorship, vehicle, DairyNZ pathway, posted <7 days)
- [ ] **SRCH-04**: Accommodation filter expanded to multi-option (house, cottage, pet-friendly, couples, family)
- [ ] **SRCH-05**: Active filter pills displayed above results (moss tint bg, × remove)
- [ ] **SRCH-06**: Expandable card tabs on job cards (Details / My Match / Apply)
- [ ] **SRCH-07**: Sort options expanded (+ salary high-low, location nearest)
- [ ] **SRCH-08**: Numbered pagination replaces "load more" button

### Job Detail

- [ ] **JDET-01**: Breadcrumb bar (44px, white bg) with path and Save/Share buttons
- [ ] **JDET-02**: Stats strip below header (4-col: Applications, Views, Salary, Posted)
- [ ] **JDET-03**: Day-to-day section renders as bulleted list with meadow dot bullets
- [ ] **JDET-04**: Skills section uses 2-column grid with legend row (Required/Preferred/Bonus badges)
- [ ] **JDET-05**: Application timeline component (vertical, meadow dots + connecting lines)
- [ ] **JDET-06**: Location section with map placeholder (160px, mist bg) and distance badge
- [ ] **JDET-07**: Similar jobs card in sidebar (3 entries with title, meta, salary, match badge)
- [ ] **JDET-08**: Sidebar quick facts list, save/share buttons, deadline notice (hay-lt)
- [ ] **JDET-09**: Farm profile card in sidebar (soil header, 3-stat grid, tags, rating, view link)

### Applicant Dashboard

- [ ] **ADSH-01**: 260px sidebar with farm header, navigation, listing selector, quick stats
- [ ] **ADSH-02**: Filter toolbar with search input, filter chips (All/New/Reviewed/Shortlisted/Declined), sort, view toggle
- [ ] **ADSH-03**: Expandable 4-tab panels per applicant (CV, Match breakdown, Interview, Notes)
- [ ] **ADSH-04**: AI candidate summary box per applicant (purple, cached in DB column)
- [ ] **ADSH-05**: Bulk actions bar (Shortlist selected, Send message, Export)

### My Applications

- [ ] **MAPP-01**: Status variant banners — shortlisted (hay-lt "You've been shortlisted!"), interview (green with Accept/Decline), offer (green + hay CTA), declined (60% opacity + red-lt message)
- [ ] **MAPP-02**: Farm response indicator ("Viewed by employer X hours ago" or "Not yet viewed")
- [ ] **MAPP-03**: Sidebar with application status summary, filter tabs (All/Active/Shortlisted/Closed), saved jobs, profile strength nudge

### Landing Page

- [ ] **LAND-01**: Hero headline matches SPEC copy with staggered fadeUp animation (motion library)
- [ ] **LAND-02**: Live counter strip includes animated pulsing "Live" green dot badge
- [ ] **LAND-03**: Social proof section includes 4 connected stat blocks alongside testimonials
- [ ] **LAND-04**: AI matching features section with mock browser window + 4 feature bullet points
- [ ] **LAND-05**: Farm types strip with 5 sector cards and listing counts
- [ ] **LAND-06**: Featured job listings include match score circles on cards
- [ ] **LAND-07**: Employer CTA band with mini dashboard preview + "Post your first job" CTA + 4-point checklist
- [ ] **LAND-08**: Trusted-by strip with farm brand name placeholders
- [ ] **LAND-09**: Final CTA section with centered headline + dual buttons
- [ ] **LAND-10**: CTA fork card border radius corrected to 14px, button text matches SPEC

## v2 Requirements

Deferred to future release. Not in current roadmap.

### Messaging
- **MSG-01**: Listing-anchored message threads with contact detection
- **MSG-02**: 3-panel messaging layout (inbox, thread, candidate panel)

### Profile Management
- **PROF-01**: Seeker profile management shell with sidebar nav (Overview, Experience, Documents, CV Builder)
- **PROF-02**: Employer public farm profile page

### Advanced Features
- **ADV-01**: Interview scheduling with calendar/time slots in applicant dashboard
- **ADV-02**: Horticulture and viticulture sector support
- **ADV-03**: Save search + email alerts on job search

## Out of Scope

| Feature | Reason |
|---------|--------|
| Messaging / EOI | Growth Phase — wireframe exists but explicitly excluded from MVP per PROJECT.md |
| CV Builder | Growth Phase nav item — not in MVP SPEC scope |
| Interview scheduling | Applicant dashboard tab placeholder only — no calendar integration |
| Horticulture/viticulture | Future milestone per PROJECT.md |
| Social login (OAuth) | Email/password only per constraints |
| Mobile native apps | Mobile web only per constraints |
| Partner job matching | Separate role complexity deferred |
| Real-time chat | Contact release after shortlist handles core use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRIM-01 | Phase 7 | Pending |
| PRIM-02 | Phase 7 | Pending |
| PRIM-03 | Phase 7 | Pending |
| PRIM-04 | Phase 7 | Pending |
| PRIM-05 | Phase 7 | Pending |
| PRIM-06 | Phase 7 | Pending |
| PRIM-07 | Phase 7 | Pending |
| PRIM-08 | Phase 7 | Pending |
| PRIM-09 | Phase 7 | Pending |
| EONB-01 | Phase 8 | Pending |
| EONB-02 | Phase 8 | Pending |
| EONB-03 | Phase 8 | Pending |
| EONB-04 | Phase 8 | Pending |
| EONB-05 | Phase 8 | Pending |
| EONB-06 | Phase 8 | Pending |
| EONB-07 | Phase 8 | Pending |
| EONB-08 | Phase 8 | Pending |
| EONB-09 | Phase 8 | Pending |
| PJOB-01 | Phase 8 | Pending |
| PJOB-02 | Phase 8 | Pending |
| PJOB-03 | Phase 8 | Pending |
| PJOB-04 | Phase 8 | Pending |
| PJOB-05 | Phase 8 | Pending |
| PJOB-06 | Phase 8 | Pending |
| PJOB-07 | Phase 8 | Pending |
| PJOB-08 | Phase 8 | Pending |
| SONB-01 | Phase 8 | Pending |
| SONB-02 | Phase 11 | Pending |
| SONB-03 | Phase 8 | Pending |
| SONB-04 | Phase 8 | Pending |
| SONB-05 | Phase 8 | Pending |
| SONB-06 | Phase 8 | Pending |
| SONB-07 | Phase 8 | Pending |
| SRCH-01 | Phase 9 | Pending |
| SRCH-02 | Phase 9 | Pending |
| SRCH-03 | Phase 9 | Pending |
| SRCH-04 | Phase 9 | Pending |
| SRCH-05 | Phase 9 | Pending |
| SRCH-06 | Phase 9 | Pending |
| SRCH-07 | Phase 9 | Pending |
| SRCH-08 | Phase 9 | Pending |
| JDET-01 | Phase 9 | Pending |
| JDET-02 | Phase 9 | Pending |
| JDET-03 | Phase 9 | Pending |
| JDET-04 | Phase 9 | Pending |
| JDET-05 | Phase 9 | Pending |
| JDET-06 | Phase 9 | Pending |
| JDET-07 | Phase 9 | Pending |
| JDET-08 | Phase 9 | Pending |
| JDET-09 | Phase 9 | Pending |
| ADSH-01 | Phase 9 | Pending |
| ADSH-02 | Phase 9 | Pending |
| ADSH-03 | Phase 9 | Pending |
| ADSH-04 | Phase 9 | Pending |
| ADSH-05 | Phase 9 | Pending |
| MAPP-01 | Phase 9 | Pending |
| MAPP-02 | Phase 9 | Pending |
| MAPP-03 | Phase 9 | Pending |
| LAND-01 | Phase 10 | Pending |
| LAND-02 | Phase 10 | Pending |
| LAND-03 | Phase 10 | Pending |
| LAND-04 | Phase 10 | Pending |
| LAND-05 | Phase 10 | Pending |
| LAND-06 | Phase 10 | Pending |
| LAND-07 | Phase 10 | Pending |
| LAND-08 | Phase 10 | Pending |
| LAND-09 | Phase 10 | Pending |
| LAND-10 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 — traceability updated after roadmap creation (phases 7-11)*
