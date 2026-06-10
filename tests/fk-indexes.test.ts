// Phase 18.1 #6 — 15× FK index migration shape guard.
//
// DB-level verification runs post-apply via read-only MCP pg_indexes query
// (operator action in plan SUMMARY at Wave 3). This test guards 025's migration
// body — 15 CREATE INDEX IF NOT EXISTS lines, naming pattern <table>_<col>_idx.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL_PATH = resolve(__dirname, '..', 'supabase/migrations/025_phase_18_1_fk_indexes.sql')

describe('FK index migration 025', () => {
  const sql = readFileSync(SQL_PATH, 'utf8')

  it('contains 15 CREATE INDEX IF NOT EXISTS statements', () => {
    const matches = sql.match(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/g) ?? []
    expect(matches).toHaveLength(15)
  })

  // 15 expected indexes by table and column
  const EXPECTED: Array<[string, string]> = [
    ['admin_notes', 'admin_id'],
    ['job_skills', 'skill_id'],
    ['listing_fees', 'employer_id'],
    ['listing_fees', 'job_id'],
    ['message_threads', 'employer_id'],
    ['message_threads', 'job_id'],
    ['message_threads', 'seeker_id'],
    ['messages', 'sender_id'],
    ['messages', 'thread_id'],
    ['placement_fees', 'application_id'],
    ['placement_fees', 'employer_id'],
    ['placement_fees', 'job_id'],
    ['placement_fees', 'seeker_id'],
    ['saved_jobs', 'job_id'],
    ['seeker_skills', 'skill_id'],
  ]

  it.each(EXPECTED)('declares index on public.%s(%s)', (table, col) => {
    const indexName = `${table}_${col}_idx`
    expect(sql).toMatch(
      new RegExp(
        `CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+${indexName}\\s+ON\\s+public\\.${table}\\s*\\(${col}\\)`,
      ),
    )
  })
})
