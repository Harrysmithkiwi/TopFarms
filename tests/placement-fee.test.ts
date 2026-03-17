import { describe, it, expect } from 'vitest'
import { calculatePlacementFee } from '@/types/domain'

describe('calculatePlacementFee', () => {
  it('returns entry tier for salary under $55k', () => {
    const result = calculatePlacementFee(40000, 50000, 'Farm Hand')
    expect(result.tier).toBe('entry')
    expect(result.amount).toBe(20000)
    expect(result.displayAmount).toBe('$200')
  })

  it('returns experienced tier for salary $55k-$80k', () => {
    const result = calculatePlacementFee(55000, 70000, 'Farm Worker')
    expect(result.tier).toBe('experienced')
    expect(result.amount).toBe(40000)
    expect(result.displayAmount).toBe('$400')
  })

  it('returns senior tier for salary $80k+', () => {
    const result = calculatePlacementFee(80000, 100000, 'Dairy Worker')
    expect(result.tier).toBe('senior')
    expect(result.amount).toBe(80000)
    expect(result.displayAmount).toBe('$800')
  })

  it('bumps entry to experienced when title contains senior keyword', () => {
    const result = calculatePlacementFee(40000, 50000, 'Farm Manager')
    expect(result.tier).toBe('experienced')
    expect(result.amount).toBe(40000)
  })

  it('bumps experienced to senior when title contains senior keyword', () => {
    const result = calculatePlacementFee(60000, 75000, 'Head Stockman')
    expect(result.tier).toBe('senior')
    expect(result.amount).toBe(80000)
  })

  it('does not bump senior down even without keyword', () => {
    const result = calculatePlacementFee(90000, 110000, 'Farm Worker')
    expect(result.tier).toBe('senior')
  })

  it('handles null salary values as 0', () => {
    const result = calculatePlacementFee(null, null, 'Farm Hand')
    expect(result.tier).toBe('entry')
    expect(result.amount).toBe(20000)
  })

  it('title keyword check is case-insensitive', () => {
    // avgSalary = 45000 → entry tier; 'SENIOR' keyword bumps entry → experienced
    const result = calculatePlacementFee(40000, 50000, 'SENIOR Farm Hand')
    expect(result.tier).toBe('experienced')
    expect(result.amount).toBe(40000)
  })
})

describe('PlacementFeeModal — contact masking UI (placeholder tests)', () => {
  it.todo('shows blurred placeholder when contacts prop is null')
  it.todo('shows real contact data when contacts prop is provided')
  it.todo('shows "Not provided" when phone is null after acknowledgement')
})

describe('PlacementFeeModal — shortlist intercept (placeholder tests)', () => {
  it.todo('handleTransition intercepts shortlisted status and shows modal')
  it.todo('modal cancel keeps applicant at prior stage')
})
