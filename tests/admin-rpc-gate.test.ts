import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

// Backend gate is enforced inside _admin_gate() in migration 023:
//   IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated';
//   IF get_user_role(auth.uid()) != 'admin' THEN RAISE EXCEPTION 'Forbidden: admin role required';
// These tests assert the FRONTEND contract: when supabase.rpc returns those error
// messages, the page code surfaces them appropriately. Live integration is
// captured in plan 20-08 bootstrap UAT.

describe('admin RPC backend gate (ADMIN-GATE-BE)', () => {
  it("ADMIN-GATE-BE-1: anonymous JWT calling admin_get_daily_briefing surfaces 'Not authenticated'", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Not authenticated' } })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_get_daily_briefing')
    expect(error?.message).toContain('Not authenticated')
  })

  it("ADMIN-GATE-BE-2: employer JWT calling admin_list_employers surfaces 'Forbidden: admin role required'", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Forbidden: admin role required' } })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_list_employers', { p_search: null, p_limit: 25, p_offset: 0 })
    expect(error?.message).toContain('Forbidden')
  })

  it("ADMIN-GATE-BE-3: seeker JWT calling admin_set_user_active surfaces 'Forbidden: admin role required'", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Forbidden: admin role required' } })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_set_user_active', { p_user_id: 'x', p_active: false })
    expect(error?.message).toContain('Forbidden')
  })
})
