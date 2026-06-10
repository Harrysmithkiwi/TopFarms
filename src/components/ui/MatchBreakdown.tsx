import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { MatchScore } from '@/types/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: 'shed_type', label: 'Shed Type', max: 25 },
  { key: 'location', label: 'Location', max: 20 },
  { key: 'accommodation', label: 'Accommodation', max: 20 },
  { key: 'skills', label: 'Skills', max: 20 },
  { key: 'salary', label: 'Salary', max: 10 },
  { key: 'visa', label: 'Visa', max: 5 },
  { key: 'couples', label: 'Couples Bonus', max: 5 },
] as const

type DimensionKey = (typeof DIMENSIONS)[number]['key']

function getLowScoreContext(key: DimensionKey): string {
  switch (key) {
    case 'shed_type':
      return 'Different shed type experience'
    case 'location':
      return 'Different region'
    case 'accommodation':
      return "Accommodation preferences don't align"
    case 'skills':
      return 'Skills gap on required qualifications'
    case 'salary':
      return 'Salary expectations differ'
    case 'visa':
      return 'Visa requirements may not align'
    case 'couples':
      return '' // bonus — no negative context needed
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchBreakdownProps {
  score: MatchScore
  blurred?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchBreakdown({ score, blurred = false, className }: MatchBreakdownProps) {
  const content = (
    <div className="bg-surface border-border space-y-4 rounded-[12px] border p-6">
      {/* Total score circle */}
      <div className="mb-2 flex flex-col items-center">
        <MatchCircle score={score.total_score} size="lg" />
        <p
          className="font-body mt-2 text-[12px] font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Overall Match
        </p>
      </div>

      {/* Category rows */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim) => {
          const dimScore = score.breakdown[dim.key]
          const lowContext = dimScore === 0 ? getLowScoreContext(dim.key) : ''

          return (
            <div key={dim.key}>
              <div className="flex items-center gap-3">
                <span
                  className="font-body w-28 flex-shrink-0 text-[13px] font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {dim.label}
                </span>
                <div className="flex-1">
                  <ProgressBar progress={(dimScore / dim.max) * 100} />
                </div>
                <span
                  className="font-body w-10 flex-shrink-0 text-right text-[12px] tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {dimScore}/{dim.max}
                </span>
              </div>
              {dimScore === 0 && lowContext && (
                <p
                  className="mt-0.5 ml-28 pl-1 text-[11px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  {lowContext}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* AI explanation */}
      {score.explanation && (
        <div className="border-border mt-4 border-t pt-4">
          <p
            className="font-body mb-1.5 text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: 'var(--color-text-subtle)' }}
          >
            Why this match
          </p>
          <p
            className="font-body text-[14px] leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {score.explanation}
          </p>
        </div>
      )}
    </div>
  )

  if (blurred) {
    return (
      <div className={cn('relative', className)}>
        {/* Blurred content */}
        <div className="pointer-events-none blur-sm select-none">{content}</div>

        {/* Overlay */}
        <div className="bg-surface/80 absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[12px]">
          <p
            className="font-body mb-3 px-4 text-center text-[14px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Sign up to see how you match
          </p>
          <Link
            to="/signup"
            className={cn(
              'font-body inline-flex items-center justify-center rounded-[8px] font-medium transition-colors duration-150',
              'bg-brand text-text-on-brand hover:bg-brand-hover px-4 py-2 text-[13px]',
              'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    )
  }

  return <div className={className}>{content}</div>
}
