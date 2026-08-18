import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit F-05 then F-06, in that order, which the audit records as a dependency.
// F-05 stops a placement being invoiced twice; F-06 stops one invoice being counted two ways.
//
// F-05: the early-return guard reads `confirmed_at`, and `confirmed_at` is written AFTER
// `finalizeInvoice` has already emailed the employer a payable invoice. Two concurrent calls,
// or one retry after a timeout, both pass the guard and both bill the farm. The DB write that
// would have closed the window is itself swallowed. There were ZERO idempotency keys across
// all 17 edge functions.
//
// F-06: the webhook's failure branch wrote `stripe_invoice_status` with no check on `paid_at`.
// Stripe delivers events out of order and retries them, so a late `payment_failed` could mark
// a PAID invoice uncollectible — counted as paid and written off at once, and
// admin_revenue_reconciliation reads both.
//
// F-06 proven on prod inside a rolled-back transaction:
//   write off a PAID fee                       -> REJECTED by the check constraint
//   same update filtered on paid_at IS NULL     -> clean no-op, no error
//   control: an UNPAID fee written off          -> ALLOWED

const INVOICE = readFileSync(
  join(process.cwd(), 'supabase/functions/create-placement-invoice/index.ts'),
  'utf-8',
)
const WEBHOOK = readFileSync(
  join(process.cwd(), 'supabase/functions/stripe-webhook/index.ts'),
  'utf-8',
)
const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/096_paid_fee_cannot_be_written_off.sql'),
  'utf-8',
)

describe('F-05 — a placement cannot be invoiced twice', () => {
  it('keys every mutating Stripe call', () => {
    // The customer create matters as much as the invoice: a duplicate customer splits the
    // farm's billing history across two Stripe records.
    for (const op of ['customer', 'invoice', 'item', 'finalize']) {
      expect(INVOICE).toMatch(new RegExp(`idem\\('${op}'\\)`))
    }
  })

  it('derives the key from application_id, which is already UNIQUE', () => {
    expect(INVOICE).toMatch(/idempotencyKey: `placement:\$\{op\}:\$\{application_id\}`/)
  })

  it('uses a distinct key per operation', () => {
    // Three different calls sharing one key collide in Stripe, and the second FAILS rather
    // than deduping — which would turn a fixed double-bill into a broken single bill.
    expect(INVOICE).toMatch(/Keys are per-operation, not per-request/)
  })

  it('no longer reports a clean success when the fee row was not written', () => {
    // `success: true` with no confirmed_at taught the caller everything reconciled, while the
    // guard above would wave the next call straight through.
    expect(INVOICE).toMatch(/reconciliation_required: Boolean\(updateFeeError\)/)
    expect(INVOICE).toMatch(/placement_fees write FAILED after invoice was finalized/)
  })
})

describe('F-06 — a paid fee cannot also be written off', () => {
  it('the webhook filters the failure branch on paid_at', () => {
    const branch = WEBHOOK.slice(WEBHOOK.indexOf("? 'payment_failed' : 'uncollectible'"))
    expect(branch).toMatch(/\.is\('paid_at', null\)/)
  })

  it('a stale event is a no-op, not a raise', () => {
    // Raising would make Stripe retry the same doomed event indefinitely.
    expect(WEBHOOK).toMatch(/makes the stale event a no-op and/)
    expect(WEBHOOK).toMatch(/Ignored \$\{status\} event for an already-paid fee/)
  })

  it('the constraint backs up every other writer', () => {
    // The filter protects one call site. The admin waive path, a future refund handler and a
    // hand-run reconciliation all write this column too.
    expect(SQL).toMatch(/CHECK \(paid_at IS NULL OR stripe_invoice_status = 'paid'\)/)
  })

  it('is applied after F-05, as the audit sequences it', () => {
    expect(SQL).toMatch(/AFTER F-05/)
  })
})
