import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// Small fixes, 25 Nov 2026 (PR topfarms/small-fixes-2026-11-25). Regression
// tests for the three behaviours that have no other coverage: the duplicate
// farm-type question disappearing from employer onboarding step 2, the
// ?role= parked across the Google OAuth round trip, and the ?ref=
// passthrough helpers shared by the landing pages.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock, rpc: vi.fn(), auth: { updateUser: vi.fn() } },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Step2FarmDetails } from '@/pages/onboarding/steps/Step2FarmDetails'
import { SelectRole } from '@/pages/auth/SelectRole'
import { readAttributionRef, signupHref } from '@/lib/attribution'

const rpcMock = vi.mocked(supabase.rpc)

const baseAuth = {
  signUpWithRole: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  refreshRole: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  sessionStorage.clear()
})

describe('Step2FarmDetails — step 1 already answered farm type', () => {
  it('does not re-ask farm type when exactly one type is already known, and still submits it', async () => {
    const onComplete = vi.fn()
    render(
      <Step2FarmDetails
        onComplete={onComplete}
        onBack={vi.fn()}
        defaultValues={{
          farm_name: 'Green Valley',
          region: 'Waikato',
          farm_types: ['sheep_beef'],
        }}
      />,
    )

    // The duplicate question is gone…
    expect(screen.queryByText('Farm type')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())

    // …but the answer still reaches the upsert, from defaultValues.
    expect(onComplete.mock.calls[0][0].farm_types).toEqual(['sheep_beef'])
  })

  it('still asks farm type when nothing is known yet', () => {
    render(
      <Step2FarmDetails
        onComplete={vi.fn()}
        onBack={vi.fn()}
        defaultValues={{ farm_name: 'Green Valley', region: 'Waikato', farm_types: [] }}
      />,
    )
    expect(screen.getByText('Farm type')).toBeInTheDocument()
  })

  it('still asks farm type when more than one type is known', () => {
    render(
      <Step2FarmDetails
        onComplete={vi.fn()}
        onBack={vi.fn()}
        defaultValues={{
          farm_name: 'Green Valley',
          region: 'Waikato',
          farm_types: ['dairy', 'sheep_beef'],
        }}
      />,
    )
    expect(screen.getByText('Farm type')).toBeInTheDocument()
  })
})

describe('SelectRole — ?role= parked across the OAuth round trip', () => {
  it('writes back a parked employer role for a fresh signup the trigger defaulted to seeker', async () => {
    sessionStorage.setItem('tf-signup-role', 'employer')
    rpcMock.mockResolvedValue({ error: null } as never)
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123', created_at: new Date().toISOString() } } as never,
      role: 'seeker',
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('set_user_role', { p_role: 'employer' }),
    )
    // The parked value is consumed, not left to flip a later session.
    expect(sessionStorage.getItem('tf-signup-role')).toBeNull()
  })

  it('leaves the stored role alone when the parked role already matches it', async () => {
    sessionStorage.setItem('tf-signup-role', 'seeker')
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123', created_at: new Date().toISOString() } } as never,
      role: 'seeker',
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument(),
    )
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('ignores a parked role for a returning user re-authenticating', async () => {
    sessionStorage.setItem('tf-signup-role', 'employer')
    const oldAccount = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123', created_at: oldAccount } } as never,
      role: 'seeker',
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument(),
    )
    expect(rpcMock).not.toHaveBeenCalled()
  })
})

describe('attribution helpers — ?ref= passthrough', () => {
  it('accepts the first 8 hex characters of a lead id, and a full UUID', () => {
    expect(readAttributionRef(new URLSearchParams('ref=1a2b3c4d'))).toBe('1a2b3c4d')
    expect(
      readAttributionRef(new URLSearchParams('ref=1a2b3c4d-1111-2222-3333-444455556666')),
    ).toBe('1a2b3c4d-1111-2222-3333-444455556666')
  })

  it('rejects junk rather than letting it ride into user metadata', () => {
    expect(readAttributionRef(new URLSearchParams('ref=not-a-ref'))).toBeNull()
    expect(readAttributionRef(new URLSearchParams(''))).toBeNull()
  })

  it('carries ?ref= through to the signup CTA, and omits it when absent', () => {
    expect(signupHref('employer', '1a2b3c4d')).toBe('/signup?role=employer&ref=1a2b3c4d')
    expect(signupHref('seeker', null)).toBe('/signup?role=seeker')
  })
})
