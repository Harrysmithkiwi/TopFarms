import { MatchCircle } from '@/components/ui/MatchCircle'
import { MatchBand } from '@/components/ui/MatchBand'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { MatchScore } from '@/types/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

// Scoring v3 (migration 093), ordered by weight. The two biggest changes from v2 are visible
// here: `role` and `contract` exist at all — v2 read neither, so the job's actual role never
// influenced the match — and `shed_type` fell from 25 (the largest block in v2) to 3, because
// it is one sector's equipment detail and it was outranking the work itself.
const DIMENSIONS = [
  { key: 'role', label: 'Role', max: 18 },
  { key: 'skills', label: 'Skills', max: 15 },
  { key: 'location', label: 'Location', max: 15 },
  { key: 'contract', label: 'Terms', max: 12 },
  { key: 'accommodation', label: 'Accommodation', max: 10 },
  { key: 'experience', label: 'Experience', max: 10 },
  { key: 'salary', label: 'Salary', max: 8 },
  { key: 'timing', label: 'Timing', max: 6 },
  { key: 'herd_size', label: 'Herd Size', max: 3 },
  { key: 'shed_type', label: 'Shed Type', max: 3 },
] as const

type DimensionKey = (typeof DIMENSIONS)[number]['key']

function getLowScoreContext(key: DimensionKey): string {
  switch (key) {
    case 'role':
      return 'A different kind of role than they are after'
    case 'skills':
      return 'Skills gap on required qualifications'
    case 'location':
      return 'Different region'
    case 'contract':
      return 'Not the kind of engagement they are looking for'
    case 'accommodation':
      return 'Accommodation does not cover what they need'
    case 'experience':
      return 'Experience does not line up with the role'
    case 'salary':
      return 'Salary expectations differ'
    case 'timing':
      return 'Cannot start when the role begins'
    case 'herd_size':
      return 'Has not worked a herd this size'
    case 'shed_type':
      return 'Different shed type experience'
  }
}

/**
 * Dealbreakers. v3 applies these multiplicatively rather than as points, because the failure
 * is categorical — someone who cannot legally work the job is not "80% as good". Reading
 * "this farm will not sponsor a visa" is more use than reading "-40 points", so they render
 * as their own band above the bars.
 */
const GATE_LABELS: Record<string, string> = {
  visa: 'This role does not offer visa sponsorship',
  terms: 'The job is not the kind of engagement they asked for',
  accommodation: 'They need housing and this role does not include it',
  sector: 'A different farming sector than they are looking for',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchBreakdownProps {
  score: MatchScore
  className?: string
  /**
   * Who is reading this. v11-DIRECTIVE §1.4 permits the number for employers and
   * forbids it for workers, so the same breakdown renders two ways.
   *
   * Defaults to 'worker' deliberately: a new call site that forgets to say gets
   * the safe one. The number has to be asked for.
   */
  audience?: 'worker' | 'employer'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchBreakdown({ score, className, audience = 'worker' }: MatchBreakdownProps) {
  const showNumbers = audience === 'employer'
  const blockers = Object.entries(score.breakdown.gates ?? {})
    .filter(([, blocked]) => blocked)
    .map(([name]) => name)
  const content = (
    <div className="bg-surface border-border space-y-4 rounded-12 border p-6">
      {/* Total score circle */}
      <div className="mb-2 flex flex-col items-center">
        {showNumbers ? (
          <MatchCircle score={score.total_score} size="lg" />
        ) : (
          <MatchBand score={score.total_score} />
        )}
        <p
          className="font-body mt-2 text-[12px] font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Overall Match
        </p>
      </div>

      {/* Blockers first: a gate changes whether the role is possible at all, so it belongs
          above the gradient, not buried among the bars. */}
      {blockers.length > 0 && (
        <div className="border-warn-border bg-warn-bg space-y-1 rounded-12 border p-3">
          <p className="font-body text-[11px] font-semibold tracking-wide uppercase text-warn-text-on-bg">
            {blockers.length === 1 ? 'Blocker' : 'Blockers'}
          </p>
          <ul className="space-y-0.5">
            {blockers.map((g) => (
              <li key={g} className="font-body text-[13px] text-warn-text-on-bg">
                {GATE_LABELS[g] ?? g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category rows */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim) => {
          const dimScore = score.breakdown[dim.key]
          // v2 emitted null for "does not apply" and excluded the dimension from the total,
          // which is what made two jobs' percentages incomparable. v3 always emits a number
          // — an unstated field pays 60% of its weight — so a missing value here means an
          // old v2 row, not an inapplicable dimension.
          const notApplicable = dimScore == null
          const lowContext = dimScore === 0 ? getLowScoreContext(dim.key) : ''

          return (
            <div key={dim.key}>
              <div className="flex items-center gap-3">
                <span
                  className="font-body w-28 flex-shrink-0 text-[13px] font-semibold"
                  style={{
                    color: notApplicable ? 'var(--color-text-subtle)' : 'var(--color-text)',
                  }}
                >
                  {dim.label}
                </span>
                <div className="flex-1">
                  {notApplicable ? (
                    <div
                      className="border-border h-1.5 w-full rounded-full border border-dashed"
                      aria-hidden="true"
                    />
                  ) : (
                    <ProgressBar progress={(dimScore / dim.max) * 100} />
                  )}
                </div>
                {showNumbers && (
                  <span
                    className="font-body w-10 flex-shrink-0 text-right text-[12px] tabular-nums"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    {notApplicable ? '—' : `${dimScore}/${dim.max}`}
                  </span>
                )}
              </div>
              {notApplicable && (
                <p
                  className="mt-0.5 ml-28 pl-1 text-[11px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Not scored — this match predates the current model
                </p>
              )}
              {!notApplicable && dimScore === 0 && lowContext && (
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

      {/* How the total is reached — the bars are raw points against raw maxima,
          the headline is the normalised percentage. Stating the denominator is
          what makes the number explainable rather than merely displayed. */}
      {showNumbers && score.breakdown._meta && (
        <p className="font-body text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
          {score.breakdown._meta.raw_total} of {score.breakdown._meta.applicable_max} applicable
          points = {score.total_score}% match
        </p>
      )}

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

  return <div className={className}>{content}</div>
}
