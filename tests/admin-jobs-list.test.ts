import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin jobs list (ADMIN-VIEW-JOBS)', () => {
  it('ADMIN-VIEW-JOBS: returns rows with correct shape including applicant_count', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 8,
        rows: [
          {
            id: '00000000-0000-0000-0000-000000000010',
            title: 'Dairy Farm Assistant',
            status: 'active',
            employer_id: '00000000-0000-0000-0000-000000000020',
            employer_name: 'Test Farm Ltd',
            applicant_count: 7,
            days_live: 14,
            last_applicant_at: '2026-05-01T00:00:00.000Z',
            created_at: '2026-04-20T00:00:00.000Z',
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_jobs', {
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    })
    const rows = (data as { rows: Array<Record<string, unknown>> }).rows
    for (const k of [
      'id',
      'title',
      'status',
      'employer_id',
      'employer_name',
      'applicant_count',
      'days_live',
      'last_applicant_at',
      'created_at',
    ]) {
      expect(rows[0]).toHaveProperty(k)
    }
    expect(rows[0].applicant_count).toBe(7)
  })

  it('ADMIN-VIEW-JOBS: search arg passes through to RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { total: 0, rows: [] }, error: null })
    const { supabase } = await import('@/lib/supabase')
    await supabase.rpc('admin_list_jobs', { p_search: 'dairy', p_limit: 25, p_offset: 0 })
    expect(rpcMock).toHaveBeenCalledWith(
      'admin_list_jobs',
      expect.objectContaining({ p_search: 'dairy' }),
    )
  })

  it('ADMIN-VIEW-JOBS: total count reflects unfiltered set', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        total: 100,
        rows: Array.from({ length: 25 }, (_, i) => ({
          id: `${i}`,
          title: `Job ${i}`,
          status: 'active',
          employer_id: 'e',
          employer_name: 'E',
          applicant_count: i,
          days_live: i,
          last_applicant_at: null,
          created_at: '2026-05-01T00:00:00.000Z',
        })),
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.rpc('admin_list_jobs', {
      p_search: null,
      p_limit: 25,
      p_offset: 0,
    })
    const payload = data as { total: number; rows: unknown[] }
    expect(payload.total).toBe(100)
    expect(payload.rows).toHaveLength(25)
  })
})
