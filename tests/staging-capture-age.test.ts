import { describe, it, expect } from 'vitest'
import {
  captureAgeDays,
  captureAgeLabel,
  isStaleCapture,
} from '@/lib/leadDisplay'

// The "Likely expired" badge reads `applications_close`, which the extractor fills ONLY when
// the ad printed a closing date and is forbidden from inferring. Measured on prod 2026-08-19:
// 34 of 125 pending leads carry one, so 91 could never be badged at any age — while 59 had been
// sitting since June/July. An unbadged row was reading as "still open" precisely where it was
// least likely to be.

const DAY = 86_400_000
const NOW = Date.parse('2026-08-19T00:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

const lead = (created: string, close: string | null = null) => ({
  created_at: created,
  structured: { applications_close: close },
})

describe('capture age', () => {
  it('counts whole days since staging', () => {
    expect(captureAgeDays(daysAgo(30), NOW)).toBe(30)
    expect(captureAgeDays(daysAgo(0), NOW)).toBe(0)
  })

  it('badges a lead with no stated close date once it passes 28 days', () => {
    expect(isStaleCapture(lead(daysAgo(28)), NOW)).toBe(true)
    expect(isStaleCapture(lead(daysAgo(53)), NOW)).toBe(true) // the 27 June cohort
  })

  it('leaves the current fortnight alone', () => {
    expect(isStaleCapture(lead(daysAgo(27)), NOW)).toBe(false)
    expect(isStaleCapture(lead(daysAgo(2)), NOW)).toBe(false)
  })

  // Two cautions on one row is noise, and the stated date is the better evidence.
  it('defers to Likely expired when the ad stated a closing date', () => {
    expect(isStaleCapture(lead(daysAgo(60), '2026-07-01'), NOW)).toBe(false)
    expect(isStaleCapture(lead(daysAgo(60), '2026-12-01'), NOW)).toBe(false)
  })

  it('reads in weeks once there is more than one', () => {
    expect(captureAgeLabel(29)).toBe('4 weeks')
    expect(captureAgeLabel(56)).toBe('8 weeks')
    expect(captureAgeLabel(10)).toBe('10 days')
  })
})
