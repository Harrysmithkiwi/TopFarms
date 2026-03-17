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

- [x] **EONB-01**: 8-screen onboarding wizard: farm type, farm details, culture, accommodation, verification start, pricing overview, completion
- [x] **EONB-02**: Farm type selection (dairy cattle, sheep & beef)
- [x] **EONB-03**: Farm details capture (herd size, shed type, milking system, region, property size)
- [x] **EONB-04**: Culture and work environment description
- [x] **EONB-05**: Accommodation details with sub-fields (pets, couples, family, utilities included)
- [x] **EONB-06**: Employer profile persisted and editable after completion

### Employer Verification

- [x] **EVER-01**: 5-tier verification system: email (auto), phone SMS, NZBN, document upload, farm photo
- [x] **EVER-02**: Verification badges displayed on employer profile and job listings
- [x] **EVER-03**: Manual NZBN verification (admin flag, no API integration for MVP)
- [x] **EVER-04**: Document and photo upload via Supabase Storage

### Job Posting

- [x] **JPOS-01**: 7-screen job posting wizard: role basics, farm details, skills required, compensation, description, pricing/payment, success
- [x] **JPOS-02**: Role basics: title, contract type, start date, duration
- [x] **JPOS-03**: Skills required with proficiency levels from master skills table
- [x] **JPOS-04**: Compensation: salary range (NZD annual), accommodation offered, other benefits
- [x] **JPOS-05**: Listing fee payment via Stripe: first listing free, Standard $100, Featured $150, Premium $200
- [x] **JPOS-06**: Job status management: draft, active, paused, filled, expired, archived
- [x] **JPOS-07**: 30-day listing expiry with status transitions

### Seeker Onboarding

- [x] **SONB-01**: 8-step onboarding wizard: account setup, farm type preference, experience, skills with proficiency, life situation, visa status, completion, profile management
- [x] **SONB-02**: Farm type preference selection (dairy cattle, sheep & beef)
- [x] **SONB-03**: Experience capture: years, herd sizes worked with, shed types experienced
- [x] **SONB-04**: Skills self-assessment with proficiency levels from master skills table
- [x] **SONB-05**: Life situation: couples seeking, accommodation requirements (pets, family), location preferences
- [x] **SONB-06**: Visa and work rights status
- [x] **SONB-07**: DairyNZ qualification level capture
- [x] **SONB-08**: Seeker profile persisted and editable after completion

### Job Search

- [x] **SRCH-01**: Job search results page with filter sidebar (280px desktop, drawer on mobile)
- [x] **SRCH-02**: Filter by shed type (rotary, herringbone, other)
- [x] **SRCH-03**: Filter by accommodation (available/not, pets, couples, family)
- [x] **SRCH-04**: Filter by visa requirements
- [x] **SRCH-05**: Filter by DairyNZ qualification level
- [x] **SRCH-06**: Filter by herd size range
- [x] **SRCH-07**: Filter by couples welcome
- [x] **SRCH-08**: Filter by salary range (dual-handle slider)
- [x] **SRCH-09**: Filter by region (NZ regions)
- [x] **SRCH-10**: Filter by contract type
- [x] **SRCH-11**: Search results display match score per job (when logged in as seeker)
- [x] **SRCH-12**: Search results load in <1.5 seconds

### Job Detail Page

- [x] **JDET-01**: Job detail page with full listing information
- [x] **JDET-02**: Logged-in seeker view: match score breakdown by category (shed type, location, accommodation, skills, salary, visa)
- [x] **JDET-03**: Visitor view: signup prompt instead of match details
- [x] **JDET-04**: Apply button with optional cover note

### Match Scoring Engine

- [x] **MTCH-01**: 100-point match scoring: shed type 25pts, location 20pts, accommodation 20pts, skills 20pts, salary 10pts, visa 5pts
- [x] **MTCH-02**: Couples bonus (+5 points when both parties seek couples and offer couples accommodation)
- [x] **MTCH-03**: Recency multiplier applied to scores
- [x] **MTCH-04**: Pre-computed scores stored in match_scores table (never computed client-side)
- [x] **MTCH-05**: Match scores recalculated when seeker profile or job listing changes (<60s SLA)
- [x] **MTCH-06**: AI match explanations via Claude API: 2-3 sentence insights per match, called from Edge Function

### Application Pipeline

- [x] **APPL-01**: Seeker can submit application to a job listing
- [x] **APPL-02**: Seeker application view with pipeline stages: applied, review, interview, shortlisted, offered, hired, declined, withdrawn
- [x] **APPL-03**: Seeker can withdraw application
- [x] **APPL-04**: Employer applicant dashboard with ranked candidates by match score
- [x] **APPL-05**: Employer can transition applicants through pipeline stages
- [x] **APPL-06**: Expandable applicant panels showing seeker profile details

### Placement Fee & Revenue

- [x] **REVN-01**: Placement fee acknowledgement modal triggered when employer shortlists a candidate
- [x] **REVN-02**: Contact details (phone, email) remain masked via RLS until placement fee acknowledged
- [ ] **REVN-03**: Stripe integration for listing fee collection (PaymentIntent API)
- [x] **REVN-04**: Stripe webhook handling with idempotency guards

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
| EONB-01 | Phase 2 | Complete |
| EONB-02 | Phase 2 | Complete |
| EONB-03 | Phase 2 | Complete |
| EONB-04 | Phase 2 | Complete |
| EONB-05 | Phase 2 | Complete |
| EONB-06 | Phase 2 | Complete |
| EVER-01 | Phase 2 | Complete |
| EVER-02 | Phase 2 | Complete |
| EVER-03 | Phase 2 | Complete |
| EVER-04 | Phase 2 | Complete |
| JPOS-01 | Phase 2 | Complete |
| JPOS-02 | Phase 2 | Complete |
| JPOS-03 | Phase 2 | Complete |
| JPOS-04 | Phase 2 | Complete |
| JPOS-05 | Phase 2 | Complete |
| JPOS-06 | Phase 2 | Complete |
| JPOS-07 | Phase 2 | Complete |
| SONB-01 | Phase 3 | Complete |
| SONB-02 | Phase 3 | Complete |
| SONB-03 | Phase 3 | Complete |
| SONB-04 | Phase 3 | Complete |
| SONB-05 | Phase 3 | Complete |
| SONB-06 | Phase 3 | Complete |
| SONB-07 | Phase 3 | Complete |
| SONB-08 | Phase 3 | Complete |
| SRCH-01 | Phase 3 | Complete |
| SRCH-02 | Phase 3 | Complete |
| SRCH-03 | Phase 3 | Complete |
| SRCH-04 | Phase 3 | Complete |
| SRCH-05 | Phase 3 | Complete |
| SRCH-06 | Phase 3 | Complete |
| SRCH-07 | Phase 3 | Complete |
| SRCH-08 | Phase 3 | Complete |
| SRCH-09 | Phase 3 | Complete |
| SRCH-10 | Phase 3 | Complete |
| SRCH-11 | Phase 3 | Complete |
| SRCH-12 | Phase 3 | Complete |
| JDET-01 | Phase 3 | Complete |
| JDET-02 | Phase 3 | Complete |
| JDET-03 | Phase 3 | Complete |
| JDET-04 | Phase 3 | Complete |
| APPL-01 | Phase 3 | Complete |
| APPL-02 | Phase 3 | Complete |
| APPL-03 | Phase 3 | Complete |
| APPL-04 | Phase 3 | Complete |
| APPL-05 | Phase 3 | Complete |
| APPL-06 | Phase 3 | Complete |
| MTCH-01 | Phase 4 | Complete |
| MTCH-02 | Phase 4 | Complete |
| MTCH-03 | Phase 4 | Complete |
| MTCH-04 | Phase 4 | Complete |
| MTCH-05 | Phase 4 | Complete |
| MTCH-06 | Phase 4 | Complete |
| REVN-01 | Phase 5 | Complete |
| REVN-02 | Phase 5 | Complete |
| REVN-03 | Phase 5 | Pending |
| REVN-04 | Phase 5 | Complete |
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
