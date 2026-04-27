# Requirements: TopFarms

**Defined:** 2026-04-02
**Core Value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides

## v2.0 Requirements

Requirements for Launch Readiness. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-06**: User can sign up and log in with Google OAuth via Supabase Auth
- [x] **AUTH-07**: User can sign up and log in with Facebook OAuth via Supabase Auth
- [x] **AUTH-08**: OAuth users are prompted to select role (Employer/Seeker) on first login and routed to role-appropriate onboarding

### Email Deliverability

- [x] **MAIL-01**: Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery
- [x] **MAIL-02**: When employer marks a job as filled, all applicants with unresolved status (applied, reviewed, interview, shortlisted) receive an automated notification email

### Bug Fixes

- [ ] **BFIX-01**: Job search cards show "Applied" badge when the logged-in seeker has already applied to that job (replace hardcoded false). Badge appears for any application status (active or terminal); status-suffixed copy distinguishes (e.g. "Applied · Declined"). Apply tab is re-enabled for terminal statuses (re-apply allowed).
- [ ] **BFIX-02**: Employers can view seeker-uploaded documents (CV, certificates, references) via Supabase Storage signed URLs in the applicant dashboard. URL minting goes through an Edge Function with service role; URLs are per-click ephemeral with 15-minute expiry.
- [ ] **BFIX-03**: Seeker-uploaded documents are categorized by type at upload (CV / certificate / reference / identity / other). Existing untagged documents migrate as 'other' and are re-classifiable by the seeker. Identity documents are NEVER exposed to employers — the document-access Edge Function filters out `document_type='identity'` server-side before minting any signed URL. Employer view in the applicant dashboard is sectioned by non-identity category.

### Job Search

- [ ] **SRCH-13**: Seeker can save current filter combination as a named saved search
- [ ] **SRCH-14**: Seeker can load a previously saved search to restore all filter state
- [ ] **SRCH-15**: Seeker can delete saved searches they no longer need

## Pre-Launch Must-Fix

Items that **block v2.0 launch**. Surfaced during pre-Phase-14 stabilisation. Not assigned to a phase yet — must be scheduled before go-live.

- [ ] **UXBUG-01** *(pre-launch blocker)*: `Step7Preview.tsx` references `accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` on `EmployerProfileData`, but those properties don't exist on the type. At runtime these access `undefined` and render as empty fields on the employer onboarding preview step (Step 7). Every employer hitting onboarding sees a half-broken preview before publishing. Investigate whether the fields were renamed during a migration, never added to the type, or never persisted at all. Found via `tsc -b` errors at `Step7Preview.tsx:129,161-164` (2026-04-27).

## Future Requirements

Deferred to post-launch. Tracked but not in current roadmap.

### Performance

- **PERF-01**: AbortController on `JobSearch.tsx` `fetchJobs` useEffect. Currently no abort on filter rapid-change — slow first response can overwrite a fresh second response. Low-priority quality fix; not a launch blocker. Logged 2026-04-27 during StrictMode investigation.

### Bug Fixes (Post-Launch)

- **HOMEBUG-01**: Home page calls `get_platform_stats` RPC which returns 404. Function may be missing, renamed, or never deployed in Supabase. Affected: home page platform stats widget renders silently empty. Logged 2026-04-27 from prod-build smoke (`localhost:4173/`).
- **HOMEBUG-02**: Home page `jobs?select=id,title,region,...` query returns 400 (likely malformed). Affected: home page featured jobs preview renders silently empty. Investigate query construction in landing page component. Logged 2026-04-27 from prod-build smoke.
- **HOMEBUG-03**: FilterSidebar Couples and Accommodation filters trigger backend errors when activated. Likely a UI/backend mismatch — filter UI exists but the corresponding query parameter or database column may be missing or named differently. Investigate: (1) does the UI emit the right query param, (2) does the jobs query handler accept it, (3) does the underlying jobs table have the necessary column. Affected: seeker job search filters (Couples + Accommodation sub-options). Logged 2026-04-27 from Bug 1 UAT side-finding.

### Email Automation

- **MAIL-03**: Weekly job digest email for seekers with matching jobs
- **MAIL-04**: 90-day inactive profile nudge ("Are you still looking?")
- **MAIL-05**: 120-day auto-hide notification and profile deactivation
- **MAIL-06**: Email alerts triggered by saved search (new matching jobs)

### Features

- **FEAT-01**: Google Maps integration for location-based job search
- **FEAT-02**: Interview scheduling with time slot proposals
- **FEAT-03**: AI-drafted job descriptions via Claude API in posting wizard
- **FEAT-04**: message_threads and messages tables (Growth Phase prep)

### Growth

- **GRWT-01**: Expressions of Interest for seekers
- **GRWT-02**: Employer analytics dashboard
- **GRWT-03**: In-app messaging UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| Messaging UI | Growth Phase — wireframe exists, tables deferred to post-launch |
| Horticulture/viticulture sectors | Future milestone per constraints |
| Native mobile apps | Mobile web only per constraints |
| Reverse seeker search | Not in MVP model — pure job-board |
| Ratings and reviews | Post-launch feature |
| SMS notifications | Email sufficient for MVP |
| PostGIS geographic search | Region-based filtering sufficient for NZ ag |
| Career Passport | Post-launch feature |
| Automated Stripe subscription billing | Manual invoicing for placement fees at MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-06 | Phase 12 | Complete |
| AUTH-07 | Phase 12 | Complete |
| AUTH-08 | Phase 12 | Complete |
| MAIL-01 | Phase 13 | Complete |
| MAIL-02 | Phase 13 | Complete |
| BFIX-01 | Phase 14 | Pending |
| BFIX-02 | Phase 14 | Pending |
| BFIX-03 | Phase 14 | Pending |
| SRCH-13 | Phase 15 | Pending |
| SRCH-14 | Phase 15 | Pending |
| SRCH-15 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-27 — added BFIX-03 (document categorization + identity exclusion) to Phase 14 scope; tightened BFIX-01/02 wording to reflect locked Phase 14 decisions*
