# Feature Landscape — v1.1 SPEC Compliance Gap Closing

**Domain:** Niche vertical job marketplace — NZ agricultural sector (dairy cattle + sheep & beef)
**Researched:** 2026-03-20
**Overall confidence:** HIGH (primary source: SPEC v3.0 + interactive wireframes + as-built codebase audit; web research tools unavailable — training data + SPEC authority used for pattern classification)

---

## Context

This is a gap-closing milestone, not greenfield feature design. The authoritative source is SPEC v3.0 and its interactive wireframes. The question is not "what should we build?" but "what does each gap category mean in terms of standard UI patterns, table stakes vs differentiator status, and build complexity given existing components?"

The competitive baseline is a NZ agricultural Facebook group, not Seek or LinkedIn Recruiter. Every pattern is judged against: "Is this better than a Facebook post?"

---

## Table Stakes

Features users expect. Missing these makes the product feel incomplete relative to any modern job board — even one competing with Facebook groups.

### Category: Search Hero Section

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Text search bar above results | Every job board (Seek, Indeed, LinkedIn) puts the search input at the top of the results page — users arrive expecting to type a query, not scroll into a pre-filtered list | LOW | Existing filter sidebar URL-sync state; search bar writes to same query params |
| Location / region dropdown in hero | Paired with search bar on every major job board; region is the second most important filter for NZ ag after shed type | LOW | Existing region filter in sidebar; hero region select mirrors sidebar state |
| Quick-filter pills below search bar | Common pattern on LinkedIn Jobs, Glassdoor, Seek — one-tap filters for highest-frequency use cases (e.g. "House included", "New this week") | LOW | Active filter pills state machine; pills write to existing filter params |
| Result count with active sector label | "N roles · NZ Agriculture" gives immediate context — every job board shows this | LOW | Existing results count already rendered; add eyebrow text |
| Active filter chip display (dismissable) | Once filters are applied, users expect to see and remove them — standard on Seek, Indeed, Airbnb-style search | MEDIUM | Requires filter state surfaced into a chip strip; × action clears individual params |

**Table stakes verdict:** The search hero section as a whole is table stakes. A results page with no search input above it is below the baseline of any job board built since 2010. Users will scroll up looking for a search bar that isn't there.

---

### Category: Expandable Result Cards with Tabs

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| In-place expand/collapse toggle on card | Accordion-style cards are standard on mobile-first results pages (LinkedIn, Glassdoor mobile); reduces page navigation friction | MEDIUM | Existing SearchJobCard component; add expand state + tab strip |
| Details tab (farm/role summary in-card) | Users expect to see key details before committing to a full page load | MEDIUM | Job detail data already fetched for card; layout already exists in job detail |
| My Match tab (breakdown bars + AI insight) | Match breakdown already exists on the job detail sidebar; exposing it in-card is a TopFarms-specific pattern | HIGH | match_scores table, AI insight Edge Function — both exist; requires additional query per expanded card |
| Apply tab (one-click in-card) | Reduces friction from browse → apply; expected on modern job boards | MEDIUM | Application submission logic already exists; needs adaptation to card context without full page navigation |

**Table stakes verdict:** Expandable cards without tabs are table stakes (accordion result cards are standard). The specific three-tab structure (Details / My Match / Apply) is a TopFarms differentiator layering ag-specific match data on top of a standard pattern.

---

### Category: Live Form Preview Sidebar (Post Job Wizard)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Sticky sidebar showing form progress | Form wizards with live preview are established on platforms like Greenhouse, Lever, Workable — employers who post jobs professionally expect to see their listing take shape | MEDIUM | Wizard form state (React state / URL params); sidebar is a read-only consumer of that state |
| Completeness meter (% with progress bar) | Nudges employers to fill all fields for better match scores; completion meters are standard in profile/listing builders (LinkedIn, Airbnb host) | LOW | Form field fill state already tracked for validation; map to % |
| Mini job card preview (as-it-will-appear) | Real-time preview of the published card reduces employer anxiety about how their listing looks; expected in modern CMS and ATS tools | MEDIUM | SearchJobCard component already exists; render in preview mode with current wizard state |
| Match pool estimate (seekers likely to match) | TopFarms-specific: "X seekers in Waikato with rotary experience are actively looking" is a posting incentive; not a general job board pattern | HIGH | Requires Supabase RPC estimating match pool given current job form state; most complex piece of the sidebar |
| AI tip box (posting quality hints) | Progressive hints during form completion are used by LinkedIn and Workable to improve listing quality; TopFarms-specific application of Claude API | MEDIUM | Claude API Edge Function already exists for match explanations; adapt prompt for posting tips |

**Table stakes verdict:** A sticky completeness meter and basic card preview are table stakes for a multi-step posting wizard. The match pool estimate is a strong differentiator — no agricultural job board in NZ provides this. The AI tip box is a differentiator.

---

### Category: Applicant Management Dashboard with AI Summaries

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Sidebar navigation (Applications, Listings, Analytics, Settings) | Dashboard sidebars are the standard navigation pattern for any ATS or employer dashboard — absent on current build which uses back-link only | MEDIUM | DashboardLayout already has sidebar slot; requires nav items + routing |
| Search + filter toolbar above applicant list | Employers with 10+ applicants need to search and filter — Seek Employer, SEEK Talent Search, LinkedIn Recruiter all lead with a toolbar | MEDIUM | Filter state (All / New / Reviewed / Shortlisted / Declined); filter chips write to query; counts per status |
| AI candidate summary box per applicant | "Key strengths, potential concerns" plain-English paragraph per candidate — extends existing AI match explanations to the employer perspective; not standard on generic ATS, a genuine differentiator | HIGH | Claude API Edge Function (employer-perspective prompt variant); match_scores breakdown already passed to AI; requires caching to avoid per-render calls |
| Bulk actions bar (Shortlist selected, Export) | Bulk status transitions are expected on any ATS with more than a handful of applicants — Greenhouse, Workable, Lever all have bulk actions | HIGH | Checkbox state per applicant; batch Supabase update; export requires CSV generation Edge Function |
| 4-tab expandable panels per applicant (CV / Match / Interview / Notes) | Multi-tab panels on applicant records are standard in modern ATS (Ashby, Greenhouse, Lever) — single accordion with cover note is below expectations for employers used to any ATS | HIGH | CV tab: seeker_profiles data already fetched; Match tab: match_scores breakdown (built); Interview tab: out of scope for MVP (calendar integration excluded); Notes tab: free text + stage mover (new data model) |
| View toggle (list / grid) | List vs card grid toggle is common on employer dashboards | LOW | CSS layout switch; no data model changes |

**Table stakes verdict:** Sidebar nav and filter toolbar are table stakes — any employer using Seek Employer or TradeMe Jobs will expect these. AI summaries and bulk actions are differentiators that justify switching from ad-hoc Facebook applicant management. The 4-tab panel is a differentiator; Interview tab is explicitly out of scope (no calendar integration).

**Critical note on AI summaries:** The applicant AI summary requires a new Claude API prompt variant tuned to employer perspective ("strengths / concerns / fit assessment"). It is not a re-use of the seeker-facing match explanation. Cache results in a computed field or edge cache — generating per render is prohibitively expensive.

---

### Category: Application Status Tracking with Variant Banners

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Status pipeline track (horizontal stages) | Horizontal stage progression is universal on job application trackers — LinkedIn, Seek, Workday candidate portals all show this | LOW | Already built — Applied → Under Review → Shortlisted → Interview → Offer |
| Status variant banners per card state | Banner content and colour changing with application status is expected on any modern job tracker — Seek's candidate portal, LinkedIn Easy Apply status all change card appearance on shortlist/interview/offer | MEDIUM | Existing card component; conditional banner render based on `applications.status`; uses existing hay/green/red-lt colour tokens |
| Shortlisted banner (hay, "You've been shortlisted!") | Positive reinforcement on shortlist is expected and motivates continued platform engagement | LOW | Status === 'shortlisted' conditional; hay-lt banner component |
| Interview invited banner (green, Accept/Decline/Suggest time) | Interview scheduling prompts on the seeker's application view are standard on any platform beyond basic email notifications | MEDIUM | Status === 'interview' conditional; Accept/Decline writes to applications table; "Suggest time" links to off-platform contact (explicit out of scope for in-app scheduling) |
| Declined banner (dim 60%, grey track, red-lt message) | Respectful decline state — card dimming + clear messaging is expected on mature job trackers; absence leaves seekers uncertain about their status | LOW | Status === 'declined' conditional; CSS opacity + grayscale filter on card; red-lt info box |
| Offer banner (green, hay CTA "View offer details") | Offer state with prominent CTA is expected; absence at offer stage is a major UX gap | LOW | Status === 'offered' conditional; green banner + hay button |
| Farm response indicator ("Viewed by employer X hours ago") | Read receipt / view timestamp is used by LinkedIn InMail and Seek to give seekers confidence their application was seen | MEDIUM | Requires `applications.employer_viewed_at` timestamp; set via employer applicant dashboard view trigger; display relative time |

**Table stakes verdict:** The status pipeline track is table stakes and is already built. Status variant banners (shortlisted, declined, offer) are table stakes — their absence makes the application tracker feel broken relative to any modern job board. The farm response indicator is a differentiator that reduces the "did they even see it?" anxiety that currently drives seekers back to Facebook groups.

---

### Category: Missing Landing Page Sections

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| AI matching features section | Marketing section explaining the 100-point match system — expected on any platform with a proprietary algorithm (not a general job board pattern, but essential for TopFarms to explain its core differentiator to cold visitors) | LOW | Static content + design system components; no data queries |
| Farm types strip (visual sector breakdown) | Category browsing strips are common on marketplace landing pages (Airbnb, Etsy, Indeed by industry) — gives cold visitors an at-a-glance sense of platform scope | LOW | Static content; farm type icons + job count badges from existing Supabase aggregate |
| Employer CTA band | Split employer / seeker CTA is standard on two-sided marketplaces — TaskRabbit, Upwork, Fiverr all have a dedicated "post a job" band mid-page | LOW | Static section; existing btn-hay for employer CTA |
| Trusted-by strip (logos / social proof) | "Used by X farms" trust strip is expected on SaaS and marketplace landing pages — addresses cold visitor skepticism | LOW | Static logos or placeholder; farm/employer brand logos if available |
| Final CTA section | Closing CTA before footer is universal on landing pages — absent = missed conversion opportunity for users who scrolled past hero without converting | LOW | Static section; mirrors hero dual CTA fork |
| Hero animation (staggered fadeUp headline) | Animated hero is now expected on modern SaaS / marketplace landing pages; static headline feels dated | LOW | Framer Motion (or CSS keyframes); staggered delay on headline words |
| 4 stat blocks in testimonials section | Numeric social proof alongside testimonials is standard on SaaS landing pages | LOW | Static data or Supabase aggregate; existing counter animation can be reused |
| Live pulsing dot on counters | Animated "live" indicator is a cosmetic trust signal — not table stakes but increases credibility of live counter claims | LOW | CSS keyframe pulse animation on a dot element; no data dependency |

**Table stakes verdict:** Employer CTA band and final CTA section are table stakes for any two-sided marketplace landing page. AI features section is a differentiator (explains the core value prop to cold visitors). Farm types strip and trusted-by strip are moderate differentiators. Animations are polish, not table stakes.

---

### Category: Missing Form Fields (Wizards)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Chip-based selectors (replace checkboxes) | Chip grids for multi-select are standard UX for attribute selection with 4–12 options — Google Forms, Typeform, Workable onboarding all prefer chips over checkbox lists for this range; checkboxes feel like admin forms | LOW | Existing design system has chip/tag tokens; replace `<input type="checkbox">` with chip components; same state shape |
| Shed type chips (add AMS, Swing-Over, Tiestall) | AMS (robotic milking) is a growing NZ dairy category; omitting it is a product gap for progressive farms | LOW | Chip grid component; add values to shed_type enum |
| Breed + milking frequency + calving (post job) | Completeness of job spec fields; employers expect to specify these because they matter for candidate fit | LOW | Form fields only; already columns on `jobs` table or JSONB |
| Accommodation extras chip grid (full 8+ options) | Accommodation is a primary decision factor (76% require it) — limiting to 4 checkboxes truncates the most important dimension | LOW | Chip grid; accommodation JSONB already stores extras |
| Career development chips (employer onboarding) | DairyNZ training, mentorship availability, study leave — these are retention drivers; employers who offer them should signal this | LOW | Chip grid; new JSONB field on `employer_profiles` |
| Salary range on employer profile | Employers signalling their pay band attracts better-fit applicants; salary transparency is now a baseline expectation | LOW | Min/max NZD inputs; existing salary fields on `employer_profiles` |
| Visa chip grid (post job — replace toggle) | Single "visa sponsorship" toggle loses information; chip grid (NZ Citizens, Open Work Visa, RSE) captures who the employer will consider | LOW | Chip grid; replaces boolean toggle with array value |
| Min dairy experience + seniority (post job step 3) | Experience level is a primary screen for dairy roles — absence forces it into free-text job description | LOW | Select fields; new columns or JSONB on `jobs` |
| Pay frequency + hours range + weekend roster (post job step 4) | Hours and roster are table stakes on NZ ag job postings — dairy shifts are 3am and 3pm, weekend frequency matters for lifestyle | LOW | Select/number inputs; JSONB on `jobs.compensation` |
| Document upload zone (seeker onboarding step 3) | CV and reference upload is expected on any job platform — its absence forces seekers to attach docs via email outside the platform | MEDIUM | Supabase Storage bucket (already used for employer photos/documents); new `seeker_documents` table |
| Licence + certification chips (seeker step 3) | NZ driver's licence, ATV safety, 4WD, first aid — all expected credential fields for NZ agricultural roles | LOW | Chip grid; new columns on `seeker_profiles` |
| Salary, availability date, notice period (seeker step 5) | Standard expected fields on any job seeker profile — absence reduces match quality on the salary dimension | LOW | Form inputs; columns already exist or need addition to `seeker_profiles` |
| Nearest town + distance-from-town (employer step 2 + post job) | Critical for accommodation-seeking seekers evaluating remoteness — a farm "30km from town" with no broadband is meaningfully different from one 2km from a small town | LOW | Text input + select; warning hint at >30km already specified in SPEC |

**Table stakes verdict:** All missing form fields in the wizards are table stakes for the platform's stated function. A posting wizard that omits breed, milking frequency, and visa details forces employers to put this information in free-text — exactly the same outcome as a Facebook post.

---

### Category: Navigation and Structural Components

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Breadcrumb bar (job detail, 44px) | Breadcrumbs are expected on deep content pages — WAI-ARIA accessibility requirement; helps users navigate back without browser back button | LOW | Static breadcrumb component; uses `useLocation` / router path; WCAG 2.1 AA requirement |
| Stats strip on job detail (applications, views, salary, posted) | Social proof stats below the job header are used by Seek and Indeed — "47 applications" signals a competitive role; "Posted 2 days ago" signals freshness | LOW | Supabase aggregate query (application count, view count); existing salary data; posted date |
| Application timeline on job detail | Vertical timeline (application close → review → interviews → offer → start) is standard on enterprise job boards (Workday, SAP SuccessFactors) — gives seekers a process overview | MEDIUM | New `job_timeline` component; dates from job record or JSONB |
| Farm profile card in job detail sidebar | Employer profile card in sidebar is universal on job detail pages — Seek, Indeed, LinkedIn all show this | MEDIUM | `employer_profiles` data already fetched; new sidebar card component |
| Similar jobs card in job detail sidebar | Related jobs widget is expected on all job boards — reduces bounce rate | MEDIUM | Supabase query: same sector + region, different job ID; re-use SearchJobCard |
| Seeker onboarding completion screen (step 7) | Completion screens with matched jobs preview are used by LinkedIn onboarding, Workable ATS — gives users immediate value before they leave the wizard | MEDIUM | Match pool query: top 3 scored jobs for new seeker; completion checklist based on profile field fill |
| Employer onboarding completion screen (step 8) | Structured CTAs post-onboarding are standard — Stripe onboarding, Shopify setup wizard all end with a clear "what to do next" card | LOW | Static CTAs + profile preview component |
| Profile management sidebar (seeker — step 8) | Profile edit shell with sidebar nav is expected on any platform with a multi-section profile | MEDIUM | DashboardLayout sidebar; nav items mirror onboarding steps; edit routes for each section |

**Table stakes verdict:** Breadcrumb nav (WCAG requirement), farm profile card, and similar jobs are table stakes. Stats strip, application timeline, and completion screens are polish-tier differentiators that increase conversion and engagement.

---

## Differentiators

Features that make TopFarms meaningfully better than Facebook groups and better than generic job boards. These are why users will stay after their first session.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Match pool estimate in live preview sidebar | "14 seekers in Waikato with rotary experience are actively looking" — only TopFarms can show this because only TopFarms has pre-computed match scores; no agricultural job board in NZ provides this incentive at posting time | HIGH | Supabase RPC estimating match pool given partial job form state; requires debounced calls as wizard fields change |
| AI candidate summaries (employer view) | Employer-perspective AI summary ("Strong rotary experience, couples-friendly, 2 seasons Waikato — concern: notice period 6 weeks") is not available on any NZ-relevant ATS for agricultural hiring | HIGH | New Claude API prompt variant; response cached per applicant per job; purple AI box in applicant panel |
| Expandable card My Match tab with breakdown bars | In-card match breakdown with AI insight — no other NZ job platform shows seekers a per-dimension score breakdown in the results list itself | HIGH | match_scores data already computed; requires expanded card state to trigger match_scores fetch if not pre-loaded |
| Farm response indicator ("Viewed by employer X hours ago") | Reduces anxiety and increases platform trust — no NZ agricultural platform provides this; gives seekers confidence the system is being used | MEDIUM | `applications.employer_viewed_at` trigger on first applicant dashboard view of the application |
| Quick-filter pills with top agriculture-specific presets | "House included", "Couples welcome", "Top match >=80%", "Pets OK" one-tap filters are specifically tuned to NZ dairy seeker decision factors — generic platforms have none of these presets | LOW | Static pill definitions mapping to existing filter params |
| Live preview sidebar match pool estimate | As described above — quantified social proof at posting time is a unique incentive | HIGH | See above |
| Seeker completion screen with matched jobs | Showing top 3 matched jobs with scores immediately after completing onboarding is a "wow moment" that no NZ agricultural platform provides | MEDIUM | match_scores must be pre-computed before completion screen renders; may need a small delay or loading state |

---

## Anti-Features (Explicitly Not Building in v1.1)

Features that appear in the SPEC wireframes but are out of scope per PROJECT.md or produce disproportionate complexity.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Interview scheduling tab in 4-tab applicant panel | Calendar integration (Google Calendar, Calendly) is explicitly excluded from PROJECT.md; "Farmers schedule by phone" is the stated rationale | Build the tab shell (Interview tab visible but empty/coming-soon state); do not wire calendar integration |
| "Message farm" button on job detail sidebar | In-app messaging is explicitly Growth Phase per PROJECT.md — building the button creates a dead end | Link to off-platform contact release (existing shortlist/placement fee gate flow); button not rendered until Growth Phase |
| "Send message" in bulk actions | Same as above — Growth Phase messaging | Bulk actions bar: "Shortlist selected" + "Export" only; remove "Send message" from bulk actions |
| Save search + email alerts box in job search | Specified in SPEC, but involves Resend Edge Function triggered on new job publish — separate system that is not part of the ~70 gap items in this milestone | Include the UI shell (blue save search box visible) but wire as "coming soon" or defer entirely to v1.x post-validation |
| CV Builder nav item (seeker navigation) | Listed in SPEC seeker nav but is a completely separate product surface — not in the ~70 gap items list | Exclude from v1.1; nav item not added |
| Employer rating in applicant dashboard | Rating system is P2 (post-validation) per existing FEATURES.md — not part of SPEC compliance gap-closing | No rating UI in v1.1 applicant dashboard |
| Notes tab with stage mover in 4-tab panel | "Stage mover" in a notes tab duplicates the status transition buttons already in the main panel — redundant UX | Build Notes tab as free-text textarea only; stage mover is surfaced via existing status buttons |

---

## Feature Dependencies (Gap-Specific)

```
[Chip component upgrade (checkboxes → chips)]
    └──required by──> All wizard field upgrades (shed type, visa, accommodation extras, career dev, certifications)
    └──blocking──> Every onboarding/wizard gap that involves multi-select

[applications.employer_viewed_at timestamp]
    └──required by──> Farm response indicator ("Viewed by employer X hours ago")
    └──must be set by──> Applicant dashboard first-view trigger (new logic in employer applicant list)

[Applicant dashboard filter state]
    └──required by──> Filter chips toolbar (All / New / Reviewed / Shortlisted / Declined with counts)
    └──required by──> Bulk actions bar (which applicants are selected)

[Claude API — employer-perspective prompt]
    └──required by──> AI candidate summary per applicant
    └──must cache response——> To avoid per-render API calls; store in applications table or edge cache

[Supabase Storage bucket (seeker documents)]
    └──required by──> Document upload zone in seeker onboarding step 3
    └──requires──> New seeker_documents table + RLS policy (seeker can upload, employer cannot read until shortlist)

[match_scores pre-computation]
    └──required by——> My Match tab in expandable search cards
    └──required by——> Seeker completion screen top-3 matched jobs
    └──already exists——> Engine built in v1.0; query only

[Live preview sidebar — match pool RPC]
    └──required by——> Post job wizard live preview sidebar match pool estimate
    └──requires——> New Supabase RPC: estimate_match_pool(shed_type[], region, accommodation) → INT
    └──debounced——> Call on form field change with 500ms debounce

[Breadcrumb component]
    └──required by——> Job detail breadcrumb bar (44px)
    └──reusable——> Any future deep-link page

[Status variant banners]
    └──required by——> My applications cards (shortlisted / interview / declined / offer states)
    └──driven by——> applications.status column (already exists; banner is purely client-side conditional render)
```

---

## Complexity Assessment by Gap Category

| Gap Category | Items | Avg Complexity | Blocking Dependencies | Risk |
|--------------|-------|---------------|----------------------|------|
| Missing form fields (chip upgrades, new inputs) | ~30 fields | LOW | Chip component | Low — additive form changes |
| Landing page missing sections | 5 sections + 3 polish | LOW | None | Low — static content + existing components |
| Search hero section | 1 section (~5 sub-features) | LOW-MEDIUM | Filter state refactor for active pills | Low-Medium |
| Status variant banners (My Applications) | 4 variants + farm response | LOW-MEDIUM | employer_viewed_at timestamp | Low |
| Expandable card tabs | 3 tabs × 1 component | MEDIUM-HIGH | Match scores per expanded card, apply-in-card UX | Medium — My Match tab requires data fetch |
| Applicant dashboard enhancements | Sidebar + toolbar + AI + bulk + tabs | HIGH | New Claude prompt, bulk batch update, seeker_documents | High — 5 distinct sub-features, AI caching critical |
| Live preview sidebar (post job wizard) | 1 sidebar (~5 sub-features) | MEDIUM-HIGH | Match pool RPC (new), wizard state wiring | Medium-High |
| Job detail structural additions | Breadcrumb, stats strip, timeline, farm card, similar jobs | LOW-MEDIUM | None blocking | Low |
| Navigation/completion screens | Seeker step 7, employer step 8, sidebar nav | MEDIUM | match_scores query for seeker completion | Low-Medium |

---

## MVP Recommendation for v1.1

### Build in this order (dependency-respecting):

1. **Chip component** — unblocks all wizard field gaps; highest leverage per hour of work
2. **Missing form fields** (all wizards) — straightforward once chips exist; 30+ fields closed in one sweep
3. **Landing page sections** — lowest risk, highest marketing impact; pure content work
4. **Search hero + active filter pills** — improves every seeker's first session; low complexity
5. **Status variant banners** — fixes the most painful seeker UX gap; conditional renders only
6. **Breadcrumb + job detail structural** — polish + WCAG compliance; no data model changes
7. **Expandable card tabs** (Details + Apply first, My Match second) — Details and Apply are medium complexity; My Match tab deferred until data fetch strategy confirmed
8. **Applicant dashboard sidebar + toolbar** — employer UX foundation; enables bulk actions
9. **AI candidate summaries** — implement with caching strategy before enabling; do not ship uncached
10. **Live preview sidebar** — last because match pool RPC is a new backend piece; other wizard improvements ship without it

### Defer within v1.1:

- Match pool RPC (live preview sidebar) — backend-heavy; ship sidebar without pool estimate first
- Interview tab in 4-tab panel — shell only, no calendar wiring
- Seeker document upload — requires new Supabase Storage bucket + RLS; not blocking any other gap
- Numbered pagination — load-more is functional; pagination is polish; defer to end of milestone

---

## Sources

- TopFarms SPEC v3.0 — primary authority (HIGH confidence)
- TopFarms WIREFRAME_SPECS_FULL.md (2026-03-17) — gap-by-gap reference (HIGH confidence)
- TopFarms PROJECT.md — milestone definition + constraints (HIGH confidence)
- TopFarms WIREFRAME_SPECS.md (as-built audit) — existing component inventory (HIGH confidence)
- Training data: UI pattern classification for job board / ATS / marketplace UI (MEDIUM confidence — web research tools unavailable; patterns drawn from well-established platforms including Seek, LinkedIn Jobs, Greenhouse, Lever, Workable, Glassdoor, Airbnb, Indeed)
- Note: WebSearch, WebFetch, and Brave Search were unavailable during this research session. Pattern classifications reflect high-confidence training data for established UI patterns (pre-August 2025). No novel framework-specific implementation details claimed.

---

*Feature research for: TopFarms v1.1 SPEC compliance gap-closing milestone*
*Researched: 2026-03-20*
