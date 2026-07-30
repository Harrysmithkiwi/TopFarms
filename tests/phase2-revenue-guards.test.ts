// Phase 2 — revenue enforcement guards.
//
// Static-source guards in the established idiom (stripe-webhook.test.ts,
// webhook-secret-presence.test.ts): the Edge Functions are Deno and cannot be
// imported into vitest, so these assert the enforcement properties survive a
// refactor. They do NOT replace the R1–R7 probes in docs/evidence/phase-2-revenue.md.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculatePlacementFee, PLACEMENT_FEE_TIERS } from '@/types/domain'

const ROOT = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8')

const pricing = read('supabase/functions/_shared/pricing.ts')
const ack = read('supabase/functions/acknowledge-placement-fee/index.ts')
const invoice = read('supabase/functions/create-placement-invoice/index.ts')
const intent = read('supabase/functions/create-payment-intent/index.ts')
const docUrl = read('supabase/functions/get-applicant-document-url/index.ts')
const mig068 = read('supabase/migrations/068_phase2_revenue_schema.sql')
const mig069 = read('supabase/migrations/069_phase2_cv_gate.sql')

// ─── Task 2.1 — no money value originates in the browser ─────────────────────

describe('pricing parity — client copy is display-only and must not drift', () => {
  it('server amounts match PLACEMENT_FEE_TIERS', () => {
    for (const [tier, info] of Object.entries(PLACEMENT_FEE_TIERS)) {
      expect(pricing).toMatch(new RegExp(`${tier}:\\s*${info.amount}`))
    }
  })

  it('server thresholds and keyword list match the client algorithm', () => {
    // The client behaviour is pinned by tests/placement-fee.test.ts; here we pin
    // that the server file carries the same constants.
    expect(pricing).toMatch(/>=\s*80000\s*\?\s*'senior'/)
    expect(pricing).toMatch(/>=\s*55000\s*\?\s*'experienced'/)
    expect(pricing).toMatch(/\['manager',\s*'head',\s*'senior',\s*'supervisor'\]/)
    // Sanity-run the client copy so a behavioural change is caught even if the
    // constants above are refactored.
    expect(calculatePlacementFee(80000, 100000, 'Farm Worker').amount).toBe(80000)
    expect(calculatePlacementFee(null, null, 'Farm Hand').amount).toBe(20000)
  })

  it('listing TIER_PRICES live in the shared module and create-payment-intent imports them', () => {
    expect(pricing).toMatch(/1:\s*10000/)
    expect(pricing).toMatch(/2:\s*15000/)
    expect(pricing).toMatch(/3:\s*20000/)
    expect(intent).toMatch(/import\s*{\s*TIER_PRICES\s*}\s*from\s*'\.\.\/_shared\/pricing\.ts'/)
    expect(intent).not.toMatch(/const TIER_PRICES/)
  })
})

describe('acknowledge-placement-fee derives the fee server-side', () => {
  it('derives from the job row and logs client mismatches', () => {
    expect(ack).toMatch(/derivePlacementFeeFromJob\(/)
    expect(ack).toMatch(/warnOnClientMismatch\(/)
  })

  it('inserts the derived values, never body values', () => {
    // fee_tier/amount_nzd are assigned from `derived`, and the body only feeds the
    // mismatch logger.
    expect(ack).toMatch(/fee_tier = derived\.tier/)
    expect(ack).toMatch(/amount_nzd = derived\.amount/)
    expect(ack).not.toMatch(/fee_tier = body\.fee_tier/)
    expect(ack).not.toMatch(/amount_nzd = body\.amount_nzd/)
  })
})

describe('create-placement-invoice derives fee and context server-side', () => {
  it('uses the acknowledged snapshot as the contract price', () => {
    // Prevents: shortlist at $800 → edit salary down → hire at $400.
    expect(invoice).toMatch(/existingFee\?\.acknowledged_at && existingFee\.fee_tier/)
  })

  it('applies only the admin-set discount, clamped to [0, 100]', () => {
    expect(invoice).toMatch(/Math\.min\(100,\s*Math\.max\(0,\s*Number\(existingFee\?\.discount_pct/)
    expect(invoice).not.toMatch(/body\.discount/)
  })

  it('derives employer email from auth, not the body', () => {
    expect(invoice).toMatch(/auth\.admin\.getUserById\(callerUserId\)/)
    expect(invoice).not.toMatch(/body\.employer_email/)
  })

  it('upserts on application_id so a hire without a shortlist still bills', () => {
    expect(invoice).toMatch(/onConflict: 'application_id'/)
  })
})

// ─── Task 2.2 — entitlement ledger, not a count ──────────────────────────────

describe('free listing is an entitlement, not a count', () => {
  it('create-payment-intent no longer counts listing_fees', () => {
    expect(intent).not.toMatch(/count:\s*'exact'/)
    expect(intent).toMatch(/from\('employer_entitlements'\)/)
  })

  it('treats a duplicate consumption as the paid path (23505)', () => {
    expect(intent).toMatch(/23505/)
  })

  it('gives the entitlement back if the free listing was not delivered', () => {
    expect(intent).toMatch(/from\('employer_entitlements'\)\s*\n?\s*\.delete\(\)/)
  })

  it('migration: PK (employer_id, kind) is the enforcement; job_id is SET NULL provenance', () => {
    expect(mig068).toMatch(/PRIMARY KEY \(employer_id, kind\)/)
    expect(mig068).toMatch(/job_id\s+uuid REFERENCES public\.jobs\(id\) ON DELETE SET NULL/)
    expect(mig068).toMatch(/CHECK \(kind IN \('free_listing'\)\)/)
  })

  it('migration: listing_fees gains UNIQUE (job_id) for free-path idempotency', () => {
    expect(mig068).toMatch(/listing_fees_job_id_key UNIQUE \(job_id\)/)
  })

  it('migration: backfills consumed entitlements from surviving $0 rows', () => {
    expect(mig068).toMatch(/INSERT INTO public\.employer_entitlements/)
    expect(mig068).toMatch(/WHERE amount_nzd = 0/)
  })
})

// ─── Task 2.3 — the contact gate (Option C) ──────────────────────────────────

describe('CV releases only on placement', () => {
  it('Edge Function: cv mint requires an acknowledged placement fee', () => {
    const gate = docUrl.split("document_type === 'cv'")[1]?.slice(0, 600) ?? ''
    expect(gate).toMatch(/placement_fees/)
    expect(gate).toMatch(/acknowledged_at/)
    expect(gate).toMatch(/403/)
  })

  it('RLS policy: cv gated via SECURITY DEFINER helper; certificate/reference stay open', () => {
    expect(mig069).toMatch(/employer_has_placement_access/)
    expect(mig069).toMatch(/SECURITY DEFINER/)
    expect(mig069).toMatch(/document_type IN \('certificate', 'reference'\)/)
    expect(mig069).toMatch(/document_type = 'cv'\s*\n\s*AND public\.employer_has_placement_access/)
  })

  it('get_applicants_for_job no longer returns email as display_name (P0-5)', () => {
    expect(mig069).not.toMatch(/COALESCE\(sc\.email, u\.email, LEFT/)
    // email is a separate column, gated on the acknowledged-fee predicate
    expect(mig069).toMatch(/pf\.acknowledged_at IS NOT NULL/)
  })
})

// ─── Task 2.4 — collectibility ───────────────────────────────────────────────

describe('the business is collectible', () => {
  it('migration: placements split the event from the money', () => {
    expect(mig068).toMatch(/CREATE TABLE public\.placements/)
    expect(mig068).toMatch(/application_id\s+uuid NOT NULL UNIQUE REFERENCES public\.applications\(id\) ON DELETE CASCADE/)
    expect(mig068).toMatch(/seeker_confirmed_at/)
  })

  it('migration: placement_fees gains paid_at / status / discount / waiver / placement_id', () => {
    for (const col of ['paid_at', 'stripe_invoice_status', 'discount_pct', 'waived_reason', 'placement_id']) {
      expect(mig068).toContain(`ADD COLUMN ${col}`)
    }
  })

  it('followup emails are wired: a cron job posts to send-followup-emails', () => {
    const mig071 = read('supabase/migrations/071_phase2_followup_cron.sql')
    expect(mig071).toMatch(/cron\.schedule\(/)
    expect(mig071).toMatch(/send-followup-emails/)
    expect(mig071).toMatch(/X-Webhook-Secret/)
  })

  it('reconciliation RPC exists and is admin-gated', () => {
    const mig070 = read('supabase/migrations/070_phase2_revenue_reconciliation.sql')
    expect(mig070).toMatch(/admin_revenue_reconciliation/)
    expect(mig070).toMatch(/_admin_gate\(\)/)
    expect(mig070).toMatch(/overdue_cents/)
  })

  it('the invoice line names the hire context, not a bare fee', () => {
    expect(invoice).toMatch(/you hired/)
    expect(invoice).toMatch(/from post to hire/)
  })
})
