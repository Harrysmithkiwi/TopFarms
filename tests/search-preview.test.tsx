import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SearchHero } from '@/components/ui/SearchHero'

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
