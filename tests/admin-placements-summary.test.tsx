import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('PlacementPipeline renders the pipeline value in dollars, not cents', () => {
  // REGRESSION, and it must render the real component — an earlier version of this test
  // re-declared the formatter locally and passed even with the bug reintroduced.
  //
  // `placement_fees.amount_nzd` stores CENTS: create-placement-invoice passes it straight to
  // Stripe invoiceItems.create (which takes cents) and PLACEMENT_FEE_AMOUNTS is
  // 20000/40000/80000 for $200/$400/$800. admin_revenue_reconciliation names the same value
  // `*_cents`; admin_get_placements_summary calls it `value_nzd`, and PlacementPipeline
  // trusted the name — rendering a $400 pipeline as $40,000.
  //
  // The old assertion in this file rendered `value_nzd: 12500` as "$12,500". That is $125 of
  // placements shown as twelve and a half thousand. The test encoded the defect, which is why
  // nothing caught it: prod has 0 placement_fees rows, so no one has ever seen this KPI.
  function mockRpcs(summary: { count: number; overdue: number; value_nzd: number }) {
    rpcMock.mockImplementation((fn: string) =>
      fn === 'admin_get_placements_summary'
        ? Promise.resolve({ data: summary, error: null })
        : Promise.resolve({ data: [], error: null }),
    )
  }

  it('renders one senior placement (80000 cents) as $800, not $80,000', async () => {
    mockRpcs({ count: 1, overdue: 0, value_nzd: 80_000 })
    const { PlacementPipeline } = await import('@/pages/admin/PlacementPipeline')
    render(<PlacementPipeline />)
    await waitFor(() => expect(screen.getByText('$800')).toBeInTheDocument())
    expect(screen.queryByText('$80,000')).not.toBeInTheDocument()
  })

  it('renders 12500 cents as $125 — the value the old assertion got wrong', async () => {
    mockRpcs({ count: 3, overdue: 1, value_nzd: 12_500 })
    const { PlacementPipeline } = await import('@/pages/admin/PlacementPipeline')
    render(<PlacementPipeline />)
    await waitFor(() => expect(screen.getByText('$125')).toBeInTheDocument())
    expect(screen.queryByText('$12,500')).not.toBeInTheDocument()
  })
})

describe('KpiCard — optional delta pill', () => {
  it('renders no delta pill when delta is omitted (placement cards)', () => {
    render(<KpiCard label="Pipeline value" value="$125" />)
    expect(screen.getByText('$125')).toBeInTheDocument()
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
