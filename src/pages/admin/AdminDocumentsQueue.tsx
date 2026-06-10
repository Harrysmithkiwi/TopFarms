import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { AdminTable } from '@/components/admin/AdminTable'
import { Tag } from '@/components/ui/Tag'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { DOCUMENT_TYPE_LABELS, type DocumentType, type SeekerDocumentStatus } from '@/types/domain'

interface DocumentRow extends Record<string, unknown> {
  document_id: string
  seeker_user_id: string
  seeker_name: string
  document_type: DocumentType
  filename: string
  uploaded_at: string
  status: SeekerDocumentStatus
  rejection_reason: string | null
}

const STATUS_DISPLAY: Record<
  SeekerDocumentStatus,
  { label: string; variant: 'warn' | 'green' | 'red' | 'blue' }
> = {
  pending: { label: 'Pending', variant: 'warn' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  needs_resubmission: { label: 'Needs Resubmission', variant: 'blue' },
}

/**
 * Phase 21 Track B — admin doc verification queue at /admin/documents.
 *
 * Composes <AdminTable rpc="admin_list_document_queue"> for the paginated table.
 * Each row exposes Approve / Reject (with reason) / Request More Info actions
 * that call the matching SECURITY DEFINER RPCs from migration 033, then invoke
 * send-document-status-email best-effort (failure doesn't roll back the action).
 *
 * Uses the Phase 20-05 `as never` workaround for Studio-applied admin_* RPCs
 * not in the supabase-js generated function-name union.
 *
 * Best-effort email contract (per plan 21-06 + 21-07):
 *   1. RPC dispatch FIRST → audit log writes atomically in the RPC body.
 *   2. ON RPC SUCCESS: invoke send-document-status-email.
 *   3. ON INVOKE FAILURE: toast.warning + continue. RPC has already committed;
 *      we don't roll back. Operator can manually retry email via Resend if
 *      needed (Phase 15 MAIL-02 CLAUDE.md §7 precedent).
 *
 * Why no rowKey conflict: AdminTable's <tr key={row.id ?? row.user_id ?? idx}> —
 * DocumentRow has neither `id` nor `user_id`, so it falls through to idx. That's
 * fine for ≤25 rows per page (no reordering across renders within a page).
 */
export function AdminDocumentsQueue() {
  // State for the row currently being rejected — holds doc_id + draft reason.
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Forces AdminTable to refetch after a mutation. AdminTable doesn't expose a
  // refetch handle, so we remount via key. Cheap at <=25 rows; matches the
  // refresh pattern used in EmployerList.tsx ProfileDrawer's onActiveChanged
  // (page-level state forces child rerender) but adapted for a stateless table.
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  async function notifyEmail(
    documentId: string,
    action: 'approved' | 'rejected' | 'needs_resubmission',
    reason?: string,
  ) {
    try {
      const { error } = await supabase.functions.invoke('send-document-status-email', {
        body: {
          document_id: documentId,
          action,
          ...(reason ? { rejection_reason: reason } : {}),
        },
      })
      if (error) {
        console.warn('[AdminDocumentsQueue] email send failed', error)
        toast.warning('Email notification failed — action succeeded.')
      }
    } catch (e) {
      console.warn('[AdminDocumentsQueue] email invoke threw', e)
      toast.warning('Email notification failed — action succeeded.')
    }
  }

  async function handleApprove(row: DocumentRow) {
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_approve_document' as never,
        { p_document_id: row.document_id } as never,
      )
      if (error) {
        toast.error(error.message || 'Approve failed')
        return
      }
      toast.success('Document approved')
      bumpRefresh()
      await notifyEmail(row.document_id, 'approved')
    } finally {
      setBusyId(null)
    }
  }

  async function handleConfirmReject(row: DocumentRow) {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason.')
      return
    }
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_reject_document' as never,
        { p_document_id: row.document_id, p_reason: reason } as never,
      )
      if (error) {
        toast.error(error.message || 'Reject failed')
        return
      }
      toast.success('Document rejected')
      setRejectingId(null)
      setRejectReason('')
      bumpRefresh()
      await notifyEmail(row.document_id, 'rejected', reason)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRequestMoreInfo(row: DocumentRow) {
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_request_more_info' as never,
        { p_document_id: row.document_id } as never,
      )
      if (error) {
        toast.error(error.message || 'Request more info failed')
        return
      }
      toast.success('Resubmission requested')
      bumpRefresh()
      await notifyEmail(row.document_id, 'needs_resubmission')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] leading-7 font-semibold"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Document Queue
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
        Review seeker-uploaded documents. Approve to grant the &ldquo;Documents Verified&rdquo;
        badge; reject with a reason or request a resubmission.
      </p>

      <AdminTable<DocumentRow>
        key={refreshKey}
        rpc="admin_list_document_queue"
        searchable={false}
        emptyHeading="Queue is empty"
        emptyBody="No documents waiting for review."
        errorCopy="Failed to load the queue. Refresh the page or check your connection."
        columns={[
          { key: 'seeker', label: 'Seeker' },
          { key: 'filename', label: 'File' },
          { key: 'uploaded', label: 'Uploaded' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ]}
        renderRow={(row) => {
          const status = STATUS_DISPLAY[row.status]
          const busy = busyId === row.document_id
          const rejecting = rejectingId === row.document_id
          return (
            <>
              <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                <div className="text-[15px]">{row.seeker_name}</div>
                <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  {DOCUMENT_TYPE_LABELS[row.document_type] ?? row.document_type}
                </div>
              </td>
              <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text)' }}>
                {row.filename}
              </td>
              <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(row.uploaded_at).toLocaleDateString('en-NZ', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3">
                <Tag variant={status.variant}>{status.label}</Tag>
                {row.status === 'rejected' && row.rejection_reason && (
                  <div className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.rejection_reason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {rejecting ? (
                  <div className="flex w-[280px] flex-col gap-2">
                    <Input
                      placeholder="Reason (required, e.g. 'illegible')"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                      disabled={busy}
                      aria-label="Rejection reason"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirmReject(row)}
                        disabled={busy}
                      >
                        {busy ? 'Submitting…' : 'Confirm reject'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingId(null)
                          setRejectReason('')
                        }}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(row)}
                      disabled={busy || row.status === 'approved'}
                      aria-label="Approve document"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingId(row.document_id)
                        setRejectReason('')
                      }}
                      disabled={busy}
                      aria-label="Reject document"
                    >
                      <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRequestMoreInfo(row)}
                      disabled={busy}
                      aria-label="Request more info"
                    >
                      <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                      Request more info
                    </Button>
                  </div>
                )}
              </td>
            </>
          )
        }}
      />
    </div>
  )
}
