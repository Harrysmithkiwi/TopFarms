import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.hoisted because SeekerStep5LifeSituation statically imports @/lib/supabase
// via ChipSelector dependencies (matches Phase 17-02/20-06 vi.hoisted precedent).
// SeekerStep5 itself doesn't call supabase directly, but the hoisted pattern
// protects against transitive imports.
const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock, rpc: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { SeekerStep5LifeSituation } from '@/pages/onboarding/steps/SeekerStep5LifeSituation'

beforeEach(() => {
  fromMock.mockReset()
})

describe('Seeker Onboarding', () => {
  describe('SONB-01: Wizard navigation', () => {
    it.todo('renders 7-step wizard with StepIndicator')
    it.todo('advances to next step on valid submission')
    it.todo('goes back to previous step on Back click')
    it.todo('resumes from saved onboarding_step on return visit')
  })

  describe('SONB-02: Farm type step', () => {
    it.todo('allows multi-select of farm types (dairy, sheep_beef)')
    it.todo('disables Continue when no selection made')
  })

  describe('SONB-03: Experience step', () => {
    it.todo('captures years_experience as number input')
    it.todo('captures shed_types_experienced as multi-select')
    it.todo('captures herd_sizes_worked as multi-select')
  })

  describe('SONB-04: Qualifications step', () => {
    it.todo('renders DairyNZ level dropdown with 5 options')
  })

  describe('SONB-05: Skills step', () => {
    it.todo('renders SkillsPicker in proficiency mode')
    it.todo('saves skills with delete+insert pattern')
  })

  describe('SONB-06: Life situation step', () => {
    it.todo('captures couples_seeking toggle')
    it.todo('captures accommodation_needed toggle with sub-options')
    it.todo('captures region preference')
  })

  describe('SONB-07: Visa step', () => {
    it.todo('renders visa status dropdown with 5 options')
  })

  describe('SONB-08: Completion', () => {
    it.todo('sets onboarding_complete to true on final step')
    it.todo('redirects to /jobs with pre-set filters after completion')
    it.todo('shows success toast on completion')
  })
})

describe('SeekerStep5 salary chips', () => {
  it('renders all 8 salary band chips', async () => {
    render(<SeekerStep5LifeSituation onComplete={vi.fn()} />)

    // All 8 chip labels must be present
    const labels = [
      '$50–60k',
      '$60–70k',
      '$70–80k',
      '$80–90k',
      '$90–100k',
      '$100–110k',
      '$110–120k',
      '$120k+',
    ]
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }

    // Old number input must be gone
    expect(
      screen.queryByRole('spinbutton'), // input[type=number] has role spinbutton
    ).toBeNull()
  })

  it('clicking a chip calls onComplete with the lower-bound integer', async () => {
    const onComplete = vi.fn()
    render(<SeekerStep5LifeSituation onComplete={onComplete} />)

    // Click '$70–80k' chip
    fireEvent.click(screen.getByText('$70–80k'))

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    const callArg = onComplete.mock.calls[0][0]
    expect(callArg.min_salary).toBe(70000)
  })

  it('renders chip as selected when defaultValues.min_salary = 80000', async () => {
    render(<SeekerStep5LifeSituation onComplete={vi.fn()} defaultValues={{ min_salary: 80000 }} />)

    // The '$80–90k' chip should be rendered — ChipSelector adds text-brand class on selected
    // We assert the chip button has the brand styling (border-brand class indicates selected)
    const chip = screen.getByText('$80–90k').closest('button')
    expect(chip).not.toBeNull()
    expect(chip?.className).toMatch(/border-brand/)
  })
})
