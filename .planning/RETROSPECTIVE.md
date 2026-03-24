# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-17
**Phases:** 6 | **Plans:** 27

### What Was Built
- Full-stack NZ agricultural job marketplace with 14-table PostgreSQL schema and RLS on every table
- Employer and seeker onboarding wizards, 7-screen job posting with Stripe payment
- Job search with 9 agriculture-specific filters and 8-stage application pipeline
- 100-point pre-computed match scoring engine with AI explanations via Claude API
- Revenue protection: placement fee gate at RLS level, Stripe invoicing, automated follow-up emails
- Public landing page with live counters and Vercel deployment config

### What Worked
- Phase-by-phase execution with clear success criteria kept scope tight and deliverables concrete
- Separate seeker_contacts table decision early in Phase 1 made contact masking trivially enforceable in Phase 5
- Wizard shell pattern (shell owns persistence, hook manages navigation) reused cleanly across employer onboarding, seeker onboarding, and job posting
- Pre-computed match scores with database triggers eliminated runtime scoring complexity entirely
- Edge Function pattern with plain fetch() (no SDK) kept Deno deployments simple and consistent

### What Was Inefficient
- ROADMAP.md plan checkboxes for Phases 2-6 were not auto-updated during execution — they still showed `[ ]` despite having SUMMARY.md files
- Some plan summaries lacked one_liner fields, requiring manual extraction during milestone completion
- STATE.md performance metrics section became inconsistently formatted as phases accumulated

### Patterns Established
- Wizard shell owns persistence, useWizard hook manages navigation state only
- Edge Functions use plain fetch() for external services (Stripe, Resend, Claude API) — no SDKs in Deno
- pg_cron flag pattern: cron sets due=true, Edge Function consumes due and sets sent=true (decoupled scheduling from delivery)
- Storage buckets use path-scoped RLS via storage.foldername() for per-user isolation
- maybeSingle() for optional row fetches (avoids PGRST116 errors)
- Functional setSearchParams(prev => ...) for all URL filter updates (prevents race conditions)

### Key Lessons
1. Contact masking architecture decisions (separate table, RLS enforcement) must be made in Phase 1 — retrofitting data-layer security is vastly harder
2. Pre-computed scores with triggers are significantly simpler than runtime computation + caching for a marketplace
3. Stripe idempotency keys should be application-scoped (e.g., listing-fee-{job_id}) not random — makes retry behavior deterministic
4. Test infrastructure (vitest config, aliases, CSS disabled) should be set up as Wave 0 of the first phase that needs tests, not deferred

### Cost Observations
- Model mix: mixed opus/sonnet across phases
- Timeline: 3 days total (2026-03-15 → 2026-03-17)
- Notable: 17,234 LOC TypeScript shipped across 27 plans — high throughput from clear phase goals and pre-computed research

---

## Milestone: v1.1 — SPEC Compliance

**Shipped:** 2026-03-23
**Phases:** 5 | **Plans:** 19

### What Was Built
- 9 shared UI primitives (ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, SearchHero, LivePreviewSidebar)
- ~30 missing wizard fields across employer, job posting, and seeker onboarding with boolean→string[] chip migration
- Full page-level integrations: job search filters/pagination/expandable cards, job detail with sidebar, applicant dashboard with AI summaries, My Applications with status banners
- Landing page SPEC compliance: hero animation (motion library), 5 new sections, stat blocks, trusted-by strip
- Backend features: match pool estimate RPC, private document upload bucket, seeker completion matched-jobs polling

### What Worked
- ChipSelector string[] value shape decision in Phase 7 made boolean→chip migration in Phase 8 clean and uniform
- booleanColumnsToChipArray() utility handled v1.0 backward compatibility without data migration for existing users
- Phase 7 UI primitives unblocking all subsequent phases kept the dependency graph clean — no circular waits
- Parallel phase execution (8+9+10 could overlap) kept timeline short despite 19 plans
- Milestone audit caught 3 broken CTA routes before shipping — audit step justified itself immediately

### What Was Inefficient
- SUMMARY.md frontmatter requirements_completed arrays were empty for Phases 8 plans 02-04 and all Phase 10 plans — documentation gap created extra audit work
- ROADMAP.md plan checkboxes still not auto-updated (same issue as v1.0) — progress table column alignment also drifted
- Phase 9 had 6 plans which could have been 4 — foundation plan (09-01) was lightweight enough to merge with 09-02

### Patterns Established
- ChipSelector with string[] value shape as universal chip component — replaces boolean columns and radio groups
- booleanColumnsToChipArray() for backward-compatible chip migrations from v1.0 data
- DEFAULT NULL RPC params for flexible filter combinations (estimate_match_pool)
- Cache-first AI pattern: check DB column before invoking external AI API (generate-candidate-summary)
- Private Storage buckets with path-scoped RLS for sensitive documents (seeker-documents)
- motion library stagger variants for landing page animations

### Key Lessons
1. Milestone audit is high-value — found 3 broken conversion CTAs that would have shipped silently; should be mandatory before completion
2. Boolean→string[] chip migration with a utility function is the right pattern for evolving form fields — avoids breaking existing data
3. SUMMARY frontmatter completeness should be enforced during plan execution, not discovered during audit
4. 19 plans across 5 phases in 5 days is sustainable when primitives are built first and dependencies are explicit

### Cost Observations
- Model mix: balanced profile (opus/sonnet mix)
- Timeline: 5 days (2026-03-19 → 2026-03-23)
- Notable: 5,711 lines added across 58 files — focused on UI compliance rather than new architecture

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 27 | Initial build — established wizard, Edge Function, and scoring patterns |
| v1.1 | 5 | 19 | SPEC compliance — UI primitives first, then parallel phase execution; added milestone audit step |

### Top Lessons (Verified Across Milestones)

1. Schema-level security decisions in Phase 1 pay compound dividends in later phases
2. Pre-computed data with triggers > runtime computation for marketplace search
3. Primitives-first dependency ordering (Phase 7 → Phases 8-11) keeps parallel execution clean
4. Milestone audit before completion catches integration bugs that phase-level verification misses (v1.1: 3 broken CTAs)
5. SUMMARY frontmatter completeness remains an issue across both milestones — needs enforcement
