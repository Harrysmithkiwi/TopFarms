import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ConfirmEmail } from '@/pages/auth/ConfirmEmail'

// Test intent — the signup-blocker fix (audit 2026-08-20 §1).
//
// The default Supabase links carry `?token=…`; quoted-printable encodes that as
// `token=3D46b4…` and a double decode in the mail path delivers `tokenF…` — 100% of
// verification links broken. The fix routes tokens through a PATH segment
// (`/auth/confirm/:type/:tokenHash`) so no `=` precedes the token, and this page exchanges
// it with verifyOtp. These tests pin the exchange call shape, the per-role routing (same
// F-12 rules as VerifyEmail: maybeSingle, never guess a role from a failed read), the
// recovery hand-off to /auth/reset, and the failure state's resend affordance.

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  resend: vi.fn(),
  getSession: vi.fn(),
  maybeSingle: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: mocks.verifyOtp,
      resend: mocks.resend,
      getSession: mocks.getSession,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  },
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => mocks.navigate }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/confirm/:type/:tokenHash" element={<ConfirmEmail />} />
      </Routes>
    </MemoryRouter>,
  )
}

const VERIFIED = { data: { user: { id: 'user-1' }, session: {} }, error: null }
const EXPIRED = {
  data: { user: null, session: null },
  error: { message: 'Token has expired or is invalid' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ConfirmEmail — token exchange', () => {
  it('exchanges the path token via verifyOtp and routes an employer to their dashboard', async () => {
    mocks.verifyOtp.mockResolvedValue(VERIFIED)
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'employer' }, error: null })

    renderAt('/auth/confirm/signup/abc123')

    await waitFor(() =>
      expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc123' }),
    )
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/employer', { replace: true }),
    )
  })

  it('routes a verified user with no role to select-role, never guessing seeker', async () => {
    mocks.verifyOtp.mockResolvedValue(VERIFIED)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    renderAt('/auth/confirm/signup/abc123')

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/auth/select-role', { replace: true }),
    )
  })

  it('a failed role read shows the role error, not a guessed dashboard (F-12)', async () => {
    mocks.verifyOtp.mockResolvedValue(VERIFIED)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'network' } })

    renderAt('/auth/confirm/signup/abc123')

    await waitFor(() =>
      expect(screen.getByText(/could not load your account type/i)).toBeInTheDocument(),
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('recovery routes to the password form, not the dashboard', async () => {
    mocks.verifyOtp.mockResolvedValue(VERIFIED)

    renderAt('/auth/confirm/recovery/abc123')

    await waitFor(() =>
      expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc123' }),
    )
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/auth/reset', { replace: true }),
    )
    // The token authorises a password change — the role table is not consulted.
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })
})

describe('ConfirmEmail — failure states', () => {
  it('an expired signup token shows the error with a resend affordance', async () => {
    mocks.verifyOtp.mockResolvedValue(EXPIRED)

    renderAt('/auth/confirm/signup/stale')

    await waitFor(() => expect(screen.getByText(/didn't work/i)).toBeInTheDocument())
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send a new verification email/i }),
    ).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('an expired recovery token points at forgot-password instead of resend', async () => {
    mocks.verifyOtp.mockResolvedValue(EXPIRED)

    renderAt('/auth/confirm/recovery/stale')

    await waitFor(() => expect(screen.getByText(/didn't work/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('an unknown type never calls verifyOtp and shows the error state', async () => {
    renderAt('/auth/confirm/bogus/abc123')

    await waitFor(() => expect(screen.getByText(/didn't work/i)).toBeInTheDocument())
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
  })
})
