import { describe, it, expect } from 'vitest'
import { computeTrustLevel } from '@/hooks/useVerifications'
import type { EmployerVerification } from '@/types/domain'

// Test intent — the trust ladder had NO coverage. Removing the phone tier on 2026-08-17
// broke nothing in the suite, which is the whole problem: this is the badge every worker
// judges an employer by, and it was free to change silently.
//
// Phone was dropped for two reasons. It was UNEARNABLE — phone auth is disabled
// project-wide, so `updateUser({ phone })` returns 500 "Unable to get SMS provider", and
// because BOTH upper tiers required it, every employer was pinned at `basic` no matter what
// they supplied. And it was the WRONG SIGNAL: an NZBN is a government registry number and a
// deed is a legal document, while a confirmed mobile proves someone held a phone for thirty
// seconds. Identity now promotes an employer, which is what the badge always meant to say.

const v = (method: string, status = 'verified'): EmployerVerification =>
  ({ method, status }) as EmployerVerification

describe('trust ladder', () => {
  it('is unverified with nothing, and with nothing VERIFIED', () => {
    expect(computeTrustLevel([])).toBe('unverified')
    // A pending NZBN is a submission, not a verification — it must not promote anyone.
    expect(computeTrustLevel([v('nzbn', 'pending')])).toBe('unverified')
    expect(computeTrustLevel([v('email', 'rejected')])).toBe('unverified')
  })

  it('is basic on email alone', () => {
    expect(computeTrustLevel([v('email')])).toBe('basic')
  })

  it('is verified on email + identity, by either route', () => {
    expect(computeTrustLevel([v('email'), v('nzbn')])).toBe('verified')
    expect(computeTrustLevel([v('email'), v('document')])).toBe('verified')
  })

  it('is fully_verified on email + identity + farm photo', () => {
    expect(computeTrustLevel([v('email'), v('nzbn'), v('farm_photo')])).toBe('fully_verified')
    expect(computeTrustLevel([v('email'), v('document'), v('farm_photo')])).toBe('fully_verified')
  })

  it('no longer requires phone for either upper tier', () => {
    // The regression that mattered: with phone in the ladder, BOTH of these returned
    // 'basic' — an employer who had supplied every piece of evidence available to them
    // still showed workers the weakest badge.
    expect(computeTrustLevel([v('email'), v('nzbn')])).not.toBe('basic')
    expect(computeTrustLevel([v('email'), v('nzbn'), v('farm_photo')])).not.toBe('basic')
  })

  it('does not let a farm photo alone buy a tier', () => {
    // farm_photo self-verifies without admin review (085), so it must never be sufficient
    // on its own — otherwise the one rung an employer can grant themselves would promote
    // them past the ones an admin rules on.
    expect(computeTrustLevel([v('email'), v('farm_photo')])).toBe('basic')
    expect(computeTrustLevel([v('farm_photo')])).toBe('unverified')
  })

  it('still ignores a lingering verified phone row', () => {
    // Rows written before the change exist in prod. They must neither promote nor demote.
    expect(computeTrustLevel([v('email'), v('phone')])).toBe('basic')
    expect(computeTrustLevel([v('email'), v('phone'), v('nzbn')])).toBe('verified')
  })
})
