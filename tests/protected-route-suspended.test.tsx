import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

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

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
// import-after-mock is intentional (vi.mock hoists above imports); the old
// `import/first` disable referenced a plugin this config doesn't use.
import { useAuth } from '@/hooks/useAuth'

function mockAuth(opts: {
  session: unknown
  role: 'employer' | 'seeker' | 'admin' | null
  loading: boolean
  isActive: boolean
}) {
  vi.mocked(useAuth).mockReturnValue({
    session: opts.session as never,
    role: opts.role,
    loading: opts.loading,
    isActive: opts.isActive,
    signUpWithRole: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  } as never)
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <ProtectedRoute requiredRole="seeker">
              <div>protected-content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/suspended" element={<div>suspended-page</div>} />
        <Route path="/dashboard/seeker" element={<div>seeker-dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute is_active gate (IS-ACTIVE-01)', () => {
  it('IS-ACTIVE-01: suspended seeker redirects to /suspended (not seeker dashboard)', () => {
    mockAuth({
      session: { user: { id: 's1' } },
      role: 'seeker',
      loading: false,
      isActive: false,
    })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('suspended-page')).toBeInTheDocument()
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01: suspended employer redirects to /suspended', () => {
    mockAuth({
      session: { user: { id: 'e1' } },
      role: 'employer',
      loading: false,
      isActive: false,
    })
    render(
      <MemoryRouter initialEntries={['/dashboard/employer']}>
        <Routes>
          <Route
            path="/dashboard/employer"
            element={
              <ProtectedRoute requiredRole="employer">
                <div>employer-content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/suspended" element={<div>suspended-page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('suspended-page')).toBeInTheDocument()
    expect(screen.queryByText('employer-content')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01: active seeker passes through to protected content', () => {
    mockAuth({
      session: { user: { id: 's1' } },
      role: 'seeker',
      loading: false,
      isActive: true,
    })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('suspended-page')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01 ordering guard (Pitfall 1): role=null with isActive=false shows spinner, NOT /suspended', () => {
    // requiredRole present + role===null → AUTH-FIX-02 spinner fires BEFORE isActive check
    mockAuth({
      session: { user: { id: 'u1' } },
      role: null,
      loading: false,
      isActive: false,
    })
    renderRoute('/dashboard/seeker')
    // Spinner = aria-label="Loading" (per ProtectedRoute.tsx:21)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('suspended-page')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01 default: isActive=true is treated as authorised (defence)', () => {
    mockAuth({
      session: { user: { id: 's1' } },
      role: 'seeker',
      loading: false,
      isActive: true,
    })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('protected-content')).toBeInTheDocument()
  })
})
