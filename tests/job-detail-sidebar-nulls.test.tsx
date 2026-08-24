import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { JobDetailSidebar } from '@/components/ui/JobDetailSidebar'
import type { JobListing } from '@/types/domain'

// Found by pre-launch UAT on live prod, 2026-08-24. An employer who left "herd size"
// blank published a listing whose page returned 500 to EVERY visitor, anonymous or
// signed in. Postgres stores an unanswered optional number as NULL; the guards here read
// `!== undefined`, and `null !== undefined` is true, so the branch rendered and
// `null.toLocaleString()` threw during SSR.
//
// This is the second half of the blank-number work: storing NULL instead of 0 was
// correct, and it moved the failure into every consumer that assumed a number.

const job = {
  id: 'j1', title: 'Herd Manager', contract_type: 'permanent',
  salary_min: null, salary_max: null, expires_at: null, start_date: null,
} as unknown as JobListing

const renderWith = (farm: Record<string, unknown>) =>
  render(
    <MemoryRouter>
      <JobDetailSidebar
        job={job}
        farm={{ id: 'e1', farm_name: 'UAT Station', region: 'Waikato', ...farm } as never}
        similarJobs={[]}
        isSaved={false}
        onSaveToggle={() => {}}
        onShare={() => {}}
      />
    </MemoryRouter>,
  )

describe('JobDetailSidebar with NULL optional numbers', () => {
  it('renders when every optional farm number is null', () => {
    expect(() =>
      renderWith({ herd_size: null, rating: null, total_jobs: null, total_hires: null }),
    ).not.toThrow()
    expect(screen.getByText('UAT Station')).toBeInTheDocument()
    // A null stat is absent, never "0" and never a crash.
    expect(screen.queryByText('Herd Size')).not.toBeInTheDocument()
  })

  it('still renders a real herd size when one was given', () => {
    renderWith({ herd_size: 1200, rating: null, total_jobs: null, total_hires: null })
    expect(screen.getByText('Herd Size')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
  })

  it('does not crash on a null match score in similar jobs', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <JobDetailSidebar
            job={job}
            farm={{ id: 'e1', farm_name: 'UAT Station', region: 'Waikato', herd_size: null } as never}
            similarJobs={[{ id: 's1', title: 'Shepherd', farm_name: 'Other', region: 'Otago', matchScore: null }]}
            isSaved={false}
            onSaveToggle={() => {}}
            onShare={() => {}}
          />
        </MemoryRouter>,
      ),
    ).not.toThrow()
  })
})
