/**
 * Phase 28 — shared lead-display helpers (P-5 name formatting, P-8 locality,
 * P-10 match snippet). Pure functions; no jsdom.
 */
import { describe, it, expect } from 'vitest'
import {
  formatLeadName,
  leadLocality,
  regionLocalityLabel,
  matchSnippet,
  highlightParts,
  sourceLabel,
} from '@/lib/leadDisplay'

describe('formatLeadName (P-5)', () => {
  it('strips a trailing locality off a descriptive headline', () => {
    expect(formatLeadName('110ha Pivot-Irrigated Dairy Farm, Rotherham')).toBe(
      '110ha Pivot-Irrigated Dairy Farm',
    )
  })
  it('keeps a short business name with a comma intact', () => {
    expect(formatLeadName('Smith Farms, Ltd')).toBe('Smith Farms, Ltd')
  })
  it('falls back for empty', () => {
    expect(formatLeadName(null)).toBe('(unnamed)')
    expect(formatLeadName('   ')).toBe('(unnamed)')
  })
  it('caps very long titles with an ellipsis', () => {
    const long = 'A'.repeat(60)
    expect(formatLeadName(long)).toHaveLength(48)
    expect(formatLeadName(long).endsWith('…')).toBe(true)
  })
})

describe('leadLocality (P-8)', () => {
  it('prefers an explicit structured locality', () => {
    expect(leadLocality({ locality: 'Tirohanga', display_name: 'X Farm, Elsewhere' })).toBe(
      'Tirohanga',
    )
  })
  it('falls back to the trailing tail of a headline name', () => {
    expect(leadLocality({ display_name: '110ha Pivot-Irrigated Dairy Farm, Rotherham' })).toBe(
      'Rotherham',
    )
  })
  it('returns null when there is no locality signal', () => {
    expect(leadLocality({ display_name: 'Smith Farms Ltd' })).toBeNull()
  })
})

describe('regionLocalityLabel (P-8)', () => {
  it('joins region and locality', () => {
    expect(regionLocalityLabel({ region: 'Waikato', locality: 'Tirohanga' })).toBe(
      'Waikato · Tirohanga',
    )
  })
  it('shows region alone when no locality', () => {
    expect(regionLocalityLabel({ region: 'Waikato' })).toBe('Waikato')
  })
  it('does not duplicate when region equals locality', () => {
    expect(regionLocalityLabel({ region: 'Waikato', locality: 'waikato' })).toBe('Waikato')
  })
  it('falls back to blank when no region/locality (a dash reads as a failed load)', () => {
    expect(regionLocalityLabel({})).toBe('')
  })
})

describe('matchSnippet (P-10)', () => {
  it('returns a window around the matched term', () => {
    const text = 'Sharemilker wanted near the small settlement of Tirohanga, good herd.'
    const snip = matchSnippet(text, 'tirohanga')
    expect(snip).toContain('Tirohanga')
    expect(snip!.startsWith('…')).toBe(true)
  })
  it('returns null when term absent', () => {
    expect(matchSnippet('Waikato dairy role', 'tirohanga')).toBeNull()
  })
  it('returns null for trivial term or empty text', () => {
    expect(matchSnippet('anything', 'a')).toBeNull()
    expect(matchSnippet(null, 'tirohanga')).toBeNull()
  })
  it('T-4: snaps to whole-word boundaries — never cuts mid-word', () => {
    const text = 'We need an experienced sharemilker for a 450-cow farm located near Rotherham this season'
    const snip = matchSnippet(text, 'farm', 12)!
    // The matched term survives intact, and no partial word sits against an ellipsis.
    expect(snip).toContain('farm')
    // every token in the window is a whole word from the source text — the
    // robust guarantee that nothing was cut mid-word.
    const sourceTokens = text.toLowerCase().split(/\s+/)
    for (const piece of snip.replace(/…/g, ' ').trim().split(/\s+/)) {
      expect(sourceTokens).toContain(piece.toLowerCase().replace(/[.,]/g, ''))
    }
  })
  it('T-4: keeps the matched term whole even when the radius lands inside it', () => {
    const snip = matchSnippet('alpha sharemilker omega', 'sharemilker', 2)!
    expect(snip).toContain('sharemilker')
  })
})

describe('highlightParts (T-4 bold)', () => {
  it('splits around a case-insensitive match and flags it', () => {
    expect(highlightParts('a Farm here', 'farm')).toEqual([
      { text: 'a ', match: false },
      { text: 'Farm', match: true },
      { text: ' here', match: false },
    ])
  })
  it('flags every occurrence', () => {
    const parts = highlightParts('farm farm', 'farm')
    expect(parts.filter((p) => p.match)).toHaveLength(2)
  })
  it('returns one inert segment when the term is absent or trivial', () => {
    expect(highlightParts('no match here', 'xyz')).toEqual([{ text: 'no match here', match: false }])
    expect(highlightParts('a', 'a')).toEqual([{ text: 'a', match: false }])
  })
})

describe('sourceLabel', () => {
  it('maps known sources and passes through unknown', () => {
    expect(sourceLabel('fb_manual_capture')).toBe('FB (manual capture)')
    expect(sourceLabel('mystery')).toBe('mystery')
  })
})
