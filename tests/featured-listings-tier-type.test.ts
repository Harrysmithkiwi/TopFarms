/**
 * HOMEBUG-02 — listing_tier int type drift static-source guard
 *
 * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-02 changes
 * FeaturedListings.tsx:133 from `.in('listing_tier', ['featured', 'premium'])`
 * to `.in('listing_tier', [2, 3])`.
 *
 * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
 * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 2.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(__dirname, '..', 'src', 'components', 'landing', 'FeaturedListings.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-02 — listing_tier int type guard', () => {
  it('uses integer values in .in(listing_tier, [...]) — Postgres schema is int NOT NULL DEFAULT 1', () => {
    // POST-FIX shape (RED until Wave 1 plan 22-02 ships):
    expect(source).toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*2\s*,\s*3\s*\]\s*\)/)
  })

  it('does NOT use string tier names ("featured", "premium") inside .in(listing_tier, [...]) — that yields Postgres 22P02 invalid_text_representation', () => {
    // Negative guard against pre-fix shape:
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*'featured'/)
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[[^\]]*'premium'[^\]]*\]/)
  })

  it('getTierBadge helper still maps integer tier values to badge labels (defence-in-depth: post-fix badge rendering)', () => {
    // The helper at lines 33-38 handles BOTH t === '3'/'premium' and t === '2'/'featured';
    // after the fix it will only receive integer tier values from the data path,
    // but the helper should continue to handle them.
    expect(source).toMatch(/t === '3'/)
    expect(source).toMatch(/t === '2'/)
  })
})
