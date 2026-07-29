import { describe, it, expect } from 'vitest'
import { canonicalRegion, classifyGeo, NZ_REGIONS } from '../supabase/functions/_shared/leadGeo.ts'

// Admin Portal v2, F — the shared geo/region module now backs BOTH lead-intake
// and lead-harvest. These lock the two facts that were diverging: the macron
// canonical spelling, and identical geo classification.

describe('canonicalRegion', () => {
  it('canonicalises to the macron spelling from any variant (harvest↔intake parity)', () => {
    for (const v of ['Manawatu-Whanganui', 'manawatu', 'Wanganui', 'whanganui']) {
      expect(canonicalRegion(v)).toBe('Manawatū-Whanganui')
    }
  })
  it('folds Wairarapa towns into Wellington and passes exact regions through', () => {
    expect(canonicalRegion('Masterton')).toBe('Wellington')
    expect(canonicalRegion('Canterbury')).toBe('Canterbury')
  })
  it('returns null for unknown / empty input', () => {
    expect(canonicalRegion('Atlantis')).toBeNull()
    expect(canonicalRegion(null)).toBeNull()
  })
})

describe('classifyGeo', () => {
  it('flags intl on a foreign dial prefix, foreign ccTLD, or overseas place-word', () => {
    expect(classifyGeo({ phone: '+353 87 1234567' }, null, '')).toBe('intl')
    expect(classifyGeo({ email: 'jobs@farm.ie' }, null, '')).toBe('intl')
    expect(classifyGeo(null, null, 'dairy farm in Tasmania')).toBe('intl')
  })
  it('is nz when the region is a real NZ region and no intl signal', () => {
    expect(classifyGeo({ phone: '+64 21 123 4567' }, 'Waikato', 'Morrinsville')).toBe('nz')
  })
  it('is unknown when there is no region and no intl signal', () => {
    expect(classifyGeo({}, null, 'great opportunity')).toBe('unknown')
  })
  it('does not false-positive intl on NZ +64 numbers', () => {
    expect(classifyGeo({ phone: '+64 3 123 4567' }, 'Otago', '')).toBe('nz')
  })
})

describe('NZ_REGIONS', () => {
  it('has all 16 regions with the macron spelling', () => {
    expect(NZ_REGIONS).toHaveLength(16)
    expect(NZ_REGIONS).toContain('Manawatū-Whanganui')
  })
})
