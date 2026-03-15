# Requirements: TopFarms

**Defined:** 2026-03-15
**Core Value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create account with email and password, selecting role (Employer or Seeker)
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh
- [x] **AUTH-05**: User is routed to role-appropriate dashboard after login

### Database & Security

- [x] **DATA-01**: Supabase PostgreSQL schema with all tables (users, employer_profiles, seeker_profiles, jobs, applications, match_scores, skills, placement_fees, verification_tiers, etc.)
- [x] **DATA-02**: Row Level Security policies on all tables enforcing role-based access
- [x] **DATA-03**: Contact details (phone, email) masked at RLS level until placement fee acknowledged
- [x] **DATA-04**: Skills master table seeded with ~40 dairy + sheep/beef skills with proficiency levels

### Design System

- [x] **DSGN-01**: Component library with Fraunces (display) + DM Sans (body) typography
- [x] **DSGN-02**: Colour palette tokens: soil (#2C1A0E), moss (#2D5016), fern (#4A7C2F), meadow (#7AAF3F), hay (#D4A843), cream (#F7F2E8)
- [x] **DSGN-03**: Reusable form components (inputs, selects, checkboxes, sliders, toggles) styled to design system
- [x] **DSGN-04**: Mobile-responsive layout system (320px minimum breakpoint)

### Employer Onboarding

- [ ] **EONB-01**: 8-screen onboarding wizard: farm type, farm details, culture, accommodation, verification start, pricing overview, completion
- [ ] **EONB-02**: Farm type selection (dairy cattle, sheep & beef)
- [ ] **EONB-03**: Farm details capture (herd size, shed type, milking system, region, property size)
- [ ] **EONB-04**: Culture and work environment description
- [ ] **EONB-05**: Accommodation details with sub-fields (pets, couples, family, utilities included)
- [ ] **EONB-06**: Employer profile persisted and editable after completion

### Employer Verification

- [ ] **EVER-01**: 5-tier verification system: email (auto), phone SMS, NZBN, document upload, farm photo
- [ ] **EVER-02**: Verification badges displayed on employer profile and job listings
- [ ] **EVER-03**: Manual NZBN verification (admin flag, no API integration for MVP)
- [ ] **EVER-04**: Document and photo upload via Supabase Storage

### Job Posting

- [ ] **JPOS-01**: 7-screen job posting wizard: role basics, farm details, skills required, compensation, description, pricing/payment, success
- [ ] **JPOS-02**: Role basics: title, contract type, start date, duration
- [ ] **JPOS-03**: Skills required with proficiency levels from master skills table
- [ ] **JPOS-04**: Compensation: salary range (NZD annual), accommodation offered, other benefits
- [ ] **JPOS-05**: Listing fee payment via Stripe: first listing free, Standard $100, Featured $150, Premium $200
- [ ] **JPOS-06**: Job status management: draft, active, paused, filled, expired, archived
- [ ] **JPOS-07**: 30-day listing expiry with status transitions

### Seeker Onboarding

- [ ] **SONB-01**: 8-step onboarding wizard: account setup, farm type preference, experience, skills with proficiency, life situation, visa status, completion, profile management
- [ ] **SONB-02**: Farm type preference selection (dairy cattle, sheep & beef)
- [ ] **SONB-03**: Experience capture: years, herd sizes worked with, shed types experienced
- [ ] **SONB-04**: Skills self-assessment with proficiency levels from master skills table
- [ ] **SONB-05**: Life situation: couples seeking, accommodation requirements (pets, family), location preferences
- [ ] **SONB-06**: Visa and work rights status
- [ ] **SONB-07**: DairyNZ qualification level capture
- [ ] **SONB-08**: Seeker profile persisted and editable after completion

### Job Search

- [ ] **SRCH-01**: Job search results page with filter sidebar (280px desktop, drawer on mobile)
- [ ] **SRCH-02**: Filter by shed type (rotary, herringbone, other)
- [ ] **SRCH-03**: Filter by accommodation (available/not, pets, couples, family)
- [ ] **SRCH-04**: Filter by visa requirements
- [ ] **SRCH-05**: Filter by DairyNZ qualification level
- [ ] **SRCH-06**: Filter by herd size range
- [ ] **SRCH-07**: Filter by couples welcome
- [ ] **SRCH-08**: Filter by salary range (dual-handle slider)
- [ ] **SRCH-09**: Filter by region (NZ regions)
- [ ] **SRCH-10**: Filter by contract type
- [ ] **SRCH-11**: Search results display match score per job (when logged in as seeker)
- [ ] **SRCH-12**: Search results load in <1.5 seconds

### Job Detail Page

- [ ] **JDET-01**: Job detail page with full listing information
- [ ] **JDET-02**: Logged-in seeker view: match score breakdown by category (shed type, location, accommodation, skills, salary, visa)
- [ ] **JDET-03**: Visitor view: signup prompt instead of match details
- [ ] **JDET-04**: Apply button with optional cover note

### Match Scoring Engine

- [ ] **MTCH-01**: 100-point match scoring: shed type 25pts, location 20pts, accommodation 20pts, skills 20pts, salary 10pts, visa 5pts
- [ ] **MTCH-02**: Couples bonus (+5 points when both parties seek couples and offer couples accommodation)
- [ ] **MTCH-03**: Recency multiplier applied to scores
- [ ] **MTCH-04**: Pre-computed scores stored in match_scores table (never computed client-side)
- [ ] **MTCH-05**: Match scores recalculated when seeker profile or job listing changes (<60s SLA)
- [ ] **MTCH-06**: AI match explanations via Claude API: 2-3 sentence insights per match, called from Edge Function

### Application Pipeline

- [ ] **APPL-01**: Seeker can submit application to a job listing
- [ ] **APPL-02**: Seeker application view with pipeline stages: applied, review, interview, shortlisted, offered, hired, declined, withdrawn
- [ ] **APPL-03**: Seeker can withdraw application
- [ ] **APPL-04**: Employer applicant dashboard with ranked candidates by match score
- [ ] **APPL-05**: Employer can transition applicants through pipeline stages
- [ ] **APPL-06**: Expandable applicant panels showing seeker profile details

### Placement Fee & Revenue

- [ ] **REVN-01**: Placement fee acknowledgement modal triggered when employer shortlists a candidate
- [ ] **REVN-02**: Contact details (phone, email) remain masked via RLS until placement fee acknowledged
- [ ] **REVN-03**: Stripe integration for listing fee collection (PaymentIntent API)
- [ ] **REVN-04**: Stripe webhook handling with idempotency guards

### Landing Page

- [ ] **LAND-01**: Hero section with full-bleed background, headline, and dual CTA (employer/seeker paths)
- [ ] **LAND-02**: Live counters (jobs posted, workers registered, matches made) with scroll-triggered animation
- [ ] **LAND-03**: How-it-works section with employer/seeker toggle
- [ ] **LAND-04**: Featured job listings section
- [ ] **LAND-05**: Testimonials section
- [ ] **LAND-06**: Footer with navigation and legal links

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Messaging

- **MSG-01**: In-app messaging between employer and seeker (listing-anchored threads)
- **MSG-02**: Soft contact detection with nudge banners

### Growth Features

- **GRWT-01**: Expressions of Interest for seekers
- **GRWT-02**: Email notifications for new matching jobs
- **GRWT-03**: Employer analytics dashboard (views, applications, conversion)

### Sectors

- **SECT-01**: Horticulture sector support
- **SECT-02**: Viticulture sector support

### Admin

- **ADMN-01**: Admin dashboard for content moderation
- **ADMN-02**: Admin NZBN verification workflow
- **ADMN-03**: Admin reporting and analytics

## Out of Scope

| Feature | Reason |
|---------|--------|
| Data scraping pipeline (Apify/Claude) | Separate build track — documented independently |
| Social media login (Google/Facebook OAuth) | Email/password only for MVP — reduces auth complexity |
| Mobile native apps (iOS/Android) | Mobile web only — responsive design covers mobile use |
| Partner job matching (separate role for seeker's partner) | Couples flag is sufficient for MVP |
| Video interviews or calendar integration | High complexity, not core to matching value |
| Multi-user employer accounts / team roles | Single admin per farm sufficient for MVP |
| API for third-party developers | No external integrations needed for MVP |
| International markets | NZ-only for MVP |
| Training providers / courses module | Not core to hiring workflow |
| Real-time chat | Disproportionate complexity; contact release after shortlist handles core use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DSGN-01 | Phase 1 | Complete |
| DSGN-02 | Phase 1 | Complete |
| DSGN-03 | Phase 1 | Complete |
| DSGN-04 | Phase 1 | Complete |
| EONB-01 | Phase 2 | Pending |
| EONB-02 | Phase 2 | Pending |
| EONB-03 | Phase 2 | Pending |
| EONB-04 | Phase 2 | Pending |
| EONB-05 | Phase 2 | Pending |
| EONB-06 | Phase 2 | Pending |
| EVER-01 | Phase 2 | Pending |
| EVER-02 | Phase 2 | Pending |
| EVER-03 | Phase 2 | Pending |
| EVER-04 | Phase 2 | Pending |
| JPOS-01 | Phase 2 | Pending |
| JPOS-02 | Phase 2 | Pending |
| JPOS-03 | Phase 2 | Pending |
| JPOS-04 | Phase 2 | Pending |
| JPOS-05 | Phase 2 | Pending |
| JPOS-06 | Phase 2 | Pending |
| JPOS-07 | Phase 2 | Pending |
| SONB-01 | Phase 3 | Pending |
| SONB-02 | Phase 3 | Pending |
| SONB-03 | Phase 3 | Pending |
| SONB-04 | Phase 3 | Pending |
| SONB-05 | Phase 3 | Pending |
| SONB-06 | Phase 3 | Pending |
| SONB-07 | Phase 3 | Pending |
| SONB-08 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| SRCH-04 | Phase 3 | Pending |
| SRCH-05 | Phase 3 | Pending |
| SRCH-06 | Phase 3 | Pending |
| SRCH-07 | Phase 3 | Pending |
| SRCH-08 | Phase 3 | Pending |
| SRCH-09 | Phase 3 | Pending |
| SRCH-10 | Phase 3 | Pending |
| SRCH-11 | Phase 3 | Pending |
| SRCH-12 | Phase 3 | Pending |
| JDET-01 | Phase 3 | Pending |
| JDET-02 | Phase 3 | Pending |
| JDET-03 | Phase 3 | Pending |
| JDET-04 | Phase 3 | Pending |
| APPL-01 | Phase 3 | Pending |
| APPL-02 | Phase 3 | Pending |
| APPL-03 | Phase 3 | Pending |
| APPL-04 | Phase 3 | Pending |
| APPL-05 | Phase 3 | Pending |
| APPL-06 | Phase 3 | Pending |
| MTCH-01 | Phase 4 | Pending |
| MTCH-02 | Phase 4 | Pending |
| MTCH-03 | Phase 4 | Pending |
| MTCH-04 | Phase 4 | Pending |
| MTCH-05 | Phase 4 | Pending |
| MTCH-06 | Phase 4 | Pending |
| REVN-01 | Phase 5 | Pending |
| REVN-02 | Phase 5 | Pending |
| REVN-03 | Phase 5 | Pending |
| REVN-04 | Phase 5 | Pending |
| LAND-01 | Phase 6 | Pending |
| LAND-02 | Phase 6 | Pending |
| LAND-03 | Phase 6 | Pending |
| LAND-04 | Phase 6 | Pending |
| LAND-05 | Phase 6 | Pending |
| LAND-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 76 total (note: original header said 68 — actual count of defined IDs is 76)
- Mapped to phases: 76
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation — all requirements mapped*
