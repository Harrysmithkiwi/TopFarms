import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { PublicOnlyRoute } from '@/components/layout/PublicOnlyRoute'

// Found by pre-launch UAT on live prod, 2026-08-24: /login and /signup rendered for an
// already-authenticated user, so a signed-in employer clicking "Post a job" on the
// landing page got a signup form for the account they already had.

const auth: {
  session: object | null
  role: 'employer' | 'seeker' | 'admin' | null
  isActive: boolean | null
  loading: boolean
} = { session: null, role: null, isActive: true, loading: false }

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))

beforeEach(() => {
  auth.session = null
  auth.role = null
  auth.isActive = true
  auth.loading = false
})

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<PublicOnlyRoute><p>Create your account</p></PublicOnlyRoute>} />
        <Route path="/dashboard/employer" element={<p>Employer dashboard</p>} />
        <Route path="/dashboard/seeker" element={<p>Seeker dashboard</p>} />
        <Route path="/admin" element={<p>Admin</p>} />
        <Route path="/suspended" element={<p>Suspended</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('PublicOnlyRoute', () => {
  it('shows the signup form to an anonymous visitor', () => {
    renderAt()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it.each([
    ['employer', 'Employer dashboard'],
    ['seeker', 'Seeker dashboard'],
    ['admin', 'Admin'],
  ] as const)('sends a signed-in %s to their dashboard, not the signup form', (role, dest) => {
    auth.session = { user: { id: 'u1' } }
    auth.role = role
    renderAt()
    expect(screen.getByText(dest)).toBeInTheDocument()
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument()
  })

  it('sends a suspended user to /suspended, not a dashboard', () => {
    auth.session = { user: { id: 'u1' } }
    auth.role = 'employer'
    auth.isActive = false
    renderAt()
    expect(screen.getByText('Suspended')).toBeInTheDocument()
  })

  it('lets a session with no role THROUGH — that user is mid-signup', () => {
    // Bouncing them to a dashboard they have no role for is the redirect loop
    // AUTH-FIX-02 exists to prevent.
    auth.session = { user: { id: 'u1' } }
    auth.role = null
    renderAt()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('never flashes the form while auth is still loading', () => {
    auth.loading = true
    auth.session = { user: { id: 'u1' } }
    auth.role = 'employer'
    renderAt()
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument()
    expect(screen.queryByText('Employer dashboard')).not.toBeInTheDocument()
  })
})
