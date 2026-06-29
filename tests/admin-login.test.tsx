import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Module-level so submit tests can assert the args signIn was called with.
const signInMock = vi.fn()

function mockAuth(opts: MockOpts) {
  signInMock.mockResolvedValue({ data: {}, error: null })
  vi.mocked(useAuth).mockReturnValue({
    session: opts.session,
    role: opts.role,
    loading: opts.loading,
    signUpWithRole: vi.fn(),
    signIn: signInMock,
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
    // selector: 'input' — the show/hide toggle button carries an aria-label containing
    // "password", so scope this query to the field itself.
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    // No OAuth buttons (CONTEXT GA-1 explicit lock)
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('password show/hide toggle reveals and re-hides the password (P-9)', async () => {
    const user = userEvent.setup()
    mockAuth({ session: null, role: null, loading: false })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )

    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' })
    // Default: masked
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: /show password/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
    const hideToggle = screen.getByRole('button', { name: /hide password/i })
    expect(hideToggle).toHaveAttribute('aria-pressed', 'true')

    await user.click(hideToggle)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('still submits with the correct password value — masked AND after reveal (P-9 binding regression)', async () => {
    const user = userEvent.setup()
    mockAuth({ session: null, role: null, loading: false })
    render(
      <MemoryRouter>
        <AdminGate />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@topfarms.co.nz')
    await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'TopFarms2026!')

    // Submit while masked (default type=password)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(signInMock).toHaveBeenCalledWith('admin@topfarms.co.nz', 'TopFarms2026!')

    // Reveal (type flips to text) then submit again — register('password') binding
    // must survive the type switch and still carry the full value.
    signInMock.mockClear()
    await user.click(screen.getByRole('button', { name: /show password/i }))
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(signInMock).toHaveBeenCalledWith('admin@topfarms.co.nz', 'TopFarms2026!')
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
