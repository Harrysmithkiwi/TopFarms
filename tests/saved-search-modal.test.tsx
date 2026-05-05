/**
 * Phase 17 Wave 0 RED stub — SRCH-13 save-search modal (RHF + Zod).
 *
 * Covers the SaveSearchModal component (Wave 1 lands the implementation).
 * Mirrors the MarkFilledModal `if (!isOpen) return null` pattern noted in
 * 17-RESEARCH.md §3.
 *
 * Critical pattern: inline role="alert" div for validation errors (NOT
 * StatusBanner) — StatusBanner has a fixed semantic-variant union with no
 * 'error' member; same approach used by Phase 20-05 ProfileDrawer per
 * RESEARCH Pitfall 3 Option A.
 *
 * Source: 17-VALIDATION.md per-task map.
 */
import { describe, it } from 'vitest'

describe('Save search modal (SRCH-13)', () => {
  it.todo('renders Input + Button primitives, NOT StatusBanner')
  it.todo('pre-fills name field with deriveAutoName output')
  it.todo('shows inline role="alert" div when name is empty (NOT StatusBanner)')
  it.todo('rejects names exceeding 100 chars via Zod max constraint')
  it.todo('disables Submit button when name field empty')
  it.todo('Esc key closes the modal')
  it.todo('clicking backdrop closes the modal')
  it.todo('submits supabase.from("saved_searches").insert({user_id, name, search_params}) on Save')
  it.todo('unmounts fully on close (mirrors MarkFilledModal `if (!isOpen) return null` pattern)')
})
