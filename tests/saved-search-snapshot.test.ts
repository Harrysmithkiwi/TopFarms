/**
 * Phase 17 Wave 1 GREEN — SRCH-13 pure functions.
 *
 * Covers the snapshotFilters() + deriveAutoName() helpers from
 * src/lib/savedSearch.ts (landed by Plan 17-01-foundation).
 *
 * Wave 0 (plan 17-00) created this file with it.todo() stubs; Wave 1 swaps
 * each stub for a real assertion. Behaviours mirror 17-RESEARCH.md §2 + §3.
 */
import { describe, it, expect } from 'vitest'
import { snapshotFilters, deriveAutoName } from '@/lib/savedSearch'

describe('snapshotFilters', () => {
  it('round-trips a typical filter set lossless via URLSearchParams', () => {
    const input = new URLSearchParams('shed_type=rotary&region=Waikato&sort=match')
    const out = snapshotFilters(input)
    const parsed = new URLSearchParams(out)
    expect(parsed.get('shed_type')).toBe('rotary')
    expect(parsed.get('region')).toBe('Waikato')
    expect(parsed.get('sort')).toBe('match')
  })

  it('excludes the page param even when present', () => {
    const input = new URLSearchParams('shed_type=rotary&page=3')
    const out = snapshotFilters(input)
    expect(out).not.toContain('page=')
    expect(new URLSearchParams(out).get('shed_type')).toBe('rotary')
  })

  it('preserves multi-valued params (shed_type=rotary&shed_type=herringbone)', () => {
    const input = new URLSearchParams('shed_type=rotary&shed_type=herringbone')
    const out = snapshotFilters(input)
    expect(new URLSearchParams(out).getAll('shed_type')).toEqual(['rotary', 'herringbone'])
  })

  it('preserves sort param (user-meaningful)', () => {
    const input = new URLSearchParams('sort=salary_desc')
    expect(snapshotFilters(input)).toBe('sort=salary_desc')
  })

  it('returns empty string when no filter keys are set', () => {
    expect(snapshotFilters(new URLSearchParams())).toBe('')
  })
})

describe('deriveAutoName', () => {
  it('returns shed-type label when single shed_type set ("Rotary")', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary'))).toBe('Rotary')
  })

  it('returns "in <region>" qualifier when single region set', () => {
    expect(deriveAutoName(new URLSearchParams('region=Waikato'))).toBe('in Waikato')
  })

  it('joins shed_type + region as "Rotary in Waikato"', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary&region=Waikato'))).toBe(
      'Rotary in Waikato',
    )
  })

  it('appends "+ accommodation" when accommodation_type set', () => {
    expect(
      deriveAutoName(new URLSearchParams('shed_type=rotary&accommodation_type=couples')),
    ).toBe('Rotary + accommodation')
  })

  it('appends "+ visa sponsorship" when visa=true', () => {
    expect(deriveAutoName(new URLSearchParams('shed_type=rotary&visa=true'))).toBe(
      'Rotary + visa sponsorship',
    )
  })

  it('falls back to "Saved search YYYY-MM-DD" when no filters set', () => {
    const result = deriveAutoName(new URLSearchParams())
    expect(result).toMatch(/^Saved search \d{4}-\d{2}-\d{2}$/)
  })

  it('truncates output to 50 chars with ellipsis when concat exceeds', () => {
    const longParams = new URLSearchParams(
      'shed_type=rotary&region=ALongRegionNameThatExceedsTheFiftyCharBudgetForSure',
    )
    const result = deriveAutoName(longParams)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.endsWith('…')).toBe(true)
  })

  it('handles multi-valued shed_type as "<N> shed types"', () => {
    const params = new URLSearchParams('shed_type=rotary&shed_type=herringbone&shed_type=ams')
    expect(deriveAutoName(params)).toBe('3 shed types')
  })
})
