import { cn } from '@/lib/utils'

interface MatchBadgeProps {
  /** 0–100 match score, rendered as `N%`. */
  score: number
  /**
   * `default` — green brand pill. `ai` — purple match-engine accent
   * (#8B5CF6), reserved for match-score moments per the brand spec.
   */
  variant?: 'default' | 'ai'
  className?: string
}

export function MatchBadge({ score, variant = 'default', className }: MatchBadgeProps) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <span
      data-anim="match-badge"
      className={cn(
        'inline-flex h-[26px] items-center gap-1.5 rounded-full px-[11px] text-[13px] font-semibold',
        variant === 'ai' ? 'bg-ai-bg text-ai' : 'bg-brand-50 text-brand-hover',
        className,
      )}
    >
      <span className="font-mono font-medium tabular-nums">{pct}%</span>
    </span>
  )
}
