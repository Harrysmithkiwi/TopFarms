import { useState } from 'react'
import { TierCard } from '@/components/ui/TierCard'
import { Button } from '@/components/ui/Button'
import { LISTING_TIERS } from '@/types/domain'

interface Step6Props {
  onComplete: (data: Record<string, never>) => void
  onBack?: () => void
}

const TIER_FEATURES = {
  1: [
    'Basic farm profile listing',
    'Standard search placement',
    'Up to 5 photos',
    'Email applications',
  ],
  2: [
    'Everything in Standard',
    'Highlighted in search results',
    'Featured badge on listing',
    'Priority email notifications',
  ],
  3: [
    'Everything in Featured',
    'Top of search results',
    'Premium featured badge',
    'Dedicated support',
    'Analytics dashboard',
  ],
} as const

export function Step6Pricing({ onComplete, onBack }: Step6Props) {
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(2)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Listing tiers
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Preview our listing options — your first listing is always free!
        </p>
      </div>

      <div
        className="rounded-[10px] p-3 text-[13px] font-body font-semibold text-center"
        style={{ backgroundColor: 'var(--color-warn-bg)', color: 'var(--color-brand-900)' }}
      >
        Your first job listing is free, regardless of tier
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([1, 2, 3] as const).map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            name={LISTING_TIERS[tier].name}
            price={LISTING_TIERS[tier].displayPrice}
            features={TIER_FEATURES[tier] as unknown as string[]}
            isPopular={tier === 2}
            isSelected={selectedTier === tier}
            isFree
            onSelect={() => setSelectedTier(tier)}
          />
        ))}
      </div>

      <p className="text-[12px] text-center" style={{ color: 'var(--color-text-subtle)' }}>
        You'll choose your listing tier when you post your first job. No payment required today.
      </p>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Continue
        </Button>
      </div>
    </form>
  )
}
