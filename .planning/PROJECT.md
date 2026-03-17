# TopFarms

## What This Is

TopFarms is a New Zealand agricultural job marketplace connecting farm employers with skilled workers. It replaces informal hiring via Facebook groups with a structured platform featuring agriculture-specific filters (shed type, accommodation, DairyNZ qualifications), AI-powered match scoring, and verified employer profiles — purpose-built for the NZ ag sector.

## Core Value

Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation sub-scoring, DairyNZ qualifications, and herd size experience — delivering match quality that justifies switching from Facebook groups.

## Requirements

### Validated

- ✓ Authentication with email/password, role selection, session persistence, password reset — v1.0
- ✓ Supabase PostgreSQL schema (14 tables) with RLS on all tables — v1.0
- ✓ Contact details masked at RLS level until placement fee acknowledged — v1.0
- ✓ Skills master table seeded with ~40 dairy + sheep/beef skills — v1.0
- ✓ Design system: Fraunces + DM Sans typography, soil/moss/fern/meadow/hay/cream palette, component library — v1.0
- ✓ Employer 8-screen onboarding wizard with editable profile — v1.0
- ✓ 5-tier employer verification (email, phone, NZBN, document, farm photo) — v1.0
- ✓ 7-screen job posting wizard with Stripe listing fees (first free, $100/$150/$200) — v1.0
- ✓ Job status lifecycle (draft, active, paused, filled, expired, archived) with 30-day expiry — v1.0
- ✓ Seeker 8-step onboarding wizard with editable profile — v1.0
- ✓ Job search with 9 agriculture-specific filters, URL-synced state, <1.5s load — v1.0
- ✓ Job detail page with match breakdown (seeker) and signup prompt (visitor) — v1.0
- ✓ Application pipeline with 8 stages, seeker tracking, employer management — v1.0
- ✓ 100-point match scoring: shed type 25, location 20, accommodation 20, skills 20, salary 10, visa 5, couples bonus, recency — v1.0
- ✓ Pre-computed match scores with database triggers (<60s recalc SLA) — v1.0
- ✓ AI match explanations via Claude API Edge Function — v1.0
- ✓ Placement fee gate at RLS level with acknowledgement modal — v1.0
- ✓ Stripe listing fee with idempotency guards — v1.0
- ✓ Stripe Invoice Net 14 for placement fees — v1.0
- ✓ Automated follow-up emails (Day 7/14) via Resend — v1.0
- ✓ Landing page: hero, live counters, how-it-works, featured listings, testimonials, footer — v1.0
- ✓ Mobile-responsive design (320px minimum) — v1.0

### Active

(None — define with `/gsd:new-milestone`)

### Out of Scope

- Data scraping pipeline (Apify/Claude) — separate build track and document
- Messaging / Expressions of Interest — Growth Phase, wireframe exists but do not build
- Horticulture and viticulture sectors — future milestone
- Social media login (Google/Facebook OAuth) — email/password only for MVP
- Mobile native apps (iOS/Android) — mobile web only
- Partner job matching (separate role for seeker's partner)
- Video interviews or calendar integration
- Multi-user employer accounts / team roles
- API for third-party developers
- International markets
- Training providers / courses module
- Real-time chat — contact release after shortlist handles core use case

## Context

Shipped v1.0 MVP with 17,234 LOC TypeScript across 214 files in 3 days.
Tech stack: React 19, TypeScript, Vite 6, Tailwind v4, Supabase, Claude API, Stripe, Resend, Vercel.

- NZ agricultural sector is small and reputation-driven — social enforcement mechanisms inform platform design
- 86% of NZ ag Facebook job posts are dairy — primary target sector
- 76% of NZ dairy seekers require on-farm accommodation — major decision factor
- Shed type (rotary vs herringbone) is the primary skill differentiator in dairy
- 28% of seekers are couples — couples matching is a significant filter
- All 8 MVP screens are fully wireframed as interactive HTML files in `TopFarms_Launch_Pack/wireframes/`

## Constraints

- **Tech stack**: React + TypeScript + Vite, Tailwind CSS, Supabase, Claude API, Stripe, Vercel — locked, no deviations
- **Design system**: Fraunces + DM Sans fonts, specific colour palette (soil/moss/fern/meadow/hay/cream), component standards — non-negotiable
- **MVP sectors**: Dairy cattle + sheep & beef ONLY
- **Auth**: Email/password only for MVP (no OAuth)
- **Performance**: Search results <1.5s, page load <2s on 4G, match recalculation <60s
- **Security**: RLS on ALL Supabase tables, contact details masked until placement fee acknowledged
- **Accessibility**: WCAG 2.1 AA target

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pre-computed match scores | Instant search results without real-time computation | ✓ Shipped v1.0 — triggers + pg_cron maintain freshness |
| Flat placement fee tiers ($200/$400/$800) | Salary-primary with title keyword bump — simple, transparent | ✓ Shipped v1.0 |
| Manual NZBN verification for MVP | API integration deferred, manual + admin flag sufficient | ✓ Shipped v1.0 |
| Hardcoded market rate salary data | Update quarterly from DairyNZ publications, avoid API dependency | ✓ Shipped v1.0 |
| Manual skills curation (~40 skills) | Better quality than automated import for MVP | ✓ Shipped v1.0 |
| Resend for transactional email | Good free tier, React Email templates, easy Edge Function integration | ✓ Shipped v1.0 |
| Contact masking at RLS level | Data-layer protection, not CSS — cannot be extracted from page source | ✓ Shipped v1.0 |
| Stripe Invoice Net 14 for placement fees | Deferred payment after hire, auto-collection, professional invoice PDF | ✓ Shipped v1.0 |
| Resend via plain fetch() not SDK | Avoids Deno SDK compatibility concerns, consistent with Edge Function patterns | ✓ Shipped v1.0 |
| Tailwind v4 CSS-first (@theme directive) | No tailwind.config.js, cleaner DX | ✓ Shipped v1.0 |
| seeker_contacts as separate table | Contact masking enforced at schema level, not view layer | ✓ Shipped v1.0 |
| Soft contact detection in messaging | Nudge banners not hard blocks — preserves goodwill (Growth Phase) | — Pending |

---
*Last updated: 2026-03-17 after v1.0 milestone*
