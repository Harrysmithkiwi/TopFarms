import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase D5, and the shape came from D1 rather than from the plan.
//
// The work order assumed the AEWV compliance artefact was an advertising record — dates and a
// screenshot. Verified against live INZ on 2026-08-18 it is not. INZ asks the employer to
// report COUNTS about the applicant pipeline: candidates applied, NZ citizens/residents
// applied, assessed suitable, hired, and (at ANZSCO skill level 4-5) why any New Zealander was
// not suitable. TopFarms already holds every one of those numbers, which is what makes the
// wedge real: the document a farm needs in order to hire the migrant they already chose is a
// by-product of a board doing its ordinary job.
//
// Proven on prod inside a rolled-back transaction:
//   bare listing        -> meets_content_rule false, 5 gaps
//   complete listing    -> true
//   3 applicants        -> 1 NZ citizen/resident, 1 visa status not stated, 1 hired (migrant),
//                          0 NZ citizens/residents hired

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/095_job_check_evidence.sql'),
  'utf-8',
)

describe('D5 — it reports facts, not legal conclusions', () => {
  it('does not map our pipeline onto "assessed as suitable"', () => {
    // That mapping is a legal judgement — does `shortlisted` mean assessed-and-suitable? does
    // `review` count? — and baking it into SQL would put a determination in front of a farm
    // with nobody accountable for it. The founder holds the practising certificate
    // (IALA s 11); the advice is his to give.
    expect(SQL).toMatch(/assessed as suitable" is not asserted here/)
    expect(SQL).not.toMatch(/assessed_as_suitable/)
  })

  it('states no single advertising duration', () => {
    // 14 days at ANZSCO skill level 1-3, 21 at 4-5, which is most farm work. A single number
    // in the output would be wrong for half the listings, and being wrong costs a farm its
    // Job Check.
    expect(SQL).toMatch(/14 days at levels 1-3, 21 days at levels 4-5/)
  })

  it('does not imply the Work and Income step is covered', () => {
    expect(SQL).toMatch(/good-faith engagement with Work and Income, which happens outside TopFarms/)
  })

  it('labels residency as self-declared', () => {
    // An INZ-facing count that quietly presents self-declaration as verified fact is the same
    // class of defect as F-11's self-asserted trust badge.
    expect(SQL).toMatch(/Residency is self-declared by the applicant and has not been verified/)
  })

  it('records when the rules were last checked', () => {
    // These rules changed twice in 2025. An artefact with no verification date invites someone
    // to rely on it a year from now.
    expect(SQL).toMatch(/'verified_against_inz_on', '2026-08-18'/)
  })
})

describe('D5 — the listing-content check', () => {
  const REQUIRED = [
    'Key tasks, duties and responsibilities',
    'Minimum rate of pay',
    'Maximum rate of pay',
    'Minimum guaranteed hours of work',
    'Minimum skills, experience or qualifications',
  ]

  it.each(REQUIRED)('flags a missing %s', (label) => {
    expect(SQL).toMatch(new RegExp(`array_append\\(v_gaps, '${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  })

  it('builds the gap list with array_append, not the || operator', () => {
    // Caught on prod: plpgsql resolves `text[] || 'text'` by parsing the right side as an
    // ARRAY LITERAL, so any gap label containing a comma or parenthesis raises 22P02 at
    // runtime — long after deploy, and only for the listings that actually have that gap.
    expect(SQL).not.toMatch(/v_gaps := v_gaps \|\|/)
    expect(SQL).toMatch(/array_append, never `v_gaps \|\| 'text'`/)
  })
})

describe('D5 — authorisation', () => {
  it('is the owning employer or an admin, nobody else', () => {
    // Applicant counts for one farm's vacancy are commercially sensitive.
    expect(SQL).toMatch(/FROM public\.employer_profiles ep\s*\n\s*WHERE ep\.id = v_job\.employer_id AND ep\.user_id = v_caller/)
    expect(SQL).toMatch(/IF NOT \(v_owns OR v_is_admin\) THEN/)
    expect(SQL).toMatch(/RAISE EXCEPTION 'Not authorised for this job'/)
  })

  it('is not executable by anon', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.job_check_evidence\(uuid\) FROM public/)
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.job_check_evidence\(uuid\) TO authenticated/)
  })
})
