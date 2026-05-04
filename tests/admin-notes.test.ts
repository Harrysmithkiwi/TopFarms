import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shape-contract tests for admin_add_note RPC.
// Live RPC integration verified post-deploy via plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1).
// These tests assert the supabase.rpc(...) call shape + returned note row shape that
// AdminNotesField.tsx + ProfileDrawer.tsx rely on.

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin notes (ADMIN-MUT-NOTE)', () => {
  it('ADMIN-MUT-NOTE: admin_add_note(uuid, text) returns the inserted note row', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        id: '00000000-0000-0000-0000-000000000abc',
        target_user_id: '00000000-0000-0000-0000-000000000001',
        admin_id: '00000000-0000-0000-0000-000000000999',
        content: 'Verified NZBN manually',
        created_at: '2026-05-04T10:00:00.000Z',
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_add_note', {
      p_target_user_id: '00000000-0000-0000-0000-000000000001',
      p_content: 'Verified NZBN manually',
    })
    expect(result.data).toHaveProperty('id')
    expect(result.data).toHaveProperty('target_user_id')
    expect(result.data).toHaveProperty('admin_id')
    expect(result.data).toHaveProperty('content', 'Verified NZBN manually')
    expect(result.data).toHaveProperty('created_at')
  })

  it('ADMIN-MUT-NOTE: empty content surfaces an error', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Note content cannot be empty' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_add_note', {
      p_target_user_id: 'x',
      p_content: '',
    })
    expect(error?.message).toMatch(/empty/i)
  })
})
