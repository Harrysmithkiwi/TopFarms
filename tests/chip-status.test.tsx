import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipSelector } from '@/components/ui/ChipSelector'

describe('ChipSelector', () => {
  const options = [
    { value: 'dairy', label: 'Dairy' },
    { value: 'sheep', label: 'Sheep & Beef' },
    { value: 'hort', label: 'Horticulture' },
  ]

  it('single-select: clicking chip B when chip A is selected calls onChange with only B', async () => {
    const onChange = vi.fn()
    render(
      <ChipSelector
        options={options}
        value={['dairy']}
        onChange={onChange}
        mode="single"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Sheep & Beef/i }))
    expect(onChange).toHaveBeenCalledWith(['sheep'])
  })

  it('multi-select: clicking chip B when chip A is selected calls onChange with both', async () => {
    const onChange = vi.fn()
    render(
      <ChipSelector
        options={options}
        value={['dairy']}
        onChange={onChange}
        mode="multi"
      />,
    )
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

  it('selected chip renders with border-moss and bg-moss classes', () => {
    render(
      <ChipSelector
        options={options}
        value={['dairy']}
        onChange={vi.fn()}
        mode="single"
      />,
    )
    const selectedButton = screen.getByRole('button', { name: /Dairy/i })
    expect(selectedButton.className).toMatch(/border-moss/)
    expect(selectedButton.className).toMatch(/bg-moss/)
  })

  it('selected chip renders a Check icon (checkmark)', () => {
    render(
      <ChipSelector
        options={options}
        value={['dairy']}
        onChange={vi.fn()}
        mode="single"
      />,
    )
    const selectedButton = screen.getByRole('button', { name: /Dairy/i })
    // lucide-react Check icon renders as an SVG
    const svg = selectedButton.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('unselected chip renders with border-fog class', () => {
    render(
      <ChipSelector
        options={options}
        value={['dairy']}
        onChange={vi.fn()}
        mode="single"
      />,
    )
    const unselectedButton = screen.getByRole('button', { name: /Sheep & Beef/i })
    expect(unselectedButton.className).toMatch(/border-fog/)
  })

  it('columns=3 renders container with grid-cols-3', () => {
    const { container } = render(
      <ChipSelector
        options={options}
        value={[]}
        onChange={vi.fn()}
        mode="multi"
        columns={3}
      />,
    )
    const grid = container.firstElementChild
    expect(grid?.className).toMatch(/grid-cols-3/)
  })

  it('columns="inline" renders container with flex-wrap', () => {
    const { container } = render(
      <ChipSelector
        options={options}
        value={[]}
        onChange={vi.fn()}
        mode="multi"
        columns="inline"
      />,
    )
    const grid = container.firstElementChild
    expect(grid?.className).toMatch(/flex-wrap/)
  })

  it('renders optional icon when provided in chip option', () => {
    const iconOptions = [
      { value: 'dairy', label: 'Dairy', icon: <span data-testid="dairy-icon">D</span> },
    ]
    render(
      <ChipSelector
        options={iconOptions}
        value={[]}
        onChange={vi.fn()}
        mode="single"
      />,
    )
    expect(screen.getByTestId('dairy-icon')).toBeTruthy()
  })
})
