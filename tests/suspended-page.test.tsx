import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Suspended } from '@/pages/auth/Suspended'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

const signOutMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 's1' } },
    role: 'seeker',
    isActive: false,
    loading: false,
    signUpWithRole: vi.fn(),
    signIn: vi.fn(),
    signOut: signOutMock,
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  }),
}))

describe('SuspendedPage (Phase 21 Wave 3)', () => {
  it('renders "Your account has been suspended" message verbatim', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Your account has been suspended/)).toBeInTheDocument()
  })

  it('renders hello@topfarms.co.nz as a mailto link', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /hello@topfarms.co.nz/i })
    expect(link).toHaveAttribute('href', 'mailto:hello@topfarms.co.nz')
  })

  it('renders Sign out button that calls signOut and navigates to /login', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
    await user.click(button)
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1))
  })

  it('does NOT render any links into authenticated app surfaces', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    // No anchor to /dashboard/*, /admin, /jobs/new, /onboarding/*
    const links = screen.queryAllByRole('link')
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      expect(href).not.toMatch(/^\/(dashboard|admin|jobs|onboarding)/)
    }
  })
})
