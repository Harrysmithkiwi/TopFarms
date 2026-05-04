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
        'relative w-full text-left rounded-[12px] border-[2px] p-5 transition-all duration-200 cursor-pointer',
        'flex flex-col gap-4',
        isSelected
          ? 'border-brand-hover bg-[rgba(74,124,47,0.06)] shadow-sm'
          : 'border-border bg-surface hover:border-mid hover:shadow-sm',
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-brand-hover text-white text-[11px] font-body font-semibold px-3 py-0.5 rounded-full">
            Best Value
          </span>
        </div>
      )}

      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-200',
          isSelected ? 'border-brand-hover bg-brand-hover' : 'border-border bg-surface',
        )}
      >
        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
      </div>

      {/* Tier name */}
      <div>
        <h3 className="text-[15px] font-body font-bold text-text">{name}</h3>

        {/* Price block */}
        <div className="mt-1 relative inline-block">
          <span
            className={cn(
              'text-[24px] font-body font-bold transition-all duration-200',
              isSelected ? 'text-brand-hover' : 'text-text',
              isFree && 'opacity-40 line-through text-[18px]',
            )}
          >
            {price}
          </span>
          {isFree && (
            <span className="ml-2 text-[13px] font-body font-semibold text-brand-hover">
              Free!
            </span>
          )}
        </div>

        {isFree && (
          <p className="text-[11px] font-body text-brand mt-0.5">First listing free</p>
        )}
      </div>

      {/* Features list */}
      <ul className="space-y-1.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check
              className={cn(
                'w-3.5 h-3.5 mt-0.5 flex-shrink-0 stroke-[2.5]',
                isSelected ? 'text-brand-hover' : 'text-brand',
              )}
            />
            <span className="text-[12px] font-body text-text-muted leading-tight">{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
