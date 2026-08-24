import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Step1FarmType } from '@/pages/onboarding/steps/Step1FarmType'

// Found by the DESIGN.md §5 judgement pass during pre-launch UAT, 2026-08-24.
// The six farm-type cards were plain buttons whose only selected-state signal was a
// border colour: no aria-pressed, no aria-checked, no grouping. On the FIRST step of
// employer onboarding, a screen-reader user could not tell which type they had picked.
//
// axe cannot catch this - it does not require a selected state on a <button> - which is
// exactly why DESIGN.md splits the mechanical gate from the judgement one.

describe('Step1FarmType selection is exposed to assistive tech', () => {
  const setup = () => render(<Step1FarmType onNext={vi.fn()} onBack={vi.fn()} />)

  it('is a labelled radiogroup, not a pile of buttons', () => {
    setup()
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAccessibleName(/what type of farm/i)
  })

  it('offers every farm type as a radio, all initially unchecked', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('marks the chosen type checked, and only that one', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /dairy cattle/i }))
    const checked = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveAccessibleName(/dairy cattle/i)
  })
})
