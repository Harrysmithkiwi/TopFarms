import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.hoisted: the step pulls @/lib/supabase in transitively via ChipSelector.
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock, rpc: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { Step2FarmDetails } from '@/pages/onboarding/steps/Step2FarmDetails'

/**
 * `inz_accreditation_expires` is a DATE column. Postgres rejects `''` with 22007, and
 * because this step saves the whole form in ONE upsert, that single empty string fails
 * every field on the step — the employer just sees "Failed to save progress".
 *
 * It broke a live signup on 2026-08-21 without anyone typing a date: react-hook-form v7
 * keeps the value of a field that was mounted and then hidden (`shouldUnregister` defaults
 * to false), so toggling INZ accreditation ON and then OFF leaves `''` in form state, and
 * `z.string().optional()` accepts it. The seeker form already guarded its own date field;
 * this one never did.
 *
 * Region is seeded through `defaultValues` rather than driven, because it is a Radix
 * combobox and this test is about the date, not about Radix.
 */
const SEED = {
  farm_name: 'Green Valley',
  region: 'hawkes_bay',
  farm_types: ['sheep_beef'],
}

function toggle() {
  return screen.getByRole('switch')
}

describe('Step2FarmDetails — a date column must never receive an empty string', () => {
  it('emits no empty-string date after INZ is toggled on then off', async () => {
    const onComplete = vi.fn()
    render(<Step2FarmDetails onComplete={onComplete} onBack={vi.fn()} defaultValues={SEED} />)

    // Mount the date input, then hide it again — the exact path that broke prod.
    fireEvent.click(toggle())
    expect(screen.getByLabelText(/accreditation expires/i)).toBeTruthy()
    fireEvent.click(toggle())

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())

    const payload = onComplete.mock.calls[0][0]
    expect(payload.inz_accreditation_expires).not.toBe('')
    expect(payload.inz_accreditation_expires ?? undefined).toBeUndefined()
  })

  it('still carries a real date through when the employer is accredited', async () => {
    const onComplete = vi.fn()
    render(<Step2FarmDetails onComplete={onComplete} onBack={vi.fn()} defaultValues={SEED} />)

    fireEvent.click(toggle())
    fireEvent.change(screen.getByLabelText(/accreditation expires/i), {
      target: { value: '2027-06-30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())

    expect(onComplete.mock.calls[0][0].inz_accreditation_expires).toBe('2027-06-30')
  })
})
