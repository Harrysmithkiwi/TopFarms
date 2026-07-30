// Phase 4.3 — 44px tap targets + no nested interactive elements.
// jsdom cannot compute layout, so the class contract (h-11/w-11/min-h-11 = 44px)
// is asserted here; the REAL computed-box check for the bookmark runs in
// tests/e2e/a11y.spec.ts via getBoundingClientRect. Both must stay.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { HireConfirmModal } from '@/pages/dashboard/employer/HireConfirmModal'
import { SearchJobCard } from '@/components/ui/SearchJobCard'
import type { JobListing } from '@/types/domain'

const job = {
  id: 'job-1',
  title: 'Dairy Assistant',
  region: 'Waikato',
  employer_profiles: { farm_name: 'Test Farm', region: 'Waikato', id: 'emp-1' },
} as unknown as JobListing & { employer_profiles: { farm_name: string; region: string; id: string } }

describe('44px tap targets (Phase 4.3)', () => {
  it('HireConfirmModal star buttons carry the 44px hit-area classes', () => {
    render(
      <HireConfirmModal
        candidateName="Test Person"
        feeDisplayAmount="$500"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const stars = screen.getAllByRole('button', { name: /rate \d star/i })
    expect(stars).toHaveLength(5)
    for (const star of stars) {
      expect(star.className).toMatch(/\bh-11\b/)
      expect(star.className).toMatch(/\bw-11\b/)
    }
  })

  it('SearchJobCard bookmark carries the 44px hit-area classes', () => {
    render(
      <MemoryRouter>
        <SearchJobCard job={job} onSaveToggle={vi.fn()} />
      </MemoryRouter>,
    )
    const bookmark = screen.getByRole('button', { name: /save this job/i })
    expect(bookmark.className).toMatch(/\bh-11\b/)
    expect(bookmark.className).toMatch(/\bw-11\b/)
  })

  it('SearchJobCard has no interactive element nested inside another', () => {
    const { container } = render(
      <MemoryRouter>
        <SearchJobCard job={job} onSaveToggle={vi.fn()} />
      </MemoryRouter>,
    )
    const nested = container.querySelectorAll(
      'button button, button a, a button, a a, button [role="button"], [role="button"] button',
    )
    expect(nested).toHaveLength(0)
  })
})
