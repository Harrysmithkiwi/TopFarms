# Milestones

## v1.1 SPEC Compliance (Shipped: 2026-03-23)

**Phases completed:** 5 phases, 19 plans
**Timeline:** 5 days (2026-03-19 → 2026-03-23)
**Lines changed:** +5,711 / -1,332 across 58 files
**Total codebase:** 19,931 LOC TypeScript
**Requirements:** 60/60 SPEC v3.0 requirements satisfied

**Delivered:** Full SPEC v3.0 compliance — every screen matches wireframe specification with missing fields, UI sections, layout corrections, and component upgrades.

**Key accomplishments:**
1. 9 shared UI primitives (ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, SearchHero, LivePreviewSidebar) with test coverage
2. ~30 missing wizard fields across employer, job posting, and seeker onboarding with DB migrations and backward-compatible chip upgrades from booleans to string arrays
3. Full page-level integrations: job search with filters/pagination/expandable cards, job detail with stats/timeline/sidebar, applicant dashboard with AI candidate summaries and bulk actions, My Applications with status variant banners
4. Landing page SPEC compliance: hero stagger animation, live counter pulse dot, AI matching section, farm types strip, employer CTA band, social proof stat blocks, trusted-by strip, final CTA section
5. Backend features: live match pool estimate RPC for LivePreviewSidebar, private seeker-documents Storage bucket with document upload, seeker completion screen with matched-jobs polling
6. 3 broken CTA routes found and fixed during milestone audit (d250e5f)

---

## v1.0 MVP (Shipped: 2026-03-17)

**Phases completed:** 6 phases, 27 plans
**Timeline:** 3 days (2026-03-15 → 2026-03-17)
**Lines of code:** 17,234 TypeScript
**Git range:** feat(01-01) → feat(06-02)

**Delivered:** Full-stack NZ agricultural job marketplace with agriculture-specific matching, Stripe payments, and AI-powered explanations.

**Key accomplishments:**
1. Full-stack foundation: 14-table PostgreSQL schema with RLS on every table, contact masking architecture, auth with role routing, design system component library
2. Employer supply side: 8-screen onboarding, 7-screen job posting wizard, 5-tier verification, Stripe listing fees (first free, then $100/$150/$200)
3. Seeker demand side: 8-step onboarding, job search with 9 agriculture-specific filters, 8-stage application pipeline with employer applicant dashboard
4. Match scoring engine: pre-computed 100-point scores with database triggers, 7 scoring dimensions, AI explanations via Claude API Edge Function
5. Revenue protection: placement fee gate enforced at RLS level, Stripe Invoice Net 14, automated Day 7/14 follow-up emails via Resend
6. Landing page: hero, live counters, how-it-works, featured listings, testimonials, Vercel deployment config

---

