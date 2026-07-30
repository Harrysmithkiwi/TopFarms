# Phase 2 · Task 2.5 — revenue enforcement evidence

Live probes against production (`inlagtgpynemhipnqvty`), Stripe in **TEST mode**
(`acct_1SyPEbRpIiAQpOa7`, "New business sandbox"). Every claim below is a recorded
request/response pair or a DB read-back, not an assertion.

**Status: COMPLETE.** R1–R7 all green. Two real defects found by probing that code review had
missed (both fixed and re-proved). Production restored to baseline and verified by read-back.

**Headline:** an employer can no longer set their own price. `amount_nzd: 0` on a senior job
now writes **80000**, and the free listing survives the delete-and-retry exploit that
previously reset it.

---

## ✅ CLEANUP DONE — production is clean

| Table | After | Baseline | |
|---|---|---|---|
| auth.users | **6** | 6 | ✅ |
| jobs / applications | **0 / 0** | 0 / 0 | ✅ |
| listing_fees / placement_fees / placements | **0 / 0 / 0** | 0 / 0 / 0 | ✅ |
| employer_entitlements | **0** | 0 | ✅ |
| seeker_documents / storage objects | **3 / 3** | 3 / 3 | ✅ real users' docs, never touched |
| rows matching `feedface-%` | **0** | — | ✅ |

Stripe test-mode artefacts also removed: probe customer `cus_UyjvPOC4xfaeBw` deleted, orphan
draft invoice `in_1TymRwRpIiAQpOa7wMsSzDXd` deleted. **The paid invoice
`in_1TymUJRpIiAQpOa7YqDRIrOW` remains** — Stripe does not permit deleting a paid invoice. It is
a test-mode object; Phase 7 step 2's purge covers this class.

### Probe accounts (provenance only — all deleted)

| Handle | UUID | Role |
|---|---|---|
| phase2probe-seeker | `feedface-0000-4000-8000-000000000001` | seeker (victim: CV + contacts) |
| phase2probe-employer-a | `feedface-0000-4000-8000-000000000002` | employer (owns the job — legitimate caller) |
| phase2probe-admin | `feedface-0000-4000-8000-000000000009` | admin (reconciliation RPC over REST) |

Emails `phase2probe-*@example.com` (RFC 2606 reserved — cannot receive mail), seeded with
`email_confirmed_at` set so no confirmation mail was ever sent. Roles assigned by the
`handle_new_user` trigger from `raw_user_meta_data->>'role'`.

## Method

Same as Phase 1: probes run over the public REST/Functions API with real user JWTs from the
password grant — the path a hostile user would take, not a privileged DB session. A probe that
passes only because the MCP connection is privileged proves nothing. Every effect is confirmed
by a read-only DB query, never by the HTTP body alone.

Fixtures: a **senior** job (salary 90–110k + "Manager" in the title ⇒ senior tier, 80000
cents) so a tampered `amount_nzd: 0` has an unambiguous correct answer, plus a real CV and a
real certificate uploaded to storage by the seeker.

**R7 ran first, deliberately.** Having just added enforcement, over-restriction is the likelier
failure. Confirm the legitimate path is alive before admiring the refusals.

---

## R7 — the legitimate employer path (run FIRST)

| Probe | Result |
|---|---|
| R7.1 `create-payment-intent` on own job, tier 2 | ✅ **200** `{"is_free":true}` |
| R7.1 read-back | ✅ `employer_entitlements` row `(free_listing, job1)`; `listing_fees` tier 2 amount 0; job → `status active`, `listing_tier 2` |
| R7.2 `create-placement-invoice` on own application | ⚠️ **500** first attempt → see Defect 1 → ✅ **200** after fix, `in_1TymUJRpIiAQpOa7YqDRIrOW` |
| R7.2 read-back | ✅ `confirmed_at` set, `stripe_invoice_status: open`, `placement_id` linked, `placements.employer_confirmed_at` set |
| certificate mint pre-placement | ✅ **200** — signed URL issued (not over-restricted) |
| `get_applicants_for_job` | ✅ **200**, one row |

**No outage.** Every legitimate call works.

### Defect 1 — found by R7.2, not by review

```
Unexpected error in create-placement-invoice: Error: You cannot combine currencies on a
single invoice. This invoice has invoice items currency nzd that conflicts with the invoice
currency aud.
```

`stripe.invoices.create` was called with **no `currency`**, so the invoice inherited the Stripe
**account default** — AUD on this sandbox — while the line item was NZD. Every placement
invoice would have 500'd. Fixed by pinning `currency: 'nzd'` on the invoice
(`create-placement-invoice/index.ts`, commit `36de732`). This is exactly the class of bug the
"prove it in test mode" step exists to catch: `tsc -b`, `deno check` and the static guards were
all green.

## R4 — the $0 self-pricing hole (the reason this phase exists)

Request as the owning employer, tampering the money fields:

```
POST /functions/v1/acknowledge-placement-fee
{"application_id":"feedface-4444-…-0001","fee_tier":"entry","amount_nzd":0}
-> HTTP 200 {"success":true,"placement_fee_id":"731c132b-…"}
```

DB read-back — **the client's values were discarded**:

| Column | Posted | Written |
|---|---|---|
| `fee_tier` | `entry` | **`senior`** ✅ |
| `amount_nzd` | `0` | **`80000`** ✅ |

The 200 is correct here and is the point: the request is *legitimate* (the employer does own
this application), so it must succeed — it simply must succeed **at the server's price**. Phase 1
closed who may write; Phase 2 closes what they may write. Compare Phase 1's P3, where the same
shape of request wrote `amount_nzd = 0` and opened the PII gate for free.

## R5 — the contact gate (Option C), before/after causation pair

Same request, same document, same caller — only the acknowledged fee differs.

| Probe | Pre-placement | Post-placement |
|---|---|---|
| CV mint (`get-applicant-document-url`) | ✅ **403** `CV unlocks when you shortlist this candidate (placement fee applies)` | ✅ **200** signed URL |
| certificate mint | ✅ **200** | ✅ 200 |
| RLS row listing (`GET /seeker_documents`) | ✅ `[{"document_type":"certificate"}]` — **CV row invisible** | ✅ `cv` + `certificate` |

Both layers enforce it: the RLS policy hides the row (so the filename — typically
`First-Last-CV.pdf` — never reaches the client), and the Edge Function refuses the mint (it
holds service-role, so the policy alone would not stop it).

### Audit P0-5 — email no longer leaks as a display string

`get_applicants_for_job`, same caller, before and after the fee:

```
pre-ack:   {"display_name":"Phase2probe S.", "email":null}
post-ack:  {"display_name":"Phase2probe S.", "email":"phase2probe-seeker@example.com"}
```

Previously `display_name` was `COALESCE(sc.email, u.email, …)` — the paywalled email rendered
on every applicant card. **Carryforward:** `display_name` is derived from the email local-part
because **no name column exists anywhere in the schema** (the 057/058 drift finding). Collecting
a real first/last name at onboarding is a follow-up phase; the derivation is a stopgap, and for
an address like `admin@farmco.nz` it will read "Admin".

## R3 — free listing survives delete-and-retry (the entitlement ledger)

| Step | Result |
|---|---|
| `DELETE /jobs?id=eq.<job1>` | HTTP 204 |
| read-back | `listing_fees` free row **gone** (CASCADE — the exact drift the old `count()` trusted); `employer_entitlements` row **survives**, `job_id` now `null` |
| create job3, `create-payment-intent` tier 1 | ✅ `{"is_free":false, client_secret present}` — **charged** |

Before Phase 2 this sequence granted an unlimited supply of free listings. The `job_id: null`
is the design working as intended: provenance is `ON DELETE SET NULL`, so deleting the job
cannot erase the fact that the entitlement was consumed.

**Known limit, unchanged:** delete-account-and-resignup still bypasses this. Universal to free
tiers; the defence is at signup, not here.

## R1 / R2 — full paid loop and replay

| Probe | Result |
|---|---|
| R1 `create-payment-intent` tier 1 (entitlement already consumed) | ✅ `is_free:false`, PI `pi_3TymXTRpIiAQpOa70v7jNexp` |
| R1 confirm with `pm_card_visa` | ✅ `succeeded`, **10000 nzd** |
| R1 webhook effect | ✅ `listing_fees` tier 1 amount **10000**, `stripe_payment_id` + `paid_at` set; job → `active`, `listing_tier 1` |
| R2 resend `payment_intent.succeeded` | ✅ `listing_fees` for that job still **1** row |
| R2 resend `invoice.payment_succeeded` | ✅ `placement_fees` still **1** row, `paid_at` byte-identical |

## R6 — paid_at, and an aged-debtors list that answers

Invoice paid with a real test card (`tok_visa` attached to the customer), which fires
`invoice.payment_succeeded` **with our metadata** — a `stripe trigger` fixture has no
`application_id`, so it can only prove the skip path.

```
placement_fees.paid_at              = 2026-07-30 05:28:06.194+00   ✅
placement_fees.stripe_invoice_status = paid                        ✅
```

### Defect 2 — the old idempotency guard made paid state unrecordable

The pre-Phase-2 handler treated `existingPf.stripe_invoice_id === invoice.id` as "duplicate,
skip". But `create-placement-invoice` writes that id at **creation**, so the condition was
already true when the first genuine payment event arrived: the webhook would have logged
"duplicate" and skipped forever. Idempotency now keys on `paid_at` itself. Recorded because the
Phase 2 brief's framing ("currently only logs") understated it — it was not merely unfinished,
it was unfinishable without this change.

### `admin_revenue_reconciliation` over REST as a real admin JWT

```json
{"summary": {"placements_total": 1, "invoiced_cents": 80000, "paid_cents": 80000,
             "outstanding_cents": 0, "overdue_cents": 0, "uncollectible_cents": 0,
             "waived_count": 0, "acknowledged_uninvoiced_cents": 0,
             "listing_revenue_cents": 0},
 "rows": [{"farm_name": "Phase2 Probe Farm", "job_title": "Senior Farm Manager",
           "fee_tier": "senior", "amount_nzd": 80000, "discount_pct": 0.0,
           "acknowledged_at": "…05:23:31", "confirmed_at": "…05:26:37",
           "paid_at": "…05:28:06", "stripe_invoice_status": "paid",
           "days_outstanding": null}]}
```

`listing_revenue_cents: 0` is correct at that moment — the reconciliation call ran before R1's
paid listing existed.

## Webhook failure paths

| Probe | Expect | Result |
|---|---|---|
| unhandled type with a **corrupted** signature | 400 | ✅ **400** |
| `stripe trigger customer.created` | 200, no write | ✅ no rows written |
| `stripe trigger payment_intent.payment_failed` | 200, no write | ✅ no rows written |

Fee counts before and after the two triggers were identical.

## Invoice legibility (Task 2.4)

The line item Stripe renders, read back from the real invoice:

> TopFarms placement fee — you hired Phase2probe S. for Senior Farm Manager (senior) · 1 matched
> candidate · 1 day from post to hire

Invoice: `currency nzd`, `amount_due 80000`, `collection_method send_invoice`, Net-14 due date,
metadata carrying `application_id` / `employer_id` / `job_id`.

## Stripe posture (test mode)

The webhook endpoint was registered but **not subscribed to any invoice event** — it carried
`payment_intent.*`, `checkout.*` and three `customer.subscription.*` types only. So even with a
correct handler, no invoice payment would ever have reached it. Subscribed
`invoice.payment_succeeded`, `invoice.payment_failed` and `invoice.marked_uncollectible` on
`we_1TBZZ6RpIiAQpOa7FUz4Oegz`. **Phase 7 must repeat this on the LIVE endpoint** —
subscriptions do not carry across modes.

## What this evidence does not cover

- **`invoice.payment_failed` / `invoice.marked_uncollectible` with real metadata.** Handler code
  and endpoint subscription are in place, and the shared branch (metadata lookup → status write)
  is proved by the succeeded path — but neither status has been written by a real event.
- **The day-7/14 follow-up emails firing.** `cron.job` row exists (`jobid 9`,
  `placement-followup-send`, `30 8 * * *`, Vault secret `WEBHOOK_SECRET`) and its flag-setter
  counterpart from migration 011 exists, but the schedule has not yet come around, and the
  7-day condition needs an aged row. **The wiring is proved structurally, not behaviourally.**
- **Live mode.** Phase 7, deliberately.

## Deploy note

`supabase-deploy.yml` reports **failure** on both runs — the `migrations` job fails at
`SASL auth (SQLSTATE 28P01)`, the known platform-side pooler-auth block. The `functions` job
succeeded both times, which is the part that matters here; migrations were applied through the
claude.ai connector instead (versions `20260730051318`–`20260730051412`, recorded in
`supabase/migrations/LEDGER.md`). Do **not** rotate the DB password in response — CLAUDE.md §6.
