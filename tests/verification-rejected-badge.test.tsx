import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { EmployerVerification } from '@/pages/verification/EmployerVerification'
import type { EmployerVerification as Row } from '@/types/domain'

// Test intent — found on live prod 2026-08-17.
//
// The status chip had exactly three branches: isVerified, isPending, and !verification. A
// REJECTED row is truthy but neither verified nor pending, so all three were false and the
// card rendered NO badge — while the action link (gated on !isVerified && !isPending) still
// showed. An employer whose NZBN was rejected saw a card that looked untouched, and had to
// expand it to discover the rejection, the reason, and the resubmit form.
//
// Rejection is the ONE state that requires the employer to act, so it was the worst one to
// leave silent. Removing this branch passed all 727 tests before this file existed.

const mocks = vi.hoisted(() => ({
  verifications: [] as Row[],
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, role: 'employer', loading: false }),
}))

vi.mock('@/hooks/useVerifications', async (orig) => {
  const actual = await orig<typeof import('@/hooks/useVerifications')>()
  return {
    ...actual,
    useVerifications: () => ({
      verifications: mocks.verifications,
      loading: false,
      trustLevel: actual.computeTrustLevel(mocks.verifications),
      refresh: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { id: 'emp-1' }, error: null }) }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}))

const row = (method: string, status: string): Row => ({ method, status }) as Row

function renderHub() {
  return render(
    <MemoryRouter>
      <EmployerVerification />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.verifications = []
})

describe('verification hub — a rejected method must announce itself', () => {
  it('shows an action-needed badge when a verification is rejected', async () => {
    mocks.verifications = [row('email', 'verified'), row('nzbn', 'rejected')]
    renderHub()
    await waitFor(() => expect(screen.getByText(/action needed/i)).toBeInTheDocument())
  })

  it('does not show it for verified, pending, or absent rows', async () => {
    mocks.verifications = [row('email', 'verified'), row('nzbn', 'pending')]
    renderHub()
    await waitFor(() => expect(screen.getByText(/pending review/i)).toBeInTheDocument())
    expect(screen.queryByText(/action needed/i)).not.toBeInTheDocument()
  })
})

describe('verification hub — phone is gone from the surface', () => {
  it('offers no phone verification control', async () => {
    // The provider is disabled project-wide: updateUser({ phone }) returns 500 "Unable to
    // get SMS provider". Leaving the card would be a second dead button, which is exactly
    // what the Facebook button was.
    mocks.verifications = [row('email', 'verified')]
    renderHub()
    await waitFor(() => expect(screen.getByText(/email address/i)).toBeInTheDocument())
    expect(screen.queryByText(/verify phone/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/phone number/i)).not.toBeInTheDocument()
  })

  it('does not advertise a tier that requires phone', async () => {
    mocks.verifications = [row('email', 'verified')]
    renderHub()
    await waitFor(() => expect(screen.getByText(/how trust levels work/i)).toBeInTheDocument())
    // The panel used to promise "Email + Phone verified" for a tier nobody could reach.
    expect(screen.queryByText(/\+ Phone/i)).not.toBeInTheDocument()
  })
})
