# TopFarms

## What This Is

TopFarms is a New Zealand agricultural job marketplace connecting farm employers with skilled workers. It replaces informal hiring via Facebook groups with a structured platform featuring agriculture-specific filters (shed type, accommodation, DairyNZ qualifications), AI-powered match scoring, verified employer profiles, and full SPEC v3.0 compliant UI — purpose-built for the NZ ag sector.

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
- ✓ 9 UI primitives (ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, SearchHero, LivePreviewSidebar) — v1.1
- ✓ Full wizard field compliance: employer onboarding, post job, seeker onboarding match SPEC v3.0 field sets — v1.1
- ✓ Job search: SearchHero, role type/extras/accommodation filters, expandable card tabs, active filter pills, pagination — v1.1
- ✓ Job detail: breadcrumb bar, stats strip, application timeline, similar jobs sidebar, farm profile card, location map placeholder — v1.1
- ✓ Applicant dashboard: 260px sidebar, filter toolbar, 4-tab expandable panels, AI candidate summaries, bulk actions bar — v1.1
- ✓ My Applications: status variant banners (shortlisted/interview/offer/declined), farm response indicator, sidebar with filter tabs — v1.1
- ✓ Landing page SPEC sections: hero animation, live pulse dot, AI matching, farm types strip, employer CTA band, social proof stats, trusted-by, final CTA — v1.1
- ✓ Seeker document upload to private Storage bucket with RLS — v1.1
- ✓ LivePreviewSidebar with live match pool estimate via RPC — v1.1
- ✓ Seeker completion screen with matched-jobs polling — v1.1

### Active

- ✓ Google OAuth signup/login — Phase 12
- ✓ Facebook OAuth signup/login — Phase 12
- ✓ OAuth role selection for new users — Phase 12
- [ ] Resend SPF/DKIM DNS configuration for production email deliverability
- [ ] hasApplied batch check in JobSearch (currently hardcoded false)
- [ ] Document viewing via signed URLs (upload works, viewing doesn't)
- [ ] Auto-ghosting prevention email when employer marks job filled
- [ ] Saved search (seeker saves and reloads filter criteria)

## Current Milestone: v2.1 Match + Train + Retain (ag-broad)

**Goal:** Begin delivering the "train + retain" brand pillars by cleaning up the skills taxonomy for agriculture-broad matching and standing up admin analytics — the foundation for skills-gap, training directory, and credential tracking. **Compromise scope: Phase 23 only proceeds now; Phases 24-26 are gated behind real ag-employer liquidity.**

**Brand positioning:** "TopFarms — NZ's agricultural job marketplace, expanding to primary industries over time."

**Phase 23 (in scope now):**
- Consolidate ~40 dairy-heavy skills → ~24 broad ag competencies across 6 categories (livestock, cropping & agronomy, machinery, farm operations, management, cross-cutting), with migration mapping for existing data
- Redesign `skills.sector` CHECK constraint to support ag-broad categories
- Relocate DairyNZ qualification levels out of the competency taxonomy (held for Phase 26 credential tracking)
- Admin analytics scaffolding (skill-coverage view + counters for future phases)

**Gated behind "real ag employers posting" (Phases 24-26):**
- Phase 24 — Skills-gap analysis (match → train bridge)
- Phase 25 — Training directory + funding navigation
- Phase 26 — Credential / expiry tracking (retain pillar)

Full scope, taxonomy detail, migration plan, and gate criteria: `.planning/v2.1-MILESTONE-SCOPING.md`.

**Coexistence note:** v2.0 Launch Readiness is functionally complete; its milestone close is gated only on PEND-01 (Stripe live-mode swap, an external operation). v2.0 is NOT yet archived — PEND-01 + sales run in the hard-stop window after Phase 23. v2.1 Phase 23 is independent foundational engineering.

### Out of Scope

- Data scraping pipeline (Apify/Claude) — separate build track and document
- Messaging / Expressions of Interest — Growth Phase, wireframe exists but do not build
- **Training as an acquired third marketplace side** (provider self-service portal, provider acquisition funnel, bookings/payments/commission) — NZ ag training is finite + institutional + largely subsidised; v2.1 treats training as admin-curated content, not a marketplace side. Revisit monetised provider side only after liquidity (see scoping doc).
- Horticulture, viticulture, apiculture, aquaculture, forestry — **future verticals** (deliberate per-vertical sequencing after ag liquidity: v3.0 horticulture, then viticulture, etc.), NOT a permanent exclusion
- Social media login (Google/Facebook OAuth) — shipped Phase 12
- Mobile native apps (iOS/Android) — mobile web only
- Partner job matching (separate role for seeker's partner)
- Video interviews or calendar integration
- Multi-user employer accounts / team roles
- API for third-party developers
- International markets
- Real-time chat — contact release after shortlist handles core use case

## Context

Shipped v1.0 MVP + v1.1 SPEC Compliance with ~20k LOC TypeScript across 116 files.
Live authority is `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md`. (The earlier `MILESTONE_LAUNCH.md` launch guide was superseded and archived 2026-06-20 → `_archive/2026-06-20/MILESTONE_LAUNCH.md`; canonical summaries live in `docs/_canonical/`.)
Tech stack: React 19, TypeScript, Vite 6, Tailwind v4, Supabase, Claude API, Stripe, Resend, Vercel.
Added: motion library for landing page animations.

- NZ agricultural sector is small and reputation-driven — social enforcement mechanisms inform platform design
- 86% of NZ ag Facebook job posts are dairy — primary target sector
- 76% of NZ dairy seekers require on-farm accommodation — major decision factor
- Shed type (rotary vs herringbone) is the primary skill differentiator in dairy
- 28% of seekers are couples — couples matching is a significant filter
- All 8 MVP screens were originally wireframed as interactive HTML files (now superseded by the shipped `src/` UI; archived 2026-06-20 → `_archive/2026-06-20/TopFarms_Launch_Pack/wireframes/`)
- v1.1 tech debt: hasApplied hardcoded to false in JobSearch, interview Accept is toast-only (no DB write), document viewing via signed URL not yet implemented

## Constraints

- **Tech stack**: React + TypeScript + Vite, Tailwind CSS, Supabase, Claude API, Stripe, Vercel — locked, no deviations
- **Design system**: Fraunces + DM Sans fonts, specific colour palette (soil/moss/fern/meadow/hay/cream), component standards — non-negotiable
- **Sectors (v2.1)**: agriculture-broad — livestock (dairy, beef, sheep, goats, pigs, poultry), cropping (arable, grain, vegetable), farm management, agronomy, ag mechanics. Horticulture/viticulture/apiculture/aquaculture/forestry are future verticals (v3.0+). *(Was "Dairy cattle + sheep & beef ONLY" through v2.0.)*
- **Auth**: Email/password + Google/Facebook OAuth with role selection
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
| Boolean→string[] chip migration | booleanColumnsToChipArray() for backward compat, cleaner data model | ✓ Shipped v1.1 |
| ChipSelector string[] value shape | Uniform interface for single/multi select, avoids boolean column proliferation | ✓ Shipped v1.1 |
| Private seeker-documents bucket | Separate from employer photos, dedicated RLS, document privacy | ✓ Shipped v1.1 |
| estimate_match_pool RPC with DEFAULT NULL params | Callable with any filter combination, debounced 500ms in UI | ✓ Shipped v1.1 |
| AI candidate summary cache-first | Check applications.ai_summary before invoking Anthropic, prevents redundant calls | ✓ Shipped v1.1 |
| motion library for animations | Lightweight, React-native integration, stagger variants for hero | ✓ Shipped v1.1 |
| OAuth redirectTo → /auth/select-role | Both new and returning OAuth users hit role selection; returning users auto-redirect to dashboard | ✓ Shipped v2.0 |
| SelectRole as public route (self-guarded) | Session+null-role users would be rejected by ProtectedRoute; SelectRole handles own auth check | ✓ Shipped v2.0 |
| Facebook OAuth requires explicit email scope | Google includes email via OpenID by default; Facebook needs scopes: 'email' | ✓ Shipped v2.0 |
| Training as content layer, not 3rd marketplace side (v2.1) | NZ ag training is finite + institutional + largely subsidised; commission/bookings model isn't real yet — curate as admin content | — Pending |
| v2.1 compromise split: Phase 23 now, 24-26 sales-gated | Taxonomy + analytics is foundational regardless; 24-26 need real liquidity to be informed builds | — Pending |
| Sector expansion as per-vertical roadmap (ag-broad → horticulture v3.0 → …) | Prove the match+train+retain model in ag first, then replicate per vertical | — Pending |

---
*Last updated: 2026-05-29 after v2.0 (Phase 22 complete) — started milestone v2.1 (Phase 23 in scope; 24-26 sales-gated)*
