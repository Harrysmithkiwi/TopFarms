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
        const { data, error } = await supabase
          .from('applications')
          .select('id, seeker_id, status')
          .eq('job_id', jobId)

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
      // 1. If an applicant was selected, mark their application as hired FIRST
      //    (before job status triggers the notify-job-filled webhook, so the hired
      //    applicant is already excluded from the ghosting-prevention emails)
      if (selectedApplicantId) {
        const { error: appError } = await supabase
          .from('applications')
          .update({ status: 'hired' })
          .eq('id', selectedApplicantId)

        if (appError) {
          console.error('MarkFilledModal: application update error', appError)
          toast.error('Failed to update applicant status. Please try again.')
          return
        }
      }

      // 2. Mark job as filled (this triggers the notify-job-filled webhook)
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'filled' })
        .eq('id', jobId)

      if (jobError) {
        toast.error('Failed to mark listing as filled. Please try again.')
        console.error('MarkFilledModal: job update error', jobError)
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
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-filled-heading"
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
        )}
      >
        <div
          className="bg-surface rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-brand" />
              <h2
                id="mark-filled-heading"
                className="text-[16px] font-body font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                Mark as Filled
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Marking this listing as filled will remove it from active search results. This action
              cannot be undone.
            </p>

            {/* Applicants section */}
            <div>
              <p className="text-[13px] font-body font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
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
                  <UserCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                  <p className="text-sm font-body font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    No applicants via TopFarms
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                    You can still mark this position as filled if you hired externally.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* "Hired externally" option */}
                  <label
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all duration-150',
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
                      className="w-4 h-4 accent-moss"
                    />
                    <span className="text-sm font-body" style={{ color: 'var(--color-text)' }}>
                      Hired externally
                    </span>
                  </label>

                  {applicants.map((applicant) => (
                    <label
                      key={applicant.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all duration-150',
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
                        className="w-4 h-4 accent-moss"
                      />
                      <span className="text-sm font-body" style={{ color: 'var(--color-text)' }}>
                        Applicant #{applicant.id.slice(0, 8)}
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
                className="block text-[13px] font-body font-semibold mb-1.5"
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
                  'w-full px-3 py-2 rounded-[8px] border-[1.5px] border-border text-sm font-body',
                  'text-text bg-surface focus:outline-none focus:border-brand transition-colors',
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
