import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { visaLabel, dairynzLabel, labelFrom, VISA_OPTIONS } from '@/types/domain'
import { Sidebar } from '@/components/layout/Sidebar'

// Sidebar only needs the role to choose its nav item list; the full AuthProvider
// would drag in a live Supabase session for an assertion about an href.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'seeker', signOut: vi.fn() }),
}))

// Test intent — the two defects found driving the seeker UAT on prod, 2026-08-16.
//
// 1. A seeker who finished onboarding could not edit their profile at all.
//    /onboarding/seeker hard-redirects once onboarding_complete is true, and every
//    "Edit Profile" affordance pointed at it, so all of them were no-ops. The guard
//    below is on the sidebar link, because that is the persistent one — a seeker sees
//    it on every page, and it is the affordance most likely to be silently repointed
//    back during a future nav refactor.
//
// 2. Stored enum values were rendered with .replace(/_/g,' ') + CSS capitalize
//    instead of their option-list label, so `nz_citizen` displayed as "Nz Citizen" —
//    including on ApplicantPanel, the employer-facing surface behind a paid
//    placement.

describe('seeker profile — enum labels', () => {
  it('renders visa status from the option list, not by de-underscoring', () => {
    // The exact regression: the old code produced "Nz Citizen".
    expect(visaLabel('nz_citizen')).toBe('NZ Citizen')
    expect(visaLabel('nz_citizen')).not.toBe('nz citizen')
    expect(visaLabel('permanent_resident')).toBe('Permanent Resident')
    expect(visaLabel('needs_sponsorship')).toBe('Needs Visa Sponsorship')
  })

  it('renders DairyNZ levels from the option list', () => {
    expect(dairynzLabel('level_3')).toBe('Level 3')
    expect(dairynzLabel('none')).toBe('None')
  })

  it('every visa option round-trips through visaLabel', () => {
    // Guards against an option being added to the picker but not reaching display.
    for (const option of VISA_OPTIONS) {
      expect(visaLabel(option.value)).toBe(option.label)
    }
  })

  it('falls back to readable text for an unmapped value rather than blanking it', () => {
    expect(labelFrom(VISA_OPTIONS, 'some_future_visa')).toBe('some future visa')
  })

  it('returns an empty string for null/undefined so callers can guard on falsiness', () => {
    expect(visaLabel(null)).toBe('')
    expect(visaLabel(undefined)).toBe('')
    expect(visaLabel('')).toBe('')
  })
})

describe('seeker profile — the edit route is reachable', () => {
  it('sidebar Edit Profile points at the editor, not at onboarding', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /edit profile/i })

    // The defect in one assertion: /onboarding/seeker bounces a completed seeker
    // straight back out, so pointing here makes the link do nothing at all.
    expect(link).toHaveAttribute('href', '/dashboard/seeker/profile')
    expect(link).not.toHaveAttribute('href', '/onboarding/seeker')
  })
})
