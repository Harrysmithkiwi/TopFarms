import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { Timeline } from '@/components/ui/Timeline'
import { StarRating } from '@/components/ui/StarRating'
import { Pagination } from '@/components/ui/Pagination'

describe('Breadcrumb', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Jobs', href: '/jobs' },
    { label: 'Farm Manager' },
  ]

  it('renders all items', () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Jobs')).toBeInTheDocument()
    expect(screen.getByText('Farm Manager')).toBeInTheDocument()
  })

  it('renders non-last items as links with href', () => {
    render(<Breadcrumb items={items} />)
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
    const jobsLink = screen.getByText('Jobs').closest('a')
    expect(jobsLink).toHaveAttribute('href', '/jobs')
  })

  it('renders last item as span (not a link)', () => {
    render(<Breadcrumb items={items} />)
    const lastItem = screen.getByText('Farm Manager')
    expect(lastItem.tagName).toBe('SPAN')
    expect(lastItem.closest('a')).toBeNull()
  })

  it('renders chevron separators between items', () => {
    const { container } = render(<Breadcrumb items={items} />)
    // ChevronRight renders as an SVG — should have 2 separators for 3 items
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders container with 44px height', () => {
    const { container } = render(<Breadcrumb items={items} />)
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('h-[44px]')
  })

  it('renders save button when onSave is provided', () => {
    const onSave = vi.fn()
    render(<Breadcrumb items={items} onSave={onSave} />)
    expect(screen.getByLabelText('Save job listing')).toBeInTheDocument()
  })

  it('renders share button when onShare is provided', () => {
    const onShare = vi.fn()
    render(<Breadcrumb items={items} onShare={onShare} />)
    expect(screen.getByLabelText('Share job listing')).toBeInTheDocument()
  })
})

describe('StatsStrip', () => {
  const stats = [
    { label: 'Applications', value: 24 },
    { label: 'Views', value: 1200 },
    { label: 'Salary', value: '$55k-$65k' },
    { label: 'Posted', value: '3 days' },
  ]

  it('renders all stat label+value pairs', () => {
    render(<StatsStrip stats={stats} />)
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('Views')).toBeInTheDocument()
    expect(screen.getByText('1200')).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('$55k-$65k')).toBeInTheDocument()
    expect(screen.getByText('Posted')).toBeInTheDocument()
    expect(screen.getByText('3 days')).toBeInTheDocument()
  })

  it('has a grid container with 4 columns', () => {
    const { container } = render(<StatsStrip stats={stats} />)
    const grid = container.firstElementChild
    expect(grid?.className).toContain('grid-cols-4')
  })
})

describe('Timeline', () => {
  const entries = [
    { title: 'Applied', date: '15 Mar 2026', description: 'Application submitted' },
    { title: 'Reviewed', date: '16 Mar 2026' },
    { title: 'Shortlisted', date: '17 Mar 2026', description: 'Added to shortlist' },
  ]

  it('renders all entries', () => {
    render(<Timeline entries={entries} />)
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('Reviewed')).toBeInTheDocument()
    expect(screen.getByText('Shortlisted')).toBeInTheDocument()
  })

  it('renders brand-coloured dots', () => {
    const { container } = render(<Timeline entries={entries} />)
    const dots = container.querySelectorAll('.bg-brand')
    expect(dots.length).toBe(3)
  })

  it('renders connecting lines with bg-border', () => {
    const { container } = render(<Timeline entries={entries} />)
    const lines = container.querySelectorAll('.bg-border')
    // Last item should NOT have a connecting line, so 2 lines for 3 entries
    expect(lines.length).toBe(2)
  })

  it('does not render connecting line on last item', () => {
    const { container } = render(<Timeline entries={entries} />)
    const listItems = container.querySelectorAll('li')
    const lastItem = listItems[listItems.length - 1]
    const line = lastItem.querySelector('.bg-border')
    expect(line).toBeNull()
  })

  it('renders dates when provided', () => {
    render(<Timeline entries={entries} />)
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument()
    expect(screen.getByText('16 Mar 2026')).toBeInTheDocument()
  })

  it('renders descriptions when provided', () => {
    render(<Timeline entries={entries} />)
    expect(screen.getByText('Application submitted')).toBeInTheDocument()
    expect(screen.getByText('Added to shortlist')).toBeInTheDocument()
  })
})

describe('StarRating', () => {
  it('renders exactly 5 stars', () => {
    const { container } = render(<StarRating value={3} />)
    const stars = container.querySelectorAll('svg')
    expect(stars.length).toBe(5)
  })

  it('renders first N stars with warn fill and rest with border fill', () => {
    const { container } = render(<StarRating value={4} />)
    const paths = container.querySelectorAll('path')
    // First 4 should have hay fill, 5th should have fog fill
    expect(paths[0]).toHaveAttribute('fill', 'var(--color-warn)')
    expect(paths[1]).toHaveAttribute('fill', 'var(--color-warn)')
    expect(paths[2]).toHaveAttribute('fill', 'var(--color-warn)')
    expect(paths[3]).toHaveAttribute('fill', 'var(--color-warn)')
    expect(paths[4]).toHaveAttribute('fill', 'var(--color-border)')
  })

  it('clicking star 3 calls onChange(3)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<StarRating value={1} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[2]) // 3rd star (0-indexed)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('uses the same SVG path as TestimonialsSection', () => {
    const { container } = render(<StarRating value={1} />)
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toContain('M8 1.5l1.854')
  })

  it('renders without buttons in display-only mode (no onChange)', () => {
    render(<StarRating value={3} />)
    const buttons = screen.queryAllByRole('button')
    expect(buttons.length).toBe(0)
  })
})

describe('Pagination', () => {
  it('renders numbered page buttons', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('active page button has bg-brand and text-text-on-brand classes', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />)
    const activeButton = screen.getByText('3')
    expect(activeButton.className).toContain('bg-brand')
    expect(activeButton.className).toContain('text-text-on-brand')
  })

  it('inactive page button has border-border class', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    const inactiveButton = screen.getByText('2')
    expect(inactiveButton.className).toContain('border-border')
  })

  it('clicking page 3 calls onPageChange(3)', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)
    await user.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('prev button is disabled on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    const prevButton = screen.getByLabelText('Go to previous page')
    expect(prevButton).toBeDisabled()
  })

  it('next button is disabled on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />)
    const nextButton = screen.getByLabelText('Go to next page')
    expect(nextButton).toBeDisabled()
  })

  it('shows ellipsis for large page counts', () => {
    render(<Pagination currentPage={10} totalPages={20} onPageChange={vi.fn()} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})
