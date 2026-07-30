// Stripe webhook security + idempotency guards — Phase 0 Task 0.4.
//
// Before this file the webhook had NO automated coverage at all — only a manual script
// (tests/stripe-webhook-events-UAT.md). It is the single most security-sensitive endpoint
// in the product: supabase/config.toml:51 sets verify_jwt = false (Stripe sends no
// Authorization header, only stripe-signature), so the signature check inside the handler
// is the ONLY thing standing in front of a service-role client that writes revenue rows.
//
// The handler is Deno (Deno.serve, npm: imports) and cannot be imported into vitest, so
// this is a static-source guard — the established idiom here, per
// tests/webhook-secret-presence.test.ts. It asserts the security properties survive a
// refactor. It does NOT replace running docs/STRIPE-TEST-HARNESS.md before a release.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const source = readFileSync(resolve(ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8')
const config = readFileSync(resolve(ROOT, 'supabase/config.toml'), 'utf8')

describe('signature verification is the auth boundary', () => {
  it('is deployed verify_jwt = false, so the signature is all there is', () => {
    const section = config.split('[functions.stripe-webhook]')[1]?.split('[')[0] ?? ''
    expect(section).toMatch(/verify_jwt\s*=\s*false/)
  })

  it('rejects a request with no stripe-signature header', () => {
    expect(source).toMatch(/stripe-signature/)
    expect(source).toMatch(/status:\s*400/)
  })

  it('verifies via constructEventAsync with the secret and a crypto provider', () => {
    // The async form + SubtleCrypto provider is required under Deno; the sync
    // constructEvent silently fails there.
    expect(source).toMatch(/constructEventAsync\(/)
    expect(source).toMatch(/createSubtleCryptoProvider\(\)/)
    expect(source).toMatch(/Deno\.env\.get\(\s*['"]STRIPE_WEBHOOK_SECRET['"]\s*\)/)
  })

  it('fails closed when Stripe env vars are missing', () => {
    expect(source).toMatch(/if\s*\(\s*!stripeSecretKey\s*\|\|\s*!webhookSecret\s*\)/)
  })

  it('verifies the signature BEFORE creating the service-role client', () => {
    // Ordering matters: the service-role client bypasses RLS entirely. If it were
    // constructed before verification, a malformed request would already have a
    // privileged handle in scope.
    const verifyAt = source.indexOf('constructEventAsync')
    const serviceRoleAt = source.indexOf('SUPABASE_SERVICE_ROLE_KEY')
    expect(verifyAt).toBeGreaterThan(0)
    expect(serviceRoleAt).toBeGreaterThan(verifyAt)
  })

  it('returns 400 — never 200 — on a verification failure', () => {
    const block = source.split('catch (err)')[1]?.slice(0, 400) ?? ''
    expect(block).toMatch(/signature verification failed/i)
    expect(block).toMatch(/status:\s*400/)
  })
})

describe('idempotency — a replayed event must not double-write', () => {
  it('dedupes listing fees on the natural key stripe_payment_id', () => {
    expect(source).toMatch(/\.eq\(\s*'stripe_payment_id'/)
    expect(source).toMatch(/if\s*\(existingFee\)/)
  })

  it('dedupes placement fees on the natural key stripe_invoice_id', () => {
    expect(source).toMatch(/stripe_invoice_id/)
  })

  it('checks for the existing row before inserting', () => {
    const checkAt = source.indexOf("eq('stripe_payment_id'")
    const insertAt = source.indexOf("from('listing_fees')\n      .insert")
    if (insertAt > 0) expect(checkAt).toBeLessThan(insertAt)
    else expect(checkAt).toBeGreaterThan(0)
  })
})

describe('event handling', () => {
  it('handles the two events the revenue model depends on', () => {
    expect(source).toMatch(/event\.type === 'payment_intent\.succeeded'/)
    expect(source).toMatch(/event\.type === 'invoice\.payment_succeeded'/)
  })

  it('does not retry-loop on unprocessable metadata', () => {
    // Missing metadata is permanent, not transient: returning non-2xx would make Stripe
    // retry the same doomed event for days.
    const block = source.split('Missing metadata')[1]?.slice(0, 300) ?? ''
    expect(block).toMatch(/status:\s*200/)
  })
})

describe('the harness runbook exists and states the traps', () => {
  const doc = readFileSync(resolve(ROOT, 'docs/STRIPE-TEST-HARNESS.md'), 'utf8')

  it('warns that stripe listen mints its own signing secret', () => {
    expect(doc).toMatch(/stripe listen/)
    expect(doc).toMatch(/own signing secret|--print-secret/)
  })

  it('warns that test-mode ids must be purged before go-live', () => {
    expect(doc).toMatch(/test-mode id/i)
    expect(doc).toMatch(/purge/i)
  })

  it('documents the direct-curl signature recipe for use without the CLI', () => {
    expect(doc).toMatch(/openssl dgst -sha256 -hmac/)
  })
})
