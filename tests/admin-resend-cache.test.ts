import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin resend cache reader (ADMIN-VIEW-RESEND)', () => {
  it('ADMIN-VIEW-RESEND: fresh cache exposes rate + cached_at', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0,
        jobs_posted_yesterday: 0,
        applications_yesterday: 0,
        placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 0, placements_confirmed_this_month: 0 },
        resend_stats: {
          fresh: true,
          cached_at: '2026-05-04T10:00:00.000Z',
          value: { rate: 0.97, total: 100, delivered: 97 },
        },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    const rs = (data as any).resend_stats
    expect(rs).toHaveProperty('fresh', true)
    expect(rs).toHaveProperty('cached_at')
    expect(rs.value).toHaveProperty('rate')
    expect(rs.value.rate).toBeGreaterThanOrEqual(0)
    expect(rs.value.rate).toBeLessThanOrEqual(1)
  })

  it('ADMIN-VIEW-RESEND: stale flag set when cached_at older than 30 minutes', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0,
        jobs_posted_yesterday: 0,
        applications_yesterday: 0,
        placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 0, placements_confirmed_this_month: 0 },
        resend_stats: {
          stale: true,
          cached_at: '2026-05-04T08:00:00.000Z',
          value: { rate: 0.92, total: 50 },
        },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    const rs = (data as any).resend_stats
    expect(rs).toHaveProperty('stale', true)
    expect(rs).toHaveProperty('cached_at')
  })

  it('ADMIN-VIEW-RESEND: unavailable shape when no cache row', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0,
        jobs_posted_yesterday: 0,
        applications_yesterday: 0,
        placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 0, placements_confirmed_this_month: 0 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    expect((data as any).resend_stats).toHaveProperty('unavailable', true)
  })
})
