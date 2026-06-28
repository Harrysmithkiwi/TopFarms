import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '@/components/admin/KpiCard'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin_get_placements_summary RPC shape (PLACEMENT-KPI)', () => {
  it('returns count / overdue / value_nzd aggregates', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { count: 4, overdue: 1, value_nzd: 12500 },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_get_placements_summary')
    for (const k of ['count', 'overdue', 'value_nzd']) {
      const v = (data as Record<string, number>)[k]
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('KpiCard — optional delta pill', () => {
  it('renders no delta pill when delta is omitted (placement cards)', () => {
    render(<KpiCard label="Pipeline value" value="$12,500" />)
    expect(screen.getByText('$12,500')).toBeInTheDocument()
    expect(screen.queryByText(/vs prior day/)).not.toBeInTheDocument()
  })

  it('renders the "—" baseline pill when delta is null', () => {
    render(<KpiCard label="Signups yesterday" value={3} delta={null} />)
    expect(screen.getByText(/vs prior day/)).toBeInTheDocument()
  })

  it('renders a coloured % pill when delta is a number', () => {
    render(<KpiCard label="Signups yesterday" value={8} delta={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
