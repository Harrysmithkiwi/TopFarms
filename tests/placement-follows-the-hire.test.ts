import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit F-04, which depends on F-03 (097) and is applied after it.
//
// `hired` had THREE writers and `placements` had ONE:
//   ApplicantDashboard.tsx:470  .update({ status: 'hired' })   -> no placement
//   mark_job_filled (026:74)    SET status = 'hired'           -> no placement
//   create-placement-invoice    upserts placements             -> only when the invoice runs
//
// So a hire recorded through "mark job filled" — the natural path for an employer closing a
// vacancy — produced a `hired` application and NO placement row. `placements` holds
// started_on, employer_confirmed_at and seeker_confirmed_at, so the record that the hire
// actually happened did not exist for that path.
//
// Proven on prod inside a rolled-back transaction:
//   before the hire                     0 placements
//   mark-filled style hire              1
//   invoice upsert afterwards           1 row / 1 confirmed  (still stamps the trigger's row)
//   re-apply (hired -> applied)         1                    (a past hire is not unmade)
//   application INSERTed as hired       1
//   control applied -> review           0

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/098_placement_follows_the_hire.sql'),
  'utf-8',
)

describe('F-04 — the placement follows the status, not the caller', () => {
  it('fires on the transition into hired', () => {
    expect(SQL).toMatch(
      /AFTER UPDATE OF status ON public\.applications\s*\n\s*FOR EACH ROW\s*\n\s*WHEN \(NEW\.status = 'hired' AND OLD\.status IS DISTINCT FROM 'hired'\)/,
    )
  })

  it('also covers an application created directly as hired', () => {
    // An UPDATE-only trigger is bypassed by an import or a hand-fixed row. Nothing does this
    // today, which is exactly when covering it is free.
    expect(SQL).toMatch(/AFTER INSERT ON public\.applications\s*\n\s*FOR EACH ROW\s*\n\s*WHEN \(NEW\.status = 'hired'\)/)
  })

  it('is idempotent, so the invoice upsert still owns employer_confirmed_at', () => {
    // The trigger creates the row BARE. create-placement-invoice then upserts the same row and
    // its ON CONFLICT DO UPDATE sets the confirmation — insert-or-fail here would break that
    // flow, and insert-with-confirmation would claim an employer confirmed something they had
    // not.
    expect(SQL).toMatch(/INSERT INTO public\.placements \(application_id\)\s*\n\s*VALUES \(NEW\.id\)\s*\n\s*ON CONFLICT \(application_id\) DO NOTHING/)
  })

  it('does not delete the placement when the status leaves hired', () => {
    // 097 permits hired -> applied because re-apply is real. A placement that happened is a
    // fact about the past; deleting it would erase a hire from the record because the person
    // later applied somewhere else.
    expect(SQL).not.toMatch(/DELETE FROM public\.placements/)
    expect(SQL).toMatch(/a placement that happened is a fact about the past|fact about the past/)
  })

  it('records the F-03 dependency', () => {
    // Order matters: attaching the placement before 097 would have hung it off a status any
    // seeker could set on themselves.
    expect(SQL).toMatch(/DEPENDS ON F-03/)
  })
})
