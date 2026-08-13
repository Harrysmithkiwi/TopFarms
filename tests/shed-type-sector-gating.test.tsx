import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobStep2FarmDetails } from '@/pages/jobs/steps/JobStep2FarmDetails'
import { Step2FarmDetails } from '@/pages/onboarding/steps/Step2FarmDetails'

// Test intent (go-live wart, 2026-08-14):
//
//   Shed type is a dairy concept, but step 2 required it for every sector. A Sheep & Beef
//   employer could not submit the step at all — the wizard blocked on a field their farm does
//   not have, on the exact path that has to work for the first real listing.
//
//   The matcher was always ready for this: compute_match_score sets v_shed_applicable = false
//   on an empty shed_type and drops the dimension out of the denominator, so a non-dairy job
//   scores on its remaining dimensions rather than silently losing 25 points.
//
//   These three assertions are the gate. If the sector check regresses, one of them fails.

describe('JobStep2FarmDetails — sector gating', () => {
  it('does not ask a Sheep & Beef listing for a shed type, and lets it submit', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(<JobStep2FarmDetails sector="sheep_beef" onComplete={onComplete} />)

    expect(screen.queryByText('Shed type')).not.toBeInTheDocument()
    expect(screen.queryByText('Milking frequency')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    // Empty, not absent: this is the value that makes the shed dimension non-applicable.
    expect(onComplete.mock.calls[0][0].shed_type).toEqual([])
  })

  it('still blocks a dairy listing that has no shed type', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(<JobStep2FarmDetails sector="dairy" onComplete={onComplete} />)

    expect(screen.getByText('Shed type')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(await screen.findByText('Select shed type')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('drops a prefilled dairy shed type rather than riding it onto a non-dairy job', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    // PostJob prefills shed_type from the employer's own profile, which may be dairy.
    render(
      <JobStep2FarmDetails
        sector="cropping"
        onComplete={onComplete}
        defaultValues={{ shed_type: ['rotary'], milking_frequency: 'twice_daily' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].shed_type).toEqual([])
    expect(onComplete.mock.calls[0][0].milking_frequency).toBe('')
  })
})

// The employer's own onboarding form carries the identical rule, expressed separately because
// the two forms share no schema. It is the worse of the two: it blocks profile completion at
// the front of the funnel, not just one listing. Fixing one and leaving the other is the trap.
describe('Step2FarmDetails (employer onboarding) — farm-type gating', () => {
  it('drops the shed-type question once the farm is Sheep & Beef only', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(
      <Step2FarmDetails
        onComplete={onComplete}
        defaultValues={{
          farm_name: 'Test Station',
          region: 'Waikato',
          farm_types: ['sheep_beef'],
        }}
      />,
    )

    expect(screen.queryByText('Shed type')).not.toBeInTheDocument()
    expect(screen.queryByText('Milking frequency')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].shed_type).toEqual([])
  })

  it('still requires a shed type from a dairy farm', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(
      <Step2FarmDetails
        onComplete={onComplete}
        defaultValues={{
          farm_name: 'Test Farm',
          region: 'Waikato',
          farm_types: ['dairy'],
        }}
      />,
    )

    expect(screen.getByText('Shed type')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText('Select shed type')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
