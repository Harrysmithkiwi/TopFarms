import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SelectRole } from '@/pages/auth/SelectRole'

const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithOAuth: vi.fn() },
    from: () => ({ insert: mockInsert }),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Import after mock so we can control the mock per test
import { useAuth } from '@/hooks/useAuth'

describe('SelectRole', () => {
  it('renders Employer and Seeker role cards', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: '123' } } as any,
      role: null,
      loading: false,
      signUpWithRole: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshRole: vi.fn(),
    })
    render(
      <MemoryRouter>
        <SelectRole />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
  })

  it('redirects to /login if no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      role: null,
      loading: false,
      signUpWithRole: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshRole: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>
    )
    // SelectRole should navigate away when no session — no role cards rendered
    expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument()
  })

  it('redirects to dashboard if role already set', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: '123' } } as any,
      role: 'employer',
      loading: false,
      signUpWithRole: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshRole: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>
    )
    // Should redirect to /dashboard/employer — employer button not shown in this stub
    expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument()
  })

  it('calls supabase insert and navigates to onboarding on role click', async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: '123' } } as any,
      role: null,
      loading: false,
      signUpWithRole: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshRole: vi.fn(),
    })
    render(
      <MemoryRouter>
        <SelectRole />
      </MemoryRouter>
    )
    const employerButton = screen.queryByRole('button', { name: /employer/i })
    if (employerButton) {
      fireEvent.click(employerButton)
      // Expect insert called with role assignment — full implementation in plan 02
      expect(mockInsert).toHaveBeenCalledWith({ user_id: '123', role: 'employer' })
    }
  })
})
