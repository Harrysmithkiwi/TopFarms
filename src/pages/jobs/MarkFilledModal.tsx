import { useState, useEffect } from 'react'
import { X, CheckCircle, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface Applicant {
  id: string
  seeker_id: string
  status: string
  display_name: string
  match_score: number
}

interface MarkFilledModalProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
  onFilled: () => void
}

/**
 * Modal for marking a job listing as filled.
 * Loads applicants for the job (Phase 3+ feature).
 * Allows employer to select hired candidate (if any) and confirm hire date.
 * Updates job status to 'filled' and optionally marks selected application as 'hired'.
 */
export function MarkFilledModal({ jobId, isOpen, onClose, onFilled }: MarkFilledModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)
  const [hireDate, setHireDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !jobId) return

    async function loadApplicants() {
      setLoadingApplicants(true)
      try {
        const { data, error } = await supabase.rpc('get_applicants_for_job', { p_job_id: jobId })

        if (error) {
          console.error('MarkFilledModal: failed to load applicants', error)
          setApplicants([])
          return
        }

        setApplicants((data as Applicant[]) ?? [])
      } finally {
        setLoadingApplicants(false)
      }
    }

    loadApplicants()
    setSelectedApplicantId(null)
    setHireDate('')
  }, [isOpen, jobId])

  async function handleConfirm() {
    if (!jobId) return
    setSubmitting(true)

    try {
      // Phase 18.1 #4 — atomic mark-filled via SECURITY DEFINER RPC.
      // The RPC wraps both UPDATEs (applications + jobs) in a single Postgres
      // transaction; on failure, both roll back — eliminates the orphan-hired
      // application class of incident (precedent: 2a91e3db Phase 15-02 Bug 4).
      // Migration: 026_mark_job_filled_rpc.sql.
      const { error } = await supabase.rpc('mark_job_filled', {
        p_job_id: jobId,
        p_applicant_id: selectedApplicantId, // null OK — RPC handles "Hired externally" branch
      })

      if (error) {
        console.error('MarkFilledModal: mark_job_filled RPC error', error)
        toast.error('Failed to mark listing as filled. Please try again.')
        return
      }

      toast.success('Listing marked as filled')
      onFilled()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-filled-heading"
        className={cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
      >
        <div
          className="bg-surface border-border w-full max-w-md rounded-[16px] border-[1.5px] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b px-6 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-brand h-5 w-5" />
              <h2
                id="mark-filled-heading"
                className="font-body text-[16px] font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                Mark as Filled
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hover:bg-surface-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="text-text-muted h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 px-6 py-5">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Marking this listing as filled will remove it from active search results. This action
              cannot be undone.
            </p>

            {/* Applicants section */}
            <div>
              <p
                className="font-body mb-2 text-[13px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Who did you hire?
              </p>

              {loadingApplicants ? (
                <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                  Loading applicants...
                </p>
              ) : applicants.length === 0 ? (
                <div
                  className="rounded-[10px] p-4 text-center"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}
                >
                  <UserCircle
                    className="mx-auto mb-2 h-8 w-8"
                    style={{ color: 'var(--color-text-subtle)' }}
                  />
                  <p
                    className="font-body text-sm font-medium"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No applicants via TopFarms
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    You can still mark this position as filled if you hired externally.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {/* "Hired externally" option */}
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[8px] border-[1.5px] p-3 transition-all duration-150',
                      selectedApplicantId === null
                        ? 'border-brand bg-[rgba(74,124,47,0.04)]'
                        : 'border-border hover:border-brand-hover',
                    )}
                  >
                    <input
                      type="radio"
                      name="applicant"
                      value=""
                      checked={selectedApplicantId === null}
                      onChange={() => setSelectedApplicantId(null)}
                      className="accent-brand h-4 w-4"
                    />
                    <span className="font-body text-sm" style={{ color: 'var(--color-text)' }}>
                      Hired externally
                    </span>
                  </label>

                  {applicants.map((applicant) => (
                    <label
                      key={applicant.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-[8px] border-[1.5px] p-3 transition-all duration-150',
                        selectedApplicantId === applicant.id
                          ? 'border-brand bg-[rgba(74,124,47,0.04)]'
                          : 'border-border hover:border-brand-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name="applicant"
                        value={applicant.id}
                        checked={selectedApplicantId === applicant.id}
                        onChange={() => setSelectedApplicantId(applicant.id)}
                        className="accent-brand h-4 w-4"
                      />
                      <span className="font-body text-sm" style={{ color: 'var(--color-text)' }}>
                        {applicant.display_name} •{' '}
                        <span className="capitalize">{applicant.status}</span> •{' '}
                        {applicant.match_score}pts
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Hire Date */}
            <div>
              <label
                htmlFor="hire-date"
                className="font-body mb-1.5 block text-[13px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Hire Date{' '}
                <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>
                  (optional)
                </span>
              </label>
              <input
                id="hire-date"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className={cn(
                  'border-border font-body w-full rounded-[8px] border-[1.5px] px-3 py-2 text-sm',
                  'text-text bg-surface focus:border-brand transition-colors focus:outline-none',
                )}
                style={{ color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-5">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Confirming...' : 'Confirm Filled'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
