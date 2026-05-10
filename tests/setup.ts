import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Polyfill ResizeObserver for Radix UI components (e.g., Select, Tooltip)
// that use @radix-ui/react-use-size internally. jsdom does not implement it.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(() => {
  cleanup()
})
