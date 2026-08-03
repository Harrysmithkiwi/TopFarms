/**
 * HOMEBUG-02 — listing_tier int type drift static-source guard
 *
 * v13 stage 2: repointed from FeaturedListings.tsx (retired) to
 * OpenRolesSection.tsx, which carries the same featured-first query. The
 * defect this guards is unchanged: listing_tier is int NOT NULL DEFAULT 1
 * (supabase/migrations/001_initial_schema.sql:129); passing string tier names
 * yields Postgres 22P02 invalid_text_representation.
 *
 * The getTierBadge assertion is gone with the badges: the v13 open-roles rows
 * use listing_tier for query ordering only (tier badges retired with the old
 * card design).
 *
 * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(__dirname, '..', 'src', 'components', 'landing', 'OpenRolesSection.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-02 — listing_tier int type guard (OpenRolesSection)', () => {
  it('uses integer values in .in(listing_tier, [...]) — Postgres schema is int NOT NULL DEFAULT 1', () => {
    expect(source).toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*2\s*,\s*3\s*\]\s*\)/)
  })

  it('does NOT use string tier names inside .in(listing_tier, [...])', () => {
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*'featured'/)
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[[^\]]*'premium'[^\]]*\]/)
  })
})
