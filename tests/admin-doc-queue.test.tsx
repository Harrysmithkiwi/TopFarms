import { describe, it, vi, beforeEach } from 'vitest'

// DOC-QUEUE-01: admin_list_document_queue RPC shape matches AdminDocumentsQueue expectations.
// DOC-QUEUE-02: Approve / Reject / Request More Info buttons dispatch correct admin RPCs.
// Wave 2 plan 21-02 ships the 4 RPCs; Wave 5 plan 21-07 ships the page that consumes them.

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
  it.todo(
    'DOC-QUEUE-01: admin_list_document_queue called with { p_limit, p_offset } returns { rows: [{ document_id, seeker_id, seeker_name, document_type, filename, uploaded_at, status, rejection_reason }], total }',
  )
  it.todo('DOC-QUEUE-01: rows ordered with pending status first, then most recently uploaded')
})

describe('admin doc queue action dispatch (DOC-QUEUE-02)', () => {
  it.todo('DOC-QUEUE-02: Approve button calls supabase.rpc("admin_approve_document", { p_document_id: id } as never)')
  it.todo(
    'DOC-QUEUE-02: Reject button (after reason supplied) calls supabase.rpc("admin_reject_document", { p_document_id: id, p_reason: text } as never)',
  )
  it.todo(
    'DOC-QUEUE-02: Request More Info button calls supabase.rpc("admin_request_more_info", { p_document_id: id } as never)',
  )
  it.todo(
    'DOC-QUEUE-02: After successful RPC, supabase.functions.invoke("send-document-status-email", { body: { document_id, action } }) is called (best-effort — no rollback on email error)',
  )
  it.todo(
    'DOC-QUEUE-02: RPC error surfaces a toast.error containing the gate failure message ("Forbidden" or "Document not found")',
  )
})
