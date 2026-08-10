import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { StatusBanner } from '@/components/ui/StatusBanner'

describe('ChipSelector', () => {
  const options = [
    { value: 'dairy', label: 'Dairy' },
    { value: 'sheep', label: 'Sheep & Beef' },
    { value: 'hort', label: 'Horticulture' },
  ]

  it('single-select: clicking chip B when chip A is selected calls onChange with only B', async () => {
    const onChange = vi.fn()
    render(<ChipSelector options={options} value={['dairy']} onChange={onChange} mode="single" />)
    await userEvent.click(screen.getByRole('button', { name: /Sheep & Beef/i }))
    expect(onChange).toHaveBeenCalledWith(['sheep'])
  })

  it('multi-select: clicking chip B when chip A is selected calls onChange with both', async () => {
    const onChange = vi.fn()
    render(<ChipSelector options={options} value={['dairy']} onChange={onChange} mode="multi" />)
    await userEvent.click(screen.getByRole('button', { name: /Sheep & Beef/i }))
    expect(onChange).toHaveBeenCalledWith(['dairy', 'sheep'])
  })

  it('multi-select: clicking selected chip A when [A, B] selected calls onChange with only B', async () => {
    const onChange = vi.fn()
    render(
      <ChipSelector
        options={options}
        value={['dairy', 'sheep']}
        onChange={onChange}
        mode="multi"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Dairy/i }))
    expect(onChange).toHaveBeenCalledWith(['sheep'])
  })

  it('selected chip renders with border-brand and bg-brand-50 classes', () => {
    render(<ChipSelector options={options} value={['dairy']} onChange={vi.fn()} mode="single" />)
    const selectedButton = screen.getByRole('button', { name: /Dairy/i })
    expect(selectedButton.className).toMatch(/border-brand/)
    expect(selectedButton.className).toMatch(/bg-brand-50/)
  })

  it('selected chip renders a Check icon (checkmark)', () => {
    render(<ChipSelector options={options} value={['dairy']} onChange={vi.fn()} mode="single" />)
    const selectedButton = screen.getByRole('button', { name: /Dairy/i })
    // lucide-react Check icon renders as an SVG
    const svg = selectedButton.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('unselected chip renders with border-border class', () => {
    render(<ChipSelector options={options} value={['dairy']} onChange={vi.fn()} mode="single" />)
    const unselectedButton = screen.getByRole('button', { name: /Sheep & Beef/i })
    expect(unselectedButton.className).toMatch(/border-border/)
  })

  // These query role="group" rather than container.firstElementChild: the chips now sit inside
  // a labelled group, so the outer element is the label/error wrapper, not the grid.
  it('columns=3 renders container with grid-cols-3', () => {
    render(
      <ChipSelector
        ariaLabel="Farm type"
        options={options}
        value={[]}
        onChange={vi.fn()}
        mode="multi"
        columns={3}
      />,
    )
    expect(screen.getByRole('group').className).toMatch(/grid-cols-3/)
  })

  it('columns="inline" renders container with flex-wrap', () => {
    render(
      <ChipSelector
        ariaLabel="Farm type"
        options={options}
        value={[]}
        onChange={vi.fn()}
        mode="multi"
        columns="inline"
      />,
    )
    expect(screen.getByRole('group').className).toMatch(/flex-wrap/)
  })

  it('names the group, marks required and wires the error — the three a11y gaps', () => {
    render(
      <ChipSelector
        label="Shed type"
        required
        error="Select shed type"
        options={options}
        value={['dairy']}
        onChange={vi.fn()}
        mode="multi"
      />,
    )
    const group = screen.getByRole('group', { name: 'Shed type' })
    expect(group).toHaveAttribute('aria-required', 'true')
    expect(group).toHaveAttribute('aria-invalid', 'true')
    // The error must be reachable from the group, not just rendered near it.
    const describedBy = group.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe('Select shed type')
    // Selection state reaches assistive tech, not only the colour and the tick.
    expect(screen.getByRole('button', { name: /Dairy/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Sheep & Beef/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('renders optional icon when provided in chip option', () => {
    const iconOptions = [
      { value: 'dairy', label: 'Dairy', icon: <span data-testid="dairy-icon">D</span> },
    ]
    render(<ChipSelector options={iconOptions} value={[]} onChange={vi.fn()} mode="single" />)
    expect(screen.getByTestId('dairy-icon')).toBeTruthy()
  })
})

describe('StatusBanner', () => {
  it('variant="shortlisted" renders correct title text', () => {
    render(<StatusBanner variant="shortlisted" />)
    expect(screen.getByText(/Great news/)).toBeTruthy()
    expect(screen.getByText(/you've been shortlisted!/)).toBeTruthy()
  })

  it('variant="interview" renders correct title text', () => {
    render(<StatusBanner variant="interview" />)
    expect(screen.getByText(/You've got an interview invitation!/)).toBeTruthy()
  })

  it('variant="offer" renders correct title text', () => {
    render(<StatusBanner variant="offer" />)
    expect(screen.getByText(/Congratulations/)).toBeTruthy()
    expect(screen.getByText(/you've received an offer!/)).toBeTruthy()
  })

  it('variant="declined" renders correct title text', () => {
    render(<StatusBanner variant="declined" />)
    expect(screen.getByText(/Unfortunately, this application wasn't successful\./)).toBeTruthy()
  })

  it('variant="shortlisted" container has bg-warn-bg class', () => {
    const { container } = render(<StatusBanner variant="shortlisted" />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toMatch(/bg-warn-bg/)
  })

  it('variant="declined" container has bg-danger-bg/60 class (not opacity-60)', () => {
    const { container } = render(<StatusBanner variant="declined" />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toMatch(/bg-danger-bg\/60/)
    expect(wrapper?.className).not.toMatch(/opacity-60/)
  })

  it('renders children passed via actions prop', () => {
    render(
      <StatusBanner
        variant="interview"
        actions={<button data-testid="accept-btn">Accept Interview</button>}
      />,
    )
    expect(screen.getByTestId('accept-btn')).toBeTruthy()
    expect(screen.getByText('Accept Interview')).toBeTruthy()
  })
})
