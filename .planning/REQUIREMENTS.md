# Requirements: TopFarms

**Defined:** 2026-04-02
**Core Value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides

## v2.0 Requirements

Requirements for Launch Readiness. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-06**: User can sign up and log in with Google OAuth via Supabase Auth
- [ ] **AUTH-07**: User can sign up and log in with Facebook OAuth via Supabase Auth
- [ ] **AUTH-08**: OAuth users are prompted to select role (Employer/Seeker) on first login and routed to role-appropriate onboarding

### Email Deliverability

- [ ] **MAIL-01**: Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery
- [ ] **MAIL-02**: When employer marks a job as filled, all applicants with unresolved status (applied, reviewed, interview, shortlisted) receive an automated notification email

### Bug Fixes

- [ ] **BFIX-01**: Job search cards show "Applied" badge when the logged-in seeker has already applied to that job (replace hardcoded false)
- [ ] **BFIX-02**: Employers can view seeker-uploaded documents (CV, certificates, references) via Supabase Storage signed URLs in the applicant dashboard

### Job Search

- [ ] **SRCH-13**: Seeker can save current filter combination as a named saved search
- [ ] **SRCH-14**: Seeker can load a previously saved search to restore all filter state
- [ ] **SRCH-15**: Seeker can delete saved searches they no longer need

## Future Requirements

Deferred to post-launch. Tracked but not in current roadmap.

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
| AUTH-06 | Phase 12 | Pending |
| AUTH-07 | Phase 12 | Pending |
| AUTH-08 | Phase 12 | Pending |
| MAIL-01 | Phase 13 | Pending |
| MAIL-02 | Phase 13 | Pending |
| BFIX-01 | Phase 14 | Pending |
| BFIX-02 | Phase 14 | Pending |
| SRCH-13 | Phase 15 | Pending |
| SRCH-14 | Phase 15 | Pending |
| SRCH-15 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation — all requirements mapped*
