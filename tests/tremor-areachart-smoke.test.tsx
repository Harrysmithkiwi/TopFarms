/**
 * Phase 0 STEP 2 render-confirm: the Tremor Raw AreaChart (recharts-2.x source)
 * must actually mount + draw against the installed recharts 3.9. tsc + Vite build
 * pass, but neither exercises the chart at runtime — this does. If recharts 3
 * had removed/changed an API Tremor relies on, this throws or renders no surface.
 *
 * Throwaway smoke test (the de-risk gate for the recharts 2→3 drift); not part of
 * the permanent suite's intent, but harmless to keep.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { AreaChart } from '@/components/tremor/AreaChart'

// recharts' ResponsiveContainer needs real element dimensions; jsdom reports 0.
// Stub size + a ResizeObserver that fires once with that size so recharts draws.
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
    observe(el: Element) {
      this.cb(
        [{ contentRect: { width: 600, height: 300 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const DATA = [
  { date: 'Jun 01', Signups: 12 },
  { date: 'Jun 02', Signups: 18 },
  { date: 'Jun 03', Signups: 9 },
  { date: 'Jun 04', Signups: 22 },
  { date: 'Jun 05', Signups: 17 },
]

describe('Tremor AreaChart × recharts 3.9 (render-confirm)', () => {
  it('mounts without throwing and draws a recharts surface', () => {
    const { container } = render(
      <div style={{ width: 600, height: 300 }}>
        <AreaChart data={DATA} index="date" categories={['Signups']} className="h-72" />
      </div>,
    )
    // ResponsiveContainer initialised (chart pipeline ran under recharts 3.9)
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    // and recharts actually rendered an SVG surface (not a no-op at 0px)
    expect(container.querySelector('svg.recharts-surface')).not.toBeNull()
  })
})
