/**
 * HOMEBUG-02 — listing_tier int type drift static-source guard
 *
 * listing_tier is `int NOT NULL DEFAULT 1`
 * (supabase/migrations/001_initial_schema.sql:129). Passing string tier names
 * where the column is an int yields Postgres 22P02 invalid_text_representation.
 *
 * Repointed twice. FeaturedListings.tsx (retired) -> OpenRolesSection.tsx
 * (v13 stage 2) -> JobDetail.tsx (2026-08-25). OpenRolesSection was deleted with
 * the other ten orphaned pre-v12 landing components; it held the last
 * `.in('listing_tier', [...])` in the codebase, so the query form this guarded
 * no longer exists anywhere. What DOES still exist is the comparison form —
 * JobDetail branches the featured and premium badges on the same column — and
 * that is where a string tier name would reappear. The guard follows the risk,
 * not the file.
 *
 * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobDetail.tsx')
const source = readFileSync(SOURCE_PATH, 'utf-8')

describe('HOMEBUG-02 — listing_tier int type guard (JobDetail)', () => {
  it('compares listing_tier against integers — the Postgres column is int NOT NULL DEFAULT 1', () => {
    expect(source).toMatch(/listing_tier\s*===\s*2/)
    expect(source).toMatch(/listing_tier\s*===\s*3/)
  })

  it('does NOT compare listing_tier against string tier names', () => {
    expect(source).not.toMatch(/listing_tier\s*===\s*['"](featured|premium|standard)['"]/)
  })

  it('no .in(listing_tier, [...]) anywhere passes string tier names', () => {
    // Guards the query form the deleted OpenRolesSection carried, in case it
    // returns on another surface.
    expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*'/)
  })
})
