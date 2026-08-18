import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase D3, seeker gap G-13.
//
// `jobs.visa_sponsorship` answers "will this farm sponsor". AEWV accreditation answers
// something else entirely: it is a status INZ grants, and without it a migrant cannot apply AT
// ALL — so a farm can honestly offer to sponsor and still be unable to hire them. Three or more
// of the 23 corpus posts are hunting specifically for accredited employers, and the question
// was unanswerable on /jobs.
//
// Migration 091 shipped the column and the derived flag; the filter was explicitly not built.
//
// Proven on prod inside a rolled-back transaction, 2026-08-18:
//   current accreditation      -> accredited_employer true
//   expiry YESTERDAY           -> false          (self-expiring; nobody has to switch it off)
//   never accredited           -> false
//   filter on, 3 jobs staged   -> 1 returned
//   raw inz_accreditation_expires exposed by the view -> 0 columns

const SIDEBAR = readFileSync(
  join(process.cwd(), 'src/components/ui/FilterSidebar.tsx'),
  'utf-8',
)
const SEARCH = readFileSync(join(process.cwd(), 'src/pages/jobs/JobSearch.tsx'), 'utf-8')

describe('D3 — accreditation is filterable and is not sponsorship', () => {
  it('the sidebar offers it as its own control', () => {
    expect(SIDEBAR).toMatch(/label="Accredited employer \(AEWV\)"/)
    expect(SIDEBAR).toMatch(/onFilterChange\('accredited', val \? 'true' : null\)/)
  })

  it('it stays distinct from the sponsorship toggle', () => {
    // Collapsing the two would reintroduce the exact confusion G-13 records: a seeker filtering
    // for sponsorship would silently be shown farms that cannot legally hire them.
    expect(SIDEBAR).toMatch(/label="Visa sponsorship offered"/)
    expect(SIDEBAR).toMatch(/checked=\{accredited === 'true'\}/)
    expect(SIDEBAR).toMatch(/checked=\{visa === 'true'\}/)
  })

  it('says plainly that it is self-declared', () => {
    // F-11's lesson: a self-declared trust claim is not a verified one, and this one can cost
    // a migrant an application fee and a season if they rely on it.
    expect(SIDEBAR).toMatch(/We do not yet check it against the INZ register/)
  })

  it('counts toward the active-filter state', () => {
    // Otherwise the filter applies while the UI reports no filters — the pill and the
    // clear-all both go missing and the empty state reads as "no jobs exist".
    expect(SIDEBAR).toMatch(/accredited !== null \|\|/)
  })
})

describe('D3 — the query filters on the derived flag', () => {
  it('selects accredited_employer from the marketplace view', () => {
    // The view, never the base table: 089 made it owner-rights and its WHERE is the security
    // boundary. The base table has no anon read policy at all.
    expect(SEARCH).toMatch(/marketplace_employer_profiles!inner\([^)]*accredited_employer/)
  })

  it('filters on the derived column, not on inz_accredited', () => {
    // accredited_employer is `inz_accredited AND inz_accreditation_expires > current_date`,
    // recomputed per read. Filtering the raw boolean instead would keep showing a farm whose
    // accreditation lapsed months ago.
    expect(SEARCH).toMatch(/\.eq\('employer_profiles\.accredited_employer', true\)/)
    expect(SEARCH).not.toMatch(/\.eq\('employer_profiles\.inz_accredited'/)
  })

  it('is registered as a known filter param', () => {
    // F-17: `q` was read but absent from the registry, so it produced no pill, could not be
    // saved, and drove the wrong empty state. After F-17 there is ONE list — savedSearch's
    // FILTER_KEYS — which JobSearch derives its clear-all from, so that is where a filter is
    // registered now.
    const saved = readFileSync(join(process.cwd(), 'src/lib/savedSearch.ts'), 'utf-8')
    expect(saved).toMatch(/'accredited',/)
    expect(SEARCH).toMatch(/FILTER_KEYS\.filter\(\(k\) => k !== 'sort'\)/)
  })
})
