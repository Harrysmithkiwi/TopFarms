/**
 * Phase 17 Wave 0 RED stub — SRCH-13 pure functions.
 *
 * Covers the snapshotFilters() + deriveAutoName() helpers from
 * src/lib/saved-search/serialize.ts (Wave 1 lands the implementations).
 *
 * Bodies are it.todo() so vitest reports a third state — neither pass nor
 * fail — providing a visible scaffolding signal in CI output. Wave 1+
 * replaces each .todo with a real assertion as production code lands.
 *
 * Source: 17-VALIDATION.md per-task map; behaviours mirror 17-RESEARCH.md §8
 * Test Coverage Strategy.
 */
import { describe, it } from 'vitest'

describe('snapshotFilters', () => {
  it.todo('round-trips a typical filter set lossless via URLSearchParams')
  it.todo('excludes the page param even when present')
  it.todo('preserves multi-valued params (shed_type=rotary&shed_type=herringbone)')
  it.todo('preserves sort param (user-meaningful)')
  it.todo('returns empty string when no filter keys are set')
})

describe('deriveAutoName', () => {
  it.todo('returns shed-type label when single shed_type set ("Rotary")')
  it.todo('returns "in <region>" qualifier when single region set')
  it.todo('joins shed_type + region as "Rotary in Waikato"')
  it.todo('appends "+ accommodation" when accommodation_type set')
  it.todo('appends "+ visa sponsorship" when visa=true')
  it.todo('falls back to "Saved search YYYY-MM-DD" when no filters set')
  it.todo('truncates output to 50 chars with ellipsis when concat exceeds')
  it.todo('handles multi-valued shed_type as "<N> shed types"')
})
