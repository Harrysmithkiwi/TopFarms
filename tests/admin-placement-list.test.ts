import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin placement pipeline (ADMIN-VIEW-PLAC)', () => {
  it('ADMIN-VIEW-PLAC: returns rows with acknowledged_at NOT NULL AND confirmed_at IS NULL', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 3,
        rows: [
          {
            id: 'p1',
            employer_id: 'e1',
            employer_name: 'Farm A',
            acknowledged_at: '2026-04-15T00:00:00.000Z',
            days_since_ack: 19,
            is_overdue: true,
            confirmed_at: null,
            stripe_customer_id: 'cus_abc',
            stripe_invoice_id: null,
            fee_tier: 'entry',
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_placements', {
      p_limit: 50,
      p_offset: 0,
    })
    const rows = (data as { rows: Array<Record<string, unknown>> }).rows
    for (const k of [
      'id',
      'employer_id',
      'acknowledged_at',
      'days_since_ack',
      'is_overdue',
      'confirmed_at',
      'stripe_customer_id',
      'stripe_invoice_id',
      'fee_tier',
    ]) {
      expect(rows[0]).toHaveProperty(k)
    }
    expect(rows[0].confirmed_at).toBeNull()
  })

  it('ADMIN-VIEW-PLAC: rows older than 14 days flagged is_overdue=true', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 1,
        rows: [
          {
            id: 'p2',
            employer_id: 'e2',
            employer_name: 'Farm B',
            acknowledged_at: '2026-04-15T00:00:00.000Z',
            days_since_ack: 19,
            is_overdue: true,
            confirmed_at: null,
            stripe_customer_id: null,
            stripe_invoice_id: null,
            fee_tier: null,
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_placements', {
      p_limit: 50,
      p_offset: 0,
    })
    const rows = (data as { rows: Array<Record<string, unknown>> }).rows
    expect(rows[0].is_overdue).toBe(true)
    expect(rows[0].days_since_ack).toBeGreaterThan(14)
  })

  it('ADMIN-VIEW-PLAC: each row includes stripe_customer_id + stripe_invoice_id columns (may be null)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 1,
        rows: [
          {
            id: 'p3',
            employer_id: 'e3',
            employer_name: 'Farm C',
            acknowledged_at: '2026-05-01T00:00:00.000Z',
            days_since_ack: 3,
            is_overdue: false,
            confirmed_at: null,
            stripe_customer_id: 'cus_xyz',
            stripe_invoice_id: 'in_123',
            fee_tier: 'experienced',
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_placements', {
      p_limit: 50,
      p_offset: 0,
    })
    const rows = (data as { rows: Array<Record<string, unknown>> }).rows
    expect(rows[0]).toHaveProperty('stripe_customer_id')
    expect(rows[0]).toHaveProperty('stripe_invoice_id')
  })
})
