import { cn } from '@/lib/utils'

interface MatchCircleProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: { container: 'w-[38px] h-[38px]', text: 'text-[11px]' },
  md: { container: 'w-[56px] h-[56px]', text: 'text-[14px]' },
  lg: { container: 'w-[88px] h-[88px]', text: 'text-[22px]' },
}

// Phase 4.1/4.5: the score is attached to a person. A low match is a partial
// fit, not an error — the bottom band is neutral, never danger-red. Text always
// uses a *-text-on-bg token so the number is readable in every band.
function getColourClasses(score: number) {
  if (score >= 80) {
    return {
      bg: 'bg-brand-50',
      border: 'border-brand/20',
      text: 'text-success-text-on-bg',
      label: 'text-success-text-on-bg',
    }
  }
  if (score >= 60) {
    return {
      bg: 'bg-warn-bg',
      border: 'border-warn/20',
      text: 'text-warn-text-on-bg',
      label: 'text-warn-text-on-bg',
    }
  }
  return {
    bg: 'bg-surface-2',
    border: 'border-border-strong',
    text: 'text-text-muted',
    label: 'text-text-muted',
  }
}

export function MatchCircle({ score, size = 'md', className }: MatchCircleProps) {
  const colours = getColourClasses(score)
  const sizes = sizeClasses[size]

  return (
    <div
      role="img"
      aria-label={`${score}% match`}
      className={cn(
        'flex flex-col items-center justify-center rounded-full border-[1.5px]',
        sizes.container,
        colours.bg,
        colours.border,
        className,
      )}
    >
      <span
        className={cn(
          'font-display leading-none font-semibold tabular-nums',
          sizes.text,
          colours.text,
        )}
      >
        {score}
      </span>
      {size === 'lg' && (
        <span className={cn('font-body mt-0.5 text-[9px] font-semibold', colours.label)}>
          MATCH
        </span>
      )}
    </div>
  )
}
