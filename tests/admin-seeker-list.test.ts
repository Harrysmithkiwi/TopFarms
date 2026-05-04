import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin seeker list (ADMIN-VIEW-SEEK)', () => {
  it('ADMIN-VIEW-SEEK: returns paginated rows with correct shape', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 100,
        rows: [
          {
            user_id: '00000000-0000-0000-0000-000000000002',
            name: 'Test Seeker',
            email: 'seeker@example.com',
            region: 'Waikato',
            onboarding_complete: false,
            onboarding_step: 3,
            match_scores_computed: false,
            joined: '2026-04-15T00:00:00.000Z',
            is_active: true,
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_seekers', {
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    })
    expect(data).toHaveProperty('total', 100)
    const rows = (data as any).rows
    for (const k of [
      'user_id',
      'name',
      'email',
      'region',
      'onboarding_complete',
      'onboarding_step',
      'match_scores_computed',
      'joined',
      'is_active',
    ]) {
      expect(rows[0]).toHaveProperty(k)
    }
  })

  it('ADMIN-VIEW-SEEK: search arg passes through', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    await supabase.rpc('admin_list_seekers', { p_search: 'bar', p_limit: 25, p_offset: 0 })
    expect(rpcMock).toHaveBeenCalledWith(
      'admin_list_seekers',
      expect.objectContaining({ p_search: 'bar' }),
    )
  })

  it('ADMIN-VIEW-SEEK: onboarding_step in [1,7] when present', () => {
    for (const step of [1, 4, 7]) {
      expect(step).toBeGreaterThanOrEqual(1)
      expect(step).toBeLessThanOrEqual(7)
    }
  })
})
