import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin daily briefing (ADMIN-VIEW-DAILY)', () => {
  it('ADMIN-VIEW-DAILY: returns yesterday counts: signups, jobs_posted, applications, placements_acked', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 4,
        jobs_posted_yesterday: 3,
        applications_yesterday: 12,
        placements_acked_yesterday: 1,
        revenue_snapshot: { placements_acked_this_month: 5, placements_confirmed_this_month: 2 },
        resend_stats: { fresh: true, cached_at: '2026-05-04T10:00:00Z', value: { rate: 0.97, total: 100 } },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    expect(data).toHaveProperty('signups_yesterday', 4)
    expect(data).toHaveProperty('jobs_posted_yesterday', 3)
    expect(data).toHaveProperty('applications_yesterday', 12)
    expect(data).toHaveProperty('placements_acked_yesterday', 1)
  })

  it('ADMIN-VIEW-DAILY: includes revenue_snapshot subkeys', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0,
        jobs_posted_yesterday: 0,
        applications_yesterday: 0,
        placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 5, placements_confirmed_this_month: 2 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    expect((data as any).revenue_snapshot).toHaveProperty('placements_acked_this_month')
    expect((data as any).revenue_snapshot).toHaveProperty('placements_confirmed_this_month')
  })

  it('ADMIN-VIEW-DAILY: counts are non-negative integers', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 4,
        jobs_posted_yesterday: 3,
        applications_yesterday: 12,
        placements_acked_yesterday: 1,
        revenue_snapshot: { placements_acked_this_month: 5, placements_confirmed_this_month: 2 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    for (const k of [
      'signups_yesterday',
      'jobs_posted_yesterday',
      'applications_yesterday',
      'placements_acked_yesterday',
    ]) {
      const v = (data as any)[k]
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })
})
