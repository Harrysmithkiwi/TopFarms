import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// docs/DESIGN.md §5 lists heading structure in the BLOCKING accessibility set: "One h1,
// and a heading for each region of content". axe does not check this - it verifies that
// present headings are ordered, not that a region has one at all - so it is the
// judgement gate's job, and this test is that gate made mechanical.
//
// Found by the pre-launch UAT design pass, 2026-08-24: EmployerDashboard put its h1 only
// inside the onboarding-COMPLETE branch, so a brand-new employer - the very first screen
// a new farmer sees - rendered with zero h1 and a bare h2.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

// A dashboard that branches on onboarding state must carry an h1 in EVERY branch.
const BRANCHED = [
  ['EmployerDashboard', 'src/pages/dashboard/EmployerDashboard.tsx'],
  ['SeekerDashboard', 'src/pages/dashboard/SeekerDashboard.tsx'],
] as const

describe('dashboard heading structure (DESIGN.md §5, blocking)', () => {
  it.each(BRANCHED)('%s has an h1 in both the complete and incomplete branch', (_n, path) => {
    const src = read(path)
    const incomplete = src.indexOf('{!isOnboardingComplete && (')
    const complete = src.indexOf('{isOnboardingComplete && (', incomplete + 1)
    expect(incomplete, 'incomplete branch not found').toBeGreaterThan(-1)
    expect(complete, 'complete branch not found').toBeGreaterThan(incomplete)

    // Each branch must open an h1 within its own span.
    expect(src.slice(incomplete, complete), 'no <h1> in the onboarding-incomplete branch')
      .toMatch(/<h1[\s>]/)
    expect(src.slice(complete), 'no <h1> in the onboarding-complete branch')
      .toMatch(/<h1[\s>]/)
  })

  it.each([
    ['MyApplications', 'src/pages/dashboard/seeker/MyApplications.tsx'],
    ['SeekerDocuments', 'src/pages/dashboard/seeker/SeekerDocuments.tsx'],
    ['SavedSearches', 'src/pages/dashboard/seeker/SavedSearches.tsx'],
  ])('%s carries exactly one h1', (_n, path) => {
    expect(read(path).match(/<h1[\s>]/g)?.length ?? 0).toBe(1)
  })
})
