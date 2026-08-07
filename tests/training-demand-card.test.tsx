import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrainingDemandCard } from '@/components/ui/TrainingDemandCard'

// S1 demand-validation capture (go-live map). What must not break:
// responses are keyed to the real skills taxonomy (uuids, not labels), a load
// failure is an error state and never a silent blank, and dismissal actually
// removes the card. The RLS behaviour is probed against prod separately —
// these tests cover the component contract.

const SKILLS = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Pasture & forage management', category: 'livestock' },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Health & safety competency', category: 'cross_cutting' },
]

const upsertMock = vi.fn()
const state: { skills: { data: unknown; error: unknown }; mine: { data: unknown; error: unknown } } = {
  skills: { data: SKILLS, error: null },
  mine: { data: null, error: null },
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
    },
    from: (table: string) => {
      if (table === 'skills') {
        return { select: () => ({ order: () => ({ order: () => Promise.resolve(state.skills) }) }) }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(state.mine) }) }),
        upsert: (...args: unknown[]) => {
          upsertMock(...args)
          return Promise.resolve({ error: null })
        },
      }
    },
  },
}))

beforeEach(() => {
  localStorage.clear()
  upsertMock.mockClear()
  state.skills = { data: SKILLS, error: null }
  state.mine = { data: null, error: null }
})

describe('TrainingDemandCard', () => {
  it('renders the taxonomy as pressable chips and submits the chosen skill ids', async () => {
    render(<TrainingDemandCard role="seeker" context="test" />)
    const chip = await screen.findByRole('button', { name: 'Pasture & forage management' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')

    // Submit is held until at least one skill is chosen — an empty response is
    // not demand signal.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()

    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByRole('status')
    const [payload] = upsertMock.mock.calls[0]
    expect(payload.skill_ids).toEqual(['aaaaaaaa-0000-0000-0000-000000000001'])
    expect(payload.audience).toBe('self') // seeker never sees the toggle; self is forced
    expect(payload.user_id).toBe('user-1')
  })

  it('employer gets the audience toggle, defaulting to staff', async () => {
    render(<TrainingDemandCard role="employer" context="test" />)
    const staff = await screen.findByRole('radio', { name: 'My staff' })
    expect(staff).toHaveAttribute('aria-checked', 'true')
  })

  it('a failed skills load is an error with retry, never a silent blank', async () => {
    state.skills = { data: null, error: { message: 'boom' } }
    render(<TrainingDemandCard role="seeker" context="test" />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not load/i)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('an existing response prefills and the button reads Update', async () => {
    state.mine = {
      data: { audience: 'self', skill_ids: [SKILLS[1].id], other_text: 'GROWSAFE' },
      error: null,
    }
    render(<TrainingDemandCard role="seeker" context="test" />)
    const chip = await screen.findByRole('button', { name: 'Health & safety competency' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Update my answer' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('GROWSAFE')).toBeInTheDocument()
  })

  it('dismiss removes the card and persists', async () => {
    render(<TrainingDemandCard role="seeker" context="test" />)
    await screen.findByRole('button', { name: 'Pasture & forage management' })
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss training question' }))
    expect(screen.queryByTestId('training-demand-card')).not.toBeInTheDocument()
    expect(localStorage.getItem('tf-training-demand-dismissed')).toBe('1')
  })
})
