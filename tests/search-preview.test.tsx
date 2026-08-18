import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SearchHero } from '@/components/ui/SearchHero'
import { LivePreviewSidebar } from '@/components/ui/LivePreviewSidebar'

describe('SearchHero', () => {
  it('renders the headline text', () => {
    render(<SearchHero />)
    expect(screen.getByText('Find your next farming opportunity')).toBeInTheDocument()
  })

  it('renders a search input with correct placeholder', () => {
    render(<SearchHero />)
    expect(screen.getByPlaceholderText(/Search jobs, roles, farms/)).toBeInTheDocument()
  })

  it('renders a Search Jobs button', () => {
    render(<SearchHero />)
    expect(screen.getByRole('button', { name: 'Search Jobs' })).toBeInTheDocument()
  })

  // `Dairy` and `Sheep & Beef` were here until 2026-08-18. They are SECTORS, and `sector` is
  // not a registered filter key — a pill emitting one could never have produced an
  // ActiveFilterPill or been cleared. The defaults are role_type values now; the vocabulary
  // itself is asserted against ROLE_TYPES in tests/search-hero-wired.test.ts.
  it('renders 5 default quick-filter pills', () => {
    render(<SearchHero />)
    for (const pill of ['Farm Manager', 'Herd Manager', 'Farm Hand', 'Relief Milker', 'Calf Rearer']) {
      expect(screen.getByText(pill)).toBeInTheDocument()
    }
  })

  it('calls onPillClick with the pill label when a pill is clicked', () => {
    const onPillClick = vi.fn()
    render(<SearchHero onPillClick={onPillClick} />)
    fireEvent.click(screen.getByText('Herd Manager'))
    expect(onPillClick).toHaveBeenCalledWith('Herd Manager')
  })

  // These assertions always passed while `<SearchHero />` was mounted with no props at all —
  // proving the callback fires says nothing about whether anyone supplied one. That gap is
  // what tests/search-hero-wired.test.ts closes.
  it('calls onSearch with the trimmed query when Search Jobs is clicked', () => {
    const onSearch = vi.fn()
    render(<SearchHero onSearch={onSearch} />)
    const input = screen.getByPlaceholderText(/Search jobs, roles, farms/)
    fireEvent.change(input, { target: { value: '  milker ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search Jobs' }))
    expect(onSearch).toHaveBeenCalledWith('milker')
  })

  it('calls onSearch when Enter is pressed in the box', () => {
    const onSearch = vi.fn()
    render(<SearchHero onSearch={onSearch} />)
    const input = screen.getByPlaceholderText(/Search jobs, roles, farms/)
    fireEvent.change(input, { target: { value: 'shepherd' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSearch).toHaveBeenCalledWith('shepherd')
  })

  it('shows the region its caller passes, not one it invented', () => {
    // Region is controlled by the URL, not by local state — held locally it desynced from the
    // sidebar's `region` filter the moment either one moved. The value is also the canonical
    // NZ_REGIONS string, so it equals what `jobs.region` stores.
    render(<SearchHero region="Manawatū-Whanganui" />)
    expect(screen.getByLabelText('Filter by region')).toHaveTextContent('Manawatū-Whanganui')
    render(<SearchHero region="" />)
    expect(screen.getAllByLabelText('Filter by region')[1]).toHaveTextContent('All Regions')
  })

  it('renders with a gradient background via inline style', () => {
    const { container } = render(<SearchHero />)
    const gradientEl = container.firstElementChild as HTMLElement
    expect(gradientEl.style.background).toContain('linear-gradient')
  })

  it('renders custom pills when provided', () => {
    render(<SearchHero pills={['Viticulture', 'Horticulture']} />)
    expect(screen.getByText('Viticulture')).toBeInTheDocument()
    expect(screen.getByText('Horticulture')).toBeInTheDocument()
    expect(screen.queryByText('Farm Manager')).not.toBeInTheDocument()
  })
})

describe('LivePreviewSidebar', () => {
  it('renders with 320px width class', () => {
    const { container } = render(<LivePreviewSidebar completenessPercent={65} />)
    const aside = container.querySelector('aside')
    expect(aside).toBeInTheDocument()
    expect(aside?.className).toContain('w-[320px]')
  })

  it('renders Listing Preview heading', () => {
    render(<LivePreviewSidebar completenessPercent={65} />)
    expect(screen.getByText('Listing Preview')).toBeInTheDocument()
  })

  it('renders completeness percentage as text', () => {
    render(<LivePreviewSidebar completenessPercent={65} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('renders Match Pool Estimate heading', () => {
    render(<LivePreviewSidebar completenessPercent={50} />)
    expect(screen.getByText('Match Pool Estimate')).toBeInTheDocument()
  })

  it('renders fill-in prompt when no matchCriteria provided', () => {
    render(<LivePreviewSidebar completenessPercent={50} />)
    expect(screen.getByText('Fill in fields to see estimates')).toBeInTheDocument()
  })

  it('renders AI tip box with ai-bg background', () => {
    render(<LivePreviewSidebar completenessPercent={50} />)
    // Truth-pass: the old copy cited "40% more applications" — a fabricated
    // stat. Current copy is a qualitative tip; never reintroduce invented numbers.
    const tipText = screen.getByText(/accommodation details/)
    expect(tipText).toBeInTheDocument()
    // Check that the tip box parent has ai-bg
    const tipBox = tipText.closest('[class*="bg-ai-bg"]')
    expect(tipBox).toBeInTheDocument()
  })

  it('renders mini card when miniCard prop is provided', () => {
    render(
      <LivePreviewSidebar
        completenessPercent={75}
        miniCard={{
          title: 'Farm Manager',
          farmName: 'Green Pastures Ltd',
          location: 'Waikato',
        }}
      />,
    )
    expect(screen.getByText('Farm Manager')).toBeInTheDocument()
    expect(screen.getByText('Green Pastures Ltd')).toBeInTheDocument()
    expect(screen.getByText('Waikato')).toBeInTheDocument()
  })

  it('renders placeholder when miniCard is not provided', () => {
    render(<LivePreviewSidebar completenessPercent={20} />)
    expect(screen.getByText('Complete fields to see preview')).toBeInTheDocument()
  })

  it('renders sticky positioning class', () => {
    const { container } = render(<LivePreviewSidebar completenessPercent={50} />)
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('sticky')
    expect(aside?.className).toContain('top-6')
  })
})
