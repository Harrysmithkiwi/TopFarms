import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Eye } from 'lucide-react'
import { AdminTable } from '@/components/admin/AdminTable'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
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

// Phase 3 Task 3.2 — employer verification submissions, the second source on
// this page. Kept here rather than on a new page: the shell, pagination and
// approve/reject affordances are identical, and the operator's job ("review the
// evidence, decide") is the same one.
interface VerificationRow extends Record<string, unknown> {
  verification_id: string
  employer_id: string
  farm_name: string | null
  region: string | null
  method: string
  status: string
  nzbn_number: string | null
  document_url: string | null
  created_at: string
  reviewed_at: string | null
  verified_at: string | null
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

const VERIFICATION_STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'warn' | 'green' | 'red' | 'grey' }
> = {
  pending: { label: 'Pending', variant: 'warn' },
  verified: { label: 'Verified', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
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

  // Which queue is on screen. Seeker documents first — it is the higher-volume
  // one and the pre-existing behaviour of this route.
  const [source, setSource] = useState<'seeker' | 'employer'>('seeker')
  const [rejectingVerificationId, setRejectingVerificationId] = useState<string | null>(null)

  /**
   * Open a document via get-applicant-document-url. The Edge Function writes an
   * admin_audit_log row BEFORE it mints the signed URL (migration 073), so
   * viewing is an audited event and this client cannot opt out of being logged.
   * Accepts either a seeker document or an employer verification.
   */
  async function openDocument(target: { document_id: string } | { verification_id: string }) {
    try {
      const { data, error } = await supabase.functions.invoke('get-applicant-document-url', {
        body: target,
      })
      if (error || !data?.url) {
        toast.error(error?.message || 'Could not open the document')
        return
      }
      window.open(data.url as string, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error('[AdminDocumentsQueue] document open failed', e)
      toast.error('Could not open the document')
    }
  }

  async function handleApproveVerification(row: VerificationRow) {
    setBusyId(row.verification_id)
    try {
      const { error } = await supabase.rpc(
        'admin_approve_verification' as never,
        { p_verification_id: row.verification_id } as never,
      )
      if (error) {
        toast.error(error.message || 'Approve failed')
        return
      }
      toast.success('Employer verified')
      bumpRefresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleRejectVerification(row: VerificationRow) {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason.')
      return
    }
    setBusyId(row.verification_id)
    try {
      const { error } = await supabase.rpc(
        'admin_reject_verification' as never,
        { p_verification_id: row.verification_id, p_reason: reason } as never,
      )
      if (error) {
        toast.error(error.message || 'Reject failed')
        return
      }
      toast.success('Verification rejected')
      setRejectingVerificationId(null)
      setRejectReason('')
      bumpRefresh()
    } finally {
      setBusyId(null)
    }
  }

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
      <AdminPageHeader
        eyebrow="People"
        title="Document Queue"
        description="Approving grants a verification badge. Every document you open is recorded in the audit log."
      />

      {/* Source switch. Two queues, one shell — same shape of decision. */}
      <div className="border-border flex border-b" role="tablist" aria-label="Queue source">
        {(
          [
            ['seeker', 'Seeker documents'],
            ['employer', 'Employer verification'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={source === key}
            onClick={() => {
              setSource(key)
              setRejectingId(null)
              setRejectingVerificationId(null)
              setRejectReason('')
            }}
            className={
              source === key
                ? 'text-brand-hover border-brand border-b-2 px-4 py-2 text-[13px] font-semibold'
                : 'text-text-muted hover:text-text px-4 py-2 text-[13px] font-semibold'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {source === 'employer' ? (
        <AdminTable<VerificationRow>
          key={`verifications-${refreshKey}`}
          rpc="admin_list_verification_queue"
          inCard
          searchable={false}
          emptyHeading="No verification submissions"
          emptyBody="Employer verification submissions will appear here for review."
          errorCopy="Failed to load the verification queue. Refresh the page or check your connection."
          columns={[
            { key: 'employer', label: 'Employer' },
            { key: 'method', label: 'Method' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          renderRow={(row) => {
            const status = VERIFICATION_STATUS_DISPLAY[row.status] ?? {
              label: row.status,
              variant: 'grey' as const,
            }
            const busy = busyId === row.verification_id
            const rejecting = rejectingVerificationId === row.verification_id
            return (
              <>
                <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                  <div className="text-[15px]">{row.farm_name ?? '—'}</div>
                  <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.region ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text)' }}>
                  {row.method}
                  {row.nzbn_number && (
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      NZBN {row.nzbn_number}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(row.created_at).toLocaleDateString('en-NZ', {
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
                        placeholder="Reason (required, e.g. 'name does not match NZBN')"
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
                          onClick={() => handleRejectVerification(row)}
                          disabled={busy}
                        >
                          {busy ? 'Submitting…' : 'Confirm reject'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRejectingVerificationId(null)
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
                      {row.document_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openDocument({ verification_id: row.verification_id })}
                          disabled={busy}
                          aria-label="View verification document"
                        >
                          <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                          View
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveVerification(row)}
                        disabled={busy || row.status === 'verified'}
                        aria-label="Approve verification"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingVerificationId(row.verification_id)
                          setRejectReason('')
                        }}
                        disabled={busy}
                        aria-label="Reject verification"
                      >
                        <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </>
            )
          }}
        />
      ) : (
      <AdminTable<DocumentRow>
        key={refreshKey}
        rpc="admin_list_document_queue"
        inCard
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
                    {/* The queue previously had no way to SEE the document it was
                        approving. Minting is audited server-side (migration 073). */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openDocument({ document_id: row.document_id })}
                      disabled={busy}
                      aria-label="View document"
                    >
                      <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                      View
                    </Button>
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
      )}
    </div>
  )
}
