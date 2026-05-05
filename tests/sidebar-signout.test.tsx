import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Sidebar — Sign Out', () => {
  it('calls signOut() once when Sign Out clicked', async () => {
    const signOutMock = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 's1' } } as any,
      role: 'seeker',
      loading: false,
      signUpWithRole: vi.fn(),
      signIn: vi.fn(),
      signOut: signOutMock,
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshRole: vi.fn(),
    } as any)

    const user = userEvent.setup()
    render(<MemoryRouter><Sidebar /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })
})
