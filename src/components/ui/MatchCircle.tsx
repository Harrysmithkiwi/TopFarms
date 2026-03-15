import { cn } from '@/lib/utils'

interface MatchCircleProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: { container: 'w-[38px] h-[38px]', text: 'text-[11px]' },
  md: { container: 'w-[50px] h-[50px]', text: 'text-[13px]' },
  lg: { container: 'w-[72px] h-[72px]', text: 'text-[18px]' },
}

function getColourClasses(score: number) {
  if (score >= 80) {
    return {
      bg: 'bg-[rgba(45,80,22,0.08)]',
      border: 'border-[rgba(45,80,22,0.2)]',
      text: 'text-moss',
      label: 'text-moss',
    }
  }
  if (score >= 60) {
    return {
      bg: 'bg-[rgba(230,126,34,0.08)]',
      border: 'border-[rgba(230,126,34,0.2)]',
      text: 'text-orange',
      label: 'text-orange',
    }
  }
  return {
    bg: 'bg-[rgba(192,57,43,0.08)]',
    border: 'border-[rgba(192,57,43,0.2)]',
    text: 'text-red',
    label: 'text-red',
  }
}

export function MatchCircle({ score, size = 'md', className }: MatchCircleProps) {
  const colours = getColourClasses(score)
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full border-[1.5px]',
        sizes.container,
        colours.bg,
        colours.border,
        className,
      )}
    >
      <span className={cn('font-display font-bold leading-none', sizes.text, colours.text)}>
        {score}
      </span>
      {size === 'lg' && (
        <span className={cn('text-[9px] font-body font-semibold mt-0.5', colours.label)}>
          MATCH
        </span>
      )}
    </div>
  )
}
