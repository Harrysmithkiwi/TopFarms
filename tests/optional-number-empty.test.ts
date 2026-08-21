import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { optionalNumber } from '@/lib/zodHelpers'

// Test intent — the silent match-corruption bug found walking the pre-outreach list
// 2026-08-21.
//
// Every optional number on every onboarding and job step used `z.coerce.number().optional()`
// with a plain `register()`. An untouched number input submits `''`, not `undefined`;
// `.optional()` only lets `undefined` through, so `''` is coerced and `Number('')` is `0`.
// Measured before the fix: `parse({ herd_size: '' })` returned `{ herd_size: 0 }`.
//
// The damage is in the match engine, not the form. 093 branches on `IS NULL` to mean
// "unknown, score neutrally", so a stored `0` takes the wrong branch in BOTH directions:
// a blank seeker min_salary scores full marks against every job (`salary_max >= 0`), and a
// blank job salary_max scores zero against every seeker. Invisible: no crash, no Sentry
// event, no failing test — just bad matches.

describe('optionalNumber — the empty box must not become a zero', () => {
  const schema = z.object({ herd_size: optionalNumber() })

  it('leaves an empty string absent rather than coercing it to 0', () => {
    const parsed = schema.parse({ herd_size: '' })
    expect(parsed.herd_size).toBeUndefined()
    // The precise regression: this used to be 0, and 0 is a lie the match engine believes.
    expect(parsed.herd_size).not.toBe(0)
  })

  it('keeps an explicit zero, which is a real answer', () => {
    expect(schema.parse({ herd_size: '0' }).herd_size).toBe(0)
  })

  it('still parses a real value', () => {
    expect(schema.parse({ herd_size: '250' }).herd_size).toBe(250)
  })

  it('leaves an absent field absent', () => {
    expect(schema.parse({}).herd_size).toBeUndefined()
  })

  it('treats null like empty', () => {
    expect(schema.parse({ herd_size: null }).herd_size).toBeUndefined()
  })

  it('still enforces constraints passed to it', () => {
    const bounded = z.object({ years: optionalNumber(z.coerce.number().min(0).max(50)) })
    expect(bounded.parse({ years: '10' }).years).toBe(10)
    expect(() => bounded.parse({ years: '99' })).toThrow()
    // ...and an empty box is exempt, because it is not an answer at all.
    expect(bounded.parse({ years: '' }).years).toBeUndefined()
  })
})

describe('no optional number field is left on the raw coerce pattern', () => {
  // A source guard, because the defect is one forgotten field away from returning and it
  // cannot be seen at runtime — the form still submits, the column still accepts it.
  const FILES = [
    'src/pages/jobs/steps/JobStep4Compensation.tsx',
    'src/pages/jobs/steps/JobStep2FarmDetails.tsx',
    'src/pages/onboarding/steps/SeekerStep2Experience.tsx',
    'src/pages/onboarding/steps/Step3Culture.tsx',
    'src/pages/onboarding/steps/Step2FarmDetails.tsx',
    'src/pages/onboarding/steps/Step4Accommodation.tsx',
    'src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx',
  ]

  it.each(FILES)('%s uses optionalNumber, never coerce.number().optional()', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf-8')
    expect(src).toContain('optionalNumber')
    expect(src).not.toMatch(/z\.coerce\.number\([^)]*\)(\.\w+\([^)]*\))*\.optional\(\)/)
  })
})
