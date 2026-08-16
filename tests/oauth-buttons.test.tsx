import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Login } from '@/pages/auth/Login'
import { SignUp } from '@/pages/auth/SignUp'

const mockSignInWithOAuth = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    role: null,
    loading: false,
    signInWithOAuth: mockSignInWithOAuth,
    signUpWithRole: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    refreshRole: vi.fn(),
  }),
}))

describe('OAuth Buttons', () => {
  it('Login page renders Google OAuth button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  // INVERTED 2026-08-17. These three asserted the Facebook button rendered and called
  // signInWithOAuth('facebook'). It did both — and then failed, every time: the provider is
  // not enabled in GoTrue, so `authorize?provider=facebook` returns 400 "provider is not
  // enabled" while google returns 302. The button had never worked, and its catch handler
  // told people to "try again" on the most prominent control of the signup page. Deleted
  // rather than fixed, because enabling it needs a Meta app and business review, not a
  // toggle. The assertions now guard the absence, matching admin-login.test.tsx:85.
  it('Login page does not offer Facebook — the provider is not enabled', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('SignUp page renders Google OAuth button', () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('SignUp page does not offer Facebook — the provider is not enabled', () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('Google button calls signInWithOAuth with google provider', async () => {
    mockSignInWithOAuth.mockClear()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
  })

  it('no OAuth control anywhere asks for a provider other than google', () => {
    // The button is gone; this guards the thing that would bring it back — a call site
    // naming a provider GoTrue has not enabled. `signInWithOAuth` is typed to the single
    // literal 'google' for the same reason, so this is the runtime half of that.
    mockSignInWithOAuth.mockClear()
    for (const Page of [Login, SignUp]) {
      const { unmount } = render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      )
      for (const btn of screen.queryAllByRole('button')) {
        if (/oauth|google|facebook|continue with|sign in with/i.test(btn.textContent ?? ''))
          fireEvent.click(btn)
      }
      unmount()
    }
    expect(mockSignInWithOAuth.mock.calls.length).toBeGreaterThan(0)
    for (const [provider] of mockSignInWithOAuth.mock.calls) expect(provider).toBe('google')
  })
})
