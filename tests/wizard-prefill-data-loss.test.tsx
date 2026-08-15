import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test intent — two P0 data-loss defects found by the impeccable critique, 2026-08-15.
//
// Both share one shape: a component whose SAVE is destructive (delete-then-insert, or an
// UPDATE that writes `|| null`) paired with a PREFILL whose failure is not handled. The
// prefill silently yields nothing, the form renders empty, and saving an untouched step
// overwrites real data with emptiness.
//
//   1. JobStep3Skills never read job_skills at all. Re-entering step 3 — Edit from the
//      preview, Back from step 4 — showed an empty picker, and Save & Continue deleted
//      every job_skills row for the job. Skills are a 20-point match dimension.
//   2. SeekerStep1FarmType discarded `error` from its seeker_contacts read, then wrote
//      `firstName.trim() || null`, nulling the name and phone an employer pays $200–800
//      to unlock. That data was already lost once on live prod (2026-08-12).
//
// These assertions are the gate. Each one fails if its guard regresses.

const mockJobSkillsSelect = vi.fn()
const mockJobSkillsDelete = vi.fn()
const mockContactsSelect = vi.fn()
const mockContactsUpdate = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'job_skills') {
        return {
          select: () => ({ eq: (_c: string, _v: string) => mockJobSkillsSelect() }),
          delete: () => ({ eq: (_c: string, _v: string) => mockJobSkillsDelete() }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'seeker_contacts') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => mockContactsSelect() }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: (payload: Record<string, unknown>) => {
            mockContactsUpdate(payload)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          },
        }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1', email: 'seeker@example.com' } } }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

// SkillsPicker fetches its own catalogue; stub it to keep this test on the defect.
vi.mock('@/components/ui/SkillsPicker', () => ({
  SkillsPicker: () => <div data-testid="skills-picker" />,
}))

import { JobStep3Skills } from '@/pages/jobs/steps/JobStep3Skills'
import { SeekerStep1FarmType } from '@/pages/onboarding/steps/SeekerStep1FarmType'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JobStep3Skills — destructive save must not run on a failed prefill', () => {
  it('reads existing job_skills on mount rather than starting empty', async () => {
    mockJobSkillsSelect.mockResolvedValue({
      data: [{ skill_id: 'skill-a', requirement_level: 'required' }],
      error: null,
    })

    render(<JobStep3Skills jobId="job-1" sector="dairy" onComplete={vi.fn()} />)

    // The bug was that this call never happened at all.
    await waitFor(() => expect(mockJobSkillsSelect).toHaveBeenCalled())
  })

  it('refuses to save — and never deletes — when the prefill failed', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    mockJobSkillsSelect.mockResolvedValue({ data: null, error: { message: 'network' } })

    render(<JobStep3Skills jobId="job-1" sector="dairy" onComplete={onComplete} />)

    // An error state replaces the form, so the destructive submit is unreachable.
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save & continue/i })).not.toBeInTheDocument()

    // The delete-then-insert must not have run.
    expect(mockJobSkillsDelete).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()

    // A retry affordance exists rather than a dead end.
    expect(screen.getByRole('button', { name: /retry|try again/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry|try again/i }))
    await waitFor(() => expect(mockJobSkillsSelect).toHaveBeenCalledTimes(2))
  })
})

describe('SeekerStep1FarmType — a failed contact prefill must not null saved details', () => {
  async function fillRequiredAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    // sector_pref and region are both required before submit is enabled.
    await user.click(screen.getByRole('button', { name: /dairy/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
  }

  it('does not write null over name and phone when the prefill errored', async () => {
    const user = userEvent.setup()
    mockContactsSelect.mockResolvedValue({ data: null, error: { message: 'network' } })

    render(<SeekerStep1FarmType onComplete={vi.fn()} defaultValues={{ region: 'Waikato' }} />)
    await waitFor(() => expect(mockContactsSelect).toHaveBeenCalled())
    await fillRequiredAndSubmit(user)

    // Either no update at all, or one that OMITS the fields entirely. A key present with a
    // null value is the defect — `?? 'absent'` would mask it, so assert on the key itself.
    for (const call of mockContactsUpdate.mock.calls) {
      const payload = call[0] as Record<string, unknown>
      expect(payload).not.toHaveProperty('first_name', null)
      expect(payload).not.toHaveProperty('last_name', null)
      expect(payload).not.toHaveProperty('phone', null)
      expect(Object.values(payload)).not.toContain(null)
    }
  })

  it('still honours details the seeker typed after a failed prefill', async () => {
    const user = userEvent.setup()
    mockContactsSelect.mockResolvedValue({ data: null, error: { message: 'network' } })

    render(<SeekerStep1FarmType onComplete={vi.fn()} defaultValues={{ region: 'Waikato' }} />)
    await waitFor(() => expect(mockContactsSelect).toHaveBeenCalled())

    await user.type(screen.getByLabelText(/first name/i), 'Hemi')
    await fillRequiredAndSubmit(user)

    // The typed value must reach the DB — skipping the write wholesale would lose it.
    await waitFor(() => {
      const payloads = mockContactsUpdate.mock.calls.map((c) => c[0] as Record<string, unknown>)
      expect(payloads.some((p) => p.first_name === 'Hemi')).toBe(true)
    })
    // …and the fields they could not see must not be nulled alongside it.
    for (const call of mockContactsUpdate.mock.calls) {
      const payload = call[0] as Record<string, unknown>
      expect(payload).not.toHaveProperty('last_name', null)
      expect(payload).not.toHaveProperty('phone', null)
      expect(Object.values(payload)).not.toContain(null)
    }
  })
})
