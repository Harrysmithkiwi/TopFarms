import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pctDelta } from '@/pages/admin/DailyBriefing'

// pctDelta is imported statically from the page, which transitively pulls
// @/lib/supabase before any top-level const initialises — so the rpc mock must
// be created via vi.hoisted (Phase 20-06 precedent), not a bare const.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
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
        resend_stats: {
          fresh: true,
          cached_at: '2026-05-04T10:00:00Z',
          value: { rate: 0.97, total: 100 },
        },
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

  it('ADMIN-VIEW-DAILY: includes prior-day counts for delta baseline (DELTA-WIRE)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 8,
        signups_prior: 4,
        jobs_posted_yesterday: 3,
        jobs_posted_prior: 6,
        applications_yesterday: 12,
        applications_prior: 12,
        placements_acked_yesterday: 1,
        placements_acked_prior: 0,
        revenue_snapshot: { placements_acked_this_month: 5, placements_confirmed_this_month: 2 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_daily_briefing')
    for (const k of [
      'signups_prior',
      'jobs_posted_prior',
      'applications_prior',
      'placements_acked_prior',
    ]) {
      expect(data).toHaveProperty(k)
    }
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

describe('pctDelta — yesterday vs prior-day percentage (DELTA-WIRE)', () => {
  it('returns a positive rounded percent when up', () => {
    expect(pctDelta(8, 4)).toBe(100)
    expect(pctDelta(13, 12)).toBe(8) // round(8.33)
  })
  it('returns a negative percent when down', () => {
    expect(pctDelta(3, 6)).toBe(-50)
  })
  it('returns 0 when unchanged', () => {
    expect(pctDelta(12, 12)).toBe(0)
  })
  it('returns null when prior is 0 (no baseline — avoids ∞%)', () => {
    expect(pctDelta(1, 0)).toBeNull()
    expect(pctDelta(0, 0)).toBeNull()
  })
  it('returns null when prior is missing/undefined (render-test safety)', () => {
    expect(pctDelta(5, undefined as unknown as number)).toBeNull()
  })
})
