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
      return 'Accommodation preferences don\'t align'
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
    <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-4">
      {/* Total score circle */}
      <div className="flex flex-col items-center mb-2">
        <MatchCircle score={score.total_score} size="lg" />
        <p
          className="text-[12px] font-body font-semibold mt-2"
          style={{ color: 'var(--color-mid)' }}
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
                  className="text-[13px] font-body font-semibold w-28 flex-shrink-0"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {dim.label}
                </span>
                <div className="flex-1">
                  <ProgressBar progress={(dimScore / dim.max) * 100} />
                </div>
                <span
                  className="text-[12px] font-body w-10 text-right flex-shrink-0"
                  style={{ color: 'var(--color-mid)' }}
                >
                  {dimScore}/{dim.max}
                </span>
              </div>
              {dimScore === 0 && lowContext && (
                <p
                  className="text-[11px] ml-28 pl-1 mt-0.5"
                  style={{ color: 'var(--color-light)' }}
                >
                  {lowContext}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  if (blurred) {
    return (
      <div className={cn('relative', className)}>
        {/* Blurred content */}
        <div className="blur-sm select-none pointer-events-none">
          {content}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-[12px] bg-white/80">
          <p
            className="text-[14px] font-body font-semibold text-center mb-3 px-4"
            style={{ color: 'var(--color-soil)' }}
          >
            Sign up to see how you match
          </p>
          <Link
            to="/signup"
            className="font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center bg-moss text-white hover:bg-fern px-4 py-2 text-[13px]"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    )
  }

  return <div className={className}>{content}</div>
}
