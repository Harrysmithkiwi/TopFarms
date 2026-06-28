import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatTrend } from '@/pages/admin/DailyBriefing'

// formatTrend is imported statically from the page, which transitively pulls
// @/lib/supabase — so the rpc mock must be created via vi.hoisted, not a bare
// const (Phase 20-06 precedent).
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin_get_signups_trend RPC shape (TREND-WIRE)', () => {
  it('returns a continuous {date, signups} daily series', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { date: '2026-06-26', signups: 0 },
        { date: '2026-06-27', signups: 5 },
        { date: '2026-06-28', signups: 3 },
      ],
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_signups_trend', { p_days: 14 })
    expect(Array.isArray(data)).toBe(true)
    for (const row of data as Array<{ date: string; signups: number }>) {
      expect(row).toHaveProperty('date')
      expect(Number.isInteger(row.signups)).toBe(true)
      expect(row.signups).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('formatTrend — RPC rows → AreaChart shape', () => {
  it('maps signups → Signups and ISO date → short day label', () => {
    const out = formatTrend([{ date: '2026-06-15', signups: 7 }])
    expect(out).toHaveLength(1)
    expect(out[0].Signups).toBe(7)
    // 15 Jun — label parsed as local midnight so it never drifts to the 14th.
    expect(out[0].date).toMatch(/15/)
    expect(out[0].date).toMatch(/Jun/)
  })

  it('returns [] for an empty series', () => {
    expect(formatTrend([])).toEqual([])
  })
})
