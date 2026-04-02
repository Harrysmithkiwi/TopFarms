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
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('Login page renders Facebook OAuth button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument()
  })

  it('SignUp page renders Google OAuth button', () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('SignUp page renders Facebook OAuth button', () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument()
  })

  it('Google button calls signInWithOAuth with google provider', async () => {
    mockSignInWithOAuth.mockClear()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
  })

  it('Facebook button calls signInWithOAuth with facebook provider', async () => {
    mockSignInWithOAuth.mockClear()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /continue with facebook/i }))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith('facebook')
  })
})
