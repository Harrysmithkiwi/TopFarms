# Stripe test harness

How to exercise the whole money path without moving real money. **Live keys are deliberately
deferred to Phase 7** (`docs/UPLIFT-ROADMAP-2026-07-30.md`) — every revenue fix in Phases 1–6 is
built and proved here first, so the first real transaction runs against audited code.

Endpoint: `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook`
Handler: `supabase/functions/stripe-webhook/index.ts` — signature verified at `:41-47`, two events
handled (`payment_intent.succeeded` `:62`, `invoice.payment_succeeded` `:142`).

---

## Two traps that will cost you an hour each

**1. `stripe listen` mints its own signing secret.** It is *different* from the endpoint secret in
the Stripe dashboard. Whichever is in play must be the value of the `STRIPE_WEBHOOK_SECRET` Edge
secret, or `constructEventAsync` throws and you get a 400 that looks exactly like a code bug.

```bash
stripe listen --print-secret        # whsec_... for the CLI session
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref inlagtgpynemhipnqvty
```

**2. Every id written here is a test-mode id.** `listing_fees.stripe_payment_id` and
`placement_fees.stripe_invoice_id` rows created during this programme point at test-mode objects
that do not exist in live mode. **Phase 7 step 2 purges them** so production never holds a mix.
Do not skip that step.

---

## The loop

```bash
# 1. Forward live-fired test events to the deployed function
stripe listen --forward-to https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook

# 2. In a second shell — fire the two events the handler actually implements
stripe trigger payment_intent.succeeded      # -> listing_fees row + job status 'active'
stripe trigger invoice.payment_succeeded     # -> placement fee paid (Phase 2 adds paid_at)

# 3. Failure paths — these must NOT 500
stripe trigger payment_intent.payment_failed
stripe trigger customer.created              # unhandled event type -> 200, no write
```

Verify each with a read-only SELECT, never the CLI's output alone:

```sql
select id, job_id, amount_nzd, stripe_payment_id, created_at from listing_fees order by created_at desc limit 5;
select id, application_id, amount_nzd, acknowledged_at, stripe_invoice_id from placement_fees order by created_at desc limit 5;
select id, status, listing_tier, expires_at from jobs order by updated_at desc limit 5;
```

## Full checkout, through the real UI

Test cards (any future expiry, any CVC, any postcode):

| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0025 0000 3155` | requires 3DS authentication |
| `4000 0000 0000 9995` | insufficient funds |

Walk: post a job → tier selection → payment step → confirm the webhook fires → job goes `active`.
The free-listing path (first listing) skips Stripe entirely — `create-payment-intent/index.ts:78-117`
writes `amount_nzd: 0` and activates directly. Both paths need testing.

## Idempotency

Replay a delivered event from the Stripe dashboard (Developers → Events → Resend) or re-run the same
`stripe trigger`. The handler dedupes on natural keys — `listing_fees.stripe_payment_id` (`:76-97`)
and `placement_fees.stripe_invoice_id` (`:157-186`). **A replay must not create a second row.** Assert
that with a `count(*)` before and after, not by eyeballing.

## Hitting the endpoint directly (no Stripe CLI)

Stripe signs as `t=<unix>,v1=<hex hmac-sha256 of "<t>.<body>" with the whsec>`.

```bash
SECRET='whsec_...'                       # must match STRIPE_WEBHOOK_SECRET
BODY='{"id":"evt_test","object":"event","type":"customer.created","data":{"object":{}}}'
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.*= //')

curl -i -X POST https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=$T,v1=$SIG" \
  --data "$BODY"
```

Expect **200** for that unhandled type. Then corrupt one character of `$SIG` and re-send — expect
**400** (`Webhook signature verification failed`). If a bad signature ever returns 200, stop: the
handler's auth has been broken, and this endpoint is `verify_jwt = false` (`supabase/config.toml:51`)
so the signature is the *only* thing standing in front of it.

## What this harness cannot prove

Left for **Phase 7** and nothing else: that live keys are configured, that the live webhook endpoint
is registered in the Stripe dashboard, and that a real card settles. Everything else — flow,
signature, idempotency, DB effects, failure handling — is provable here.

## Automated coverage

`tests/stripe-webhook.test.ts` is a static-source guard (the handler is Deno and cannot be imported
into vitest — same idiom as `tests/webhook-secret-presence.test.ts`). It asserts the security
properties hold; it does **not** replace running the loop above before a release.
