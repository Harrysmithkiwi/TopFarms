# Decisions Pending

Things that need a deliberate action at a specific future trigger point. Not bugs (those go in REQUIREMENTS.md / Phase 18). Not quirks (KNOWN_QUIRKS.md). These are operational/configuration changes that must happen before a named event — typically pre-launch, pre-first-real-charge, pre-customer-onboard.

Each entry has a clear trigger and a checklist of actions. Cross off as complete; leave the date for traceability.

---

## Before first real employer pays

### PEND-01: Stripe production-mode swap (sk_test → sk_live)

- **Logged:** 2026-05-04
- **Trigger:** before the first real employer attempts to pay a placement fee or post a paid listing
- **Why pending:** development has been in Stripe sandbox/test mode throughout. All charges, invoices, and webhook events to date are test-mode artefacts. Switching to live involves credential rotation across three surfaces + webhook registration + smoke verification.
- **Owner:** harry

**Current state (2026-05-04):**
- Supabase secret `STRIPE_SECRET_KEY`: `sk_test_*` (dev-context inference — prefix not visible in dashboard digest view)
- Supabase secret `STRIPE_WEBHOOK_SECRET`: test-mode (sandbox) webhook signing secret
- Vercel env `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_*` (presumed)
- Stripe webhook posture: **no live-mode webhook endpoint registered as of 2026-05-04** — sandbox webhook ("TopFarms Webhook") is active at `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook` with 6 events subscribed; live-mode dashboard has no equivalent endpoint yet.
- `.env.example` documents Stripe vars: yes (added 2026-05-04 in same commit as this file)

**Pre-launch checklist:**

1. [ ] Rotate `STRIPE_SECRET_KEY` in Supabase secrets to `sk_live_*` (Project Settings → Edge Functions → Secrets → edit)
2. [ ] Register webhook endpoint at `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook` in Stripe **live-mode** dashboard (Developers → Webhooks → Add endpoint). Sandbox webhook stays as-is for ongoing dev/test.
3. [ ] Subscribe live-mode webhook to the same 6 events the sandbox webhook listens to (cross-check current sandbox subscription against `stripe-webhook/index.ts` event handlers — if any handler exists for an event the sandbox webhook isn't subscribed to, fix the sandbox subscription too).
4. [ ] Copy live-mode webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` in Supabase secrets, replacing the sandbox secret.
5. [ ] Rotate `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel env to `pk_live_*` (Settings → Environment Variables).
6. [ ] Trigger a Vercel redeploy so the new publishable key takes effect (env var changes don't auto-rebuild).
7. [ ] Smoke test: $0.50 PaymentIntent live → webhook fires → `placement_fees` row updated → immediate refund. Confirm both directions in Stripe live dashboard.
8. [ ] Confirm idempotency: re-deliver the same webhook event from Stripe's "Resend" tooling; verify no duplicate `placement_fees` row created.
9. [ ] Document the swap in commit/changelog so future-readers know when test→live transition happened.

**Smoke evidence to capture:**
- Stripe Dashboard live-mode transactions list showing the $0.50 charge + refund
- `net._http_response` row showing webhook fired with status_code 200
- `placement_fees` row state diff (before charge → after charge → after refund)

**Hard fail signals:**
- Webhook returns non-2xx after key swap → `STRIPE_WEBHOOK_SECRET` mismatch; verify live-mode secret was used (sandbox secret won't validate live-mode signatures)
- PaymentIntent fails to create → `STRIPE_SECRET_KEY` is wrong mode (test secret used in live API, or vice versa)
- Frontend Stripe Elements show test-mode banner after deploy → publishable key not yet `pk_live_*` OR Vercel deploy didn't pick up new env

**Phase 18 cross-reference:** entry 13 ("Stripe production-mode posture verified before first real placement charge") — this PEND-01 is the operational checklist that closes that Phase 18 item.

**Phase 21 cross-reference:** plan 21-09 Task 2 (`.planning/phases/21-v20-close-post-launch-ops/21-09-track-a-milestone-close-PLAN.md`) — Phase 21 attempted to absorb PEND-01 into the v2.0 milestone-close batch, but operator deferred 2026-05-18:

> "defer: Stripe live-mode swap requires dedicated focus and a real test charge. Not doing it mid-session. Continue with Tasks 3-4-5 (visual smoke tests + Track B UAT) now. PEND-01 will be completed in a separate session before first real employer pays."

Phase 21 plan 21-09 Tasks 1, 3, 4, 5 are COMPLETE and verified (Edge fn deploys + 5/5 visual smokes + 5/5 Track B UATs + atomic docs commit). The Phase 21 closure record at `.planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md` is set to status `resolved_pending_pend_01` — all Phase-21-scoped work shipped, but `/gsd:complete-milestone v2.0` (Task 6) is BLOCKED on PEND-01.

**STATUS 2026-05-18:** OPEN — DEFERRED from Phase 21 closure to a separate operator-driven session. None of the 9 checklist items above have been [x]'d yet; this section remains the authoritative script. The 4 §"Smoke evidence to capture" artefacts will be saved into `.planning/phases/21-v20-close-post-launch-ops/21-09-EVIDENCE/stripe-live-mode/` when PEND-01 finally runs. When complete, follow the 6-step playbook in `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` § "SC-2 status update" to flip 18.1 SC-2 PASS and unblock `/gsd:complete-milestone v2.0`.

---

*Last updated: 2026-05-18 — Phase 21 plan 21-09 Task 5 deferral note added; PEND-01 carryforward to separate session confirmed.*
