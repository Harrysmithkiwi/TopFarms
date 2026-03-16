import { describe, it } from 'vitest'

describe('MatchBreakdown UI', () => {
  describe('MTCH-06: AI explanation section', () => {
    it.todo('renders "Why this match" section when explanation is present')
    it.todo('hides explanation section when explanation is null')
    it.todo('hides explanation section when explanation is undefined')
    it.todo('explanation text uses correct typography (14px, leading-relaxed)')
    it.todo('"Why this match" label uses correct typography (11px, uppercase)')
    it.todo('explanation section has border-t border-fog separator')
  })

  describe('Existing dimension rows', () => {
    it.todo('renders all 7 dimension rows with correct labels')
    it.todo('renders MatchCircle with total score')
    it.todo('blurred overlay hides content for visitors')
  })
})
