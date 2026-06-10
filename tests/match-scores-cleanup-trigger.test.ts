// Phase 18.1 #5 — match_scores cleanup trigger migration shape guard.
//
// DB-level behaviour is verified at execute time (027 post-verify DO block + manual
// MCP read-only orphan-count query). This file's vitest test is a static-source
// guard against migration 027 being deleted, renamed, or having its load-bearing
// fragments altered.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL_PATH = resolve(
  __dirname,
  '..',
  'supabase/migrations/027_match_scores_cleanup_trigger.sql',
)

describe('match_scores cleanup trigger migration shape', () => {
  it('027 migration exists', () => {
    expect(() => readFileSync(SQL_PATH, 'utf8')).not.toThrow()
  })

  it('declares cleanup_match_scores_on_status_change function', () => {
    const sql = readFileSync(SQL_PATH, 'utf8')
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.cleanup_match_scores_on_status_change/,
    )
  })

  it('uses OLD/NEW status guard for active → non-active transition', () => {
    const sql = readFileSync(SQL_PATH, 'utf8')
    expect(sql).toMatch(
      /OLD\.status\s*=\s*'active'\s+AND\s+NEW\.status\s+IS\s+DISTINCT\s+FROM\s+'active'/,
    )
  })

  it('attaches AFTER UPDATE trigger to public.jobs', () => {
    const sql = readFileSync(SQL_PATH, 'utf8')
    expect(sql).toMatch(/CREATE\s+TRIGGER\s+on_jobs_status_change_match_scores_cleanup/)
    expect(sql).toMatch(/AFTER\s+UPDATE\s+OF\s+status\s+ON\s+public\.jobs/)
  })

  it('includes one-time backfill DELETE for stale rows', () => {
    const sql = readFileSync(SQL_PATH, 'utf8')
    expect(sql).toMatch(/DELETE\s+FROM\s+public\.match_scores\s+ms\s+WHERE\s+EXISTS/)
  })
})
