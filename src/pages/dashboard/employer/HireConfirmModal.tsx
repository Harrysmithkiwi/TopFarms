import { useState } from 'react'
import { CheckCircle, Star, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface HireConfirmModalProps {
  candidateName: string
  feeDisplayAmount: string
  onConfirm: (rating: number | null) => Promise<void>
  onCancel: () => void
}

export function HireConfirmModal({
  candidateName,
  feeDisplayAmount,
  onConfirm,
  onCancel,
}: HireConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState<number | null>(null)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm(rating)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />

      {/* Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Card */}
        <div className="bg-surface border-border w-full max-w-md rounded-[16px] border-[1.5px] shadow-xl">
          {/* Header */}
          <div className="border-border flex items-center gap-2.5 border-b px-6 pt-6 pb-4">
            <CheckCircle
              className="text-brand h-5 w-5 flex-shrink-0"
              style={{ color: 'var(--color-brand)' }}
            />
            <h2
              className="font-body flex-1 text-[16px] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Confirm Hire
            </h2>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="hover:bg-surface-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 px-6 py-5">
            {/* Candidate label */}
            <p className="font-body text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
              Confirm hire of{' '}
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {candidateName}
              </span>
              ?
            </p>

            {/* Invoice warning box */}
            <div
              className="rounded-[10px] border-[1.5px] p-4"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'var(--color-warn)' }}
            >
              <p className="font-body text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                A placement fee invoice of{' '}
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {feeDisplayAmount} NZD
                </span>{' '}
                will be generated and sent to your email.
              </p>
              <p
                className="mt-1.5 text-[11px] tracking-wide uppercase"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                Payment due within 14 days.
              </p>
            </div>

            {/* Star rating (optional) */}
            <div className="space-y-2">
              <p
                className="font-body text-[11px] tracking-wide uppercase"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                Rate your matching experience (optional)
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n === rating ? null : n)}
                    className="p-0.5 transition-colors"
                    aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        (rating ?? 0) >= n ? 'fill-warn text-warn' : 'text-border-strong',
                      )}
                      style={
                        (rating ?? 0) >= n
                          ? { fill: 'var(--color-warn)', color: 'var(--color-warn)' }
                          : { color: 'var(--color-border)' }
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
              Go back
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </span>
              ) : (
                'Confirm Hire'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
