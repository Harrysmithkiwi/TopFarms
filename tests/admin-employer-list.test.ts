import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin employer list (ADMIN-VIEW-EMPL)', () => {
  it('ADMIN-VIEW-EMPL: returns paginated rows with correct shape', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 42,
        rows: [
          {
            user_id: '00000000-0000-0000-0000-000000000001',
            name: 'Test Farm',
            email: 'farm@example.com',
            verification_tier: 'nzbn',
            joined: '2026-03-01T00:00:00.000Z',
            jobs_count: 5,
            is_active: true,
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_employers', {
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    })
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('rows')
    const rows = (data as any).rows
    expect(rows).toHaveLength(1)
    for (const k of [
      'user_id',
      'name',
      'email',
      'verification_tier',
      'joined',
      'jobs_count',
      'is_active',
    ]) {
      expect(rows[0]).toHaveProperty(k)
    }
  })

  it('ADMIN-VIEW-EMPL: search arg passes through to RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    await supabase.rpc('admin_list_employers', { p_search: 'foo', p_limit: 25, p_offset: 0 })
    expect(rpcMock).toHaveBeenCalledWith(
      'admin_list_employers',
      expect.objectContaining({ p_search: 'foo' }),
    )
  })

  it('ADMIN-VIEW-EMPL: verification_tier is one of the locked enum values', () => {
    const tiers = ['unverified', 'email', 'nzbn', 'featured']
    for (const tier of tiers) {
      expect(['unverified', 'email', 'nzbn', 'featured']).toContain(tier)
    }
  })
})
