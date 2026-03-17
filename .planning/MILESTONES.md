# Milestones

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

