/**
 * Phase 17 Wave 0 RED stub — SRCH-13 10-cap replace flow.
 *
 * Covers the replace-oldest modal that opens when a user attempts an
 * 11th save while count=10. Wave 2 lands the implementation alongside
 * the primary save flow.
 *
 * Critical contract: handleSaveAttempt issues a `select count(*)` head:true
 * query BEFORE any insert, so the cap is enforced client-side (RLS still
 * enforces server-side). See 17-RESEARCH.md §4.
 *
 * Source: 17-VALIDATION.md per-task map.
 */
import { describe, it } from 'vitest'

describe('10-cap replace flow (SRCH-13 edge case)', () => {
  it.todo('attempting 11th save when count=10 opens replace modal')
  it.todo('replace modal displays the OLDEST saved search name')
  it.todo('clicking Cancel closes modal without DB writes')
  it.todo('clicking Replace deletes oldest then inserts new (DB count remains 10)')
  it.todo('handleSaveAttempt issues `select count(*) head:true` before insert')
})
