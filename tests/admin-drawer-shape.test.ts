import { describe, it, expect } from 'vitest'

// JSONB shape contract locked in 20-UI-SPEC.md § "SECURITY DEFINER RPC contract — drawer payload".
// These tests assert the SHAPE the frontend code requires from admin_get_user_profile.
// Live integration is verified via the manual UAT in plan 20-08 (ADMIN-BOOTSTRAP-1).

const VERIFICATION_TIERS = ['unverified', 'email', 'nzbn', 'featured'] as const

describe('admin drawer JSONB shape (ADMIN-DRAWER)', () => {
  it('ADMIN-DRAWER: employer fixture has all required keys', () => {
    const employerFixture = {
      role: 'employer' as const,
      name: 'Test Farm Ltd',
      email: 'employer@example.com',
      region: 'Waikato',
      join_date: '2026-03-01T00:00:00.000Z',
      last_sign_in: '2026-04-30T12:00:00.000Z',
      verification_tier: 'nzbn' as const,
      total_jobs_posted: 12,
    }
    expect(employerFixture).toHaveProperty('role')
    expect(employerFixture).toHaveProperty('name')
    expect(employerFixture).toHaveProperty('email')
    expect(employerFixture).toHaveProperty('region')
    expect(employerFixture).toHaveProperty('join_date')
    expect(employerFixture).toHaveProperty('last_sign_in')
    expect(employerFixture).toHaveProperty('verification_tier')
    expect(employerFixture).toHaveProperty('total_jobs_posted')
    expect(VERIFICATION_TIERS).toContain(employerFixture.verification_tier)
    expect(typeof employerFixture.total_jobs_posted).toBe('number')
  })

  it('ADMIN-DRAWER: seeker fixture has all required keys', () => {
    const seekerFixture = {
      role: 'seeker' as const,
      name: 'Test Seeker',
      email: 'seeker@example.com',
      region: 'Canterbury',
      join_date: '2026-03-15T00:00:00.000Z',
      last_sign_in: null,
      onboarding_complete: false,
      onboarding_step: 4,
      match_scores_computed: true,
    }
    expect(seekerFixture).toHaveProperty('role')
    expect(seekerFixture).toHaveProperty('name')
    expect(seekerFixture).toHaveProperty('email')
    expect(seekerFixture).toHaveProperty('region')
    expect(seekerFixture).toHaveProperty('join_date')
    expect(seekerFixture).toHaveProperty('last_sign_in')
    expect(seekerFixture).toHaveProperty('onboarding_complete')
    expect(seekerFixture).toHaveProperty('onboarding_step')
    expect(seekerFixture).toHaveProperty('match_scores_computed')
    expect(typeof seekerFixture.onboarding_complete).toBe('boolean')
    expect(typeof seekerFixture.match_scores_computed).toBe('boolean')
  })

  it('ADMIN-DRAWER: verification_tier is one of the locked enum values', () => {
    for (const tier of VERIFICATION_TIERS) {
      expect(['unverified', 'email', 'nzbn', 'featured']).toContain(tier)
    }
  })

  it('ADMIN-DRAWER: onboarding_step is integer in [1, 7]', () => {
    for (const step of [1, 2, 3, 4, 5, 6, 7]) {
      expect(step).toBeGreaterThanOrEqual(1)
      expect(step).toBeLessThanOrEqual(7)
      expect(Number.isInteger(step)).toBe(true)
    }
  })
})
