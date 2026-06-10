import { useState } from 'react'
import { X, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { PlacementFeeTier } from '@/types/domain'

interface PlacementFeeModalProps {
  candidateName: string
  feeTier: PlacementFeeTier
  feeAmount: number
  feeDisplayAmount: string
  feeTierLabel: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function PlacementFeeModal({
  candidateName,
  feeTier: _feeTier,
  feeAmount: _feeAmount,
  feeDisplayAmount,
  feeTierLabel,
  onConfirm,
  onCancel,
}: PlacementFeeModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } catch {
      toast.error('Failed to release contact details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />

      {/* Modal container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-fee-heading"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-surface border-border w-full max-w-md rounded-[16px] border-[1.5px] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b px-6 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="text-warn h-5 w-5" />
              <h2
                id="placement-fee-heading"
                className="font-body text-[16px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Shortlist Candidate
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="hover:bg-surface-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="text-text-muted h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-6 px-6 py-5">
            {/* Candidate name */}
            <p
              className="font-body text-[14px] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {candidateName}
            </p>

            {/* Fee tier badge + fee amount */}
            <div className="space-y-2">
              <span
                className="font-body inline-block rounded-full px-2 py-1 text-[11px] font-semibold tracking-wide uppercase"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--color-warn)' }}
              >
                {feeTierLabel}
              </span>
              <p
                className="font-body text-[16px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {feeDisplayAmount} NZD
              </p>
            </div>

            {/* Explanatory text */}
            <p className="font-body text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              Placement fee applies if you hire this candidate. Shortlisting is free — this creates
              a record that you&apos;ve seen their contact details.
            </p>

            {/* Blurred contact preview */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span
                  className="font-body text-[11px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Phone
                </span>
                <p
                  className="font-mono text-[13px] blur-sm select-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ••• ••• ••••
                </p>
              </div>
              <div>
                <span
                  className="font-body text-[11px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Email
                </span>
                <p
                  className="font-mono text-[13px] blur-sm select-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  j•••@gmail.com
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-5">
            <Button
              variant="outline"
              size="md"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Keep current stage
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                'I understand — release contact details'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
