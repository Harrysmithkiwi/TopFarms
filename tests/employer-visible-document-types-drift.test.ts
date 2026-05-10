// Phase 18.1 #1 — EMPLOYER_VISIBLE_DOCUMENT_TYPES drift guard.
//
// The list MUST be identical across three layers:
//   1. src/types/domain.ts:200      (TS canonical)
//   2. supabase/functions/get-applicant-document-url/index.ts:43 (Edge fn whitelist)
//   3. supabase/migrations/020_seeker_documents_employer_policy.sql:35 (RLS policy)
//
// Drift means an employer either gets denied access to a doc they should see
// (false negative) OR an identity doc leaks (false positive — privacy regression
// on BFIX-02 / PRIV-02). Either way, prod-blocker.
//
// Pattern source: tests/saved-search-load-integration.test.tsx (Phase 17-04 static
// source test — readFileSync + regex; pure-Node, no jsdom, runs in <50ms).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const TS_PATH    = resolve(ROOT, 'src/types/domain.ts')
const EDGE_PATH  = resolve(ROOT, 'supabase/functions/get-applicant-document-url/index.ts')
const SQL_PATH   = resolve(ROOT, 'supabase/migrations/020_seeker_documents_employer_policy.sql')

function extractTsList(source: string): string[] {
  // Match: EMPLOYER_VISIBLE_DOCUMENT_TYPES[: DocumentType[]]? = ['cv', 'certificate', 'reference']
  const m = source.match(/EMPLOYER_VISIBLE_DOCUMENT_TYPES[^=]*=\s*\[([^\]]+)\]/)
  if (!m) throw new Error('TS: EMPLOYER_VISIBLE_DOCUMENT_TYPES literal not found')
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
}

function extractSqlList(source: string): string[] {
  // Match: document_type IN ('cv', 'certificate', 'reference')
  const m = source.match(/document_type\s+IN\s*\(([^)]+)\)/)
  if (!m) throw new Error('SQL: document_type IN (...) literal not found')
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
}

describe('EMPLOYER_VISIBLE_DOCUMENT_TYPES drift guard', () => {
  it('TS canonical, Edge fn duplicate, and SQL policy literal are identical', () => {
    const tsList   = extractTsList(readFileSync(TS_PATH,   'utf8'))
    const edgeList = extractTsList(readFileSync(EDGE_PATH, 'utf8'))
    const sqlList  = extractSqlList(readFileSync(SQL_PATH, 'utf8'))

    // Order-independent comparison via sorted sets
    const sorted = (xs: string[]) => [...new Set(xs)].sort()
    expect(sorted(tsList)).toEqual(sorted(edgeList))
    expect(sorted(tsList)).toEqual(sorted(sqlList))
  })

  it('canonical list does NOT contain "identity" (privacy regression guard)', () => {
    const tsList = extractTsList(readFileSync(TS_PATH, 'utf8'))
    expect(tsList).not.toContain('identity')
  })
})
