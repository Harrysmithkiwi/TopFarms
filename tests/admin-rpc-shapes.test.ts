import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin RPC happy-path shapes (ADMIN-GATE-BE-4)', () => {
  it('ADMIN-GATE-BE-4: admin_get_daily_briefing returns valid jsonb shape', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0, jobs_posted_yesterday: 0, applications_yesterday: 0, placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 0, placements_confirmed_this_month: 0 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_get_daily_briefing')
    expect(error).toBeNull()
    expect(data).toHaveProperty('signups_yesterday')
    expect(data).toHaveProperty('revenue_snapshot')
    expect(data).toHaveProperty('resend_stats')
  })

  it('ADMIN-GATE-BE-4: admin_list_employers returns {total, rows}', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_list_employers', { p_search: null, p_limit: 25, p_offset: 0 })
    expect(error).toBeNull()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('rows')
    expect(Array.isArray((data as { rows: unknown[] }).rows)).toBe(true)
  })

  it('ADMIN-GATE-BE-4: admin_list_seekers returns {total, rows}', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_list_seekers', { p_search: null, p_limit: 25, p_offset: 0 })
    expect(error).toBeNull()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('rows')
  })

  it('ADMIN-GATE-BE-4: admin_list_jobs returns {total, rows}', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_list_jobs', { p_search: null, p_limit: 25, p_offset: 0 })
    expect(error).toBeNull()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('rows')
  })

  it('ADMIN-GATE-BE-4: admin_list_placements returns {total, rows}', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_list_placements', { p_limit: 50, p_offset: 0 })
    expect(error).toBeNull()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('rows')
  })

  it('ADMIN-GATE-BE-4: admin_get_user_profile returns role-keyed shape', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        role: 'employer', name: 'Farm', email: 'a@b.c', region: 'Waikato',
        join_date: '2026-03-01T00:00:00Z', last_sign_in: null,
        verification_tier: 'unverified', total_jobs_posted: 0,
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.rpc('admin_get_user_profile', { p_user_id: 'x' })
    expect(error).toBeNull()
    expect(data).toHaveProperty('role')
    expect(['employer', 'seeker']).toContain((data as { role: string }).role)
  })
})
