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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 27 | Initial build — established wizard, Edge Function, and scoring patterns |

### Top Lessons (Verified Across Milestones)

1. Schema-level security decisions in Phase 1 pay compound dividends in later phases
2. Pre-computed data with triggers > runtime computation for marketplace search
