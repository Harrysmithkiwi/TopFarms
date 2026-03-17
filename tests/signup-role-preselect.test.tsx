import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SignUp } from '@/pages/auth/SignUp'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    role: null,
    signUpWithRole: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
    loading: false,
  }),
}))

describe('SignUp Role Pre-selection', () => {
  it('pre-selects seeker role when ?role=seeker URL param present', () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=seeker']}>
        <SignUp />
      </MemoryRouter>
    )
    // When seeker role is pre-selected, the email input is rendered (conditional on selectedRole)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    // Both role buttons are present
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
  })

  it('pre-selects employer role when ?role=employer URL param present', () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=employer']}>
        <SignUp />
      </MemoryRouter>
    )
    // When employer role is pre-selected, the email input is rendered (conditional on selectedRole)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    // Both role buttons are present
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
  })

  it('defaults to null when no role param present', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <SignUp />
      </MemoryRouter>
    )
    // No role pre-selected — email input is NOT rendered (conditional on selectedRole)
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
    // Both role buttons are still visible
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
  })

  it('ignores invalid role values in URL param', () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=admin']}>
        <SignUp />
      </MemoryRouter>
    )
    // Invalid role param — no role pre-selected, email input not rendered
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
  })
})
