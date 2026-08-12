import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import type { MatchScore } from '@/types/domain'

// v11-DIRECTIVE §1.4 — "Employers see numeric match scores… It never shows the
// worker a score for themselves."
//
// This file used to be nine `it.todo` stubs, and they described the behaviour
// §1.4 FORBIDS: "renders MatchCircle with total score", "renders all 7 dimension
// rows", "blurred overlay hides content for visitors". They were written before
// the ruling and never implemented, so the single check the M1 UAT calls "the
// most important visual check in this pass" had zero automated coverage, and
// the stubs pointed the wrong way.
//
// It needs no database. MatchBreakdown takes a MatchScore as a prop, so the
// rule is testable here rather than waiting on a scored job in production —
// which is why this could be closed before the merge train rather than after.

const SCORE: MatchScore = {
  total_score: 83,
  breakdown: {
    shed_type: 25,
    location: 16,
    accommodation: 20,
    skills: 14,
    salary: 8,
    visa: 5,
    couples: 0,
    _meta: { raw_total: 88, applicable_max: 105 },
  },
} as MatchScore

/** Every digit rendered as visible text, ignoring attributes and styles. */
function visibleDigits(container: HTMLElement): string[] {
  return (container.textContent ?? '').match(/\d+/g) ?? []
}

describe('MatchBreakdown — §1.4 worker/employer split', () => {
  it('shows a worker a WORD and not one digit', () => {
    const { container } = render(<MatchBreakdown score={SCORE} audience="worker" />)

    // The band word, not the number behind it.
    expect(screen.getByText(/Strong match/i)).toBeInTheDocument()

    // The whole point: 83, 25/25, 16/20, "88 of 105 applicable points" — none
    // of it may reach a worker's screen.
    expect(visibleDigits(container), 'a worker must see no numerals at all').toEqual([])
  })

  it('defaults to the worker treatment when audience is omitted', () => {
    // The safe default is load-bearing: a new call site that forgets to pass
    // audience must not leak the number. JobDetail relies on exactly this —
    // it renders <MatchBreakdown score={matchScore} /> with no audience prop.
    const { container } = render(<MatchBreakdown score={SCORE} />)
    expect(visibleDigits(container), 'omitted audience must not expose numerals').toEqual([])
  })

  it('shows an employer the number, because §1.4 permits it explicitly', () => {
    const { container } = render(<MatchBreakdown score={SCORE} audience="employer" />)
    const digits = visibleDigits(container)

    expect(digits, 'employer view must render the total').toContain('83')
    // Per-dimension points and the stated denominator — the explainability
    // half of the rule. If these vanish, the employer view has been "unified"
    // with the worker view, which the component doc explicitly forbids.
    expect(digits, 'employer view must render per-dimension points').toContain('25')
    expect(container.textContent).toMatch(/88 of 105 applicable points/)
  })

  it('never renders a negative band word to a worker', () => {
    // The ladder is positive-only by design (MatchBand): "Weak"/"Poor"
    // reintroduce the ranking sting §1.4 exists to remove.
    const { container } = render(
      <MatchBreakdown score={{ ...SCORE, total_score: 12 } as MatchScore} audience="worker" />,
    )
    expect(container.textContent).toMatch(/Possible match/i)
    expect(container.textContent).not.toMatch(/weak|poor|low match|bad/i)
    expect(visibleDigits(container)).toEqual([])
  })
})
