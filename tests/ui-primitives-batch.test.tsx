import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { Timeline } from '@/components/ui/Timeline'

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

  it('renders meadow dots', () => {
    const { container } = render(<Timeline entries={entries} />)
    const dots = container.querySelectorAll('.bg-meadow')
    expect(dots.length).toBe(3)
  })

  it('renders connecting lines with bg-fog', () => {
    const { container } = render(<Timeline entries={entries} />)
    const lines = container.querySelectorAll('.bg-fog')
    // Last item should NOT have a connecting line, so 2 lines for 3 entries
    expect(lines.length).toBe(2)
  })

  it('does not render connecting line on last item', () => {
    const { container } = render(<Timeline entries={entries} />)
    const listItems = container.querySelectorAll('li')
    const lastItem = listItems[listItems.length - 1]
    const line = lastItem.querySelector('.bg-fog')
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
