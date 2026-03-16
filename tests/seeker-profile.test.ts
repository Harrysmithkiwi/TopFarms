import { describe, it } from 'vitest'

describe('Seeker Profile (SONB-07)', () => {
  describe('Profile CRUD', () => {
    it.todo('creates seeker profile on first onboarding step completion')
    it.todo('updates existing profile on subsequent step completions')
    it.todo('loads saved profile data on return visit')
  })

  describe('Profile data integrity', () => {
    it.todo('shed_types_experienced stores valid ShedType values')
    it.todo('herd_sizes_worked stores valid HerdSizeBucket values')
    it.todo('dairynz_level stores valid DairyNZLevel value')
    it.todo('visa_status stores valid VisaStatus value')
  })

  describe('Skills persistence', () => {
    it.todo('saves seeker skills with proficiency levels')
    it.todo('delete+insert pattern replaces all skills atomically')
    it.todo('proficiency uses basic/intermediate/advanced values')
  })
})
