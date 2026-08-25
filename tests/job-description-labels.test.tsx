import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobStep5Description } from '@/pages/jobs/steps/JobStep5Description'

// Found by the pre-launch UAT design pass, 2026-08-25. All four textareas on the job
// description step rendered a <label> with no htmlFor beside a <textarea> with no id, so
// none of them had an accessible name — a screen reader announced four unlabelled boxes
// with only a placeholder to go on, and a placeholder disappears the moment you type.
// DESIGN.md §5 lists accessible name in the BLOCKING set.

describe('JobStep5Description textareas are labelled', () => {
  const setup = () => render(<JobStep5Description onComplete={vi.fn()} onBack={vi.fn()} />)

  it.each([
    'Role Overview',
    'Day-to-Day',
    'What We Offer',
    'Ideal Candidate',
  ])('"%s" is reachable by its label', (label) => {
    setup()
    expect(screen.getByLabelText(new RegExp(label, 'i'))).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('leaves no textarea without an accessible name', () => {
    const { container } = setup()
    const orphans = [...container.querySelectorAll('textarea')].filter((t) => {
      const byId = t.id && container.querySelector(`label[for="${t.id}"]`)
      return !byId && !t.getAttribute('aria-label') && !t.getAttribute('aria-labelledby')
    })
    expect(orphans).toHaveLength(0)
  })

  it('wires the character counter to the field it counts', () => {
    setup()
    const ta = screen.getByLabelText(/Role Overview/i)
    const described = ta.getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const ids = described!.split(' ').filter(Boolean)
    expect(ids.some((i) => document.getElementById(i)?.textContent?.includes('/'))).toBe(true)
  })
})
