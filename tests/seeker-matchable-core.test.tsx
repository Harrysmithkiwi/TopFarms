import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeekerStep1FarmType } from '@/pages/onboarding/steps/SeekerStep1FarmType'

/**
 * Step 1 is the matchable core, and `sector_pref` is the load-bearing field in it.
 *
 * `trigger_recompute_job_scores` inserts scores `WHERE NEW.sector = ANY(sp.sector_pref)`.
 * A profile without a sector therefore matches NOTHING — it is invisible to every job ever
 * posted, and nothing anywhere reports it. The seeker sees an account that works and simply
 * never hears from anyone.
 *
 * Since the later steps are escapable ("Save and finish later"), whatever this screen fails
 * to require is permanently optional in practice. That is why the guard lives here.
 */

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: (...a: unknown[]) => {
        upsertMock(...a)
        return Promise.resolve({ error: null })
      },
      // An UPDATE here matches no row on a seeker's first pass and reports no error,
      // dropping the contact details silently. Fail loudly instead of re-shipping that.
      update: () => {
        throw new Error('seeker_contacts must be upserted — the row does not exist yet')
      },
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
      }),
    }),
  },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

beforeEach(() => upsertMock.mockReset())

describe('seeker step 1 is the matchable core', () => {
  it('cannot be submitted without a sector — the field that decides whether any match happens', async () => {
    render(<SeekerStep1FarmType onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('still cannot be submitted with a sector but no region', async () => {
    const user = userEvent.setup()
    render(<SeekerStep1FarmType onComplete={vi.fn()} defaultValues={{ sector_pref: ['dairy'] }} />)
    // Sector satisfied via defaults; region is still empty.
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /continue/i })).catch(() => {})
  })

  it('submits sector and region together once both are present', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <SeekerStep1FarmType
        onComplete={onComplete}
        defaultValues={{ sector_pref: ['dairy'], region: 'Waikato' }}
      />,
    )
    const submit = screen.getByRole('button', { name: /continue/i })
    expect(submit).toBeEnabled()
    await user.click(submit)
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
    const payload = onComplete.mock.calls[0][0]
    expect(payload.sector_pref).toEqual(['dairy'])
    expect(payload.region).toBe('Waikato')
  })

  it('writes the contact row it cannot assume exists — first_name is what an employer pays for', async () => {
    const user = userEvent.setup()
    render(
      <SeekerStep1FarmType
        onComplete={vi.fn()}
        defaultValues={{ sector_pref: ['dairy'], region: 'Waikato' }}
      />,
    )
    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(upsertMock).toHaveBeenCalled())
    const [row, options] = upsertMock.mock.calls[0] as [Record<string, unknown>, unknown]
    expect(row.user_id).toBe('u1')
    expect(row.first_name).toBe('Ada')
    expect(options).toEqual({ onConflict: 'user_id' })
  })

  it('names the role group so the chips are not a nameless set of buttons', () => {
    render(<SeekerStep1FarmType onComplete={vi.fn()} />)
    expect(screen.getByRole('group', { name: /roles you're after/i })).toBeInTheDocument()
  })
})
