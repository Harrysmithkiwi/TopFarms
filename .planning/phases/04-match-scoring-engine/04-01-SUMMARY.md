---
phase: 04-match-scoring-engine
plan: 01
subsystem: database
tags: [postgresql, triggers, pg_cron, match_scores, precompute]

# Dependency graph
requires:
  - phase: 03-seeker-demand-side
    provides: compute_match_score() SQL function in 009_seeker_onboarding.sql, match_scores table schema, pg_cron established in 008_job_expiry_cron.sql
provides:
  - Pre-computed match_scores rows maintained by AFTER INSERT/UPDATE triggers on seeker_profiles and jobs
  - explanation text column on match_scores for AI-generated content
  - Sector-scoped trigger_recompute_seeker_scores() with 8-column guard
  - Sector-scoped trigger_recompute_job_scores() with status guard and 9-column guard
  - Backfill of all existing active seeker-job pairs on migration run
  - Nightly pg_cron job (3 AM UTC) for data integrity and day-7 recency multiplier transitions
affects:
  - 04-02 (AI Edge Function reads/writes explanation column)
  - 04-03 (frontend switches from RPC to match_scores table reads)
  - 04-04 (MatchBreakdown renders explanation from match_scores row)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CROSS JOIN LATERAL for single-call compute_match_score() result capture (avoids double-calling per row)
    - IS NOT DISTINCT FROM for NULL-safe column comparison in trigger guards
    - SET statement_timeout = '0' + RESET for backfill migrations on Supabase
    - IS DISTINCT FROM EXCLUDED guards in nightly pg_cron DO UPDATE to skip unchanged rows

key-files:
  created:
    - supabase/migrations/010_match_scores_precompute.sql
  modified: []

key-decisions:
  - "trigger_recompute_seeker_scores column guard uses IS NOT DISTINCT FROM on 8 fields — handles NULLs correctly and skips rescoring on irrelevant field updates (updated_at, onboarding_step, etc.)"
  - "trigger_recompute_job_scores primary guard: IF NEW.status != 'active' THEN RETURN NEW — inactive job changes never touch match_scores"
  - "CROSS JOIN LATERAL captures full compute_match_score() jsonb in one call per row — never double-calls the function"
  - "explanation column excluded from all DO UPDATE SET clauses — owned exclusively by AI Edge Function (04-02)"
  - "SET statement_timeout = '0' before backfill prevents Supabase migration timeout on large datasets"
  - "Nightly pg_cron at 3 AM UTC (not 2 AM, which is used by expire-job-listings) — handles day-7 recency multiplier drop and data integrity drift"
  - "IS DISTINCT FROM guards on nightly DO UPDATE skip unchanged rows to keep nightly run efficient"

patterns-established:
  - "Sector-scoped trigger pattern: seeker trigger filters jobs by j.sector = ANY(NEW.sector_pref); job trigger filters seekers by NEW.sector = ANY(sp.sector_pref)"
  - "Column-level guard pattern in triggers: check all scoring-relevant columns with IS NOT DISTINCT FROM, RETURN NEW early if nothing changed"
  - "explanation column ownership: DB layer (migration + triggers) never writes explanation — AI Edge Function has sole ownership"

requirements-completed: [MTCH-01, MTCH-02, MTCH-03, MTCH-04, MTCH-05]

# Metrics
duration: 1min
completed: 2026-03-16
---

# Phase 4 Plan 01: Match Scores Precompute Summary

**PostgreSQL AFTER triggers + pg_cron nightly batch that transform match scoring from query-time RPC to pre-computed, trigger-maintained rows in match_scores, with explanation column ready for AI content**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-16T08:47:24Z
- **Completed:** 2026-03-16T08:48:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `explanation text` column to `match_scores` with partial null index for AI retry pass
- Created sector-scoped `trigger_recompute_seeker_scores()` with 8-column IS NOT DISTINCT FROM guard to skip non-scoring updates
- Created sector-scoped `trigger_recompute_job_scores()` with `status != 'active'` guard and 9-column update guard
- Attached AFTER INSERT OR UPDATE triggers to both `seeker_profiles` and `jobs` tables
- Backfill migration computes all existing active seeker-job pairs (statement_timeout disabled)
- Nightly pg_cron job at 3 AM UTC handles day-7 recency transitions and data integrity drift with IS DISTINCT FROM skip guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration with explanation column, trigger functions, and column-guarded triggers** - `65a0a3c` (feat)

**Plan metadata:** _(to be committed with SUMMARY.md, STATE.md, ROADMAP.md)_

## Files Created/Modified
- `supabase/migrations/010_match_scores_precompute.sql` - 228-line migration with all 7 sections: explanation column, seeker trigger function + definition, job trigger function + definition, backfill, nightly pg_cron job

## Decisions Made
- CROSS JOIN LATERAL used throughout — captures `compute_match_score()` result once per row, never calls the function twice
- Column guards with `IS NOT DISTINCT FROM` for NULL safety on all 8 seeker scoring fields and 9 job scoring fields
- `explanation` column intentionally excluded from every `DO UPDATE SET` clause — sole ownership stays with the AI Edge Function (Plan 04-02)
- `SET statement_timeout = '0'` added before backfill to prevent Supabase migration timeout on larger datasets
- Nightly batch scheduled at `0 3 * * *` (3 AM UTC) to avoid conflict with expire-job-listings at 2 AM UTC
- `IS DISTINCT FROM EXCLUDED.total_score OR ... EXCLUDED.breakdown` guard on nightly DO UPDATE skips rows whose scores haven't changed

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration runs via `supabase db push`. pg_cron is already enabled (confirmed by `008_job_expiry_cron.sql`).

## Next Phase Readiness
- Migration is ready for `supabase db push` — all triggers, backfill, and nightly job will be deployed
- Plan 04-02 (AI Edge Function `generate-match-explanation`) can now write to `match_scores.explanation` column
- Plan 04-03 (frontend switch from RPC to table reads) can query `match_scores` directly for pre-computed scores
- Plan 04-04 (MatchBreakdown AI explanation UI) can read `explanation` from `match_scores` row

---
*Phase: 04-match-scoring-engine*
*Completed: 2026-03-16*
