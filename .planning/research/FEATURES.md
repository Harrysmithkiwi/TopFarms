# Feature Research

**Domain:** Niche / vertical job marketplace — NZ agricultural sector (dairy cattle + sheep & beef)
**Researched:** 2026-03-15
**Confidence:** HIGH (primary source: fully-specified SPEC.md v3.0 with 8 interactive wireframes; domain knowledge cross-referenced against known patterns in vertical job boards and agricultural hiring)

---

## Context

TopFarms is replacing informal Facebook group hiring with a structured platform. The competitive baseline is NOT Seek or TradeMe — it is the NZ ag Facebook group experience (free, frictionless, but unstructured and slow). Every feature must be better than a Facebook post, not better than a generic enterprise ATS.

The SPEC.md v3.0 is the authoritative product definition. This document categorises its features against the job marketplace feature landscape, adds anti-feature analysis, and surfaces the dependency graph that governs build order.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken compared to Facebook groups or any basic job board.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password signup with user type selection | Every platform has accounts; role selection at signup is necessary because employer and seeker UX are completely different | LOW | Supabase Auth handles this; employer/seeker fork on signup |
| Persistent login sessions | Facebook groups never log you out; platform can't feel less convenient | LOW | Supabase session management via `localStorage` |
| Job listing page with full details | The atomic unit of any job board — job title, description, salary, location | MEDIUM | Single page with two states: logged-in (match score) and visitor (signup prompt) |
| Employer job posting form | Without the ability to post jobs, there is no supply side | HIGH | 7-screen wizard covering all ag-specific fields |
| Job search with filtering | Seekers need to find relevant jobs; broad search = low signal | MEDIUM | 280px filter sidebar, 10+ filter dimensions |
| Application submission | Seekers must be able to express interest in a job | LOW | One-click apply with optional cover note |
| Application tracking for seeker | "Did they see my application?" — users expect to know their status | MEDIUM | 8-stage pipeline visible to seeker; employer-controlled transitions |
| Applicant dashboard for employer | Employers need to review and act on applications | MEDIUM | Ranked candidate list with pipeline stage management |
| Mobile-responsive design | 86% of NZ ag Facebook usage is on mobile; desktop-only = immediate churn | HIGH | 320px minimum; filter sidebar becomes drawer on mobile |
| Employer profile (public farm page) | Seekers want to research the farm before applying; trust signal | MEDIUM | Shows farm details, shed type, accommodation, active listings |
| Password reset via email | Standard auth expectation; absence creates support burden | LOW | Supabase handles; Resend for email delivery |
| Salary information on listings | Salary transparency is now a baseline expectation; hidden salary = fewer applications | LOW | Min/max NZD annual + market rate comparison hint |
| Job expiry and status management | Listings must not show filled or expired roles; users lose trust if they see stale data | LOW | 30-day expiry, status: draft/active/paused/filled/expired/archived |
| Landing page with clear value prop | Cold visitors (from Google, word of mouth) need to understand what the platform does in <5 seconds | HIGH | Full-bleed hero, dual CTA fork (employer/seeker), live counters |

### Differentiators (Competitive Advantage)

Features that make TopFarms demonstrably better than Facebook groups and generically better than Seek/TradeMe. These are why employers and seekers will switch.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Shed type matching (rotary vs herringbone) | The #1 skill differentiator in dairy; Seek has no concept of shed type; a rotary-trained worker applying to a herringbone farm wastes both parties' time | MEDIUM | 25/100 match score weight; chip selector on both employer and seeker profiles |
| Pre-computed match score (0–100) displayed per job | Seekers get instant signal quality without reading every listing; employers get pre-ranked applicants; replaces the "scroll through 50 Facebook comments" experience | HIGH | Stored in `match_scores` table; recalculated on profile/job change; <60s SLA |
| AI match explanations (Claude API) | Plain-English "why this job suits you" removes ambiguity; differentiated from raw score algorithms | MEDIUM | 2–3 sentence Claude Sonnet API call per match; purple AI insight box |
| Accommodation sub-scoring (pets, couples, family, utilities) | 76% of NZ dairy seekers require on-farm accommodation; pets/couple requirements are make-or-break — a job with no pets policy is a hard no for many | HIGH | Sub-scored independently in `accommodation` JSONB; 20/100 match weight |
| Couples-seeking matching | 28% of seekers are couples; both partners need roles; no existing platform handles this | LOW | `couples_seeking` + `couples_welcome` boolean pair; +5 point bonus in scoring |
| DairyNZ qualification level filters | NZ-specific certification taxonomy; Level 2 vs Level 5 is a meaningful hiring signal; generic platforms have no NZ ag qualification taxonomy | MEDIUM | Chip selector on seeker profile; filter in job search; included in skills match dimension |
| Herd size experience matching | 300-cow experience vs 1,200-cow experience is a real skill differentiator; large-scale farms will not hire under-experienced candidates | LOW | Int range stored on both job and seeker profile; included in skills score calculation |
| 5-tier employer verification system | NZ ag is reputation-driven; unverified listings destroy trust; Facebook groups have no verification whatsoever | MEDIUM | Tier 1 auto (email), Tier 2 SMS OTP, Tier 3 NZBN, Tier 4 doc upload, Tier 5 farm photo |
| Match score breakdown with animated progress bars | Seekers can see exactly why their score is 68% and what would improve it; actionable transparency | MEDIUM | Per-dimension bar chart on job detail sidebar and applicant dashboard expandable panel |
| Visa / right-to-work hard filter | Eliminates ineligible applications before they waste the employer's time; common pain point in seasonal hiring | LOW | 5 pts in scoring; visa-ineligible seeker gets hard 0 on that dimension |
| Market rate salary comparison at posting time | Employers posting below-market salaries see a hint; reduces "no applicants" because salary was 20% below Waikato average | LOW | Hardcoded NZD ranges per region/role for MVP; updated quarterly from DairyNZ data |
| Placement fee protection via RLS contact masking | Contact details masked at the database layer (not CSS) until employer acknowledges fee; stronger than any client-side approach | MEDIUM | Supabase RLS policy on seeker contact fields; `placement_fees.acknowledged_at` gate |
| Listing tier differentiation (Standard / Featured / Premium) | Employers who pay more get more visibility; featured listings appear at top of search + hay border; creates upgrade incentive | LOW | Tier stored on `jobs.listing_tier`; featured gets priority sort + homepage placement |
| Save search + email alerts | Seekers set up a saved search and get notified when new matching jobs are posted; passive job hunters are reached | MEDIUM | Email alert via Resend Edge Function triggered on new job publish |
| Job cards with expandable in-place tabs (Details / Match / Apply) | Reduces navigation friction; seeker can apply without leaving search results page | MEDIUM | Three-tab expandable card component; apply tab writes to `applications` table |
| Recency multiplier in match scoring | Jobs posted within 7 days get 1.1x multiplier; prevents stale listings dominating top results | LOW | Single multiplier in scoring engine calculation |
| Profile completeness nudge with field-level completion map | Incomplete profiles produce worse match scores; completion nudges drive higher profile quality = better matches | LOW | `profile_complete_pct` computed field; progress bar with per-field checklist |
| Live counters on landing page (animated from zero on scroll) | Social proof for cold visitors; "847 registered seekers, 63 active jobs" is a trust signal during cold start | LOW | Static data from Supabase aggregate query; animates on scroll reveal |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but create problems disproportionate to their benefit at MVP stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-app messaging (employer ↔ seeker) | "How do I reach candidates without sharing my phone number?" | Contact detection for phone/email patterns is complex; listing-anchored threading adds significant backend complexity; primary risk is seekers circumventing placement fees in messages — soft-block is imperfect at ~85% catch rate; this is a Growth Phase problem to solve after revenue validation | Release contact details post-shortlist acknowledgement; provide off-platform contact after fee gate; deferred to Growth Phase |
| Social login (Google / Facebook OAuth) | Lower friction signup; users already have Google accounts | OAuth adds implementation complexity; Facebook login is ironic given TopFarms is replacing Facebook groups; email/password is sufficient for MVP validation; adds OAuth error states and account-linking edge cases | Email/password with strong onboarding UX; add OAuth in v1.x once core is working |
| Partner job matching (seeker's partner) | 28% of seekers are couples; partner needs work too | Matching two people to two jobs on one farm is a multi-variable optimisation problem; couples_welcome flag + couples_seeking boolean handles the common case (farm must accommodate both); true partner job matching requires a separate seeker profile linked to the primary | Couples boolean on both sides covers 80% of the use case; defer full partner matching to v2 |
| Video interviews / calendar integration | "Can we schedule interviews on-platform?" | Calendar integration (Calendly, Google Calendar) adds OAuth dependencies and scheduling edge cases; video (Zoom, Teams) adds media infrastructure; farmers schedule by phone — this solves a problem that doesn't exist in the target audience | Off-platform scheduling; employers and seekers exchange contact details after shortlist and use whatever tool they prefer |
| Real-time match score updates | "My score changed as I filled in my profile" | Real-time recalculation for every keypress would be expensive (60-second SLA is the right target for batch recalculation, not per-keystroke); adds Supabase Realtime subscription complexity for marginal UX gain | Batch recalculation on profile save; show "score updating" state; display recalculated score within 60 seconds |
| Training provider / courses module | Farmers want DairyNZ training pathways integrated | Separate content product; course data changes frequently; licensing/partnership required; out of scope entirely for MVP | Link out to DairyNZ.co.nz for training info; add as external link in seeker profile completion nudge |
| Multi-user employer accounts (team roles) | Corporate farms have HR teams; "can my 2IC post jobs?" | Role-based access control within an employer account adds significant auth complexity; most NZ farms are owner-operator or have a single hiring contact | Single-user employer account for MVP; explicit out of scope; add in enterprise tier expansion |
| Horticulture / viticulture sectors | "What about kiwifruit and wine jobs?" | Different skill taxonomies, seasonal patterns, and accommodation norms; different filter dimensions (block size vs herd size); dilutes MVP focus on dairy/sheep-beef which is 86% of the problem space | Phase 2 expansion; schema is sector-aware (`sector` column on `jobs`) so addition is additive, not breaking |
| "Best match" AI job recommendations push-email | "Email me my top 5 jobs every week" | Requires a ranking job that runs per-seeker weekly; significant Edge Function complexity for an audience that may not open marketing email; more valuable once platform has 500+ active listings | Save search + alert on new matching job publish is the right v1 mechanism; weekly digest is v2 |
| Employer rating / review system | "I want to know if this farm is a good employer" | Rating without verification is gameable; agricultural community is small — a public bad review from a disgruntled worker could be defamatory; moderation burden is high | Verification tier badge (Trusted Employer) is the v1 trust signal; add ratings in v2 after community norms are established |

---

## Feature Dependencies

```
[Auth — email/password signup with user type]
    └──required by──> [Employer onboarding wizard]
    └──required by──> [Seeker onboarding wizard]
    └──required by──> [Match score display on job detail]
    └──required by──> [Application submission]
    └──required by──> [Applicant dashboard]
    └──required by──> [Worker application view]

[Employer onboarding wizard] (farm profile data in employer_profiles)
    └──required by──> [Employer job posting form] (jobs.employer_id FK)
    └──required by──> [Public employer profile page]
    └──enhances──> [Match scoring engine] (shed_type, region, accommodation from farm profile)

[Seeker onboarding wizard] (seeker_profiles + seeker_skills populated)
    └──required by──> [Match scoring engine] (needs seeker dimensions to score)
    └──required by──> [Job search match scores displayed]
    └──required by──> [Job detail match breakdown sidebar]
    └──required by──> [Worker application view]

[Employer job posting form] (jobs record created + listing_fee paid)
    └──required by──> [Job listing page / job detail]
    └──required by──> [Job search results]
    └──required by──> [Match scoring engine] (triggers recalculation for all seekers in sector)
    └──required by──> [Applicant dashboard]

[Skills master table seeded ~40 skills]
    └──required by──> [Employer job posting form Step 3 — skill requirement picker]
    └──required by──> [Seeker onboarding Step 4 — skill proficiency chips]
    └──required by──> [Match scoring — skills dimension]

[Match scoring engine] (pre-computed match_scores table populated)
    └──required by──> [Job search — sorted by "Best match"]
    └──required by──> [Job detail match breakdown bars]
    └──required by──> [Applicant dashboard — ranked candidates]
    └──enhances──> [AI match explanations] (score breakdown passed to Claude API)

[Stripe integration — listing fees]
    └──required by──> [Job posting Step 6 — pay to publish]
    └──required by──> [Listing going active] (webhook confirms payment → status = active)

[Placement fee acknowledgement gate]
    └──required by──> [Contact details release via RLS]
    └──requires──> [Applicant dashboard shortlist action]
    └──requires──> [Stripe invoice creation on hire confirmation]

[AI match explanations — Claude API]
    └──enhances──> [Job detail sidebar (logged-in state)]
    └──enhances──> [Applicant dashboard candidate cards]
    └──requires──> [Match scoring engine] (needs breakdown scores as input)

[Save search + email alerts]
    └──requires──> [Job search filters]
    └──requires──> [Resend email Edge Function]
    └──enhances──> [Job posting] (triggers alerts when new matching job published)

[Landing page live counters]
    └──enhances──> [Landing page trust]
    └──requires──> [Auth + job posting] (counters need real data; fake data is acceptable at cold start)

[Public employer profile page]
    └──enhances──> [Job detail page] (farm profile card in sidebar)
    └──requires──> [Employer onboarding]

[Employer verification Tier 2+ (phone, NZBN, doc)]
    └──enhances──> [Public employer profile] (verification tier badge)
    └──enhances──> [Job listings] (Verified Employer badge on listing cards)
    └──requires──> [Employer onboarding wizard Screen 6]
```

### Dependency Notes

- **Skills master table is a zero-milestone dependency:** It must be seeded before any onboarding wizard (employer or seeker) that references skills can function. Seed during schema migration in Milestone 1.
- **Match scoring engine requires both employer and seeker data:** It cannot run until at least one job exists AND at least one seeker profile exists. Recalculation is triggered automatically; the engine itself should be built in Milestone 3 (seeker) even though employer data exists from Milestone 2.
- **Placement fee gate requires Stripe:** The acknowledgement modal and contact release are separate from payment; but the hire-confirmation invoice requires Stripe Invoice API. Ensure Stripe integration is complete in Milestone 2 before the gate is wired.
- **AI match explanations are an enhancer, not a blocker:** Every surface that shows them (job detail, applicant dashboard) can render without the AI text — it can be added as a progressive enhancement. Avoids a hard dependency on Claude API uptime blocking core application flow.
- **RLS contact masking must be implemented before any contact fields are stored:** Build the RLS policy in Milestone 1 schema migration. Do not store real contact data without the policy in place.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate whether farmers will use a structured platform over Facebook groups.

- [ ] Auth (email/password, employer/seeker fork, session persistence) — without this nothing works
- [ ] Employer onboarding wizard (8 screens) — supply side requires farm profile before job posting
- [ ] Employer job posting form (7 screens) + Stripe listing fees — no listings = no platform
- [ ] Job detail page (logged-in + visitor states) — atomic unit of the product
- [ ] Seeker onboarding wizard (8 steps) + profile management — demand side needs structured profiles for matching
- [ ] Job search with all ag-specific filters — the core reason to use TopFarms over Facebook
- [ ] Pre-computed match scoring engine (6 dimensions + couples bonus + recency multiplier) — the primary value proposition
- [ ] AI match explanations via Claude API — differentiates score display from a raw number
- [ ] Worker application view with pipeline stages — seekers need to track status
- [ ] Employer applicant dashboard (ranked, pipeline, expandable panels) — employers need to manage applicants
- [ ] Placement fee acknowledgement gate + contact masking via RLS — revenue protection; non-negotiable
- [ ] 5-tier employer verification (Tiers 1–4 minimum; Tier 5 optional) — trust signal for seekers
- [ ] Landing page with hero, dual CTA, live counters, how-it-works, featured listings, testimonials — cold visitor acquisition
- [ ] Mobile-responsive design (320px minimum; filter drawer on mobile) — NZ ag users are on phones
- [ ] WCAG 2.1 AA compliance — legal and ethical baseline
- [ ] Design system components (buttons, cards, chips, match circles, info boxes) — consistent identity

### Add After Validation (v1.x)

Features to add once the core employer ↔ seeker ↔ application loop is validated with real users.

- [ ] Save search + email job alerts — trigger: seekers report missing new listings between visits
- [ ] Social login (Google OAuth) — trigger: high signup abandonment rate at email/password step
- [ ] Employer profile rating (optional, moderated) — trigger: seekers request more trust signals
- [ ] Tier 2 filters (ATV/quad, tractor certification, irrigation) — trigger: employer feedback that these dimensions matter
- [ ] Admin panel for verification review (NZBN, document uploads) — trigger: >25 employers needing manual verification

### Future Consideration (v2+)

Features to defer until product-market fit is confirmed and revenue is stable.

- [ ] In-app messaging / Expressions of Interest — requires placement fee revenue to justify complexity; Growth Phase wireframe complete
- [ ] Partner job matching (true dual-applicant matching) — couples_welcome boolean covers 80% of cases at MVP
- [ ] Horticulture + viticulture sectors — Phase 2; schema is sector-aware, addition is additive
- [ ] Multi-user employer accounts (team roles / permissions) — enterprise-tier requirement
- [ ] Video interviews / calendar integration — farmers schedule by phone; low demand signal expected
- [ ] Mobile native apps (iOS/Android) — mobile web first; native only if retention data supports investment
- [ ] API for third-party developers — enterprise expansion, not MVP
- [ ] Weekly "best match" AI job recommendation digest — requires 500+ active listings to be valuable
- [ ] Training providers / courses module — separate product; DairyNZ partnership required

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth + session persistence | HIGH | LOW | P1 |
| Employer onboarding wizard | HIGH | MEDIUM | P1 |
| Employer job posting + Stripe | HIGH | HIGH | P1 |
| Job detail page | HIGH | MEDIUM | P1 |
| Seeker onboarding wizard | HIGH | MEDIUM | P1 |
| Job search + ag-specific filters | HIGH | MEDIUM | P1 |
| Match scoring engine (pre-computed) | HIGH | HIGH | P1 |
| AI match explanations (Claude API) | HIGH | MEDIUM | P1 |
| Worker application view | HIGH | MEDIUM | P1 |
| Employer applicant dashboard | HIGH | MEDIUM | P1 |
| Placement fee gate + RLS masking | HIGH | MEDIUM | P1 |
| Employer verification (Tiers 1–4) | HIGH | MEDIUM | P1 |
| Landing page | HIGH | HIGH | P1 |
| Mobile-responsive design | HIGH | HIGH | P1 |
| Design system components | HIGH | MEDIUM | P1 |
| Save search + email alerts | MEDIUM | MEDIUM | P2 |
| Employer profile rating | MEDIUM | MEDIUM | P2 |
| Tier 2 filters (ATV, tractor, etc.) | MEDIUM | LOW | P2 |
| Admin verification review panel | MEDIUM | MEDIUM | P2 |
| Social login (OAuth) | LOW | MEDIUM | P3 |
| In-app messaging | MEDIUM | HIGH | P3 |
| Horticulture / viticulture sectors | MEDIUM | HIGH | P3 |
| Multi-user employer accounts | LOW | HIGH | P3 |
| Partner job matching | MEDIUM | HIGH | P3 |
| Video interviews | LOW | HIGH | P3 |
| Native mobile apps | LOW | HIGH | P3 |
| API for developers | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

Research note: WebSearch and WebFetch were unavailable during this research session. The competitor analysis below is derived from the SPEC.md's own competitive analysis (Section 11) and domain knowledge about NZ agricultural hiring platforms. Confidence: MEDIUM.

| Feature | Seek / TradeMe (generic) | NZ Facebook Groups (informal) | TopFarms Approach |
|---------|--------------------------|-------------------------------|-------------------|
| Shed type filter | Not available | Free-text in post; no filter | Chip selector; 25pt match weight |
| Accommodation matching | Binary yes/no field | Mentioned in post; unsearchable | Sub-scored: pets, couples, family, utilities, house type |
| DairyNZ qualification filter | Not available | Mentioned in post; unsearchable | Chip grid; included in skills dimension |
| Herd size experience | Not available | Mentioned in post; unsearchable | Int range; included in skills score |
| Couples matching | Not available | "Couple welcome" in post text | Boolean pair; +5pt bonus |
| Match scoring | Not available | Manual scrolling | Pre-computed 100pt system with AI explanation |
| Employer verification | Basic (email only) | No verification | 5-tier ladder (email, SMS, NZBN, doc, photo) |
| Application tracking | Basic status emails | Comments on post | 8-stage pipeline with visual track |
| Contact protection | Not applicable | No protection | RLS masking until fee acknowledgement |
| Salary transparency | Optional field | Varies by poster | Required field with market rate comparison |
| Region-specific salary data | Generic national data | No guidance | Hardcoded NZ ag rates per region/role |
| Mobile UX | Good | Native app (Facebook) | 320px minimum; filter drawer on mobile |
| Listing fees | Standard job board rates | Free | First listing free; $100–$200 thereafter |

---

## NZ Agricultural-Specific Feature Notes

These are features unique to this domain that have no analogue in generic job board research:

**Shed type is the most important single dimension.** A herringbone-trained dairy worker applying to a rotary operation requires retraining; they are not directly equivalent. Rotary ↔ herringbone = 40% partial match in the scoring engine. AMS (robotic milking) is a separate pool entirely. This dimension carries 25/100 match weight — more than location (20pts) — because it determines day-one job performance.

**Accommodation is a decision driver, not a perk.** 76% of NZ dairy seekers require on-farm accommodation because many dairy farms are 30+ km from the nearest town. A listing that does not offer accommodation is automatically excluded by these seekers regardless of any other factor. The accommodation filter and its sub-scoring (pets, couples, family) must be complete and accurate — incomplete accommodation data on a listing is equivalent to a misleading salary figure on a generic platform.

**Couples hiring is systemic, not edge-case.** 28% of seekers are in couples. Most farm couples expect both partners to be employed (or at least accommodated). The `couples_welcome` flag on a job and `couples_seeking` on a seeker profile are not optional fields; they are a primary matching dimension. The +5pt couples bonus is an additive top-up on the base score, not a filter that can eliminate an otherwise good match.

**Visa status is a hard filter.** NZ ag seasonal labour involves RSE (Recognised Seasonal Employer) scheme workers, working holiday visa holders, and permanent residents. Sending a working-holiday visa holder's application to an employer who cannot sponsor is not a bad match — it is a disqualifying mismatch. The visa dimension carries only 5pts in the score but operates as a hard 0 when the seeker is ineligible for the role's sponsorship requirements.

**DairyNZ qualification levels are the sector's credential system.** Dairy employers reference DairyNZ Level 2, 3, 4, 5+ as shorthand for capability. No generic job board has this taxonomy. The qualification chip grid on both employer (requirement) and seeker (achieved) profiles is a core differentiator.

**Market rate salary data is regionally fragmented.** Waikato dairy assistant rates differ from Southland rates. Hardcoded regional rate ranges (updated quarterly from DairyNZ publications) provide the salary comparison hint at posting time. This is a meaningful service that Facebook groups and generic platforms cannot provide.

---

## Sources

- TopFarms SPEC.md v3.0 — Primary source, authored by product owner (HIGH confidence)
- TopFarms PROJECT.md — Project context and validated requirements (HIGH confidence)
- Domain knowledge: NZ agricultural labour market context embedded in SPEC.md Sections 1.2, 1.4, 11 (MEDIUM confidence — reflects SPEC author's research)
- Competitor analysis: SPEC.md Section 11 "Why TopFarms Wins" table (MEDIUM confidence — SPEC's own competitive claim; not independently verified via WebFetch)
- Note: WebSearch and WebFetch were denied during this research session; no independent competitor site verification was possible

---

*Feature research for: NZ agricultural job marketplace (vertical job board)*
*Researched: 2026-03-15*
