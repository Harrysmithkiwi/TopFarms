import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { VerifyEmail } from '@/pages/auth/VerifyEmail'

// Test intent — audit findings F-12 and F-12b, both found by driving signup on live prod
// 2026-08-17 and both living in this one component.
//
// F-12b (the blocker): the ONLY trigger was the SIGNED_IN event from onAuthStateChange.
// supabase-js consumes the URL hash at MODULE INIT, before this component mounts, so by the
// time the effect subscribed the event had already fired — and the hash was stripped to a
// bare `#`, which also made the old `hasHashToken` check false. Nothing ran. A confirmed,
// signed-in employer sat on "Check your inbox" forever, with a valid session in
// localStorage. Reproduced twice on prod, the second time on wiped storage.
//
// F-12: the role read used `.single()`, DISCARDED its error, and fell back to `?? 'seeker'`.
// A verified EMPLOYER was routed to the seeker dashboard, where ProtectedRoute correctly
// refused them — "Access Denied" at the highest-traffic step of signup.
//
// These are BEHAVIOURAL tests, not source-shape guards, deliberately: F-12b is a race
// between module init and mount, and a grep cannot see a race. The decisive case is
// "session already exists, SIGNED_IN never fires" — the exact prod repro.

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  maybeSingle: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      resend: vi.fn(),
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

const SESSION = { data: { session: { user: { id: 'user-1' } } } }
const NO_SESSION = { data: { session: null } }

function renderPage() {
  return render(
    <MemoryRouter>
      <VerifyEmail />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})

describe('VerifyEmail — F-12b: the session that already exists must still route', () => {
  it('routes an employer whose SIGNED_IN fired before mount', async () => {
    // The prod repro: getSession() resolves a live session and the event NEVER fires.
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'employer' }, error: null })

    renderPage()

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/employer', { replace: true }),
    )
  })

  it('does not strand the user on "Check your inbox" once signed in', async () => {
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'employer' }, error: null })

    renderPage()

    // The dead end. Before the fix this text stayed on screen indefinitely.
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled())
    expect(screen.queryByText(/Resend verification email/i)).not.toBeInTheDocument()
  })

  it('still routes when the session arrives only via SIGNED_IN', async () => {
    // The other direction must keep working — this is the path the old code assumed.
    mocks.getSession.mockResolvedValue(NO_SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'seeker' }, error: null })

    let fire: ((e: string, s: unknown) => void) | undefined
    mocks.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      fire = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    renderPage()
    await waitFor(() => expect(fire).toBeDefined())
    fire!('SIGNED_IN', { user: { id: 'user-1' } })

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/seeker', { replace: true }),
    )
  })

  it('routes exactly once when both triggers fire for the same confirmation', async () => {
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'employer' }, error: null })

    let fire: ((e: string, s: unknown) => void) | undefined
    mocks.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      fire = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    renderPage()
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled())
    fire!('SIGNED_IN', { user: { id: 'user-1' } })

    await new Promise((r) => setTimeout(r, 0))
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
  })

  it('stays on "Check your inbox" when there is genuinely no session', async () => {
    mocks.getSession.mockResolvedValue(NO_SESSION)

    renderPage()

    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled())
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(screen.getByText(/Resend verification email/i)).toBeInTheDocument()
  })
})

describe('VerifyEmail — F-12: a failed role read must never be answered with a guess', () => {
  it('does not route an errored role read to the seeker dashboard', async () => {
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'network' } })

    renderPage()

    // The whole defect: `?? 'seeker'` sent an employer here and ProtectedRoute refused them.
    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalled())
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard/seeker', { replace: true })
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('surfaces a recoverable error instead of a wrong dashboard', async () => {
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'network' } })

    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/could not load your account type/i)).toBeInTheDocument(),
    )
  })

  it('sends a user with no role yet to select-role, not to a guessed one', async () => {
    // A real state, distinct from a failed read — `.maybeSingle()` is what separates them.
    mocks.getSession.mockResolvedValue(SESSION)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    renderPage()

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/auth/select-role', { replace: true }),
    )
  })
})
