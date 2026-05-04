import { describe, it } from 'vitest'

describe('admin jobs list (ADMIN-VIEW-JOBS)', () => {
  it.todo('ADMIN-VIEW-JOBS: returns rows with shape {id, title, status, employer_id, employer_name, applicant_count, days_live, last_applicant_at}')
  it.todo('ADMIN-VIEW-JOBS: search param filters by job title OR employer name')
  it.todo('ADMIN-VIEW-JOBS: applicant_count reflects applications.count for that job')
})
