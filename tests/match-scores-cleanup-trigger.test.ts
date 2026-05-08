// Phase 18.1 #5 — match_scores cleanup trigger migration shape guard.
//
// Wave 0 RED scaffold. Wave 1 (plan 18.1-03) replaces it.todo() with real
// readFileSync + regex assertions over supabase/migrations/027_*.sql.
//
// DB-level behaviour is verified at execute time (027 post-verify DO block + manual
// MCP read-only orphan-count query). This file's vitest test is a static-source
// guard against migration 027 being deleted, renamed, or having its load-bearing
// fragments altered.

import { describe, it } from 'vitest'

describe('match_scores cleanup trigger migration shape', () => {
  it.todo('027 migration exists')
  it.todo('declares cleanup_match_scores_on_status_change function')
  it.todo('uses OLD/NEW status guard for active → non-active transition')
  it.todo('attaches AFTER UPDATE trigger to public.jobs')
  it.todo('includes one-time backfill DELETE for stale rows')
})
