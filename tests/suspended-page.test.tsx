import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('SuspendedPage (Wave 3 plan 05)', () => {
  it.todo('renders "Your account has been suspended" heading')
  it.todo('renders hello@topfarms.co.nz contact link/text')
  it.todo('renders a Sign Out button so suspended user can clear session')
  it.todo('does NOT render any navigation into authenticated app surfaces')
})
