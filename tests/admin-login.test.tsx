import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// Mock supabase first so transitive imports inside SUT chain don't try to hit network.
// Mirrors tests/admin-protected-route.test.tsx mock pattern.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

import { useAuth } from '@/hooks/useAuth'
import { AdminGate } from '@/pages/admin/AdminLoginPage'

type MockOpts = {
  session: any
  role: 'employer' | 'seeker' | 'admin' | null
  loading: boolean
}

function mockAuth(opts: MockOpts) {
  vi.mocked(useAuth).mockReturnValue({
    session: opts.session,
    role: opts.role,
    loading: opts.loading,
    signUpWithRole: vi.fn(),
    signIn: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminGate hybrid route', () => {
  it('shows spinner when loading', () => {
    mockAuth({ session: null, role: null, loading: true })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('renders AdminLoginPage form when unauthenticated', () => {
    mockAuth({ session: null, role: null, loading: false })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    // No OAuth buttons (CONTEXT GA-1 explicit lock)
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('renders Access denied for non-admin authenticated user (employer)', () => {
    mockAuth({ session: { user: { id: 'e1' } }, role: 'employer', loading: false })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )
    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
  })

  it('renders AdminLayout for admin user', () => {
    mockAuth({ session: { user: { id: 'a1' } }, role: 'admin', loading: false })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )
    // AdminLayout renders <main> — see src/components/layout/AdminLayout.tsx:16
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
