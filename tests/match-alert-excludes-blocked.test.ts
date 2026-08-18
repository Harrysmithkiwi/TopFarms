import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase C5.
//
// `notify-job-matches` is the operator's match-alert email: "these people were promised an
// email when a matching job appears — this is the list to send it to". It ordered by
// total_score and printed roles, and that was all it knew.
//
// Scoring v3 (093) records dealbreakers as `breakdown.gates`, applied multiplicatively. A
// seeker who needs sponsorship on a non-sponsoring job, or who asked for relief work on a
// permanent role, is not a low match — they are BLOCKED. Putting their name in that email is
// worse than noise: the promise was a matching job, and a farm they cannot legally take is
// not one.
//
// It also never showed the terms a seeker asked for, which is the most common thing they
// state — 9 of the 23 corpus posts.

const FN = readFileSync(
  join(process.cwd(), 'supabase/functions/notify-job-matches/index.ts'),
  'utf-8',
)

describe('C5 — a blocked pair is not a match', () => {
  it('reads the gates out of the breakdown', () => {
    expect(FN).toMatch(/\.select\('seeker_id, total_score, breakdown'\)/)
    expect(FN).toMatch(/m\.breakdown\?\.gates \?\? \{\}/)
  })

  it('any gate blocks, not just one of them', () => {
    // visa, terms, accommodation and sector are all categorical. Naming one would leave the
    // others to be discovered by an operator emailing someone who cannot take the job.
    expect(FN).toMatch(/\.some\(Boolean\)/)
  })

  it('rows scored before v3 still pass through', () => {
    // No `gates` key means a v2 row. Treating a missing key as blocked would silently empty
    // the alert for every match scored before the migration.
    expect(FN).toMatch(/breakdown\?\.gates \?\? \{\}/)
  })

  it('the eligible list is actually filtered by it', () => {
    // Caught by mutation: the first version of this file asserted that `blocked` existed and
    // that downstream read `eligible`, and both held with the filter deleted. Defining a
    // predicate is not applying one.
    expect(FN).toMatch(/const eligible = \(matches \?\? \[\]\)\.filter\(\(m\) => !blocked\(m\)\)/)
  })

  it('everything downstream reads the filtered list', () => {
    // The original bug shape: filter one collection, then keep using the other. The profile
    // fetch and the line builder must both read `eligible`.
    expect(FN).toMatch(/const seekerIds = eligible\.map/)
    expect(FN).toMatch(/const lines: MatchLine\[\] = eligible\.map/)
    expect(FN).not.toMatch(/const lines: MatchLine\[\] = matches\.map/)
  })

  it('never drops anyone silently', () => {
    // A cap the operator cannot see reads as "nobody matched", which is the wrong diagnosis
    // and the expensive one — it looks like the funnel is empty rather than filtered.
    expect(FN).toMatch(/excluded \d* ?gate-blocked pair|excluded \$\{excluded\}/)
    expect(FN).toMatch(/blocked=\$\{excluded\}/)
    expect(FN).toMatch(/excluded, job_id: jobId/)
  })
})

describe('C5 — the email shows what they asked for', () => {
  it('fetches and renders the terms', () => {
    expect(FN).toMatch(/role_type_pref, contract_type_pref/)
    expect(FN).toMatch(/terms: string/)
    expect(FN).toMatch(/\$\{m\.terms\}/)
  })

  it('shows the words the posts use, not the DB tokens', () => {
    // Nobody in these posts writes "casual" — they write "relief".
    expect(FN).toMatch(/'Casual or relief'/)
    expect(FN).toMatch(/terms not stated/)
  })
})
