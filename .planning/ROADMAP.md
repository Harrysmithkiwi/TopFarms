# Roadmap: TopFarms

## Overview

TopFarms launches as a six-phase build. Phase 1 lays the schema, security, auth, and design system foundations — every pitfall identified in research is resolved here or costs days to fix later. Phase 2 completes the employer supply side (onboarding, job posting, Stripe). Phase 3 completes the seeker demand side (onboarding, job search with all ag-specific filters, applications). Phase 4 builds the match scoring engine and AI explanations that are the platform's core differentiator. Phase 5 wires the revenue protection layer (placement fee gate, contact masking, follow-up emails). Phase 6 delivers the public landing page, mobile QA, accessibility audit, and production launch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Schema, auth, RLS policies, design system, and project scaffolding
- [x] **Phase 2: Employer Supply Side** - Employer onboarding, job posting wizard, Stripe listing fees, and verification (completed 2026-03-15)
- [x] **Phase 3: Seeker Demand Side** - Seeker onboarding, ag-specific job search, and application pipeline (completed 2026-03-16)
- [x] **Phase 4: Match Scoring Engine** - Pre-computed match scores, staleness triggers, and AI explanations (completed 2026-03-16)
- [ ] **Phase 5: Revenue Protection** - Placement fee gate, RLS contact masking, and follow-up emails
- [ ] **Phase 6: Landing Page and Launch** - Public landing page, mobile QA, accessibility, and production deployment

## Phase Details

### Phase 1: Foundation
**Goal**: The project is scaffolded, all database tables exist with RLS on every table, contact data is architecturally separated, auth works with employer/seeker role fork, and the design system components are available for every subsequent screen
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DATA-01, DATA-02, DATA-03, DATA-04, DSGN-01, DSGN-02, DSGN-03, DSGN-04
**Success Criteria** (what must be TRUE):
  1. A visitor can create an account, select Employer or Seeker, verify their email, and be routed to the appropriate dashboard
  2. A logged-in user's session persists across browser refresh and tab close/reopen
  3. A user can reset their forgotten password via an email link and log in with the new password
  4. Every database table has RLS enabled and enforced — seeker contact details (phone, email) are inaccessible without a confirmed placement fee record
  5. All design system components (typography, colour tokens, form controls, responsive breakpoints) render correctly at 320px and above
**Plans**: 4 plans
- [x] 01-01-PLAN.md — Project scaffolding, Tailwind v4 theme, Supabase schema with RLS, skills seed
- [x] 01-02-PLAN.md — Design system component library (10 UI primitives)
- [x] 01-03-PLAN.md — Auth flows (signup with role, login, email verify, password reset)
- [x] 01-04-PLAN.md — Protected routes, role routing, Nav/Sidebar, dashboard shells

### Phase 2: Employer Supply Side
**Goal**: An employer can complete their profile, post a job with listing tier payment, and have their employer verification status displayed — creating the supply of listings that seekers will search
**Depends on**: Phase 1
**Requirements**: EONB-01, EONB-02, EONB-03, EONB-04, EONB-05, EONB-06, EVER-01, EVER-02, EVER-03, EVER-04, JPOS-01, JPOS-02, JPOS-03, JPOS-04, JPOS-05, JPOS-06, JPOS-07
**Success Criteria** (what must be TRUE):
  1. An employer can complete the 8-screen onboarding wizard (farm type, details, culture, accommodation, verification, pricing) and return later to edit their profile
  2. An employer can post a job through the 7-screen wizard and pay the listing fee via Stripe — first listing is free, subsequent listings charge the selected tier (Standard $100 / Featured $150 / Premium $200)
  3. A job listing becomes active after Stripe payment confirmation and expires after 30 days with correct status transitions (draft, active, paused, filled, expired, archived)
  4. Employer verification badges (email auto-verified, phone SMS, NZBN, document upload, farm photo) appear on the employer profile and job listings
  5. A visitor viewing a job detail page sees full listing information and a signup prompt instead of match details
**Plans**: 6 plans
- [x] 02-01-PLAN.md — Database migrations (employer profile columns, employer_verifications, jobs status+benefits, storage buckets), shared UI components (StepIndicator, FileDropzone, SkillsPicker, TierCard, JobCard, VerificationBadge), hooks (useWizard, useVerifications), extended domain types
- [ ] 02-02-PLAN.md — Employer onboarding wizard (8 screens)
- [ ] 02-03-PLAN.md — Job posting wizard (7 screens)
- [ ] 02-04-PLAN.md — Verification system (5-method: email, phone, NZBN, document, farm photo)
- [ ] 02-05-PLAN.md — Stripe listing fee payment flow
- [ ] 02-06-PLAN.md — Job management dashboard (status lifecycle, edit, archive, mark filled)

### Phase 3: Seeker Demand Side
**Goal**: A seeker can complete their profile, search jobs using all NZ agriculture-specific filters, view match scores on results, and submit and track applications through the full pipeline
**Depends on**: Phase 2
**Requirements**: SONB-01, SONB-02, SONB-03, SONB-04, SONB-05, SONB-06, SONB-07, SONB-08, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, SRCH-09, SRCH-10, SRCH-11, SRCH-12, JDET-01, JDET-02, JDET-03, JDET-04, APPL-01, APPL-02, APPL-03, APPL-04, APPL-05, APPL-06
**Success Criteria** (what must be TRUE):
  1. A seeker can complete the 8-step onboarding wizard (farm type preference, experience, skills, life situation, visa, DairyNZ qualifications) and edit their profile afterwards
  2. A logged-in seeker can filter job search results by shed type, accommodation, visa, DairyNZ qualification, herd size, couples welcome, salary range, region, and contract type — with results loading in under 1.5 seconds and filter state preserved in the URL
  3. A logged-in seeker sees a match score per job in search results and a full per-dimension match breakdown (shed type, location, accommodation, skills, salary, visa) on the job detail page
  4. A seeker can apply to a job with an optional cover note, and track their application through all 8 pipeline stages (applied, review, interview, shortlisted, offered, hired, declined, withdrawn)
  5. An employer can view all applicants for a job ranked by match score, expand individual applicant panels, and move applicants through pipeline stages
**Plans**: 7 plans
- [ ] 03-00-PLAN.md — Test infrastructure: vitest config, setup, and stub test files for all Phase 3 verification points
- [ ] 03-01-PLAN.md — Schema migration (seeker onboarding columns, application pipeline enum, seeker_skills proficiency fix, RLS policies, match scoring SQL functions), extended domain types
- [ ] 03-02-PLAN.md — Seeker onboarding wizard (7 steps: farm type, experience, qualifications, skills, life situation, visa, complete)
- [ ] 03-03-PLAN.md — Job search page with FilterSidebar (9 filter types, URL sync, batch match scores) and SearchJobCard
- [ ] 03-04-PLAN.md — Job detail seeker view (MatchBreakdown sidebar, blurred visitor teaser, apply modal with cover note)
- [ ] 03-05-PLAN.md — Seeker My Applications page + employer Applicant Dashboard with pipeline transitions
- [ ] 03-06-PLAN.md — Route wiring, SeekerDashboard rebuild with live data, EmployerDashboard applicant counts, Sidebar nav

### Phase 4: Match Scoring Engine
**Goal**: Match scores are pre-computed, stored, kept fresh via database triggers, and enriched with AI-generated plain-English explanations — making ranked search and the employer applicant dashboard fully functional
**Depends on**: Phase 3
**Requirements**: MTCH-01, MTCH-02, MTCH-03, MTCH-04, MTCH-05, MTCH-06
**Success Criteria** (what must be TRUE):
  1. Every seeker-job pair has a pre-computed match score stored in the database — scores are never calculated at query time
  2. When a seeker updates their profile or an employer changes a job listing, all affected match scores are recalculated within 60 seconds
  3. Each match score includes a correct breakdown: shed type (25pts), location (20pts), accommodation (20pts), skills (20pts), salary (10pts), visa (5pts), couples bonus (+5pts), and recency multiplier
  4. Each match has a 2-3 sentence AI explanation (via Claude API, called from an Edge Function) visible on the job detail page and the employer applicant dashboard — if the Claude API is unavailable, the explanation area degrades gracefully without breaking the page
**Plans**: 4 plans
Plans:
- [ ] 04-00-PLAN.md — Wave 0 test scaffolds: stub test files for scoring math (MTCH-01/02/03) and explanation UI (MTCH-06)
- [ ] 04-01-PLAN.md — Database migration: explanation column, sector-scoped AFTER triggers on seeker_profiles and jobs, backfill, pg_cron nightly batch
- [ ] 04-02-PLAN.md — Edge Function: generate-match-explanation with Claude API, retry logic, graceful degradation
- [ ] 04-03-PLAN.md — Frontend: MatchScore type update, MatchBreakdown AI explanation section, switch 4 pages from RPC to match_scores table reads

### Phase 5: Revenue Protection
**Goal**: The placement fee gate is enforced at the database layer — an employer cannot read seeker contact details until they have acknowledged the placement fee, and follow-up emails fire automatically after shortlisting
**Depends on**: Phase 4
**Requirements**: REVN-01, REVN-02, REVN-03, REVN-04
**Success Criteria** (what must be TRUE):
  1. When an employer moves an applicant to shortlisted, a placement fee acknowledgement modal appears with the fee amount and payment timeline before any contact details are revealed
  2. Seeker contact details (phone, email) remain masked in the UI and inaccessible via direct database query until the employer has acknowledged the placement fee — the gate is enforced at the RLS level, not in UI code
  3. Stripe listing fee payment intents are created and processed with idempotency guards — duplicate Stripe webhook deliveries do not create duplicate fee records or double-activate listings
  4. Placement follow-up emails are sent automatically at Day 7 and Day 14 after shortlisting, via Resend Edge Function
**Plans**: 4 plans
Plans:
- [ ] 05-01-PLAN.md — Migration 011 (follow-up columns, stripe_customer_id, pg_cron), placement fee types + calculatePlacementFee, test scaffolds
- [ ] 05-02-PLAN.md — PlacementFeeModal, acknowledge-placement-fee Edge Function, ApplicantDashboard shortlist intercept, ApplicantPanel contact masking
- [ ] 05-03-PLAN.md — HireConfirmModal, create-placement-invoice Edge Function (Stripe Invoice Net 14), stripe-webhook invoice event handler
- [ ] 05-04-PLAN.md — send-followup-emails Edge Function (Day 7/14 employer+seeker emails via Resend)

### Phase 6: Landing Page and Launch
**Goal**: The public landing page is live with real platform data, all flows pass mobile QA at 320px, accessibility meets WCAG 2.1 AA, and the application is deployed to production on Vercel
**Depends on**: Phase 5
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06
**Success Criteria** (what must be TRUE):
  1. A first-time visitor sees the landing page with hero, live job/worker/match counters, how-it-works section with employer/seeker toggle, featured listings, testimonials, and footer — and can navigate to either the employer or seeker signup flow from the dual CTA
  2. Live counters (jobs posted, workers registered, matches made) reflect real platform data and animate on scroll into view
  3. Every user flow (auth, employer onboarding, job posting, seeker onboarding, job search, application, shortlist, contact release) works correctly on a 320px-wide mobile screen — filter sidebar renders as a drawer on mobile
  4. The deployed production application passes Lighthouse performance targets (search results under 1.5 seconds, page load under 2 seconds on 4G) and meets WCAG 2.1 AA accessibility requirements
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-03-15 |
| 2. Employer Supply Side | 6/6 | Complete   | 2026-03-15 |
| 3. Seeker Demand Side | 7/7 | Complete   | 2026-03-16 |
| 4. Match Scoring Engine | 4/4 | Complete   | 2026-03-16 |
| 5. Revenue Protection | 0/4 | Not started | - |
| 6. Landing Page and Launch | 0/TBD | Not started | - |
