import { describe, it, vi } from 'vitest'

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

// Helper signature retained as documentation — Wave 3 plan 21-04 imports vi.mocked(useAuth)
// and calls this shape to set up suspended/active fixtures before render.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _mockAuth(_opts: {
  session: unknown
  role: 'employer' | 'seeker' | 'admin' | null
  loading: boolean
  isActive: boolean
}) {
  // Implementation lands when the .todo rows below are flipped to real assertions.
}

describe('ProtectedRoute is_active gate (IS-ACTIVE-01)', () => {
  it.todo(
    'IS-ACTIVE-01: suspended seeker (session=true, role=seeker, isActive=false) redirects to /suspended, not requested dashboard',
  )
  it.todo(
    'IS-ACTIVE-01: suspended employer (session=true, role=employer, isActive=false) redirects to /suspended',
  )
  it.todo(
    'IS-ACTIVE-01: active seeker (isActive=true) accessing /dashboard/seeker passes through (no redirect)',
  )
  it.todo(
    'IS-ACTIVE-01 ordering guard: isActive=false but role=null (still loading) shows spinner, NOT /suspended flash (Pitfall 1)',
  )
  it.todo('IS-ACTIVE-01 default: undefined isActive treated as true (defence — no suspension on transient error)')
})
