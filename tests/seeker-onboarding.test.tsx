import { describe, it } from 'vitest'

describe('Seeker Onboarding', () => {
  describe('SONB-01: Wizard navigation', () => {
    it.todo('renders 7-step wizard with StepIndicator')
    it.todo('advances to next step on valid submission')
    it.todo('goes back to previous step on Back click')
    it.todo('resumes from saved onboarding_step on return visit')
  })

  describe('SONB-02: Farm type step', () => {
    it.todo('allows multi-select of farm types (dairy, sheep_beef)')
    it.todo('disables Continue when no selection made')
  })

  describe('SONB-03: Experience step', () => {
    it.todo('captures years_experience as number input')
    it.todo('captures shed_types_experienced as multi-select')
    it.todo('captures herd_sizes_worked as multi-select')
  })

  describe('SONB-04: Qualifications step', () => {
    it.todo('renders DairyNZ level dropdown with 5 options')
  })

  describe('SONB-05: Skills step', () => {
    it.todo('renders SkillsPicker in proficiency mode')
    it.todo('saves skills with delete+insert pattern')
  })

  describe('SONB-06: Life situation step', () => {
    it.todo('captures couples_seeking toggle')
    it.todo('captures accommodation_needed toggle with sub-options')
    it.todo('captures region preference')
  })

  describe('SONB-07: Visa step', () => {
    it.todo('renders visa status dropdown with 5 options')
  })

  describe('SONB-08: Completion', () => {
    it.todo('sets onboarding_complete to true on final step')
    it.todo('redirects to /jobs with pre-set filters after completion')
    it.todo('shows success toast on completion')
  })
})
