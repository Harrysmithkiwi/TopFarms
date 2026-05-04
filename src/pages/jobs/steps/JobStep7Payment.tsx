import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TierCard } from '@/components/ui/TierCard'
import { PaymentForm } from '@/components/stripe/PaymentForm'
import { Button } from '@/components/ui/Button'

const LISTING_TIERS = {
  1: {
    name: 'Standard',
    price: '$100',
    features: ['Listed in search results', '30-day listing', 'Basic analytics'],
  },
  2: {
    name: 'Featured',
    price: '$150',
    features: [
      'Highlighted in search results',
      '30-day listing',
      'Priority placement',
      'Detailed analytics',
    ],
  },
  3: {
    name: 'Premium',
    price: '$200',
    features: [
      'Top of search results',
      '30-day listing',
      'Featured badge on listing',
      'Premium analytics',
      'Social media boost',
    ],
  },
} as const

type TierKey = keyof typeof LISTING_TIERS
type Phase = 'tier-selection' | 'payment' | 'free-activated'

interface JobStep7PaymentProps {
  jobId: string
  employerId: string
  onComplete: () => void
  onBack: () => void
}

export function JobStep7Payment({
  jobId,
  employerId,
  onComplete,
  onBack,
}: JobStep7PaymentProps) {
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null)
  const [phase, setPhase] = useState<Phase>('tier-selection')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!selectedTier) return

    setLoading(true)
    setPaymentError(null)

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        job_id: jobId,
        tier: selectedTier,
        employer_id: employerId,
      },
    })

    setLoading(false)

    if (error) {
      toast.error('Failed to process request. Please try again.')
      console.error('create-payment-intent error:', error)
      return
    }

    if (data.is_free) {
      // First listing — no payment needed, job already activated
      setPhase('free-activated')
      // Auto-advance to success after 2 seconds
      setTimeout(() => {
        onComplete()
      }, 2000)
    } else if (data.client_secret) {
      setClientSecret(data.client_secret)
      setPhase('payment')
    } else {
      toast.error('Unexpected response from payment service')
    }
  }

  function handleBackToTierSelection() {
    setPhase('tier-selection')
    setClientSecret(null)
    setPaymentError(null)
  }

  // Phase: Free activation confirmed
  if (phase === 'free-activated') {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
        <CheckCircle className="w-12 h-12" style={{ color: 'var(--color-brand-hover)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Your first listing is free!
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your job is being activated. Redirecting to success screen...
        </p>
        <div
          className="w-5 h-5 rounded-full border-[2px] border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-brand-hover)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // Phase: Payment form
  if (phase === 'payment' && clientSecret) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            Complete payment
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {selectedTier
              ? `${LISTING_TIERS[selectedTier].name} listing — ${LISTING_TIERS[selectedTier].price} NZD`
              : 'Enter your payment details to activate your listing'}
          </p>
        </div>

        {paymentError && (
          <div
            className="rounded-[10px] border border-danger/30 bg-red/5 p-4 space-y-2"
          >
            <p className="text-[13px] font-medium" style={{ color: 'var(--color-clay)' }}>
              Payment failed
            </p>
            <p className="text-[12px]" style={{ color: 'var(--color-clay)' }}>
              {paymentError}
            </p>
            <button
              type="button"
              className="text-[12px] font-semibold underline"
              style={{ color: 'var(--color-brand-hover)' }}
              onClick={() => setPaymentError(null)}
            >
              Try again
            </button>
          </div>
        )}

        <PaymentForm
          clientSecret={clientSecret}
          onSuccess={() => {
            onComplete()
          }}
          onError={(message) => {
            setPaymentError(message)
          }}
        />

        <div className="flex justify-start pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackToTierSelection}
          >
            Change plan
          </Button>
        </div>
      </div>
    )
  }

  // Phase: Tier selection
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Choose a listing plan
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Select the plan that best suits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {([1, 2, 3] as const).map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            name={LISTING_TIERS[tier].name}
            price={LISTING_TIERS[tier].price}
            features={[...LISTING_TIERS[tier].features]}
            isPopular={tier === 2}
            isSelected={selectedTier === tier}
            onSelect={() => setSelectedTier(tier)}
          />
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" size="md" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={!selectedTier || loading}
          onClick={handleContinue}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border-[2px] border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(255,255,255,0.6)', borderTopColor: 'transparent' }}
              />
              Processing...
            </span>
          ) : (
            'Continue to payment'
          )}
        </Button>
      </div>
    </div>
  )
}
