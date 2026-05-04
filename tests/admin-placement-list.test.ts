import { describe, it } from 'vitest'

describe('admin placement pipeline (ADMIN-VIEW-PLAC)', () => {
  it.todo('ADMIN-VIEW-PLAC: returns rows where acknowledged_at IS NOT NULL AND confirmed_at IS NULL')
  it.todo('ADMIN-VIEW-PLAC: rows older than 14 days flagged is_overdue=true')
  it.todo('ADMIN-VIEW-PLAC: each row includes stripe_customer_id + stripe_invoice_id for click-through')
})
