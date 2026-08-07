import { Tag } from '@/components/ui/Tag'

/**
 * The worker-facing match indicator. A word, never a number.
 *
 * `docs/design/v11-DIRECTIVE.md` §1.4: "Employers see numeric match scores. The
 * worker-facing profile panel shows a word, **Strong**, against a named job. It
 * never shows the worker a score for themselves." The stated reason is that a
 * number attached to a person invites them to read it as a rating of their
 * worth, and the worker side includes migrant workers who are structurally
 * vulnerable and fee sensitive.
 *
 * `MatchCircle` is the employer-side counterpart and still renders the number —
 * §1.4 permits that explicitly. Do not "unify" the two; the difference is the
 * point.
 *
 * The ladder is positive-only by design. A negative word ("Weak", "Poor")
 * reintroduces exactly the ranking sting §1.4 removes — arguably worse than the
 * number, because a number is at least specific. Bands match the thresholds
 * MatchCircle already uses, so the two audiences agree on where the lines fall.
 */
const BANDS = [
  { min: 80, word: 'Strong', variant: 'green' as const },
  { min: 60, word: 'Good', variant: 'warn' as const },
  { min: 0, word: 'Possible', variant: 'grey' as const },
]

function matchBandFor(score: number) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]
}

export function MatchBand({ score, className }: { score: number; className?: string }) {
  const band = matchBandFor(score)
  return (
    <Tag variant={band.variant} className={className}>
      {band.word} match
    </Tag>
  )
}
