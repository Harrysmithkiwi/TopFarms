import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TierCardProps {
  tier: 1 | 2 | 3
  name: string
  /** Display price string e.g. "$150" */
  price: string
  features: string[]
  isPopular?: boolean
  isSelected?: boolean
  /** When true, shows "First listing free!" badge overlaying the price */
  isFree?: boolean
  onSelect: () => void
}

/**
 * Tier comparison card for listing fee selection.
 * - Selected state: fern border + light green background
 * - Popular badge: "Best Value" tag on tier 2
 * - Free badge: "First listing free!" overlay when isFree
 */
export function TierCard({
  name,
  price,
  features,
  isPopular = false,
  isSelected = false,
  isFree = false,
  onSelect,
}: TierCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full cursor-pointer rounded-[12px] border-[2px] p-5 text-left transition-all duration-200',
        'flex flex-col gap-4',
        isSelected
          ? 'border-brand-hover bg-[rgba(74,124,47,0.06)] shadow-sm'
          : 'border-border bg-surface hover:border-border-strong hover:shadow-sm',
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-brand-hover font-body rounded-full px-3 py-0.5 text-[11px] font-semibold text-white">
            Best Value
          </span>
        </div>
      )}

      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-[2px] transition-all duration-200',
          isSelected ? 'border-brand-hover bg-brand-hover' : 'border-border bg-surface',
        )}
      >
        {isSelected && <Check className="h-3 w-3 stroke-[3] text-white" />}
      </div>

      {/* Tier name */}
      <div>
        <h3 className="font-body text-text text-[15px] font-bold">{name}</h3>

        {/* Price block */}
        <div className="relative mt-1 inline-block">
          <span
            className={cn(
              'font-body text-[24px] font-bold transition-all duration-200',
              isSelected ? 'text-brand-hover' : 'text-text',
              isFree && 'text-[18px] line-through opacity-40',
            )}
          >
            {price}
          </span>
          {isFree && (
            <span className="font-body text-brand-hover ml-2 text-[13px] font-semibold">Free!</span>
          )}
        </div>

        {isFree && <p className="font-body text-brand mt-0.5 text-[11px]">First listing free</p>}
      </div>

      {/* Features list */}
      <ul className="space-y-1.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check
              className={cn(
                'mt-0.5 h-3.5 w-3.5 flex-shrink-0 stroke-[2.5]',
                isSelected ? 'text-brand-hover' : 'text-brand',
              )}
            />
            <span className="font-body text-text-muted text-[12px] leading-tight">{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
