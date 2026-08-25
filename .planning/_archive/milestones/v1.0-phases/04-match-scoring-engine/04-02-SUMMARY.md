---
phase: 04-match-scoring-engine
plan: "02"
subsystem: api
tags: [claude-api, edge-function, deno, supabase, ai-explanations]

# Dependency graph
requires:
  - phase: 04-match-scoring-engine
    provides: "match_scores table with explanation column (from plan 04-01)"
provides:
  - "Supabase Edge Function generating 2-3 sentence AI match explanations via Claude API"
  - "Explanation stored in match_scores.explanation for instant frontend reads"
  - "Graceful degradation: null explanation returned without error status on all retries failing"
affects: [04-match-scoring-engine, frontend-match-display, MatchBreakdown, JobDetail, ApplicantDashboard]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk (via esm.sh Deno import)"]
  patterns:
    - "Deno Edge Function: esm.sh imports, CORS preflight, service role Supabase client, Deno.env.get secrets"
    - "Exponential backoff retry: delays [1000, 2000, 4000]ms for 3 attempts"
    - "Graceful degradation: null explanation is valid 200 response, not an error"

key-files:
  created:
    - "supabase/functions/generate-match-explanation/index.ts"
  modified: []

key-decisions:
  - "claude-sonnet-4-20250514 used as model — latest Claude Sonnet at time of implementation"
  - "max_tokens: 150 — enforces 2-3 sentence constraint and keeps latency predictable"
  - "Retry counter increments on catch, delay index uses attempt-1 — delays [1000,2000] apply after attempt 1 and 2 respectively; no sleep after 3rd failure"
  - "Explanation upserted only when non-null — avoids overwriting existing explanation with null if API call succeeds on retry"

patterns-established:
  - "buildPrompt function: accepts totalScore + breakdown Record<string,number>, produces farm-worker-friendly NZ language prompt"
  - "All 7 dimensions explicitly listed in prompt (shed_type/25, location/20, accommodation/20, skills/20, salary/10, visa/5, couples/5)"

requirements-completed: [MTCH-06]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 4 Plan 02: Generate Match Explanation Summary

**Deno Edge Function calling Claude Sonnet API to generate 2-3 sentence farm-worker-friendly match explanations with 3-attempt exponential backoff and graceful null degradation stored in match_scores.explanation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T08:47:24Z
- **Completed:** 2026-03-16T08:52:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Edge Function created at `supabase/functions/generate-match-explanation/index.ts` following identical project Deno pattern (esm.sh imports, CORS headers, service role client)
- `buildPrompt` function embeds all 7 scoring dimensions with honest farm-worker language, NZ-specific context, and instructed example style
- 3-attempt exponential backoff (1s, 2s, 4s delays) ensures resilience against transient Claude API failures
- Returns `{ explanation: null }` with 200 status on all-retry failure — never blocks callers or logs false errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generate-match-explanation Edge Function with Claude API integration** - `145ec96` (feat)

**Plan metadata:** _(to be added with SUMMARY.md commit)_

## Files Created/Modified
- `supabase/functions/generate-match-explanation/index.ts` - Deno Edge Function with Anthropic SDK integration, buildPrompt, retry loop, graceful degradation

## Decisions Made
- `claude-sonnet-4-20250514` selected as model — current Claude Sonnet, appropriate balance of speed and quality for 2-3 sentence explanations
- `max_tokens: 150` enforces concise output and keeps latency low for async processing
- Retry delay array `[1000, 2000, 4000]` with attempt counter: delays applied after attempts 1 and 2 only; no sleep after the 3rd failure, just exits loop
- Explanation only written back to match_scores when non-null — prevents a retry success from being overwritten by a null if logic were to re-run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Environment variable required:** `ANTHROPIC_API_KEY` must be set in Supabase Edge Function secrets before deploying.

To set the secret:
```bash
supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

To deploy:
```bash
supabase functions deploy generate-match-explanation
```

## Next Phase Readiness
- Edge Function is deployable via `supabase functions deploy generate-match-explanation`
- Frontend can call it async after score computation; null explanations are hidden gracefully (per plan 04-CONTEXT.md degradation spec)
- Nightly batch (plan 04-03 or similar) can retry all null explanations by iterating match_scores WHERE explanation IS NULL

---
*Phase: 04-match-scoring-engine*
*Completed: 2026-03-16*
