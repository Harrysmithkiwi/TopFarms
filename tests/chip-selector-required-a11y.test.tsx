import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChipSelector } from '@/components/ui/ChipSelector'

// Found by the pre-launch UAT design pass, 2026-08-25. The group carried
// aria-required="true" on role="group", which is NOT a permitted attribute there - axe
// rates it CRITICAL and the browser simply drops it. The visible asterisk was
// aria-hidden, on the stated grounds that "aria-required on the group carries this to
// assistive tech". It did not. A screen-reader user got no indication at all that the
// field was required.

const opts = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'sheep', label: 'Sheep & Beef' },
]

describe('ChipSelector required-ness is announced, not just drawn', () => {
  it('never puts aria-required on the group (invalid there, and dropped)', () => {
    const { container } = render(
      <ChipSelector label="Farm type" mode="single" required value={[]} onChange={vi.fn()} options={opts} />,
    )
    const group = container.querySelector('[role="group"]')!
    expect(group.hasAttribute('aria-required')).toBe(false)
  })

  it('speaks the requirement in the label', () => {
    render(<ChipSelector label="Farm type" mode="single" required value={[]} onChange={vi.fn()} options={opts} />)
    expect(screen.getByText(/\(required\)/i)).toBeInTheDocument()
    // The group takes its name from that label, so the requirement travels with it.
    expect(screen.getByRole('group')).toHaveAccessibleName(/farm type.*required/i)
  })

  it('says nothing about requirement when the field is optional', () => {
    render(<ChipSelector label="Farm type" mode="single" value={[]} onChange={vi.fn()} options={opts} />)
    expect(screen.queryByText(/\(required\)/i)).not.toBeInTheDocument()
  })
})
