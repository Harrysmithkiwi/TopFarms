import { cn } from '@/lib/utils'

interface MatchScoreRingProps {
  /** 0–100 match score. */
  score: number
  /**
   * `score` — large ring, AI-purple accent (the match-engine signature), with
   * an optional uppercase label. `badge` — compact green outline ring for card
   * corners (just the number).
   */
  variant?: 'score' | 'badge'
  /** Rendered pixel size of the ring (square). */
  size?: number
  /** Uppercase caption under the number (score variant only). */
  label?: string
  className?: string
}

// Design tokens: AI-purple ring for the headline score (TopFarms_Brand_Spec_v2
// reserves #8B5CF6 for match-score moments); compact ring-badge uses the one
// brand green. Geometry mirrors the design system's styles.css (.tf-ring /
// .tf-ring-badge): r=86 in a 200 box, r=22 in a 52 box.
const SPECS = {
  score: { box: 200, r: 86, stroke: 14, track: 'var(--color-ai-bg)', fill: 'var(--color-ai)' },
  badge: { box: 52, r: 22, stroke: 4, track: 'rgba(22,163,74,0.18)', fill: 'var(--color-brand)' },
} as const

export function MatchScoreRing({
  score,
  variant = 'score',
  size = variant === 'score' ? 200 : 52,
  label,
  className,
}: MatchScoreRingProps) {
  const spec = SPECS[variant]
  const pct = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * spec.r
  const dashoffset = circumference * (1 - pct / 100)

  return (
    <div
      role="img"
      aria-label={`${pct}% match`}
      data-anim="match-ring"
      data-variant={variant}
      className={cn('relative inline-flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${spec.box} ${spec.box}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={spec.box / 2}
          cy={spec.box / 2}
          r={spec.r}
          fill="none"
          stroke={spec.track}
          strokeWidth={spec.stroke}
        />
        <circle
          data-anim="ring-fill"
          cx={spec.box / 2}
          cy={spec.box / 2}
          r={spec.r}
          fill="none"
          stroke={spec.fill}
          strokeWidth={spec.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>

      {variant === 'badge' ? (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-medium text-brand tabular-nums">
          {pct}
        </span>
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className="font-mono font-medium tabular-nums text-text"
            style={{ fontSize: Math.round(size * 0.26), lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {pct}
            <sup className="text-text-muted" style={{ fontSize: '0.46em', top: '-0.85em' }}>
              %
            </sup>
          </span>
          {label ? (
            <span
              className="font-semibold tracking-[0.08em] text-ai uppercase"
              style={{ fontSize: Math.max(9, Math.round(size * 0.055)) }}
            >
              {label}
            </span>
          ) : null}
        </span>
      )}
    </div>
  )
}
