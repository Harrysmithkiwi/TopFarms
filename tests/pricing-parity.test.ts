import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculatePlacementFee, PLACEMENT_FEE_TIERS } from '@/types/domain'

// THE TEST supabase/functions/_shared/pricing.ts SAYS ALREADY EXISTS.
//
// That module's header reads: "The client keeps its copy of this algorithm for
// DISPLAY ONLY. If the two drift, tests/pricing-parity.test.ts fails." The file did
// not exist. The claim was load-bearing and unenforced, which is worse than no claim
// at all, because it reads as a guarantee to whoever edits one copy.
//
// It matters more now than when it was written. Directive 1.19 removed listing fees,
// so the placement fee is the ENTIRE revenue model. The server derivation
// (derivePlacementFeeFromJob) is authoritative and already correct; this guards the
// browser copy against drifting away from it and quoting a price we will not invoice.
//
// Deno source is read as text because vitest cannot import an esm.sh URL module.

const ROOT = resolve(__dirname, '..')
const server = readFileSync(resolve(ROOT, 'supabase/functions/_shared/pricing.ts'), 'utf8')

describe('placement fee: client display matches server derivation', () => {
  it('amounts agree, tier for tier', () => {
    for (const [tier, info] of Object.entries(PLACEMENT_FEE_TIERS)) {
      expect(server).toMatch(new RegExp(`${tier}:\\s*${info.amount}\\b`))
    }
  })

  it('band boundaries agree (55k and 80k, not any other pair)', () => {
    expect(server).toMatch(/avgSalary >= 80000 \? 'senior' : avgSalary >= 55000 \? 'experienced'/)
    // Same boundaries, asserted through the client function's behaviour rather than
    // its source, so a refactor that keeps the contract keeps passing.
    expect(calculatePlacementFee(54999, 54999, 'Farm Hand').tier).toBe('entry')
    expect(calculatePlacementFee(55000, 55000, 'Farm Hand').tier).toBe('experienced')
    expect(calculatePlacementFee(79999, 79999, 'Farm Hand').tier).toBe('experienced')
    expect(calculatePlacementFee(80000, 80000, 'Farm Hand').tier).toBe('senior')
  })

  it('the same title keywords bump, and only upward', () => {
    for (const kw of ['manager', 'head', 'senior', 'supervisor']) {
      expect(server).toContain(`'${kw}'`)
      expect(calculatePlacementFee(30000, 30000, `Farm ${kw}`).tier).toBe('experienced')
    }
    // Never downward: a senior salary with no keyword stays senior.
    expect(calculatePlacementFee(120000, 120000, 'Farm Hand').tier).toBe('senior')
    // And a keyword cannot push past the top band.
    expect(calculatePlacementFee(120000, 120000, 'Senior Manager').tier).toBe('senior')
  })

  it('a missing salary falls to the cheapest band, on both sides', () => {
    expect(calculatePlacementFee(null, null, 'Farm Hand').amount).toBe(20000)
    expect(server).toMatch(/\(\(salaryMin \?\? 0\) \+ \(salaryMax \?\? 0\)\) \/ 2/)
  })
})
