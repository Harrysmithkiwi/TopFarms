import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  size?: number
  className?: string
}

const STAR_PATH =
  'M8 1.5l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.81l-3.708 1.1.708-4.128-3-2.924 4.146-.602L8 1.5z'

function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={STAR_PATH}
        fill={filled ? 'var(--color-warn)' : 'var(--color-border)'}
      />
    </svg>
  )
}

export function StarRating({ value, onChange, size = 16, className }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const isInteractive = typeof onChange === 'function'

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      onMouseLeave={isInteractive ? () => setHoverRating(0) : undefined}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const filled = rating <= (hoverRating || value)

        if (!isInteractive) {
          return (
            <span key={rating}>
              <StarIcon filled={filled} size={size} />
            </span>
          )
        }

        return (
          <button
            key={rating}
            type="button"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            onMouseEnter={() => setHoverRating(rating)}
            onClick={() => onChange(rating)}
          >
            <StarIcon filled={filled} size={size} />
          </button>
        )
      })}
    </div>
  )
}
