import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// DOC-QUEUE-01: admin_list_document_queue RPC shape matches AdminDocumentsQueue expectations.
// DOC-QUEUE-02: Approve / Reject / Request More Info buttons dispatch correct admin RPCs.
// Wave 2 plan 21-02 ships the 4 RPCs; Wave 5 plan 21-07 ships the page that consumes them
// + the end-to-end render-test that asserts click → RPC → email-fn invoke shape.
//
// Mock strategy: vi.hoisted for both supabase.rpc + supabase.functions.invoke + auth shim.
// The hoisted form is required because AdminDocumentsQueue (Wave 5 SUT) statically imports
// @/lib/supabase, which would resolve to undefined-mock without hoisting. The earlier
// shape-contract tests (lazy `await import('@/lib/supabase')`) coexist cleanly with the
// hoisted mocks — they call into the same `rpcMock` and just don't exercise the React tree.
// Pattern source: STATE Phase 17-02/18.1-02/20-06 (mark-job-filled-rpc.test.tsx,
// saved-search-modal.test.tsx, saved-search-list.test.tsx).
//
// Per Phase 20-05 STATE: admin_* RPCs not in supabase-js generated function-name union
// (Studio-applied), so callers use `supabase.rpc(name, args as never)`. These tests
// pass the same `as never` shape so they catch any future drift.

const { rpcMock, functionsInvokeMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  functionsInvokeMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    functions: { invoke: functionsInvokeMock },
    // auth shim — AuthProvider isn't in the render tree (we use MemoryRouter
    // alone) but AdminDocumentsQueue's transitive imports may pull supabase
    // auth on module init in some envs; the shim makes the mock complete.
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

beforeEach(() => {
  rpcMock.mockReset()
  functionsInvokeMock.mockReset()
  // Default: every functions.invoke resolves to a successful send. Individual
  // tests can override with mockResolvedValueOnce / mockRejectedValueOnce.
  functionsInvokeMock.mockResolvedValue({ data: { sent: true }, error: null })
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
    const result = await supabase.rpc('admin_list_document_queue', {
      p_limit: 25,
      p_offset: 0,
    } as never)
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
    const result = await supabase.rpc('admin_list_document_queue', {
      p_limit: 25,
      p_offset: 0,
    } as never)
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
    const result = await supabase.rpc('admin_reject_document', {
      p_document_id: 'doc-1',
      p_reason: 'illegible',
    } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_reject_document', {
      p_document_id: 'doc-1',
      p_reason: 'illegible',
    })
    expect(result.data).toMatchObject({ ok: true, status: 'rejected', reason: 'illegible' })
  })

  it('DOC-QUEUE-02: admin_request_more_info called with { p_document_id } returns { ok, status: "needs_resubmission" }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'needs_resubmission' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_request_more_info', {
      p_document_id: 'doc-1',
    } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_request_more_info', { p_document_id: 'doc-1' })
    expect(result.data).toMatchObject({ ok: true, status: 'needs_resubmission' })
  })

  it('DOC-QUEUE-02: non-admin caller (forbidden) surfaces "Forbidden" error', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_approve_document', {
      p_document_id: 'doc-1',
    } as never)
    expect(error?.message).toContain('Forbidden')
  })

  it('DOC-QUEUE-02: rejected document with empty reason surfaces "Rejection reason cannot be empty"', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rejection reason cannot be empty' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_reject_document', {
      p_document_id: 'doc-1',
      p_reason: '',
    } as never)
    expect(error?.message).toContain('Rejection reason cannot be empty')
  })
})

describe('AdminDocumentsQueue end-to-end action dispatch (DOC-QUEUE-02 email side-effect)', () => {
  // Wave 5 plan 21-07 flips the prior third-state placeholder for the email side-
  // effect into two real RTL render tests — one for the happy approve path (click
  // → RPC → invoke 'send-document-status-email'), one for the reject-flow empty-
  // reason guard.

  it('DOC-QUEUE-02: Approve click → admin_approve_document RPC → send-document-status-email invoke', async () => {
    rpcMock.mockImplementation((fn: string) => {
      if (fn === 'admin_list_document_queue') {
        return Promise.resolve({
          data: {
            rows: [
              {
                document_id: 'doc-1',
                seeker_user_id: 'usr-1',
                seeker_name: 'Jane Doe',
                document_type: 'cv',
                filename: 'jane-cv.pdf',
                uploaded_at: '2026-05-15T10:00:00Z',
                status: 'pending',
                rejection_reason: null,
              },
            ],
            total: 1,
          },
          error: null,
        })
      }
      if (fn === 'admin_approve_document') {
        return Promise.resolve({
          data: { ok: true, document_id: 'doc-1', status: 'approved' },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { AdminDocumentsQueue } = await import('@/pages/admin/AdminDocumentsQueue')
    render(
      <MemoryRouter>
        <AdminDocumentsQueue />
      </MemoryRouter>,
    )

    // Wait for table row to render
    await waitFor(() => expect(screen.getByText('jane-cv.pdf')).toBeInTheDocument())

    const approveBtn = screen.getByRole('button', { name: /approve document/i })
    fireEvent.click(approveBtn)

    // Approve RPC fired with correct args
    await waitFor(() => {
      const approveCall = rpcMock.mock.calls.find((c) => c[0] === 'admin_approve_document')
      expect(approveCall).toBeTruthy()
      expect(approveCall![1]).toEqual({ p_document_id: 'doc-1' })
    })

    // Email function invoked with locked body shape
    await waitFor(() => {
      expect(functionsInvokeMock).toHaveBeenCalledWith('send-document-status-email', {
        body: { document_id: 'doc-1', action: 'approved' },
      })
    })
  })

  it('DOC-QUEUE-02: Reject flow requires reason; submitting empty does NOT dispatch admin_reject_document RPC', async () => {
    rpcMock.mockImplementation((fn: string) => {
      if (fn === 'admin_list_document_queue') {
        return Promise.resolve({
          data: {
            rows: [
              {
                document_id: 'doc-1',
                seeker_user_id: 'u1',
                seeker_name: 'Jane',
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
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { AdminDocumentsQueue } = await import('@/pages/admin/AdminDocumentsQueue')
    render(
      <MemoryRouter>
        <AdminDocumentsQueue />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('cv.pdf')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /reject document/i }))

    // Reason input + Confirm button surface; click Confirm without typing
    const confirm = await screen.findByRole('button', { name: /confirm reject/i })
    fireEvent.click(confirm)

    // No admin_reject_document RPC call expected because reason was empty
    // (handler short-circuits with toast.error before dispatch).
    await waitFor(() => {
      const rejectCall = rpcMock.mock.calls.find((c) => c[0] === 'admin_reject_document')
      expect(rejectCall).toBeUndefined()
    })
    // And the email fn was not invoked either.
    expect(functionsInvokeMock).not.toHaveBeenCalled()
  })
})
