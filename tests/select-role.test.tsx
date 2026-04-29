import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SelectRole } from '@/pages/auth/SelectRole'

// Test intent (AUTH-02 era — repaired in cleanup-session post-Phase-14):
//
//   1. Two role cards (Employer / Seeker) render when authenticated and
//      role is null — the post-OAuth role-selection moment.
//   2. Unauthenticated users redirect to /login (Navigate guard).
//   3. Already-roled users redirect to their dashboard (Navigate guard).
//   4. Clicking a role persists the choice. Original implementation: client
//      INSERT into user_roles. AUTH-02 (cdc9df7) replaced that with the
//      set_user_role RPC (SECURITY DEFINER, idempotent UPSERT, validates
//      auth.uid() + role allowlist) because the client INSERT was being
//      silently rejected by RLS-without-INSERT-policy. The repaired test
//      verifies the same intent — "role persists" — against the canonical
//      RPC, not the broken direct-insert path.

// vi.hoisted lets the mock factory safely reference `mocks.rpc` at hoist time.
// A direct top-level `const mockRpc = vi.fn(...)` referenced eagerly inside the
// vi.mock factory would TDZ-fail because vi.mock is hoisted above the const.
// (The original test got away with `from: () => ({ insert: mockInsert })` because
// the reference was lazy — only resolved when `from()` was invoked at runtime.)
const mocks = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithOAuth: vi.fn() },
    rpc: mocks.rpc,
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

const baseAuth = {
  signUpWithRole: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  refreshRole: vi.fn().mockResolvedValue(undefined),
}

describe('SelectRole', () => {
  it('renders Employer and Seeker role cards', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123' } } as any,
      role: null,
      loading: false,
    })
    render(
      <MemoryRouter>
        <SelectRole />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /employer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seeker/i })).toBeInTheDocument()
  })

  it('redirects to /login if no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: null,
      role: null,
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>,
    )
    // Navigate replaces the rendered tree — role cards should not appear
    expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument()
  })

  it('redirects to dashboard if role already set', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123' } } as any,
      role: 'employer',
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/auth/select-role']}>
        <SelectRole />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /employer/i })).not.toBeInTheDocument()
  })

  it('persists role via the set_user_role RPC on role click (post-AUTH-02 — replaces the pre-RLS-fix direct user_roles INSERT)', async () => {
    mocks.rpc.mockClear()
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      session: { user: { id: '123' } } as any,
      role: null,
      loading: false,
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SelectRole />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /employer/i }))

    expect(mocks.rpc).toHaveBeenCalledWith('set_user_role', { p_role: 'employer' })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
})
