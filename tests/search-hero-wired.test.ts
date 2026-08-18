import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FILTER_KEYS } from '@/lib/savedSearch'
import { ROLE_TYPES } from '@/lib/constants'

// Test intent — the same family as F-17 and F-22, found on the most prominent control on
// /jobs: `<SearchHero />` was mounted with NO props at all.
//
//   JobSearch.tsx:564   <SearchHero />
//   SearchHero.tsx      onClick={handleSearch} -> onSearch?.(...)   // undefined
//                       onClick={() => onPillClick?.(pill)}         // undefined
//
// So typing a search and pressing the button did nothing, choosing a region did nothing, and
// all five pills did nothing. A seeker reads an unchanged result list as "no jobs match".
//
// It was carrying a FIFTH region vocabulary on top of it — nine hand-written slugs
// (`manawatu`, `hawkes-bay`) matching neither NZ_REGIONS nor `jobs.region`, which is compared
// by exact string equality. Migration 100 unified the other four lists.
//
// A render test would not have caught either half: every control rendered, and every slug
// rendered. What was missing is that a control has to be CONNECTED and has to emit the value
// the column stores — properties of two files agreeing — so that is what this asserts.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

/**
 * Comment lines are stripped before matching. The fix's own docstring quotes the defect
 * verbatim — `<SearchHero />` — and a regex that cannot tell code from commentary fails on the
 * commit that repairs it, which is the one class of false positive a guard must not have.
 */
const code = (src: string) =>
  src
    .split('\n')
    .filter((l) => {
      const t = l.trimStart()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .join('\n')

const HERO = code(read('src/components/ui/SearchHero.tsx'))
const SEARCH = code(read('src/pages/jobs/JobSearch.tsx'))

describe('SearchHero is connected to the filters it appears to drive', () => {
  it('JobSearch passes every callback the hero exposes', () => {
    // The defect in one line. `<SearchHero />` with no props type-checks, renders, and lies.
    expect(SEARCH).not.toMatch(/<SearchHero\s*\/>/)
    for (const prop of ['onSearch=', 'onPillClick=', 'onRegionChange=', 'region=']) {
      expect(SEARCH, `SearchHero is mounted without ${prop}`).toMatch(
        new RegExp(`<SearchHero[\\s\\S]{0,400}${prop}`),
      )
    }
  })

  it('writes only registered filter keys, so every hero action produces a clearable pill', () => {
    // handleFilterChange writes the URL; FILTER_KEYS is what ActiveFilterPills labels and what
    // clear-all derives from. A key written here but absent there is a filter with no exit.
    const written = [...SEARCH.matchAll(/handleFilterChange\('([a-z_]+)'/g)].map((m) => m[1])
    const heroKeys = ['q', 'region', 'role_type']
    for (const key of heroKeys) {
      expect(written, `the hero never writes ${key}`).toContain(key)
      expect(FILTER_KEYS as readonly string[], `${key} is not a registered filter`).toContain(key)
    }
  })

  it('has no private region list — the fifth copy is gone', () => {
    expect(HERO).not.toMatch(/'manawatu'|'hawkes-bay'|'bay-of-plenty'|'northland'/)
    expect(HERO).toMatch(/import\s*\{[^}]*NZ_REGIONS[^}]*\}\s*from '@\/lib\/constants'/)
    // value === label is what makes the emitted filter equal the stored column, exactly as
    // FilterSidebar and JobStep1Basics do it.
    expect(HERO).toMatch(/NZ_REGIONS\.map\(\(r\) => \(\{ value: r, label: r \}\)\)/)
  })

  it('every default pill is a real role_type', () => {
    const block = /const DEFAULT_PILLS: RoleType\[\] = \[([\s\S]*?)\]/.exec(HERO)
    expect(block, 'DEFAULT_PILLS not found').toBeTruthy()
    const pills = [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(pills.length).toBeGreaterThan(0)
    for (const pill of pills) {
      // 'Dairy' and 'Sheep & Beef' were here. They are SECTORS, and `sector` is not a
      // registered filter key — clicking them could not have produced a pill or been cleared.
      expect(ROLE_TYPES as readonly string[], `"${pill}" is not a role_type`).toContain(pill)
    }
  })

  it('the region select is controlled by the URL, not by local state', () => {
    // Held locally it desynced the moment the sidebar touched `region`, and pressing Search
    // would then have silently overwritten a selection the seeker never revisited.
    expect(HERO).not.toMatch(/useState\((['"])all\1\)/)
    expect(SEARCH).toMatch(/regionParams\.length === 1 \? regionParams\[0\] : ''/)
  })

  it('Enter in the search box submits', () => {
    expect(HERO).toMatch(/e\.key === 'Enter'/)
  })
})
