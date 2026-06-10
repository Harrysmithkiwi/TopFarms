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

function getColourClasses(score: number) {
  if (score >= 80) {
    return {
      bg: 'bg-brand-50',
      border: 'border-brand/20',
      text: 'text-brand',
      label: 'text-brand',
    }
  }
  if (score >= 60) {
    return {
      bg: 'bg-warn/10',
      border: 'border-warn/20',
      text: 'text-warn',
      label: 'text-warn',
    }
  }
  return {
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    text: 'text-danger',
    label: 'text-danger',
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
