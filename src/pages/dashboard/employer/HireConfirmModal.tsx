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

export function HireConfirmModal({ candidateName, feeDisplayAmount, onConfirm, onCancel }: HireConfirmModalProps) {
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
        <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-fog">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-6 pt-6 pb-4 border-b border-fog">
            <CheckCircle className="w-5 h-5 text-moss flex-shrink-0" style={{ color: 'var(--color-moss)' }} />
            <h2 className="flex-1 text-[16px] font-semibold font-body" style={{ color: 'var(--color-ink)' }}>
              Confirm Hire
            </h2>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-fog transition-colors"
              style={{ color: 'var(--color-mid)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Candidate label */}
            <p className="text-[14px] font-body" style={{ color: 'var(--color-mid)' }}>
              Confirm hire of <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{candidateName}</span>?
            </p>

            {/* Invoice warning box */}
            <div
              className="rounded-[10px] p-4 border-[1.5px]"
              style={{ backgroundColor: 'rgba(212,168,67,0.1)', borderColor: 'var(--color-hay)' }}
            >
              <p className="text-[13px] font-body" style={{ color: 'var(--color-mid)' }}>
                A placement fee invoice of{' '}
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {feeDisplayAmount} NZD
                </span>{' '}
                will be generated and sent to your email.
              </p>
              <p
                className="text-[11px] uppercase tracking-wide mt-1.5"
                style={{ color: 'var(--color-light)' }}
              >
                Payment due within 14 days.
              </p>
            </div>

            {/* Star rating (optional) */}
            <div className="space-y-2">
              <p
                className="text-[11px] uppercase tracking-wide font-body"
                style={{ color: 'var(--color-light)' }}
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
                        'w-4 h-4',
                        (rating ?? 0) >= n
                          ? 'fill-hay text-hay'
                          : 'text-fog',
                      )}
                      style={
                        (rating ?? 0) >= n
                          ? { fill: 'var(--color-hay)', color: 'var(--color-hay)' }
                          : { color: 'var(--color-fog)' }
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Go back
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
