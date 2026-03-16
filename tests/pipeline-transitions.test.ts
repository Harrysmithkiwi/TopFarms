import { describe, it, expect } from 'vitest'

// This file tests the VALID_TRANSITIONS state machine logic.
// Unlike other stubs, some tests here should be immediately implementable
// once Plan 01 creates the domain types.

describe('Pipeline Transitions (APPL-05)', () => {
  describe('VALID_TRANSITIONS state machine', () => {
    it.todo('applied can transition to review or declined')
    it.todo('review can transition to interview, shortlisted, or declined')
    it.todo('interview can transition to shortlisted or declined')
    it.todo('shortlisted can transition to offered or declined')
    it.todo('offered can transition to hired or declined')
    it.todo('hired is a terminal state (no valid transitions)')
    it.todo('declined is a terminal state (no valid transitions)')
    it.todo('withdrawn is a terminal state (no valid transitions)')
  })

  describe('Transition enforcement', () => {
    it.todo('rejects invalid transition (e.g., applied -> hired)')
    it.todo('employer can only transition forward, not backward')
    it.todo('seeker can only withdraw (not transition through pipeline)')
  })
})
