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

function mockAuth(opts: {
  session: any
  role: 'employer' | 'seeker' | 'admin' | null
  loading: boolean
}) {
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

  // FE-2/FE-3 asserted only that the protected content was absent, which was true of
  // the old redirect too — they passed either way. docs/DESIGN.md §5 requires the
  // access-denied view to render IN PLACE, so assert the view, not just the absence.
  it('ADMIN-GATE-FE-2: authenticated employer sees access denied at /admin, not a redirect', () => {
    mockAuth({ session: { user: { id: 'e1' } } as any, role: 'employer', loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i)
    expect(screen.getByText(/does not have admin privileges/i)).toBeInTheDocument()
    // The escape hatch goes to the user's OWN dashboard, not back to the page that
    // just refused them — that round trip is what §5 calls a bounce.
    expect(screen.getByRole('link', { name: /back to your dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard/employer',
    )
  })

  it('ADMIN-GATE-FE-3: authenticated seeker sees access denied at /admin, not a redirect', () => {
    mockAuth({ session: { user: { id: 's1' } } as any, role: 'seeker', loading: false })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requiredRole="admin">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i)
    expect(screen.getByRole('link', { name: /back to your dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard/seeker',
    )
  })

  // The other two portals go through the same guard; the admin case above is not
  // special. These are the cases the old redirect made invisible.
  it('ADMIN-GATE-FE-5: admin hitting an employer route sees access denied, escaping to /admin', () => {
    mockAuth({ session: { user: { id: 'a1' } } as any, role: 'admin', loading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard/employer']}>
        <ProtectedRoute requiredRole="employer">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(screen.getByText(/this page is for employer accounts/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to the admin portal/i })).toHaveAttribute(
      'href',
      '/admin',
    )
  })

  it('ADMIN-GATE-FE-6: seeker hitting an employer route sees access denied, not a silent bounce', () => {
    mockAuth({ session: { user: { id: 's2' } } as any, role: 'seeker', loading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard/employer']}>
        <ProtectedRoute requiredRole="employer">
          <div>protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(screen.getByText(/this page is for employer accounts/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to your dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard/seeker',
    )
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
