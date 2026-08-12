import { Button } from '@/components/ui/Button'

// Onboarding pricing preview. Was a three-tier ladder ($100/$150/$200) behind a
// "first listing free" badge; directive 1.19 retired both. Listings are free and
// unlimited, so this step's job is no longer to sell a tier. It is to make sure an
// employer finishes onboarding already knowing where the one fee is, because the
// alternative is discovering it at shortlist.
//
// TierCard and LISTING_TIERS are deliberately not imported. Featured ($99) returns
// as its own surface when its traffic trigger fires.

interface Step6Props {
  onComplete: (data: Record<string, never>) => void
  onBack?: () => void
}

const BANDS: Array<[string, string]> = [
  ['Under $55,000', '$200'],
  ['$55,000 to $80,000', '$400'],
  ['$80,000 and above, and manager roles', '$800'],
]

export function Step6Pricing({ onComplete, onBack }: Step6Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          What it costs
        </h2>
      </div>

      <div
        className="font-body rounded-[10px] p-3 text-center text-[13px] font-semibold"
        style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-900)' }}
      >
        Listing jobs is free. All of them, always. No card required.
      </div>

      <div className="rounded-[12px] p-5" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <p className="text-label font-semibold" style={{ color: 'var(--color-text)' }}>
          You pay one fee, once, only if you hire
        </p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Set by the salary band on the listing. Accepted when you shortlist someone, which
          is when their phone, email and CV unlock.
        </p>

        <dl className="mt-4 space-y-2">
          {BANDS.map(([band, fee]) => (
            <div
              key={band}
              className="flex items-baseline justify-between gap-4 border-t pt-2 text-[13px]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <dt style={{ color: 'var(--color-text-muted)' }}>{band}</dt>
              <dd
                className="font-mono font-semibold [font-variant-numeric:tabular-nums]"
                style={{ color: 'var(--color-text)' }}
              >
                {fee}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Every placement fee includes a replacement guarantee: 90 days on permanent roles,
          30 days on fixed term. Casual and relief work carries no guarantee.
        </p>
      </div>

      <p className="text-center text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
        Nothing to pay today, and nothing to pay to post.
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
