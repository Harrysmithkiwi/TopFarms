import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Audit F-27 — the gate, which is the half that lasts.
//
// The finding was "108 `it.todo` counted green; 80 in 5 files with ZERO `expect()`". Deleting
// them fixes today. This stops tomorrow.
//
// `it.todo` is not a failure and not a skip — vitest reports it as a passing-ish line in a
// green run, so a file of nothing but todos reads exactly like a file of passing tests. That
// is how `tests/pipeline-transitions.test.ts` sat at 11 todos and 0 assertions while a seeker
// could set their own application status to `hired`, and how `tests/match-scoring.test.ts`
// described a 25-point shed dimension and a 1.1x recency multiplier that migration 072 had
// removed and another test actively forbade.
//
// Two rules:
//   1. A test FILE may not be all todo and no assertions. That file is a plan, and a plan
//      belongs in docs/TEST-BACKLOG.md where nothing reports it as green.
//   2. The total todo count may only go down. A ratchet, like the design gate.

const TESTS = join(process.cwd(), 'tests')

const files = readdirSync(TESTS).filter((f) => /\.test\.tsx?$/.test(f))

type Counted = { file: string; todos: number; assertions: number }

/**
 * Comment lines are stripped before counting.
 *
 * Written the naive way first, and it over-counted by three: several files DESCRIBE their own
 * history in a docstring — "Wave 1 swaps it.todo() stubs for real assertions" — and a regex
 * that cannot tell code from commentary counted those as live todos. The gate then disagreed
 * with vitest's own tally, which is precisely the class of defect it exists to catch.
 */
function code(src: string): string {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trimStart()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .join('\n')
}

const counted: Counted[] = files.map((file) => {
  const src = code(readFileSync(join(TESTS, file), 'utf-8'))
  return {
    file,
    todos: (src.match(/\b(it|test)\.todo\(/g) ?? []).length,
    assertions: (src.match(/\bexpect\(/g) ?? []).length,
  }
})

/**
 * The number of `it.todo`s allowed across the suite. RATCHET: this may be lowered, never
 * raised. Raising it is how the audit's 108 accumulated one commit at a time.
 *
 * 2026-08-18: 108 -> 25. Removed match-scoring (26, describing a model two migrations dead),
 * job-search (18), applications (15) and seeker-profile (10), and replaced pipeline-transitions'
 * 11 with real assertions — see docs/TEST-BACKLOG.md for what each claimed and why it was
 * dropped, replaced, or kept.
 *
 * Set to the EXACT current count, not a round number above it. Slack is where the next 80 grow.
 * The largest remaining block is seeker-onboarding.test.tsx: 19 todos beside 6 real assertions,
 * so it is not phantom coverage, but it is 76% plan and it is the obvious next target.
 */
const TODO_CEILING = 25

describe('F-27 — no phantom coverage', () => {
  it('no test file is all plan and no assertion', () => {
    // A file with todos AND assertions is fine: the assertions are real and the todos are a
    // note. A file with only todos has never tested anything, and it is indistinguishable
    // from a green one at a glance.
    const phantom = counted.filter((c) => c.todos > 0 && c.assertions === 0)
    expect(
      phantom.map((c) => `${c.file} (${c.todos} todo, 0 expect)`),
      'these files report green and check nothing — move them to docs/TEST-BACKLOG.md',
    ).toEqual([])
  })

  it('the todo count only goes down', () => {
    const total = counted.reduce((n, c) => n + c.todos, 0)
    expect(
      total,
      `todo count rose to ${total}. Lower TODO_CEILING when you remove some; never raise it.`,
    ).toBeLessThanOrEqual(TODO_CEILING)
  })

  it('the ceiling is not slack', () => {
    // A ratchet nobody tightens is a ceiling nobody notices. If the real count has dropped
    // well below the ceiling, lower it in the same commit.
    const total = counted.reduce((n, c) => n + c.todos, 0)
    expect(
      TODO_CEILING - total,
      `TODO_CEILING is ${TODO_CEILING} but only ${total} todos exist — lower it`,
    ).toBeLessThanOrEqual(5)
  })
})
