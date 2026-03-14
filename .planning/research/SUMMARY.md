# Project Research Summary

**Project:** TopFarms — NZ Agricultural Job Marketplace
**Domain:** Two-sided vertical job marketplace (agricultural sector, NZ)
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

TopFarms is a niche, two-sided job marketplace replacing informal Facebook group hiring in the New Zealand agricultural sector (dairy cattle and sheep/beef). The product's competitive baseline is not Seek or TradeMe — it is the NZ ag Facebook group experience. Every design decision must make TopFarms demonstrably better than posting in a Facebook group, not better than a generic enterprise ATS. The stack is fully locked in SPEC.md v3.0 and is a modern, well-validated combination: React 19, TypeScript, Vite 8, Tailwind CSS v4, Supabase (Postgres + Auth + Storage + Edge Functions), Vercel, Stripe, Claude API, and Resend. All major library versions have been verified against the npm registry as of 2026-03-15.

The architecture is a standard React SPA backed by Supabase, with a critical pre-computed match scoring system as the primary value proposition. Match scores must be stored in a `match_scores` table and refreshed asynchronously via database triggers and scheduled Edge Functions — never computed at query time. Supabase Row Level Security is the primary security boundary for all data access, with particular emphasis on contact detail masking: seeker contact fields must be architecturally separated from their profiles and only accessible after a `placement_fees.acknowledged_at` record exists. The platform's revenue model depends entirely on this gate being enforced at the database layer, not in UI code.

The top risks are all schema-phase decisions that become expensive to retrofit: contact data separation (must not live in `seeker_profiles`), user role architecture (`user_roles` table, not JWT metadata), RLS circular policy design, and Stripe webhook idempotency. These are not optional refinements — building them wrong in Phase 1 costs days to reverse. The SPEC.md v3.0 is the authoritative source for all product decisions; research confirms the SPEC's choices are correct and consistent with established marketplace patterns.

---

## Key Findings

### Recommended Stack

The stack is locked and verified. All versions are current stable releases as of 2026-03-15. The most significant version implications are: Tailwind v4 uses CSS-first configuration (no `tailwind.config.js`) and requires `@tailwindcss/vite` (not PostCSS) with `tailwind-merge` v3.x; React Router v7 unified `react-router-dom` into `react-router`; and Zod v4 requires `@hookform/resolvers` v5.x. These are breaking changes from prior versions — mixing old and new versions of any of these will cause silent failures or incompatible type errors.

**Core technologies:**
- React 19 + TypeScript 5.9: UI and type safety — stable, full lib support confirmed
- Vite 8 + Tailwind CSS v4: build tooling — CSS-first config via `@theme` directive, `@tailwindcss/vite` plugin required
- Supabase 2.99.1: Postgres DB, Auth, Storage, Edge Functions — RLS on all tables, service_role key in Edge Functions only
- React Query 5.x + React Hook Form 7.x + Zod v4: data fetching and form state — uncontrolled inputs essential for 7-8 step wizards
- Radix UI primitives (raw) + Sonner: accessible UI without design system opinions — shadcn/ui rejected because TopFarms has a bespoke design system
- Stripe Node SDK 20 + Stripe.js 8: listing fees and placement invoicing — publishable key client-side only, secret key in Edge Functions
- Claude API (claude-sonnet-4-20250514) via `@anthropic-ai/sdk` 0.78.0: AI match explanations — Edge Function only, never client-side
- Resend 6.9 + React Email 5.2: transactional email — requires SPF/DKIM DNS configuration before first send
- Motion 12 (formerly framer-motion): landing page entrance animations only — CSS transitions for all wizard/dashboard transitions

See `.planning/research/STACK.md` for full library manifest with versions, rationale, and alternatives considered.

### Expected Features

TopFarms must replace the NZ ag Facebook group experience, which means the baseline is free, frictionless, and mobile-first — not enterprise. Three NZ ag-specific dimensions have no analogue on generic job boards and are the core reason employers and seekers would switch: shed type (rotary vs herringbone vs AMS — the #1 dairy skill differentiator), accommodation sub-scoring (76% of dairy seekers require on-farm accommodation with pets/couples/family specifics), and DairyNZ qualification taxonomy (Level 2–5+ as the sector's credential system).

**Must have (table stakes) — without these the platform feels broken:**
- Email/password auth with employer/seeker fork at signup
- Persistent login sessions
- Employer onboarding wizard (8 screens) + job posting wizard (7 screens)
- Job detail page (visitor and logged-in states)
- Seeker onboarding wizard (8 steps) + profile management
- Job search with all ag-specific filters (shed type, region, DairyNZ quals, herd size, accommodation, visa, salary range)
- Application submission and status tracking (8-stage pipeline)
- Employer applicant dashboard with ranked candidates
- Mobile-responsive design (320px minimum; filter becomes drawer on mobile)
- Employer profile (public farm page) as trust signal
- Salary transparency with NZ regional market rate hints
- Job expiry and status management
- Landing page with hero, dual CTA, live counters, testimonials

**Should have (differentiators that justify switching from Facebook groups):**
- Pre-computed match scoring engine (100-point, 6 dimensions + couples bonus + recency multiplier)
- AI match explanations via Claude API (2-3 sentence plain-English rationale per match)
- Match score breakdown with per-dimension progress bars
- 5-tier employer verification ladder (Tiers 1–4 minimum at launch)
- Placement fee gate with RLS contact masking
- Accommodation sub-scoring (pets, couples, family, utilities)
- Couples-seeking matching (+5pt bonus)
- Visa right-to-work hard filter
- Listing tier differentiation (Standard / Featured / Premium)
- Profile completeness nudge
- Save search + email alerts (v1.x after validation)

**Defer to v2+:**
- In-app messaging (contact release via fee gate covers MVP; messaging adds fee-bypass risk)
- Social login / OAuth (email/password sufficient for validation)
- Partner job matching (couples boolean covers 80% of use case)
- Horticulture/viticulture sectors (schema is sector-aware; addition is additive)
- Multi-user employer accounts (team roles)
- Video interviews / calendar integration (farmers schedule by phone)
- Native mobile apps (mobile web first)
- Weekly AI job recommendation digest (requires 500+ active listings)

See `.planning/research/FEATURES.md` for full dependency graph and prioritization matrix.

### Architecture Approach

The architecture is a React SPA on Vercel CDN backed by Supabase, with four layers: UI (pages and design system components), state (React Query for server state, useState for local UI only — no Redux/Zustand needed), data (typed Supabase client wrapped in hooks, never called directly from components), and a service layer for external APIs (Stripe, Claude, Resend). All secret-key operations (Stripe webhooks, Claude API calls, email sending) run in Supabase Edge Functions (Deno). The match scoring engine is implemented as a PostgreSQL stored procedure and pre-computes scores into a `match_scores` table, triggered by database webhooks on job and seeker profile changes. URL search params are the single source of truth for job search filter state.

**Major components:**
1. Design system (`src/components/ui/`): stateless primitives — Button, Card, Tag, MatchCircle, InfoBox, Input, Toggle, ProgressBar — built once, consumed everywhere; must be completed before any screen
2. Match scoring engine (`supabase/functions/match-score.sql` + `match-recalculate` Edge Function): PostgreSQL stored procedure writing to `match_scores` table; triggered by DB webhooks on job/profile updates; nightly batch for integrity
3. WizardShell (`src/components/features/shared/WizardShell.tsx`): orchestrates multi-step employer onboarding and job posting; upserts draft data to Supabase on every "Next" to survive browser refresh
4. Edge Functions (`supabase/functions/`): stripe-webhook (job activation), match-recalculate (score freshness), placement-followup (Day 7+14 emails via Resend), nightly-batch (full recompute integrity)
5. RLS policies (`supabase/migrations/002_rls_policies.sql`): primary security boundary; `seeker_contacts` table (separate from `seeker_profiles`) with placement fee gate; `user_roles` table as role authority; security definer functions to break circular policy recursion

See `.planning/research/ARCHITECTURE.md` for full project structure, data flow diagrams, and 5 architectural patterns.

### Critical Pitfalls

1. **Contact fields in `seeker_profiles` instead of a separate `seeker_contacts` table** — Any employer can SELECT the seeker_profiles row for search results; if email/phone live there, they are fully readable before the placement fee gate is triggered. Separation into `seeker_contacts` with a placement-fee-gated RLS SELECT policy is mandatory. Build this in the first migration or face a multi-day data layer rewrite. The SPEC uses CSS/RLS framing — the correct implementation is data separation, not column masking.

2. **User role stored only in JWT metadata, not a `user_roles` table** — `auth.users.raw_user_meta_data.user_type` is client-readable and not a reliable RLS security signal. Create a `user_roles` table (user_id, role, created_at) and enforce all cross-role access decisions against it. This is a Phase 1 schema decision; retrofitting it touches every table's RLS policies.

3. **RLS circular policy recursion** — Job marketplace schemas are circular (jobs → employers → applications → seekers → match_scores). Writing RLS policies that cross-reference tables creates `ERROR: infinite recursion detected in policy`. Use `security definer` functions to break recursion and test every policy with `SET ROLE` in psql before deployment.

4. **Stripe webhook processed without idempotency check** — Stripe delivers `payment_intent.succeeded` with at-least-once guarantees. Without a `UNIQUE` constraint on `listing_fees.stripe_payment_id` and an idempotency check at the top of every webhook handler, retries create duplicate job activations, duplicate fee rows, and revenue accounting errors. Add this before writing any payment flow code.

5. **Match scores never invalidated after seeker/job update** — Pre-computed scores go stale silently when a seeker updates visa status or an employer changes shed type requirements. Add a `stale` boolean to `match_scores` from the initial migration; use DB triggers on `jobs`, `seeker_profiles`, and `seeker_skills` to mark rows stale; run a scheduled Edge Function to recompute. Retrofitting a staleness mechanism into a working scorer requires a full trigger-chain rewrite.

See `.planning/research/PITFALLS.md` for full pitfall details, recovery strategies, and "looks done but isn't" checklist.

---

## Implications for Roadmap

Based on combined research, the SPEC.md's milestone order is architecturally correct. The phase structure below follows the dependency graph from FEATURES.md, the build order rationale from ARCHITECTURE.md, and the phase-to-pitfall mapping from PITFALLS.md.

### Phase 1: Foundation — Schema, Auth, RLS, Design System

**Rationale:** Nothing is buildable without the database schema, security policies, and design system. All critical pitfalls (contact data separation, user roles, RLS recursion) must be resolved here. Mistakes in this phase require migrations and policy rewrites that cascade across every subsequent phase.

**Delivers:** Working auth with employer/seeker fork; all 12 database tables with RLS on every table; `user_roles` table; `seeker_contacts` table separate from `seeker_profiles`; skills master table seeded (~40 skills); complete design system components (Button, Card, Tag, MatchCircle, InfoBox, Input, Toggle, ProgressBar); React Router setup with route structure; Supabase client singleton with generated types.

**Addresses:** Auth (email/password, user type fork, session persistence), WCAG 2.1 AA baseline, mobile-responsive layout shell.

**Avoids:** Contact masking failure (Pitfall 1 + 6), multi-role auth confusion (Pitfall 5), RLS recursion (Pitfall 3), RLS not enabled on tables (integration gotcha).

**Research flag:** Standard patterns — Supabase Auth + RLS + Vite setup are well-documented. Design system implementation follows bespoke patterns from SPEC wireframes. No phase research needed.

---

### Phase 2: Employer Supply Side — Onboarding, Job Posting, Stripe

**Rationale:** Employers create the supply side before seekers can search. The job posting wizard + Stripe integration + job detail page form the complete supply-side vertical slice. Stripe integration must be complete here because the placement fee acknowledgement gate (Phase 5) depends on it — and Stripe idempotency must be designed before writing any payment flow.

**Delivers:** Employer onboarding wizard (8 screens) with draft persistence to Supabase; job posting wizard (7 screens) with live preview sidebar; Stripe listing fee PaymentIntent (client) + stripe-webhook Edge Function (server, with idempotency); job detail page (visitor state); public employer profile page; 5-tier employer verification UI (Tiers 1–4 minimum); listing tier differentiation (Standard / Featured / Premium).

**Uses:** `react-hook-form` + Zod v4 for wizard forms; WizardShell with draft upsert pattern; Radix UI Select/Switch/Tabs/Progress primitives; `@stripe/react-stripe-js` PaymentElement; `react-dropzone` for document/photo uploads to Supabase Storage.

**Implements:** WizardShell architecture pattern; Stripe Webhook → Database State Machine pattern; wizard draft persistence pattern.

**Avoids:** Stripe without idempotency (Pitfall 4); `VITE_STRIPE_SECRET_KEY` anti-pattern; wizard state in React only (Anti-Pattern 4).

**Research flag:** Stripe PaymentElement + webhook integration is well-documented but NZD cents handling and first-listing-free server-side enforcement need careful implementation verification. No full phase research needed; spot-check during implementation.

---

### Phase 3: Seeker Demand Side — Onboarding, Job Search, Applications

**Rationale:** Requires jobs existing from Phase 2. Seeker onboarding populates the profile data that the match scoring engine needs. Job search is the primary seeker value proposition — the ag-specific filter dimensions (shed type, DairyNZ quals, accommodation, herd size, couples, visa) are the reason seekers would use TopFarms over Facebook. Match scores can be stubbed with a simple calculation (Phase 4 refines them).

**Delivers:** Seeker onboarding wizard (8 steps) with draft persistence; seeker profile management with completeness nudge; job search with full ag-specific filter sidebar (URL param state); JobCard and JobCardExpanded (Details/Match/Apply tabs) components; application submission; worker application view with 8-stage pipeline; job detail page (logged-in seeker state with match score display).

**Uses:** FilterSidebar with `useSearchParams` (URL param pattern); `useJobs` hook with React Query stale-while-revalidate; Radix UI Slider for salary range; MatchCircle component (design system); Application CRUD via `useApplications` hook.

**Implements:** URL params as filter state (Anti-Pattern 5 avoidance); React Query caching for search results.

**Avoids:** Filter state in React only (Anti-Pattern 5); showing visa-incompatible jobs (UX pitfall); wizard state lost on refresh (UX pitfall).

**Research flag:** Standard React Router + React Query patterns. Job search filter implementation (10+ dimensions) is complex but follows established URL param patterns. No phase research needed.

---

### Phase 4: Match Scoring Engine — Pre-Computation, Triggers, AI Explanations

**Rationale:** Requires both employer jobs (Phase 2) and seeker profiles (Phase 3) to exist. The PostgreSQL stored procedure and recalculation trigger chain are refinements of what Phase 3 stubbed. This phase makes the ranked search and AI explanations fully functional. The match engine is the primary differentiator — implement it completely with staleness handling before Phase 5 depends on ranked applicant dashboards.

**Delivers:** `match_score()` PostgreSQL stored procedure (6 dimensions: shed type 25pts, location/region 20pts, accommodation 20pts, skills 20pts, visa 5pts, experience 5pts; + couples bonus 5pts; + recency multiplier 1.1x); `match_scores` table with `stale` boolean and `breakdown` JSONB; DB triggers on `jobs`, `seeker_profiles`, `seeker_skills`, `job_skills` to mark scores stale; `match-recalculate` Edge Function (triggered by DB webhooks, <60s SLA); `nightly-batch` Edge Function for integrity; Claude API match explanations (async, cached in `match_scores.explanation`, graceful degradation on API failure); employer applicant dashboard with ranked candidate list and expandable match breakdown panels.

**Uses:** `@anthropic-ai/sdk` 0.78.0 in Supabase Edge Function (Deno import); `match_scores.breakdown` JSONB passed to Claude (not full profiles); `motion` entrance animation for MatchCircle reveal.

**Implements:** Pre-Computed Match Scores pattern (Pattern 1); Edge Functions for All Secret-Key Operations pattern (Pattern 3); staleness tracking from PITFALLS.md.

**Avoids:** Real-time match score computation at query time (Anti-Pattern 2 + Pitfall 2); client-side Claude API calls (Anti-Pattern, security violation); blocking search on Claude API response (Performance trap).

**Research flag:** The scoring algorithm specifics (dimension weights, accommodation sub-scoring logic, couples bonus edge cases) are fully specified in SPEC.md. No external research needed. The `pg_cron` vs Supabase scheduled functions choice for the nightly batch needs verification during implementation.

---

### Phase 5: Revenue Protection — Placement Fee Gate, Contact Masking, Dashboards

**Rationale:** Depends on the full match pipeline (Phase 4) being functional because shortlisting (the placement fee trigger) happens in the ranked applicant dashboard. This phase wires the revenue model: shortlist action → placement fee acknowledgement modal → RLS contact release → Day 7 + Day 14 follow-up emails.

**Delivers:** Placement fee acknowledgement modal with exact NZD amount, payment timeline, and invoice explanation; `placement_fees` table rows written atomically on acknowledgement; RLS contact release (employer can read `seeker_contacts` only after acknowledged_at set); contact card with click-to-call, mailto, and suggested intro message; Stripe Invoice creation Edge Function triggered on hire confirmation; `placement-followup` Edge Function with Day 7 + Day 14 Resend emails; structured contact card shown on contact release; seeker notification emails on pipeline status changes; application rate limiting (10 applications/day per seeker).

**Uses:** `@radix-ui/react-dialog` for placement fee modal; Resend + React Email for follow-up emails; `supabase.auth.getUser()` from server context (not client) for placement fee verification.

**Implements:** Shortlist + Contact Release data flow (from ARCHITECTURE.md); RLS as Primary Security Boundary pattern (Pattern 2); Hire Confirmation → Invoice data flow.

**Avoids:** Placement fee in frontend state only (security mistake); contact masking at CSS/UI layer (Pitfall 6 + Architecture Anti-Pattern 1); admin role without server-side enforcement.

**Research flag:** Resend SPF/DKIM DNS configuration must be done before any email reaches real users — flag for environment setup. Stripe Invoice API (different from PaymentIntent) needs implementation verification.

---

### Phase 6: Landing Page, Polish, Launch Readiness

**Rationale:** Depends on all prior phases being functionally complete. The landing page needs real data for live counters and featured listings. Mobile QA, accessibility audit, and E2E tests cover the full user journey end-to-end before production launch.

**Delivers:** Landing page (full-bleed hero, dual employer/seeker CTA fork, `motion`-animated live counters on scroll reveal, How It Works section with seeker/employer tab toggle, featured listings carousel, testimonials, footer); save search + email alerts (Resend Edge Function triggered on new job publish); mobile QA across all flows (320px minimum, filter drawer on mobile); WCAG 2.1 AA audit; E2E test suite covering critical paths (auth, job post, apply, shortlist, contact release); production Vercel deployment; Stripe production keys; DNS/email configuration; performance audit (Lighthouse, search <1.5s target).

**Uses:** `react-intersection-observer` for counter animation trigger; `motion` for hero `fadeUp` stagger; `react-intersection-observer` + `motion` for scroll reveal.

**Implements:** Landing page trust signals; progressive enhancement pattern for AI explanations.

**Avoids:** Expired listings not cleaned up by cron (pitfall checklist); emails landing in spam (SPF/DKIM not configured).

**Research flag:** Save search + email alerts is the one v1.x feature that should be pulled into Phase 6 if capacity allows (medium complexity, medium value). E2E testing framework choice (Playwright vs Cypress) needs a decision — both are well-supported with Vite.

---

### Phase Ordering Rationale

- **Foundation before everything:** Schema and RLS decisions are irreversible without migrations. Contact separation and user_roles architecture must be correct before any profile or listing table is created. Design system must be built before any screen.
- **Supply before demand:** Employers create jobs before seekers can search them. Phase 2 before Phase 3 is non-negotiable.
- **Both sides before match engine:** The scoring function cannot run until both `jobs` (Phase 2) and `seeker_profiles` (Phase 3) are populated. Phase 4 is the integration phase.
- **Match engine before revenue gate:** The placement fee trigger (shortlist action) is in the ranked applicant dashboard, which requires Phase 4 scores. Phase 5 cannot be built without ranked applicants to shortlist.
- **All features before landing page polish:** Landing page live counters need real data. Mobile QA covers all flows. Phase 6 is validation and launch.
- **Anti-patterns are avoided by phase order:** Wizards persist to Supabase (not React state) because persistence is designed into Phases 2–3. Filter state uses URL params from Phase 3. Contact data separation is built in Phase 1 schema, not retrofitted.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4:** `pg_cron` vs Supabase scheduled functions availability in current Supabase tier — verify during implementation setup. Accommodation sub-scoring null/false handling edge cases are specified in pitfalls checklist but need explicit test coverage design.
- **Phase 5:** Stripe Invoice API specifics (different from PaymentIntent flow) — spot-check during implementation. Resend DNS setup timing (must precede any user-facing email send).

Phases with standard patterns (skip research-phase):
- **Phase 1:** Supabase + Vite + React project scaffolding is well-documented. Tailwind v4 CSS-first setup pattern is fully covered in STACK.md.
- **Phase 2:** React Hook Form wizard pattern with Supabase upsert is established. Stripe PaymentElement integration is standard.
- **Phase 3:** React Query + Supabase search with URL params is a standard pattern.
- **Phase 6:** Playwright/Vitest patterns are standard; Vercel deployment is zero-config.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry 2026-03-15. Tailwind v4 + Vite 8 peer dep compatibility is MEDIUM — verify `@tailwindcss/vite` works with Vite 8 on project init (peer dep lists ^5-7 but v8 extends v7 pattern). Zod v4 + resolvers v5 pairing is MEDIUM — verify import paths on init. |
| Features | HIGH | SPEC.md v3.0 is the primary source — authored by product owner, fully specified with wireframes. Competitor analysis is MEDIUM (not independently verified via live site checks; web access was unavailable during research). |
| Architecture | HIGH | SPEC.md v3.0 provides authoritative schema, data flows, and RLS requirements. Architectural patterns (pre-computed scores, RLS masking, Edge Functions for secrets) are confirmed by well-established Supabase and marketplace conventions. URL param filter state pattern is MEDIUM (standard React Router pattern, validated against v6 docs). |
| Pitfalls | MEDIUM | Supabase RLS recursion and Stripe idempotency patterns are HIGH confidence (core platform behaviors). Contact masking and two-sided marketplace patterns are MEDIUM (based on training data, not live external sources — web access unavailable). NZ-specific agricultural patterns are MEDIUM (from SPEC author research, not independently sourced). |

**Overall confidence:** HIGH

### Gaps to Address

- **Vite 8 + `@tailwindcss/vite` peer dep:** The Tailwind v4 Vite plugin lists peer dep `vite: '^5.2.0 || ^6 || ^7'`; Vite 8 follows the v7 pattern but is not explicitly listed. Verify compatibility on `npm install` during Phase 1 project init. Fallback: downgrade to Vite 7 if incompatible.
- **Zod v4 + `@hookform/resolvers` v5 import paths:** Resolver v5 adds Zod v4 support but import path changes need verification on first form implementation (Phase 2). Document the correct import pattern immediately.
- **`pg_cron` vs Supabase scheduled functions for nightly batch:** Supabase's built-in scheduler has evolved; verify current availability in the project's Supabase plan tier during Phase 4 setup.
- **Competitor feature verification:** Seek, TradeMe, and any NZ ag-specific job boards were not independently verified during research (web tools unavailable). The SPEC's competitive claims are the source. If competitive positioning changes during development, revisit FEATURES.md competitor analysis section.
- **Claude API rate limits:** Rate limits can change post-training cutoff. Verify current `claude-sonnet-4-20250514` tier limits at https://docs.anthropic.com/en/api/rate-limits before Phase 4 implementation.
- **Resend SPF/DKIM DNS lead time:** DNS propagation can take 24–48 hours. DNS configuration must be initiated before Phase 5 testing begins, not during it.

---

## Sources

### Primary (HIGH confidence)
- TopFarms SPEC.md v3.0 — product definition, schema, RLS requirements, wireframes, match scoring algorithm, Stripe integration, milestone structure
- TopFarms PROJECT.md — project context and validated requirements
- npm registry (queried 2026-03-15) — all stack versions verified via `npm info [pkg] dist-tags`

### Secondary (MEDIUM confidence)
- Supabase RLS documentation (official, training data Aug 2025) — RLS policy patterns, Edge Functions, Storage
- PostgreSQL RLS recursive policy behavior — core PostgreSQL behavior, pg docs consistent
- Stripe webhook delivery guarantees documentation — at-least-once delivery, consistent since 2019
- React Query, React Hook Form, React Router v7 documentation — state management and routing patterns
- Two-sided marketplace contact masking post-mortems — MEDIUM, from training data without live source verification

### Tertiary (MEDIUM-LOW confidence)
- NZ agricultural sector context (DairyNZ qualification taxonomy, accommodation norms, couples hiring rates) — derived from SPEC author's research; not independently verified via live sources
- Competitor analysis (Seek, TradeMe, NZ ag Facebook groups) — SPEC Section 11 is the source; not independently verified via live site checks

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*
