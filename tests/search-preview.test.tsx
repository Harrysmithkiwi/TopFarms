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

  it('renders 5 default quick-filter pills', () => {
    render(<SearchHero />)
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getByText('Sheep & Beef')).toBeInTheDocument()
    expect(screen.getByText('Farm Manager')).toBeInTheDocument()
    expect(screen.getByText('Herd Manager')).toBeInTheDocument()
    expect(screen.getByText('Relief Milker')).toBeInTheDocument()
  })

  it('calls onPillClick with the pill label when a pill is clicked', () => {
    const onPillClick = vi.fn()
    render(<SearchHero onPillClick={onPillClick} />)
    fireEvent.click(screen.getByText('Dairy'))
    expect(onPillClick).toHaveBeenCalledWith('Dairy')
  })

  it('calls onSearch with query and region values when Search Jobs is clicked', () => {
    const onSearch = vi.fn()
    render(<SearchHero onSearch={onSearch} />)
    const input = screen.getByPlaceholderText(/Search jobs, roles, farms/)
    fireEvent.change(input, { target: { value: 'milker' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search Jobs' }))
    expect(onSearch).toHaveBeenCalledWith('milker', '')
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
    expect(screen.queryByText('Dairy')).not.toBeInTheDocument()
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

  it('renders AI tip box with purple-lt background', () => {
    render(<LivePreviewSidebar completenessPercent={50} />)
    const tipText = screen.getByText(/40% more applications/)
    expect(tipText).toBeInTheDocument()
    // Check that the tip box parent has purple-lt bg
    const tipBox = tipText.closest('[class*="bg-purple-lt"]')
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
