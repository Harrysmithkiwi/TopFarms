# Phase 4: Match Scoring Engine - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Match scores are pre-computed, stored in the `match_scores` table, kept fresh via database triggers (seeker profile or job changes), and enriched with AI-generated plain-English explanations via Claude API Edge Function. This phase replaces Phase 3's query-time scoring with a pre-computed engine and adds AI explanations — making ranked search and the employer applicant dashboard fully functional with instant, accurate scores.

</domain>

<decisions>
## Implementation Decisions

### Staleness & Recalculation Triggers
- DB triggers on `seeker_profiles` and `jobs` tables fire recalculation — scores upserted into `match_scores` immediately
- Recalculation is sector-scoped: dairy seeker change only recalculates against dairy jobs (and vice versa) — keeps trigger work proportional as platform grows
- Nightly batch recalculation for data integrity — Claude's discretion on pg_cron vs Supabase scheduled Edge Function (verify availability on current Supabase plan)
- Migration backfill on deploy: populate `match_scores` for all existing seeker-job pairs so search works immediately with pre-computed scores
- Must meet <60s SLA for score updates after profile/job changes

### Recency Multiplier
- 1.1× multiplier for jobs posted within 7 days — hard cutoff, not gradual decay
- Applied to base score, then capped at 100 — no scores above 100 in the system
- Nightly batch handles the day-7 transition (recalculates scores for jobs crossing the 7-day mark)

### AI Explanation Tone & Content
- Honest and practical tone — farm-worker-friendly language, no corporate-speak, no overselling
- Example: "You've got rotary experience and they run a rotary shed — that's your strongest match. The salary sits at the top of your range."
- Same single explanation per seeker-job pair — both seeker and employer see the same 2-3 sentences (one Claude API call per pair, stored once)
- Always generate for all scores including low matches — helps seekers understand WHY and whether to still apply (trustworthy brand)
- AI explanations generated async after score computation — separate Edge Function processes scores without explanations, doesn't block the <60s SLA

### Graceful Degradation
- If no explanation exists yet, hide the explanation area entirely — match breakdown bars still render from score data, no broken UI
- Show stale explanation until replaced — when score changes, keep old explanation visible while new one generates async; score numbers update immediately, text catches up
- Edge Function retries: 3 attempts with exponential backoff (1s, 2s, 4s); if all fail, explanation stays null until nightly batch retries all null explanations

### Claude's Discretion
- Nightly batch implementation choice (pg_cron vs Supabase scheduled Edge Function)
- Exact Claude API prompt design for generating explanations from breakdown jsonb
- Edge Function queue/processing pattern for async explanation generation
- Trigger implementation details (AFTER INSERT/UPDATE, transition tables, etc.)
- Error logging and monitoring approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scoring Specification
- `SPEC.md` §9 — Match Scoring Engine: scoring dimensions (§9.1), display rules (§9.2), staleness triggers (§9.3), recency multiplier
- `SPEC.md` §8.7 — `match_scores` table schema including breakdown jsonb structure

### Existing Implementation
- `supabase/migrations/009_seeker_onboarding.sql` lines 108-356 — Current `compute_match_score()` and `compute_match_scores_batch()` SQL functions (Phase 3 query-time implementation to be replaced)
- `supabase/migrations/001_initial_schema.sql` lines 172-188 — `match_scores` table definition, indexes, and RLS
- `supabase/migrations/002_rls_policies.sql` lines 241-255 — `match_scores` RLS policies (seekers view own, employers view for own jobs)

### Frontend Consumers
- `src/components/ui/MatchBreakdown.tsx` — Match breakdown component with DIMENSIONS const (will need AI explanation area added)
- `src/pages/jobs/JobDetail.tsx` — Job detail page consuming match scores
- `src/pages/jobs/JobSearch.tsx` — Search page consuming batch match scores
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — Employer view consuming match scores

### Prior Phase Context
- `.planning/phases/03-seeker-demand-side/03-CONTEXT.md` — Phase 3 match scoring decisions (query-time scoring, honest low scores, no competitive signals, employer gets key highlights not full breakdown)

### Edge Function Pattern
- `supabase/functions/create-payment-intent/` — Existing Edge Function pattern (Deno, esm.sh imports)
- `supabase/functions/stripe-webhook/` — Existing webhook Edge Function pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compute_match_score()` SQL function — Full scoring logic for all 7 dimensions already implemented; needs wrapping with pre-compute/store logic rather than rewriting
- `compute_match_scores_batch()` SQL function — Batch scoring for arrays of job IDs; useful pattern for backfill and nightly recalc
- `MatchBreakdown` component — Renders category bars from breakdown jsonb; needs AI explanation section added below bars
- `MatchCircle` component — Score circle display, already handles color coding by score range
- Edge Function Deno pattern — `create-payment-intent` and `stripe-webhook` establish the project's Edge Function conventions (esm.sh imports, Stripe v14 pattern)

### Established Patterns
- `match_scores` table already exists with correct schema (id, job_id, seeker_id, total_score, breakdown jsonb, calculated_at, unique constraint on job_id+seeker_id)
- RLS policies already in place for match_scores (seekers view own, employers view for own jobs)
- Supabase Edge Functions use Deno runtime with esm.sh for npm packages
- `pg_cron` already used for job expiry (`008_job_expiry_cron.sql`) — confirms extension availability

### Integration Points
- `match_scores` table — needs `explanation` text column added (nullable, for AI text)
- DB triggers on `seeker_profiles` and `jobs` tables — new triggers for recalculation
- New Edge Function for Claude API explanation generation
- `MatchBreakdown.tsx` — add conditional AI explanation rendering below breakdown bars
- `JobDetail.tsx`, `ApplicantDashboard.tsx` — pass explanation data through to MatchBreakdown
- Search page query — switch from `compute_match_scores_batch()` call to reading `match_scores` table directly

</code_context>

<specifics>
## Specific Ideas

- pg_cron is confirmed available (already used for `008_job_expiry_cron.sql` job expiry) — nightly batch can use the same pattern
- The existing `compute_match_score()` function is the scoring logic source of truth — Phase 4 wraps it with trigger + store, not rewrite
- AI explanations should feel like a knowledgeable farming recruiter giving honest feedback, not a chatbot

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-match-scoring-engine*
*Context gathered: 2026-03-16*
