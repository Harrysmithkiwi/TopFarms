// Phase 4.4 — focus & motion gates.
// Behavioural where jsdom allows (dialog semantics, trap, Escape); source-level
// for the two global contracts (MotionConfig wrapper, base :focus-visible rule)
// because the entry module has import-time side effects. The behavioural half of
// reduced-motion is A7 in the e2e evidence (page.emulateMedia), not here.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HireConfirmModal } from '@/pages/dashboard/employer/HireConfirmModal'

describe('HireConfirmModal dialog semantics (Phase 4.4)', () => {
  it('renders role="dialog" with aria-modal and an accessible name', () => {
    render(
      <HireConfirmModal
        candidateName="Test Person"
        feeDisplayAmount="$500"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Confirm Hire' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('moves focus into the dialog on open and closes on Escape', () => {
    const onCancel = vi.fn()
    render(
      <HireConfirmModal
        candidateName="Test Person"
        feeDisplayAmount="$500"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Confirm Hire' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('global focus & motion contracts (Phase 4.4)', () => {
  it('root.tsx wraps the app in <MotionConfig reducedMotion="user">', () => {
    // v13 stage 3b: was main.tsx before framework mode; root.tsx owns the
    // provider tree now.
    const root = readFileSync('src/root.tsx', 'utf8')
    expect(root).toMatch(/<MotionConfig reducedMotion="user">/)
  })

  it('index.css declares the base-layer :focus-visible ring', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/:focus-visible\s*\{\s*outline: 2px solid var\(--color-brand-hover\)/)
  })
})
