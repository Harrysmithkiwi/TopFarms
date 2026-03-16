import { describe, it } from 'vitest'

describe('Applications', () => {
  describe('APPL-01: Apply to job', () => {
    it.todo('inserts application with status "applied" and optional cover_note')
    it.todo('prevents duplicate application to same job (23505 error handling)')
    it.todo('disables Apply button after successful submission')
  })

  describe('APPL-02: My Applications view', () => {
    it.todo('groups applications into active and completed sections')
    it.todo('shows ApplicationCard with status tag and job details')
    it.todo('links each card to job detail page')
  })

  describe('APPL-03: Withdraw application', () => {
    it.todo('updates application status to withdrawn')
    it.todo('moves card from active to completed section')
    it.todo('shows confirmation prompt before withdrawing')
  })

  describe('APPL-04: Application tracking', () => {
    it.todo('shows current status badge on each application')
    it.todo('shows match score on application cards')
  })

  describe('APPL-06: Employer applicant view', () => {
    it.todo('loads applicants for a specific job')
    it.todo('ranks applicants by match score descending')
    it.todo('expands panel to show seeker profile details')
    it.todo('shows cover note in expanded panel')
  })
})
