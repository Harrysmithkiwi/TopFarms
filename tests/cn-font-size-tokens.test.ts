import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

// Phase 5.0a regression guard.
//
// tailwind-merge classifies `text-*` against a fixed list. The Phase 5.2 tokens
// `text-micro` and `text-label` are not in it, so it assumed they were COLOURS
// and dropped any colour class before them — silently, in 44 call sites. It
// shipped a "Browse jobs" CTA at 3.43:1 (dark ink on dark green) whose source
// clearly said `text-white`. Only the axe gate caught it, and only once
// credentials made that route reachable.
describe('cn() knows the custom font-size tokens', () => {
  it('keeps a text colour alongside text-label', () => {
    expect(cn('text-white', 'text-label')).toContain('text-white')
    expect(cn('text-white', 'text-label')).toContain('text-label')
  })

  it('keeps a text colour alongside text-micro', () => {
    expect(cn('text-white', 'text-micro')).toContain('text-white')
    expect(cn('text-white', 'text-micro')).toContain('text-micro')
  })

  it('still lets a later size win over an earlier size', () => {
    expect(cn('text-label', 'text-micro')).toBe('text-micro')
    expect(cn('text-micro', 'text-sm')).toBe('text-sm')
  })

  it('still lets a later colour win over an earlier colour', () => {
    expect(cn('text-text', 'text-white')).toBe('text-white')
  })
})
