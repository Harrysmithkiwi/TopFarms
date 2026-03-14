# TopFarms

## What This Is

TopFarms is a New Zealand agricultural job marketplace connecting farm employers with skilled workers. It replaces informal hiring via Facebook groups with a structured platform featuring agriculture-specific filters (shed type, accommodation, DairyNZ qualifications), AI-powered match scoring, and verified employer profiles — purpose-built for the NZ ag sector.

## Core Value

Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation sub-scoring, DairyNZ qualifications, and herd size experience — delivering match quality that justifies switching from Facebook groups.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Authentication with email/password, user type selection (Employer/Seeker), session persistence
- [ ] Employer onboarding wizard (8 screens): farm type, details, culture, accommodation, verification, pricing
- [ ] Employer job posting form (7-screen wizard): role basics, farm details, skills, compensation, description, pricing, success
- [ ] Job detail page with two states (logged-in match breakdown / visitor signup prompt)
- [ ] Seeker onboarding wizard (8 steps): account, farm type pref, experience, skills with proficiency, life situation, visa, completion, profile management
- [ ] Worker job search with all agriculture-specific filters (shed type, accommodation, visa, DairyNZ, herd size, couples, salary, region, contract type)
- [ ] Worker application view with pipeline stages (applied, review, interview, shortlisted, offered, hired, declined, withdrawn)
- [ ] Employer applicant dashboard with ranked candidates, match scores, pipeline stages, expandable panels
- [ ] Match scoring engine (100-point system): shed type 25pts, location 20pts, accommodation 20pts, skills 20pts, salary 10pts, visa 5pts + couples bonus + recency multiplier
- [ ] AI match explanations via Claude API (2-3 sentence insights per match)
- [ ] Listing fees via Stripe: first free, Standard $100, Featured $150, Premium $200
- [ ] Placement fee gate: acknowledgement modal at shortlist, contact masking via RLS until confirmed
- [ ] 5-tier employer verification: email (auto), phone SMS, NZBN, document upload, farm photo
- [ ] Landing page: hero, dual CTA, live counters, how-it-works, featured listings, testimonials, footer
- [ ] Mobile-responsive design (320px minimum) with drawer filter on mobile
- [ ] Design system: Fraunces + DM Sans typography, soil/moss/fern/meadow/hay/cream palette, component library
- [ ] Supabase database with full schema (12 tables), RLS on all tables
- [ ] Skills master table seeded with ~40 dairy + sheep/beef skills

### Out of Scope

- Data scraping pipeline (Apify/Claude) — separate build track and document
- Messaging / Expressions of Interest — Growth Phase, wireframe exists but do not build
- Horticulture and viticulture sectors — Phase 2
- Social media login (Google/Facebook OAuth) — email/password only for MVP
- Mobile native apps (iOS/Android) — mobile web only
- Partner job matching (separate role for seeker's partner)
- Video interviews or calendar integration
- Multi-user employer accounts / team roles
- API for third-party developers
- International markets
- Training providers / courses module

## Context

- NZ agricultural sector is small and reputation-driven — social enforcement mechanisms inform platform design
- 86% of NZ ag Facebook job posts are dairy — primary target sector
- 76% of NZ dairy seekers require on-farm accommodation — major decision factor
- Shed type (rotary vs herringbone) is the primary skill differentiator in dairy
- 28% of seekers are couples — couples matching is a significant filter
- All 8 MVP screens are fully wireframed as interactive HTML files in `TopFarms_Launch_Pack/wireframes/`
- Revenue Journey and Data Architecture are documented as separate HTML files in `TopFarms_Launch_Pack/docs/`
- Complete SPEC.md with all technical details at project root

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
| Pre-computed match scores | Instant search results without real-time computation | — Pending |
| Flat placement fee (recommended) | Simpler than % of salary, less contentious, easier ToS | — Pending |
| Manual NZBN verification for MVP | API integration deferred, manual + admin flag sufficient | — Pending |
| Hardcoded market rate salary data | Update quarterly from DairyNZ publications, avoid API dependency | — Pending |
| Manual skills curation (~40 skills) | Better quality than automated import for MVP | — Pending |
| Resend for transactional email | Good free tier, React Email templates, easy Edge Function integration | — Pending |
| Contact masking at RLS level | Data-layer protection, not CSS — cannot be extracted from page source | — Pending |
| Soft contact detection in messaging | Nudge banners not hard blocks — preserves goodwill (Growth Phase) | — Pending |

---
*Last updated: 2026-03-15 after initialization*
