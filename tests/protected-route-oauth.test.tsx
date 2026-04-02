import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

describe('ProtectedRoute OAuth — role is null', () => {
  it('redirects to /auth/select-role when session exists but role is null', () => {
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
      <MemoryRouter initialEntries={['/dashboard/employer']}>
        <ProtectedRoute requiredRole="employer">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>
    )
    // Should redirect to /auth/select-role — protected content should NOT be rendered
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('renders children when session and role exist', () => {
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
      <MemoryRouter>
        <ProtectedRoute requiredRole="employer">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
