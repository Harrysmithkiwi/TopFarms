// Phase 18.1 #1 — EMPLOYER_VISIBLE_DOCUMENT_TYPES drift guard.
//
// Wave 0 RED scaffold. Wave 2 (plan 18.1-05) replaces it.todo() with real assertions.
//
// The list MUST be identical across three layers:
//   1. src/types/domain.ts:200      (TS canonical)
//   2. supabase/functions/get-applicant-document-url/index.ts:43 (Edge fn whitelist)
//   3. supabase/migrations/020_seeker_documents_employer_policy.sql:35 (RLS policy)
//
// Pattern source: tests/saved-search-load-integration.test.tsx (Phase 17-04 static
// source pattern — readFileSync + regex; pure-Node, no jsdom mock surface).

import { describe, it } from 'vitest'

describe('EMPLOYER_VISIBLE_DOCUMENT_TYPES drift guard', () => {
  it.todo('TS canonical, Edge fn duplicate, and SQL policy literal are identical')
  it.todo('canonical list does NOT contain "identity" (privacy regression guard)')
})
