# TopFarms — Product Requirements Document

**Version:** 2.0 (post v1.1 SPEC Compliance)
**Last Updated:** 2026-04-02
**Status:** v1.0 MVP + v1.1 SPEC Compliance SHIPPED | v2.0 not yet defined

---

## 1. Product Overview

TopFarms is a New Zealand agricultural job marketplace connecting farm employers with skilled workers. It replaces informal hiring via Facebook groups with a structured platform featuring agriculture-specific filters (shed type, accommodation, DairyNZ qualifications), AI-powered match scoring, verified employer profiles, and full SPEC v3.0 compliant UI — purpose-built for the NZ ag sector.

### Core Value Proposition

Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation sub-scoring, DairyNZ qualifications, and herd size experience — delivering match quality that justifies switching from Facebook groups.

### Market Context

- NZ agricultural sector is small and reputation-driven — social enforcement mechanisms inform platform design
- 86% of NZ ag Facebook job posts are dairy — primary target sector
- 76% of NZ dairy seekers require on-farm accommodation — major decision factor
- Shed type (rotary vs herringbone) is the primary skill differentiator in dairy
- 28% of seekers are couples — couples matching is a significant filter

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4 (CSS-first, @theme directive, no tailwind.config.js) |
| Animation | motion library (hero stagger animations) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS) |
| AI | Claude API via Supabase Edge Functions |
| Payments | Stripe (PaymentIntent for listing fees, Invoice Net 14 for placement fees) |
| Email | Resend via plain fetch() in Edge Functions (not SDK) |
| Hosting | Vercel |
| Design System | Fraunces (display) + DM Sans (body), soil/moss/fern/meadow/hay/cream palette |

---

## 3. Design System

### Typography
- **Display:** Fraunces
- **Body:** DM Sans

### Colour Palette
| Token | Hex | Usage |
|-------|-----|-------|
| soil | #2C1A0E | Dark backgrounds, headers |
| moss | #2D5016 | Primary actions, active states |
| fern | #4A7C2F | Secondary accent |
| meadow | #7AAF3F | Success states, timeline dots |
| hay | #D4A843 | Warnings, highlights |
| cream | #F7F2E8 | Page backgrounds |

### UI Component Library (39 components)
**Primitives (v1.1):** ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, SearchHero, LivePreviewSidebar

**Core UI:** Button, Card, Checkbox, Input, Select, Toggle, Tag, InfoBox, ProgressBar, FileDropzone, SkillsPicker, StepIndicator, TierCard, VerificationBadge, MatchBreakdown, MatchCircle

**Page-Specific:** JobCard, SearchJobCard, FilterSidebar, ActiveFilterPills, ExpandableCardTabs, ApplicantPanel, ApplicantDashboardSidebar, AICandidateSummary, BulkActionsBar, ApplicationCard, StatusBanner, FarmResponseIndicator, MyApplicationsSidebar, JobDetailSidebar, MapPlaceholder

**Layout:** Nav, Sidebar, DashboardLayout, AuthLayout, ProtectedRoute

---

## 4. Database Architecture

### Supabase PostgreSQL — 14+ tables with RLS on ALL tables

**Core Tables:**
- `users` — auth profiles with role (employer/seeker)
- `employer_profiles` — farm details, culture, accommodation, verification status
- `seeker_profiles` — experience, preferences, visa, DairyNZ qualifications
- `seeker_contacts` — phone/email in separate table for RLS-level contact masking
- `jobs` — listings with status lifecycle (draft, active, paused, filled, expired, archived)
- `applications` — 8-stage pipeline (applied, review, interview, shortlisted, offered, hired, declined, withdrawn)
- `match_scores` — pre-computed seeker-job match scores (never computed client-side)
- `skills` — master skills table (~40 dairy + sheep/beef skills)
- `seeker_skills` — seeker skill self-assessments with proficiency levels
- `placement_fees` — placement fee acknowledgement records
- `employer_verifications` — 5-tier verification records
- `verification_tiers` — verification level definitions

**16 Migrations (001-016):**
- 001-011: v1.0 MVP schema
- 012: Platform stats RPC
- 013: Phase 8 wizard fields (v1.1)
- 014: ownership_type text→text[] migration
- 015: Phase 9 schema additions
- 016: Phase 11 backend features (seeker-documents bucket, match pool RPC)

**Key RLS Policies:**
- Contact details (phone, email) masked at RLS level until placement fee acknowledged — data-layer protection, not CSS
- Seeker documents stored in private `seeker-documents` bucket with dedicated RLS
- Employer photos in separate storage bucket

**Database Functions:**
- `estimate_match_pool` — RPC with DEFAULT NULL params, callable with any filter combination
- `platform_stats` — live counters for landing page
- Match score recalculation triggers on seeker_profiles and jobs tables (<60s SLA)
- pg_cron nightly batch for match score maintenance

---

## 5. Supabase Edge Functions (7 functions)

| Function | Purpose |
|----------|---------|
| `create-payment-intent` | Stripe PaymentIntent for listing fees (first free, $100/$150/$200) |
| `stripe-webhook` | Webhook handler with idempotency guards |
| `acknowledge-placement-fee` | Records placement fee acknowledgement, unlocks contact details |
| `create-placement-invoice` | Stripe Invoice Net 14 for placement fees ($200/$400/$800 tiers) |
| `generate-match-explanation` | Claude API — 2-3 sentence AI match insights per seeker-job pair |
| `generate-candidate-summary` | Claude API — AI candidate summary, cached in applications.ai_summary |
| `send-followup-emails` | Resend — Day 7/14 automated follow-up after shortlisting |

---

## 6. Shipped Features (v1.0 + v1.1)

### 6.1 Authentication
- [x] Email/password signup with role selection (Employer or Seeker)
- [x] Email verification after signup
- [x] Password reset via email link
- [x] Session persistence across browser refresh
- [x] Role-appropriate dashboard routing after login

### 6.2 Employer Onboarding (8 screens)
- [x] Farm type selection — 6 farm types in 2x3 chip grid + 4 ownership structure chips
- [x] Farm details — herd size, shed type (5 ChipSelector options: Rotary, Herringbone, AMS, Swing-Over, Tiestall), milking system, calving system, region, nearest town, distance-from-town with >30km hay warning, property size
- [x] Culture — career development chip grid, hiring frequency, couples toggle with partner sub-select, about farm textarea (175/400 char limits)
- [x] Accommodation — blue info box ("76% of seekers need accommodation"), 8+ extras chip grid, vehicle toggle with chips, broadband toggle, salary range min/max NZD with market rate comparison hint
- [x] Verification start
- [x] Pricing overview — annual/monthly billing toggle with "Save 20%" messaging
- [x] Completion — two-col layout with success checklist, 3 CTAs, AI tip, live profile preview
- [x] Profile persisted and editable after completion
- [x] v1.0 boolean→string[] chip migration with backward compat

### 6.3 Employer Verification (5 tiers)
- [x] Email (auto-verified)
- [x] Phone SMS
- [x] NZBN (manual admin flag, no API)
- [x] Document upload via Supabase Storage
- [x] Farm photo upload
- [x] Verification badges on profile and job listings

### 6.4 Job Posting Wizard (7 screens + success)
- [x] Step 1 — two-column layout (soil left panel with stats, cream right form): title, contract type, start date, duration
- [x] Step 2 — breed, milking frequency, calving system, farm area, nearest town, distance with warning, shed type ChipSelector (5 options)
- [x] Step 3 — minimum dairy experience, seniority level, qualifications section, visa chip grid, skills with proficiency from master table
- [x] Step 4 — salary range with market rate comparison, pay frequency, on-call allowance, hours range, weekend roster, accommodation, benefits
- [x] Step 5 — job description textarea (175/400 char limits)
- [x] Steps 2-5 — LivePreviewSidebar with completeness meter, mini card preview, match pool estimate (live RPC, debounced 500ms)
- [x] Listing fee via Stripe: first listing free, Standard $100, Featured $150, Premium $200
- [x] Step 8 success — stats grid (avg days to first applicant, seekers in match pool, actively looking)
- [x] Job status lifecycle: draft → active → paused/filled/expired → archived (30-day expiry)

### 6.5 Seeker Onboarding (8 steps)
- [x] Step 1 — all 6 sector chips (Dairy, Sheep & Beef, Cropping, Deer, Mixed, Other)
- [x] Step 2 — experience: years, herd sizes worked with, shed types experienced
- [x] Step 3 — document upload (CV/certificates/references to private `seeker-documents` bucket), NZ driver's licence chips, certification chips (ATV, tractor, 4WD, first aid), DairyNZ qualification level
- [x] Step 4 — skills self-assessment with proficiency levels from master table
- [x] Step 5 — minimum salary input, availability date, notice period, housing sub-options chip grid (Single, Couple working, Couple not working, Family, Working dogs, Pets), preferred regions multi-select chip grid (8 NZ regions), location preferences
- [x] Step 6 — visa and work rights status
- [x] Step 7 — completion: success screen with profile checklist, match pool preview, top 3 matched jobs with scores (polled within 30s, "calculating" fallback)
- [x] Profile persisted and editable after completion

### 6.6 Job Search
- [x] SearchHero — gradient background, headline, search bar + region select + quick-filter pills
- [x] Filter sidebar (280px desktop, drawer on mobile) with 9+ filter types:
  - Shed type (rotary, herringbone, other)
  - Accommodation (house, cottage, pet-friendly, couples, family)
  - Visa requirements
  - DairyNZ qualification level
  - Herd size range
  - Couples welcome
  - Salary range (dual-handle slider)
  - Region (NZ regions)
  - Contract type
  - Role type (8 options with counts)
  - Extras toggles (mentorship, vehicle, DairyNZ pathway, posted <7 days)
- [x] Active filter pills above results (moss tint bg, x remove)
- [x] Expandable card tabs on job cards (Details / My Match / Apply)
- [x] Sort options: relevance, salary high-low, location nearest, date
- [x] Numbered pagination (replaces load-more)
- [x] Match score per job (when logged in as seeker)
- [x] URL-synced filter state
- [x] <1.5s search result load time

### 6.7 Job Detail Page
- [x] Breadcrumb bar (44px, white bg) with Save/Share buttons
- [x] Stats strip (4-col: Applications, Views, Salary, Posted)
- [x] Full listing information with day-to-day bulleted list (meadow dot bullets)
- [x] Skills section — 2-column grid with legend row (Required/Preferred/Bonus badges)
- [x] Application timeline (vertical, meadow dots + connecting lines)
- [x] Location section with map placeholder (160px, mist bg) and distance badge
- [x] Sidebar: similar jobs card (3 entries), quick facts list, save/share buttons, deadline notice (hay-lt), farm profile card (soil header, 3-stat grid, tags, rating, view link)
- [x] Seeker view: match score breakdown by category (shed type, location, accommodation, skills, salary, visa)
- [x] Visitor view: signup prompt instead of match details
- [x] Apply button with optional cover note

### 6.8 Match Scoring Engine
- [x] 100-point scoring: shed type 25pts, location 20pts, accommodation 20pts, skills 20pts, salary 10pts, visa 5pts
- [x] Couples bonus (+5 points when both parties seek/offer couples accommodation)
- [x] Recency multiplier applied to scores
- [x] Pre-computed scores in match_scores table (never client-side)
- [x] Database triggers — recalculate affected scores when seeker profile or job changes (<60s SLA)
- [x] pg_cron nightly batch maintenance
- [x] AI match explanations via Claude API Edge Function (2-3 sentences per match)
- [x] Graceful degradation if Claude API unavailable

### 6.9 Application Pipeline
- [x] Seeker can apply with optional cover note
- [x] 8 pipeline stages: applied, review, interview, shortlisted, offered, hired, declined, withdrawn
- [x] Seeker can withdraw application
- [x] **Employer Applicant Dashboard:**
  - 260px sidebar with farm header, navigation, listing selector, quick stats
  - Filter toolbar with search input, filter chips (All/New/Reviewed/Shortlisted/Declined), sort, view toggle
  - Expandable 4-tab panels per applicant (CV, Match breakdown, Interview, Notes)
  - AI candidate summary box per applicant (purple, cached in DB)
  - Bulk actions bar (Shortlist selected, Send message, Export)
  - Candidates ranked by match score
- [x] **My Applications (Seeker):**
  - Status variant banners: shortlisted (hay-lt), interview (green with Accept/Decline), offer (green + hay CTA), declined (60% opacity + red-lt)
  - Farm response indicator ("Viewed by employer X hours ago" or "Not yet viewed")
  - Sidebar with application status summary, filter tabs (All/Active/Shortlisted/Closed), saved jobs, profile strength nudge

### 6.10 Placement Fee & Revenue
- [x] Placement fee acknowledgement modal on employer shortlist action — shows fee amount and payment timeline
- [x] Contact details (phone, email) masked via RLS until placement fee acknowledged
- [x] Placement fee tiers: $200/$400/$800 (salary-primary with title keyword bump)
- [x] Stripe Invoice Net 14 for placement fees with auto-collection and professional invoice PDF
- [x] Stripe listing fee with idempotency guards — duplicate webhooks don't create duplicate records
- [x] Automated follow-up emails: Day 7 + Day 14 after shortlisting (via Resend Edge Function)

### 6.11 Landing Page
- [x] Hero — SPEC copy with staggered fadeUp animation (motion library), each line animates in sequence
- [x] Live counters — jobs posted, workers registered, matches made, scroll-triggered animation, animated pulsing green "Live" dot
- [x] How-it-works — employer/seeker toggle
- [x] AI matching section — mock browser window + 4 feature bullet points
- [x] Farm types strip — 5 sector cards with listing counts
- [x] Featured job listings — with match score circles on cards
- [x] Employer CTA band — mini dashboard preview + "Post your first job" CTA + 4-point checklist
- [x] Testimonials section — with 4 connected stat blocks
- [x] Trusted-by strip — farm brand name placeholders
- [x] Final CTA section — centered headline + dual buttons
- [x] Footer — navigation and legal links
- [x] CTA fork card border radius 14px, button text matches SPEC

### 6.12 Cross-Cutting
- [x] Mobile-responsive design (320px minimum breakpoint)
- [x] Page load <2s on 4G
- [x] WCAG 2.1 AA target
- [x] Protected routes with role-based access
- [x] Dashboard layouts for employer and seeker

---

## 7. Codebase Structure

```
src/
  App.tsx                          # Router and app shell
  main.tsx                         # Entry point
  index.css                        # Tailwind v4 @theme directives
  components/
    ui/           (39 components)  # Full component library
    layout/       (5 components)   # Nav, Sidebar, DashboardLayout, AuthLayout, ProtectedRoute
    landing/      (11 components)  # All landing page sections
    stripe/                        # Stripe payment components
  hooks/          (6 hooks)        # useAuth, useWizard, useVerifications, useSavedJobs, useCountUp, useInView
  pages/
    auth/                          # Login, Signup, PasswordReset, VerifyEmail
    dashboard/                     # EmployerDashboard, SeekerDashboard
    onboarding/                    # EmployerOnboarding (8 steps), SeekerOnboarding (8 steps)
    jobs/                          # PostJob wizard, JobSearch, JobDetail, MyApplications, ApplicantDashboard
    verification/                  # Employer verification flow
    Home.tsx                       # Landing page
  types/
    domain.ts                      # All TypeScript domain types
  lib/
    constants.ts                   # App constants, skills data
    stripe.ts                      # Stripe client config
    supabase.ts                    # Supabase client
    utils.ts                       # Shared utilities
    wizardUtils.ts                 # Boolean→string[] chip migration helpers

supabase/
  migrations/    (16 files)        # 001-016 SQL migrations
  functions/     (7 functions)     # Edge Functions (see Section 5)
```

**Codebase size:** ~116 TypeScript/TSX files, ~20,000 LOC

---

## 8. Known Tech Debt

| Item | Severity | Context |
|------|----------|---------|
| `hasApplied` hardcoded to `false` in JobSearch | Medium | Batch application status check deferred — cards don't show "Applied" badge |
| Interview Accept is toast-only | Low | No DB write — `interview_accepted` is not a valid ApplicationStatus enum value |
| Document viewing via signed URL | Medium | Upload works, but viewing stored documents requires `createSignedUrl` implementation |
| `onUploadComplete` stub in SeekerStep3 | Low | `() => {}` placeholder, required by FileDropzone prop contract |
| ADSH-05 Send message bulk action | Low | Button rendered but messaging deferred to v2 |
| Resend SPF/DKIM DNS configuration | High | Required for production email deliverability |

---

## 9. Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Pre-computed match scores | Instant search results without real-time computation |
| Contact masking at RLS level | Data-layer protection — cannot be extracted from page source |
| seeker_contacts as separate table | Contact masking enforced at schema level, not view layer |
| Flat placement fee tiers ($200/$400/$800) | Salary-primary with title keyword bump — simple, transparent |
| Stripe Invoice Net 14 for placement fees | Deferred payment after hire, auto-collection |
| Manual NZBN verification for MVP | API integration deferred, manual + admin flag sufficient |
| Hardcoded market rate salary data | Update quarterly from DairyNZ publications, avoid API dependency |
| Manual skills curation (~40 skills) | Better quality than automated import for MVP |
| Resend via plain fetch() not SDK | Avoids Deno SDK compatibility concerns in Edge Functions |
| Tailwind v4 CSS-first (@theme directive) | No tailwind.config.js, cleaner DX |
| ChipSelector string[] value shape | Uniform interface for single/multi select, avoids boolean column proliferation |
| Private seeker-documents bucket | Separate from employer photos, dedicated RLS |
| estimate_match_pool RPC with DEFAULT NULL params | Callable with any filter combination, debounced 500ms in UI |
| AI candidate summary cache-first | Check applications.ai_summary before invoking Claude API |
| motion library for animations | Lightweight, React-native integration |

---

## 10. Future Scope (Not Yet Built)

### v2 Candidates (requirements defined, not planned)
- In-app messaging with listing-anchored threads and soft contact detection
- Seeker profile management shell (Overview, Experience, Documents, CV Builder)
- Employer public farm profile page
- Interview scheduling with calendar/time slots
- Save search + email alerts
- Expressions of Interest for seekers
- Employer analytics dashboard (views, applications, conversion)

### Out of Scope
- Data scraping pipeline (Apify/Claude) — separate build track
- Social login (OAuth) — email/password only
- Mobile native apps — mobile web only
- Partner job matching (separate role)
- Video interviews / calendar integration
- Multi-user employer accounts / team roles
- Third-party API
- International markets
- Training providers / courses module
- Real-time chat
- Horticulture and viticulture sectors — future milestone

---

## 11. Milestones Shipped

### v1.0 MVP (Shipped 2026-03-17)
- 6 phases, 27 plans, 76 requirements
- Phases: Foundation → Employer Supply → Seeker Demand → Match Scoring → Revenue Protection → Landing Page

### v1.1 SPEC Compliance (Shipped 2026-03-23)
- 5 phases, 19 plans, 60 requirements
- Phases: UI Primitives → Wizard Field Extensions → Page-Level Integrations → Landing Page → Backend-Dependent Features
- 19,931 LOC TypeScript across 58 modified files in 5 days
- Milestone audit: 60/60 requirements satisfied, all 5 E2E flows passing

---

## 12. Constraints

- **Tech stack locked:** React + TypeScript + Vite, Tailwind CSS, Supabase, Claude API, Stripe, Vercel
- **Design system non-negotiable:** Fraunces + DM Sans, soil/moss/fern/meadow/hay/cream palette
- **MVP sectors:** Dairy cattle + sheep & beef ONLY
- **Auth:** Email/password only (no OAuth)
- **Performance:** Search <1.5s, page load <2s on 4G, match recalc <60s
- **Security:** RLS on ALL tables, contact masking at database layer
- **Accessibility:** WCAG 2.1 AA target
