import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VALID_TRANSITIONS, type ApplicationStatus } from '@/types/domain'

// Audit F-03, and this file was also an instance of F-27.
//
// It was ELEVEN `it.todo` and ZERO `expect()`. The gate counted it green while the application
// state machine was enforced nowhere at all: the live policy `applications: seekers update own`
// constrained `seeker_id` and nothing else, so any seeker could run
//
//     update applications set status = 'hired' where seeker_id = <their own>
//
// and `hired` is not a label — it is the trigger for the placement/billing path. The employer
// policy had a USING clause and no WITH CHECK, so an employer could move an application
// anywhere too. `VALID_TRANSITIONS` was used in exactly one place, to render buttons.
//
// Migration 097 makes the machine real, as DATA with an actor column. Proven on prod inside a
// rolled-back transaction:
//   seeker  -> hired                        REJECTED   (the defect)
//   seeker  -> withdrawn                    ALLOWED
//   seeker  withdrawn -> applied            ALLOWED    (re-apply preserved)
//   employer applied -> hired               REJECTED   (pipeline skip, which the audit missed)
//   employer applied->review->shortlisted->offered->hired  ALLOWED

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/097_application_status_state_machine.sql'),
  'utf-8',
)

/**
 * The (from, to, actor) rows seeded by the migration.
 *
 * Scoped to the VALUES block on purpose: a regex over the whole file also matches the CHECK
 * constraint's `actor IN ('seeker', 'employer', 'admin')` and reads it as a transition, which
 * is exactly the false row this test caught on its first run.
 */
function seeded(): { from: string; to: string; actor: string }[] {
  const start = SQL.indexOf('INSERT INTO public.application_status_transitions (from_status, to_status, actor) VALUES')
  const block = SQL.slice(start, SQL.indexOf('ON CONFLICT DO NOTHING', start))
  return [...block.matchAll(/\('(\w+)',\s*'(\w+)',\s*'(\w+)'\)/g)].map((m) => ({
    from: m[1],
    to: m[2],
    actor: m[3],
  }))
}

describe('F-03 — a seeker cannot promote themselves', () => {
  it('no seeker row leads to hired', () => {
    // The whole finding in one assertion.
    expect(seeded().filter((r) => r.actor === 'seeker' && r.to === 'hired')).toEqual([])
  })

  it('only the employer may hire', () => {
    const toHired = seeded().filter((r) => r.to === 'hired')
    expect(toHired.length).toBeGreaterThan(0)
    expect(new Set(toHired.map((r) => r.actor))).toEqual(new Set(['employer']))
  })

  it('hiring is reachable only from offered', () => {
    // An employer jumping applied -> hired skips every step that produced the evidence a
    // placement fee is charged against.
    expect(new Set(seeded().filter((r) => r.to === 'hired').map((r) => r.from))).toEqual(
      new Set(['offered']),
    )
  })

  it('admin is not a superuser over the pipeline', () => {
    // An admin marking someone hired still bills a farm, so admin gets the union of what the
    // two real actors may do and nothing beyond it. Derived by SELECT DISTINCT rather than
    // written out, so admin cannot drift ahead of the edges it mirrors.
    expect(SQL).toMatch(
      /INSERT INTO public\.application_status_transitions \(from_status, to_status, actor\)\s*\n\s*SELECT DISTINCT from_status, to_status, 'admin'\s*\n\s*FROM public\.application_status_transitions/,
    )
    // and no admin row is hand-written, which would escape that derivation
    expect(seeded().filter((r) => r.actor === 'admin')).toEqual([])
  })
})

describe('F-03 — the employer pipeline matches the rendered one', () => {
  it.each(
    Object.entries(VALID_TRANSITIONS).flatMap(([from, tos]) =>
      (tos as ApplicationStatus[]).map((to) => [from, to] as const),
    ),
  )('employer may move %s -> %s, as ApplicantPanel offers', (from, to) => {
    // VALID_TRANSITIONS drives the buttons. Any edge it renders that the database refuses is a
    // button that 500s, which is worse than a button that is not there.
    expect(
      seeded().some((r) => r.actor === 'employer' && r.from === from && r.to === to),
    ).toBe(true)
  })
})

describe('F-03 — the moves VALID_TRANSITIONS does not describe', () => {
  it('a seeker may withdraw from any live stage', () => {
    // `withdrawn` is modelled, rendered by two components and handled by useAppliedStatuses,
    // yet VALID_TRANSITIONS has no path INTO it — a status nobody could enter.
    const withdrawable = seeded()
      .filter((r) => r.actor === 'seeker' && r.to === 'withdrawn')
      .map((r) => r.from)
    expect(new Set(withdrawable)).toEqual(
      new Set(['applied', 'review', 'interview', 'shortlisted', 'offered']),
    )
  })

  it('a seeker may re-apply from every terminal state', () => {
    // The apply path is an UPSERT and ExpandableCardTabs deliberately re-enables Apply on
    // declined/withdrawn/hired. Encoding only VALID_TRANSITIONS would have broken re-apply,
    // which happens in production today.
    const reapply = seeded()
      .filter((r) => r.actor === 'seeker' && r.to === 'applied')
      .map((r) => r.from)
    expect(new Set(reapply)).toEqual(new Set(['declined', 'withdrawn', 'hired']))
  })
})

describe('F-03 — enforcement, not decoration', () => {
  it('is a BEFORE UPDATE OF status trigger', () => {
    expect(SQL).toMatch(
      /CREATE TRIGGER applications_enforce_transition\s*\n\s*BEFORE UPDATE OF status ON public\.applications/,
    )
  })

  it('reads the actor from the caller, not from the payload', () => {
    // A role supplied by the client is a role chosen by the client.
    expect(SQL).toMatch(/v_actor := public\.get_user_role\(auth\.uid\(\)\)/)
  })

  it('lets a service context through, visibly', () => {
    // mark_job_filled writes `hired` as a definer function with no auth.uid(). Re-gating it
    // here would break the pipeline and teach the next person to bypass the trigger.
    expect(SQL).toMatch(/IF auth\.uid\(\) IS NULL THEN\s*\n\s*RETURN NEW;/)
    expect(SQL).toMatch(/Service context/)
  })

  it('the transitions table is not writable from the app', () => {
    expect(SQL).toMatch(/REVOKE ALL ON public\.application_status_transitions FROM anon, authenticated/)
    expect(SQL).toMatch(/ALTER TABLE public\.application_status_transitions ENABLE ROW LEVEL SECURITY/)
  })
})
