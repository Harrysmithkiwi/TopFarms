import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FILTER_KEYS } from '@/lib/savedSearch'

// Test intent — audit F-17.
//
// `q` was READ by JobSearch and SENT by OpenRolesSection, and appeared in NO registry. So a
// text search produced no pill, could not be removed, was silently dropped by a saved search,
// survived Clear All, and drove the "no filters applied" empty state while filtering hard.
//
// Four registries were kept in step by hand — savedSearch's FILTER_KEYS, JobSearch's clear-all
// list, ActiveFilterPills' label map, and FilterSidebar's hasActiveFilters. FILTER_KEYS' own
// docstring named the drift risk, and it had then drifted exactly as predicted.
//
// Four filters were deleted rather than repaired: `mentorship`, `vehicle`, `dairynz_pathway`
// and `dairynz_level` rendered, persisted and pilled while JobSearch applied none of them,
// because `jobs` has no column for any of them. A filter that visibly narrows nothing is worse
// than a missing one — the seeker reads the unchanged list as "these are the only jobs".

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')
const SEARCH = read('src/pages/jobs/JobSearch.tsx')
const PILLS = read('src/components/ui/ActiveFilterPills.tsx')
const SIDEBAR = read('src/components/ui/FilterSidebar.tsx')

const DEAD = ['mentorship', 'vehicle', 'dairynz_pathway', 'dairynz_level']

describe('F-17 — one list, not four', () => {
  it('JobSearch derives its clear-all from FILTER_KEYS', () => {
    // A derived list cannot drift. A copied one already had.
    expect(SEARCH).toMatch(/FILTER_KEYS\.filter\(\(k\) => k !== 'sort'\)/)
  })

  it('q is registered', () => {
    expect(FILTER_KEYS).toContain('q')
  })

  it('every registered key that can show a pill has a label', () => {
    // `accredited` was added to the pill key set during Phase D and had no label — the same
    // defect as `q`, reintroduced by the fix for a different ticket.
    const singles = /const SINGLE_VALUE_KEYS = new Set\(\[([^\]]*)\]\)/.exec(PILLS)
    expect(singles, 'SINGLE_VALUE_KEYS not found').not.toBeNull()
    const keys = [...singles![1].matchAll(/'(\w+)'/g)].map((m) => m[1])
    for (const k of keys) {
      expect(PILLS, `${k} is a pill key with no label`).toMatch(new RegExp(`^\\s*${k}: \\(`, 'm'))
    }
  })
})

describe('F-17 — a filter that filters nothing is gone', () => {
  it.each(DEAD)('%s is not offered anywhere', (key) => {
    // Comments are stripped: each removal is explained in place, and an assertion that cannot
    // tell code from commentary is not an assertion.
    const code = (s: string) =>
      s
        .split('\n')
        .filter((l) => {
          const t = l.trimStart()
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*')
        })
        .join('\n')
    expect(code(SIDEBAR)).not.toMatch(new RegExp(`'${key}'`))
    expect(code(PILLS)).not.toMatch(new RegExp(`\\b${key}:`))
    expect(FILTER_KEYS as readonly string[]).not.toContain(key)
  })

  it('posted_recent survives, because it does filter', () => {
    expect(FILTER_KEYS).toContain('posted_recent')
    expect(SIDEBAR).toMatch(/'posted_recent', label: 'Posted in last 7 days'/)
  })
})
