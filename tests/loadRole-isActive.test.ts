import { describe, it, vi, beforeEach } from 'vitest'

// IS-ACTIVE-02: loadRole fetches { role, is_active } in a single user_roles query.
// IS-ACTIVE-03: loadRole returns isActive=true on DB error (no false-positive suspension).
// Wave 3 plan 21-04 implements; this file scaffolds the contract.

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  fromMock.mockReset()
})

describe('AuthContext.loadRole is_active extension (IS-ACTIVE-02, IS-ACTIVE-03)', () => {
  it.todo(
    'IS-ACTIVE-02: loadRole calls .from("user_roles").select("role, is_active").eq("user_id", id).single() — single round-trip',
  )
  it.todo('IS-ACTIVE-02: loadRole returns { role: UserRole, isActive: boolean } on happy path')
  it.todo('IS-ACTIVE-03: loadRole returns { role: null, isActive: true } when supabase returns error')
  it.todo('IS-ACTIVE-03: loadRole returns isActive: true when data.is_active is null (DB default fallback)')
})
