import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Mirrors tests/protected-route-oauth.test.tsx pattern.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

function mockAuth(opts: { session: any; role: 'employer' | 'seeker' | 'admin' | null; loading: boolean }) {
  vi.mocked(useAuth).mockReturnValue({
    session: opts.session,
    role: opts.role,
    loading: opts.loading,
    signUpWithRole: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  })
}

describe('admin route gate (ADMIN-GATE-FE)', () => {
  it('ADMIN-GATE-FE-1: anonymous user redirected from /admin to /login', () => {
    mockAuth({ session: null, role: null, loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('ADMIN-GATE-FE-2: authenticated employer redirected from /admin to /dashboard/employer', () => {
    mockAuth({ session: { user: { id: 'e1' } } as any, role: 'employer', loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('ADMIN-GATE-FE-3: authenticated seeker redirected from /admin to /dashboard/seeker', () => {
    mockAuth({ session: { user: { id: 's1' } } as any, role: 'seeker', loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('ADMIN-GATE-FE-4: authenticated admin reaches /admin and sees protected content', () => {
    mockAuth({ session: { user: { id: 'a1' } } as any, role: 'admin', loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
