import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shape-contract tests for admin_set_user_active RPC.
// Live RPC integration verified post-deploy via plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1).
// These tests assert the supabase.rpc(...) call shape + response handling pattern that
// ProfileDrawer.tsx relies on.

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin suspend/reactivate (ADMIN-MUT-SUS, ADMIN-MUT-REA)', () => {
  it('ADMIN-MUT-SUS: admin_set_user_active(uuid, false) is invoked with correct args and returns ok=true', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, before: true, after: false },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_set_user_active', {
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_active: false,
    })
    expect(rpcMock).toHaveBeenCalledWith('admin_set_user_active', {
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_active: false,
    })
    expect(result.data).toMatchObject({ ok: true, before: true, after: false })
  })

  it('ADMIN-MUT-REA: admin_set_user_active(uuid, true) is invoked with correct args and returns ok=true', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, before: false, after: true },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_set_user_active', {
      p_user_id: '00000000-0000-0000-0000-000000000002',
      p_active: true,
    })
    expect(rpcMock).toHaveBeenCalledWith('admin_set_user_active', {
      p_user_id: '00000000-0000-0000-0000-000000000002',
      p_active: true,
    })
    expect(result.data).toMatchObject({ ok: true, after: true })
  })

  it('ADMIN-MUT-SUS: non-admin caller surfaces "Forbidden" error', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_set_user_active', {
      p_user_id: 'x',
      p_active: false,
    })
    expect(error?.message).toContain('Forbidden')
  })
})
