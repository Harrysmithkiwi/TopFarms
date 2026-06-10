/**
 * HOMEBUG-03 — accommodation filter Layer 2 remap static-source guard
 *
 * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-03 adds
 * the ACCOMMODATION_FILTER_TO_DB lookup constant and wires it into the
 * .overlaps() call in fetchJobs (replacing the raw searchParams pass-through).
 *
 * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
 * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 3.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobSearch.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-03 — accommodation filter Layer 2 remap', () => {
  it('declares ACCOMMODATION_FILTER_TO_DB lookup constant at module level', () => {
    // POST-FIX shape (RED until Wave 1 plan 22-03 ships):
    expect(source).toMatch(
      /const\s+ACCOMMODATION_FILTER_TO_DB\s*:\s*Record<string,\s*string>\s*=\s*\{/,
    )
  })

  it('maps URL param values to Title Case DB values (couples → "Couples welcome", family → "Family welcome", pet_friendly → "Pets allowed")', () => {
    // Asserts the 3 minimum mappings (Title Case values match src/types/domain.ts:327-336).
    // Open Question from research (house/cottage TYPE values) is OUT OF SCOPE per planner discretion —
    // those flow through a different column (accommodation_type singular, not accommodation_extras array).
    expect(source).toMatch(/couples\s*:\s*'Couples welcome'/)
    expect(source).toMatch(/family\s*:\s*'Family welcome'/)
    expect(source).toMatch(/pet_friendly\s*:\s*'Pets allowed'/)
  })

  it('uses ACCOMMODATION_FILTER_TO_DB in the .overlaps() call (lookup is wired, not dead code)', () => {
    // After the fix, fetchJobs maps accommodationTypes through the lookup before .overlaps().
    // The lookup constant must be REFERENCED (not just declared) for the bug to be closed.
    expect(source).toMatch(/ACCOMMODATION_FILTER_TO_DB\[/)
  })

  it('does NOT pass raw searchParams.getAll values directly to .overlaps(employer_profiles.accommodation_extras) (the pre-fix shape)', () => {
    // Negative guard against pre-fix shape — the direct pass-through of `accommodationTypes` (raw
    // URL values) into .overlaps() is exactly the bug.
    // We assert the pattern `.overlaps('employer_profiles.accommodation_extras', accommodationTypes)` is GONE.
    expect(source).not.toMatch(
      /\.overlaps\(\s*'employer_profiles\.accommodation_extras'\s*,\s*accommodationTypes\s*\)/,
    )
  })
})
