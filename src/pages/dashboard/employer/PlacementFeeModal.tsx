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
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-fee-heading"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-surface rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-warn" />
              <h2
                id="placement-fee-heading"
                className="text-[16px] font-body font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Shortlist Candidate
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {/* Candidate name */}
            <p className="text-[14px] font-body font-semibold" style={{ color: 'var(--color-text)' }}>
              {candidateName}
            </p>

            {/* Fee tier badge + fee amount */}
            <div className="space-y-2">
              <span
                className="inline-block text-[11px] font-body font-semibold uppercase tracking-wide rounded-full px-2 py-1"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--color-warn)' }}
              >
                {feeTierLabel}
              </span>
              <p className="text-[16px] font-body font-semibold" style={{ color: 'var(--color-text)' }}>
                {feeDisplayAmount} NZD
              </p>
            </div>

            {/* Explanatory text */}
            <p className="text-[13px] font-body" style={{ color: 'var(--color-text-muted)' }}>
              Placement fee applies if you hire this candidate. Shortlisting is free — this creates a record that you&apos;ve seen their contact details.
            </p>

            {/* Blurred contact preview */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span className="text-[11px] font-body" style={{ color: 'var(--color-text-subtle)' }}>Phone</span>
                <p className="font-mono text-[13px] select-none blur-sm" style={{ color: 'var(--color-text-muted)' }}>
                  ••• ••• ••••
                </p>
              </div>
              <div>
                <span className="text-[11px] font-body" style={{ color: 'var(--color-text-subtle)' }}>Email</span>
                <p className="font-mono text-[13px] select-none blur-sm" style={{ color: 'var(--color-text-muted)' }}>
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
