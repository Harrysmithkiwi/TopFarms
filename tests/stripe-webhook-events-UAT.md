# Stripe Webhook Events — Pre-Launch Operator UAT (Phase 18.1 #2)

**Owner:** Operator (Harry)
**Pre-condition:** Phase 18.1 Wave 1+2 complete; live Stripe account configured.
**Purpose:** Confirm production Stripe posture before first real placement charge.

## Required dashboard event registrations

The deployed `stripe-webhook` Edge function handles two event types (audited via
`grep -n 'event\.type' supabase/functions/stripe-webhook/index.ts`):

| Event type | Edge fn line | Effect |
|------------|--------------|--------|
| `payment_intent.succeeded` | index.ts:48 | Creates `listing_fees` row + activates job |
| `invoice.payment_succeeded` | index.ts:128 | Idempotency check on placement fee invoice |

## Required production secrets

| Secret | Format | Source |
|--------|--------|--------|
| `STRIPE_SECRET_KEY` | starts `sk_live_` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | starts `whsec_` (live mode) | Stripe Dashboard → Developers → Webhooks → endpoint signing secret |

## Operator checks (capture evidence in plan SUMMARY)

- [ ] **Check 1: Live secret key.**
      `supabase secrets list --project-ref inlagtgpynemhipnqvty`
      Confirm `STRIPE_SECRET_KEY` is present. Visual-spot-check value starts with `sk_live_` (paste redacted prefix into SUMMARY: `sk_live_xxxx…`).

- [ ] **Check 2: Live webhook signing secret.**
      Same `secrets list` output. Confirm `STRIPE_WEBHOOK_SECRET` is present and live-mode (signing secrets pulled from Stripe live dashboard endpoint, not test).

- [ ] **Check 3: Live webhook endpoint registered.**
      Stripe Dashboard (live mode toggle ON) → Developers → Webhooks. Confirm endpoint
      `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook`
      is listed and ENABLED.

- [ ] **Check 4: Endpoint subscribed to BOTH event types.**
      Same endpoint detail page → "Events to send" section. Confirm both
      `payment_intent.succeeded` and `invoice.payment_succeeded` are listed.
      Capture screenshot or copy the exhaustive event list into SUMMARY.

- [ ] **Check 5: API version pin matches code.**
      Stripe library pin in `stripe-webhook/index.ts:27` is `apiVersion: '2024-06-20'`.
      Confirm endpoint's "API version" matches (or is compatible — Stripe's webhook
      delivery is API-version-agnostic, but a wide gap is a flag for review).

- [ ] **Check 6: `.env.example` documents Stripe vars.**
      Read `.env.example` lines 11-14. Confirm `STRIPE_SECRET_KEY` and
      `STRIPE_WEBHOOK_SECRET` are documented (already verified 2026-05-07: lines
      11-14 mention both). If missing, refresh the comment.

## Acceptance

All 6 checks ✓. Each check captures concrete evidence:
- Check 1, 2, 6: CLI/diff paste.
- Check 3, 4, 5: dashboard screenshot or transcribed event list.

If ANY check fails: pause Phase 18.1 closure, log the gap, fix before plan SUMMARY closes.
