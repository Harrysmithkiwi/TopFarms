/**
 * Application lifecycle slice (migration 107) — events, timeline, interview
 * acceptance.
 *
 * Two layers, mirroring tests/pipeline-transitions.test.ts:
 *
 * 1. MIGRATION CONTENT — pins the security-load-bearing clauses of
 *    107_application_events.sql so a future edit that drops one goes red.
 *    The migration's live BEHAVIOUR was proven on prod 2026-08-29 inside a
 *    rolled-back transaction (assertions A1–A8: insert event, transition
 *    events, wrong-owner rejected, owner accepts + event, idempotence,
 *    wrong-status rejected, re-apply resets acceptance, seeker→hired still
 *    rejected). This file keeps the *shape* honest; the DB proved the runtime.
 *
 * 2. UI — the accepted-interview state replaces the Accept/Decline buttons
 *    (the pre-107 defect: Accept was a toast with no write, Decline wrote an
 *    employer-only edge the 097 trigger rejected), and the timeline renders
 *    real events only, candidate-phrased.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ApplicationTimeline } from '@/components/ui/ApplicationTimeline'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import type { ApplicationEvent } from '@/types/domain'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/107_application_events.sql'),
  'utf-8',
)

describe('107 migration — the clauses that carry the security model', () => {
  it('clients cannot write events: grants revoked, SELECT-only granted back', () => {
    expect(SQL).toMatch(/REVOKE ALL ON public\.application_events FROM anon, authenticated/)
    expect(SQL).toMatch(/GRANT SELECT ON public\.application_events TO authenticated/)
    // No INSERT/UPDATE/DELETE policy exists for clients — only the two SELECTs.
    expect(SQL).not.toMatch(/application_events FOR (INSERT|UPDATE|DELETE|ALL)/)
  })

  it('event reads are scoped to the two parties via the applications relationship walk', () => {
    expect(SQL).toMatch(/seekers view own/)
    expect(SQL).toMatch(/employers view for own jobs/)
    expect(SQL).toMatch(/get_user_role\(\(SELECT auth\.uid\(\)\)\) = 'seeker'/)
    expect(SQL).toMatch(/get_user_role\(\(SELECT auth\.uid\(\)\)\) = 'employer'/)
  })

  it('accept_interview validates ownership, status, and is idempotent', () => {
    // Ownership: the seeker_profiles join against auth.uid() inside the RPC.
    expect(SQL).toMatch(/JOIN public\.seeker_profiles sp ON sp\.id = a\.seeker_id/)
    expect(SQL).toMatch(/sp\.user_id = auth\.uid\(\)/)
    // Status gate + idempotence.
    expect(SQL).toMatch(/v_app\.status <> 'interview'/)
    expect(SQL).toMatch(/IF v_app\.interview_accepted_at IS NOT NULL THEN\s*RETURN v_app\.interview_accepted_at/)
    // Concurrency: the row is locked while deciding.
    expect(SQL).toMatch(/FOR UPDATE OF a/)
    // anon cannot call it.
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.accept_interview\(uuid\) FROM anon, public/)
  })

  it('every lifecycle write path is covered by an event trigger', () => {
    expect(SQL).toMatch(/AFTER INSERT ON public\.applications/)
    expect(SQL).toMatch(/AFTER UPDATE OF status ON public\.applications/)
    // Re-apply over a terminal row clears a stale acceptance.
    expect(SQL).toMatch(/NEW\.interview_accepted_at := NULL/)
  })
})

function ev(partial: Partial<ApplicationEvent>): ApplicationEvent {
  return {
    id: Math.random().toString(36).slice(2),
    application_id: 'app-1',
    event_type: 'status_change',
    from_status: null,
    to_status: 'applied',
    actor: 'seeker',
    created_at: '2026-08-28T00:00:00Z',
    ...partial,
  }
}

describe('ApplicationTimeline — real events only, candidate-phrased', () => {
  it('renders nothing with no events (no fabricated timeline)', () => {
    const { container } = render(<ApplicationTimeline events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('phrases the lifecycle from the candidate side', () => {
    render(
      <ApplicationTimeline
        events={[
          ev({ from_status: null, to_status: 'applied' }),
          ev({ from_status: 'applied', to_status: 'review', actor: 'employer' }),
          ev({ from_status: 'review', to_status: 'interview', actor: 'employer' }),
          ev({ event_type: 'interview_accepted', from_status: 'interview', to_status: 'interview' }),
        ]}
      />,
    )
    expect(screen.getByText('Application submitted')).toBeInTheDocument()
    expect(screen.getByText('Employer reviewing your application')).toBeInTheDocument()
    expect(screen.getByText('Interview requested')).toBeInTheDocument()
    expect(screen.getByText('You accepted the interview')).toBeInTheDocument()
  })

  it('re-apply is distinguished from first application', () => {
    render(<ApplicationTimeline events={[ev({ from_status: 'withdrawn', to_status: 'applied' })]} />)
    expect(screen.getByText('You re-applied')).toBeInTheDocument()
  })
})

const baseApp = {
  id: 'app-1',
  job_id: 'job-1',
  seeker_id: 'sp-1',
  status: 'interview' as const,
  created_at: '2026-08-28T00:00:00Z',
  jobs: {
    id: 'job-1',
    employer_id: 'ep-1',
    title: 'Dairy Assistant',
    sector: 'dairy',
    role_type: 'farm_hand',
    region: 'Waikato',
    status: 'active' as const,
    listing_tier: 1 as const,
    contract_type: 'permanent' as const,
    visa_sponsorship: false,
    couples_welcome: false,
    views_count: 0,
    created_at: '2026-08-27T00:00:00Z',
    employer_profiles: { farm_name: 'Test Farm', region: 'Waikato' },
  },
}

describe('ApplicationCard — interview acceptance is state, not a toast', () => {
  it('shows Accept/Decline while unanswered', () => {
    render(
      <MemoryRouter>
        <ApplicationCard
          application={{ ...baseApp, interview_accepted_at: null }}
          onAcceptInterview={() => {}}
          onDeclineInterview={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
  })

  it('replaces the buttons with the persisted acceptance after accept', () => {
    render(
      <MemoryRouter>
        <ApplicationCard
          application={{ ...baseApp, interview_accepted_at: '2026-08-29T00:00:00Z' }}
          onAcceptInterview={() => {}}
          onDeclineInterview={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
    expect(screen.getByText(/Interview accepted/)).toBeInTheDocument()
  })

  it('renders the History disclosure only when events exist', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ApplicationCard application={baseApp} />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/^History/)).not.toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <ApplicationCard application={baseApp} events={[ev({})]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('History (1)')).toBeInTheDocument()
  })
})
