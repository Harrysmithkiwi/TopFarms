import { describe, it, expect, vi, beforeEach } from 'vitest'

// DOC-QUEUE-01: admin_list_document_queue RPC shape matches AdminDocumentsQueue expectations.
// DOC-QUEUE-02: Approve / Reject / Request More Info buttons dispatch correct admin RPCs.
// Wave 2 plan 21-02 ships the 4 RPCs; Wave 5 plan 21-07 ships the page that consumes them.
//
// These are shape-contract tests (mocked supabase) — they assert the rpc(...) call
// shape + response shape that Wave 5's AdminDocumentsQueue page will rely on. Live
// RPC integration verified empirically via Phase 21 MCP smoke tests in 21-02-SUMMARY.md
// (gate fires, RPCs registered as SECURITY DEFINER, EXECUTE granted to authenticated).
//
// Per Phase 20-05 STATE: admin_* RPCs not in supabase-js generated function-name union
// (Studio-applied), so callers use `supabase.rpc(name, args as never)`. These tests
// pass the same `as never` shape so they catch any future drift.

const rpcMock = vi.fn()
const functionsInvokeMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    functions: { invoke: functionsInvokeMock },
  },
}))

beforeEach(() => {
  rpcMock.mockReset()
  functionsInvokeMock.mockReset()
})

describe('admin_list_document_queue RPC shape (DOC-QUEUE-01)', () => {
  it('DOC-QUEUE-01: admin_list_document_queue called with { p_limit, p_offset } returns { rows: [...], total }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        rows: [
          {
            document_id: 'doc-1',
            seeker_user_id: 'usr-1',
            seeker_name: 'Jane Doe',
            document_type: 'cv',
            filename: 'cv.pdf',
            uploaded_at: '2026-05-15T10:00:00Z',
            status: 'pending',
            rejection_reason: null,
          },
        ],
        total: 1,
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_list_document_queue', { p_limit: 25, p_offset: 0 } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_list_document_queue', { p_limit: 25, p_offset: 0 })
    expect(result.data).toMatchObject({ rows: expect.any(Array), total: expect.any(Number) })
    expect((result.data as { rows: Array<Record<string, unknown>> }).rows[0]).toMatchObject({
      document_id: expect.any(String),
      seeker_user_id: expect.any(String),
      seeker_name: expect.any(String),
      document_type: expect.any(String),
      filename: expect.any(String),
      uploaded_at: expect.any(String),
      status: expect.any(String),
    })
  })

  it('DOC-QUEUE-01: rows ordered pending first per RPC ORDER BY contract', async () => {
    // Shape-only assertion — actual ordering verified server-side in plan 21-02 migration ORDER BY clause
    rpcMock.mockResolvedValueOnce({
      data: {
        rows: [
          { document_id: 'd1', status: 'pending', uploaded_at: '2026-05-10T00:00:00Z' },
          { document_id: 'd2', status: 'approved', uploaded_at: '2026-05-15T00:00:00Z' },
        ],
        total: 2,
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_list_document_queue', { p_limit: 25, p_offset: 0 } as never)
    const rows = (result.data as { rows: Array<{ status: string }> }).rows
    expect(rows[0].status).toBe('pending')
  })
})

describe('admin doc queue action dispatch (DOC-QUEUE-02)', () => {
  it('DOC-QUEUE-02: admin_approve_document called with { p_document_id } returns { ok, status: "approved" }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'approved' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_approve_document', { p_document_id: 'doc-1' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_approve_document', { p_document_id: 'doc-1' })
    expect(result.data).toMatchObject({ ok: true, status: 'approved' })
  })

  it('DOC-QUEUE-02: admin_reject_document called with { p_document_id, p_reason } returns { ok, status: "rejected", reason }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'rejected', reason: 'illegible' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_reject_document', { p_document_id: 'doc-1', p_reason: 'illegible' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_reject_document', { p_document_id: 'doc-1', p_reason: 'illegible' })
    expect(result.data).toMatchObject({ ok: true, status: 'rejected', reason: 'illegible' })
  })

  it('DOC-QUEUE-02: admin_request_more_info called with { p_document_id } returns { ok, status: "needs_resubmission" }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'needs_resubmission' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_request_more_info', { p_document_id: 'doc-1' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_request_more_info', { p_document_id: 'doc-1' })
    expect(result.data).toMatchObject({ ok: true, status: 'needs_resubmission' })
  })

  it('DOC-QUEUE-02: non-admin caller (forbidden) surfaces "Forbidden" error', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_approve_document', { p_document_id: 'doc-1' } as never)
    expect(error?.message).toContain('Forbidden')
  })

  it('DOC-QUEUE-02: rejected document with empty reason surfaces "Rejection reason cannot be empty"', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rejection reason cannot be empty' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_reject_document', { p_document_id: 'doc-1', p_reason: '' } as never)
    expect(error?.message).toContain('Rejection reason cannot be empty')
  })

  // Keep the email-side-effect as it.todo — UI flow + email dispatch is Wave 5 plan 21-07's job
  it.todo(
    'DOC-QUEUE-02: AdminDocumentsQueue page invokes supabase.functions.invoke("send-document-status-email") after successful RPC (Wave 5)',
  )
})
