/**
 * Phase-1 Analytics render-confirm: the Tremor BarChart (recharts-2.x source) must
 * mount + draw against the installed recharts 3.9, same as the AreaChart guard.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { BarChart } from '@/components/tremor/BarChart'

beforeAll(() => {
  for (const prop of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value: prop.includes('Width') ? 600 : 300,
    })
  }
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, x: 0, y: 0, toJSON() {} }) as DOMRect
  global.ResizeObserver = class {
    cb: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb
    }
    observe() {
      this.cb([{ contentRect: { width: 600, height: 300 } } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const DATA = [
  { band: '0–40', Applications: 5, Hired: 0 },
  { band: '40–70', Applications: 12, Hired: 2 },
  { band: '70–100', Applications: 8, Hired: 4 },
]

describe('Tremor BarChart × recharts 3.9 (render-confirm)', () => {
  it('mounts and draws a recharts surface', () => {
    const { container } = render(
      <div style={{ width: 600, height: 300 }}>
        <BarChart data={DATA} index="band" categories={['Applications', 'Hired']} colors={['brand', 'brandLight']} className="h-72" />
      </div>,
    )
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    expect(container.querySelector('svg.recharts-surface')).not.toBeNull()
  })
})
