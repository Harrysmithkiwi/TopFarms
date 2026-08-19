import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'

// IS-ACTIVE-02: loadRole fetches { role, is_active } in a single user_roles query.
// IS-ACTIVE-03: loadRole returns isActive=true on DB error (no false-positive suspension).
// Wave 3 plan 21-04 implementation; this file exercises the contract via
// AuthProvider mount (loadRole is not exported directly — we observe it via the
// supabase.from chain mock and the resulting useAuth() value).

const selectMock = vi.fn()
const eqMock = vi.fn()
const singleMock = vi.fn()
const fromMock = vi.fn(() => ({ select: selectMock }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockReset()
  eqMock.mockReset()
  singleMock.mockReset()
  selectMock.mockImplementation(() => ({ eq: eqMock }))
  eqMock.mockImplementation(() => ({ single: singleMock }))
})

interface AuthSnapshot {
  role: unknown
  isActive: unknown
  loading: unknown
}

async function mountAndCapture(): Promise<AuthSnapshot> {
  let captured: AuthSnapshot = { role: undefined, isActive: undefined, loading: undefined }
  const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
  function Probe(): null {
    const auth = useAuth()
    captured = { role: auth.role, isActive: auth.isActive, loading: auth.loading }
    return null
  }
  render(createElement(AuthProvider, { children: createElement(Probe) as ReactNode }))
  return new Promise<AuthSnapshot>((resolve) => {
    setTimeout(() => resolve(captured), 0)
  }).then(() => captured)
}

describe('AuthContext.loadRole is_active extension (IS-ACTIVE-02, IS-ACTIVE-03)', () => {
  it('IS-ACTIVE-02: loadRole calls select("role, is_active") — single round-trip', async () => {
    singleMock.mockResolvedValue({
      data: { role: 'seeker', is_active: true },
      error: null,
    })
    await mountAndCapture()
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('user_roles')
      expect(selectMock).toHaveBeenCalledWith('role, is_active')
      expect(eqMock).toHaveBeenCalledWith('user_id', 'u1')
    })
    // Single round-trip: only one .from('user_roles') call during mount
    const userRolesCalls = fromMock.mock.calls.filter((c) => c[0] === 'user_roles').length
    expect(userRolesCalls).toBe(1)
  })

  it('IS-ACTIVE-02: AuthHookReturn exposes isActive=true on happy path', async () => {
    singleMock.mockResolvedValue({
      data: { role: 'seeker', is_active: true },
      error: null,
    })
    let captured: { role: unknown; isActive: unknown; loading: unknown } = {
      role: undefined,
      isActive: undefined,
      loading: undefined,
    }
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe(): null {
      const auth = useAuth()
      captured = { role: auth.role, isActive: auth.isActive, loading: auth.loading }
      return null
    }
    render(createElement(AuthProvider, { children: createElement(Probe) as ReactNode }))
    await waitFor(() => expect(captured.role).toBe('seeker'))
    expect(captured.isActive).toBe(true)
  })

  it('IS-ACTIVE-02: AuthHookReturn exposes isActive=false when DB says so', async () => {
    singleMock.mockResolvedValue({
      data: { role: 'seeker', is_active: false },
      error: null,
    })
    let captured: { role: unknown; isActive: unknown; loading: unknown } = {
      role: undefined,
      isActive: undefined,
      loading: undefined,
    }
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe(): null {
      const auth = useAuth()
      captured = { role: auth.role, isActive: auth.isActive, loading: auth.loading }
      return null
    }
    render(createElement(AuthProvider, { children: createElement(Probe) as ReactNode }))
    await waitFor(() => expect(captured.role).toBe('seeker'))
    expect(captured.isActive).toBe(false)
  })

  it('IS-ACTIVE-03: DB error returns role=null, isActive=true (no false-positive suspension)', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'transient' } })
    let captured: { role: unknown; isActive: unknown; loading: unknown } = {
      role: undefined,
      isActive: undefined,
      loading: undefined,
    }
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe(): null {
      const auth = useAuth()
      captured = { role: auth.role, isActive: auth.isActive, loading: auth.loading }
      return null
    }
    render(createElement(AuthProvider, { children: createElement(Probe) as ReactNode }))
    await waitFor(() => expect(captured.loading).toBe(false))
    expect(captured.role).toBeNull()
    expect(captured.isActive).toBe(true)
  })

  it('IS-ACTIVE-03: is_active=null in row defaults to isActive=true (DB default fallback)', async () => {
    singleMock.mockResolvedValue({
      data: { role: 'seeker', is_active: null },
      error: null,
    })
    let captured: { role: unknown; isActive: unknown; loading: unknown } = {
      role: undefined,
      isActive: undefined,
      loading: undefined,
    }
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe(): null {
      const auth = useAuth()
      captured = { role: auth.role, isActive: auth.isActive, loading: auth.loading }
      return null
    }
    render(createElement(AuthProvider, { children: createElement(Probe) as ReactNode }))
    await waitFor(() => expect(captured.role).toBe('seeker'))
    expect(captured.isActive).toBe(true)
  })
})

// Observed on live prod 2026-08-19 with Chrome DevTools: "[useAuth] loadRole timeout after 3s"
// logged twice on every page load while both user_roles requests returned 200 in milliseconds.
// Promise.race settles on the winner but does not cancel the loser, so the timer always fired.
// Control flow was never wrong — but the auth subsystem cried wolf on every navigation, which
// is the same defect shape as a swallowed error: a signal that no longer means anything.
describe('loadRole timeout does not fire after a successful load', () => {
  it('clears the 3s timer once the role resolves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      singleMock.mockResolvedValue({ data: { role: 'seeker', is_active: true }, error: null })
      await mountAndCapture()
      await waitFor(() => expect(singleMock).toHaveBeenCalled())

      await vi.advanceTimersByTimeAsync(5000)

      const timeoutWarnings = warn.mock.calls.filter((c) => String(c[0]).includes('loadRole timeout'))
      expect(timeoutWarnings).toEqual([])
    } finally {
      warn.mockRestore()
      vi.useRealTimers()
    }
  })
})

