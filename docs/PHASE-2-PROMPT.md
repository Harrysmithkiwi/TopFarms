# Phase 2 — Revenue enforcement

Operating prompt. Companion to `docs/UPLIFT-ROADMAP-2026-07-30.md`, `docs/AUDIT-PRELAUNCH-2026-07-30.md`,
`docs/STRIPE-TEST-HARNESS.md`. Phases 0 and 1 are complete and merged.

**Goal.** Make both fee lines unforgeable and collectible. Phase 1 closed tenancy — you can no
longer act on someone else's application. It did **not** close pricing: an employer can still
acknowledge their *own* placement at $0. That is this phase.

**Effort ~20 h. Entirely in Stripe TEST mode.** Live keys are Phase 7, after all four domains
re-score ≥90. Every change here is proved with `stripe trigger` and test cards first.

**Score movement:** D3 monetisation 25→95, funnel 45→90 · D1 integration robustness 45→90.

---

## Locked product decisions (operator, 2026-07-30)

| Question | Decision |
|---|---|
| First **listing** free? | **Yes** — as built and advertised (`Pricing.tsx:62`, PRD `:39`) |
| First **placement** free? | **No.** Placements are the revenue line. Never was implemented; do not add it |
| Discount on first placement? | **Capability, not policy.** Add admin-applied `discount_pct` / `waived_reason`. No automatic rule |
| CV / contact gate | **Option C** — pre-placement the employer sees the structured profile, match breakdown, AI summary and first name; the CV *document* unlocks on placement |
| Seeker-side confirmation | **Schema now, mechanism later.** Columns land in this phase; the nudge/email/admin queue does not |

---

## Ground truth, verified live 2026-07-30

Do not re-derive.

- `calculatePlacementFee(salaryMin, salaryMax, jobTitle)` at **`src/types/domain.ts:470-489`** —
  salary-primary (`<$55k` entry $200 · `$55k–80k` experienced $400 · `$80k+` senior $800), with
  title keywords (`manager|head|senior|supervisor`) bumping **up only**. **This logic is correct;
  the defect is that it runs in the browser and the server trusts the result.**
- `TIER_PRICES` at `create-payment-intent/index.ts:10-14` — `{1:10000, 2:15000, 3:20000}` cents.
- **`listing_fees` already has `paid_at`.** `placement_fees` does **not** — it has
  `acknowledged_at` and `confirmed_at`, where `confirmed_at` means *invoice created*, not paid.
  That is why no aged-debtors list is possible today.
- `placement_fees` already carries `followup_7d_due/sent`, `followup_14d_due/sent` and `rating`.
- `listing_fees.job_id` → `jobs(id) **ON DELETE CASCADE**` (`001:214`) and the `jobs` policy is
  `FOR ALL`, which is why deleting a job resets the free allowance.
- `message_threads` FKs are `ON DELETE SET NULL` — orphans survive account deletion (found by the
  Phase 1 cleanup). Same trap must not be repeated on new tables.

---

## Task 2.1 — Server-derive every money value

**The hole Phase 1 left open.** `ApplicantDashboard.tsx:369-384` computes `fee_tier`/`amount_nzd`
in the browser and posts them; `acknowledge-placement-fee` and `create-placement-invoice` insert
them verbatim. An employer can acknowledge their own placement at `amount_nzd: 0` — and because
the `seeker_contacts` policy keys only on `acknowledged_at IS NOT NULL`, that releases the
seeker's phone and email for free.

1. Move `calculatePlacementFee` to `supabase/functions/_shared/pricing.ts` — same algorithm,
   single source of truth. The client keeps a copy **for display only**.
2. Both functions derive tier and amount from the **job row** (`salary_min`, `salary_max`,
   `title`). Body values are ignored.
3. If the client's value disagrees with the server's, **log a warning with both** — that
   mismatch is the earliest signal of tampering you will get.
4. Same for listing tier: validate `tier` against `TIER_PRICES` server-side; never accept an
   amount from the client.

**Gate:** POST `amount_nzd: 0` for a `senior` job → row is written at **80000**, not 0.

## Task 2.2 — Entitlement ledger (replaces counting)

Free-listing eligibility is currently `count(listing_fees) === 0`. Because those rows cascade on
job delete, deleting a job resets the allowance — unlimited free listings.

**Do not fix the count. Stop counting.** An entitlement is a *fact about an account*; a count is
a value *derived from another table's lifecycle*. Never derive a fact from something that cascades.

```sql
CREATE TABLE public.employer_entitlements (
  employer_id    uuid NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('free_listing')),
  consumed_at    timestamptz NOT NULL DEFAULT now(),
  -- provenance ONLY. SET NULL, never CASCADE: deleting the job must not erase the fact.
  job_id         uuid REFERENCES jobs(id) ON DELETE SET NULL,
  PRIMARY KEY (employer_id, kind)
);
```

The primary key **is** the enforcement — consuming twice is a constraint violation, not a count
that can drift. `kind` is an enum-style CHECK with one value today so `free_placement` can never
be added by accident; adding a value is then a deliberate migration.

Also add `UNIQUE (job_id)` to `listing_fees` — the free path is not currently idempotent under
retry.

**Known limit, state it in the PR:** delete-account-and-resignup still bypasses this. Universal
to free tiers; the defence is at signup, not here. Do not over-engineer around it.

**Gate:** consume the free listing → delete the job → attempt a second free listing → **charged**.

## Task 2.3 — The contact gate (Option C)

Audit **P0-1**, the largest revenue leak. `seeker_contacts` is correctly paywalled, but the same
phone and email sit in the CV, and `020_seeker_documents_employer_policy.sql:33-46` releases the
CV with **no fee predicate**. `ApplicantPanel.tsx:119` makes CV the **default tab**. No exploit
needed — the employer just opens the panel.

Implement Option C:
1. Employer SELECT on `seeker_documents`: `certificate` and `reference` stay available
   pre-placement; **`cv` requires `placement_fees.acknowledged_at IS NOT NULL`** for that
   application. Cross-table predicate via a SECURITY DEFINER helper (incident E8).
2. Mirror the condition in `get-applicant-document-url/index.ts:194-256` — the policy alone is
   not enough, that function uses service-role.
3. `ApplicantPanel.tsx:119` — default tab becomes **Profile**. The CV tab renders a locked state
   naming what unlocks it and when.
4. `get_applicants_for_job` — stop returning `COALESCE(sc.email, u.email, …)` as `display_name`
   (audit P0-5). Return first name + initial; gate email on the same predicate.

**The employer must lose nothing they need to decide.** `MatchBreakdown.tsx:9-38` already explains
the score across 7 dimensions and `ApplicantPanel.tsx:87,275-282` derives plain-language
highlights. Confirm that surface is complete before locking the document — if a real hiring
decision needs something only the CV has, fix that first.

**Gate:** as the owning employer pre-placement, CV mint → **403**; certificate → **200**;
after acknowledging the fee, CV → **200**.

## Task 2.4 — Make the business collectible

Today you cannot answer *"who owes us money?"* from the database.

1. **`placements` table — split the event from the money.**
   `placement_fees` currently conflates *a hire happened* with *a fee is owed*. Separate:

   ```sql
   CREATE TABLE public.placements (
     id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     application_id        uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
     started_on            date,
     employer_confirmed_at timestamptz,
     seeker_confirmed_at   timestamptz,   -- schema now; nudge mechanism is a later phase
     created_at            timestamptz NOT NULL DEFAULT now()
   );
   ```
   `placement_fees` gains `placement_id`. Why it matters: a waived fee and a *missing* fee look
   identical while they are fused — and "how many placements have we facilitated?" is the number
   that tells the marketplace story, separate from "how much have we billed?".

2. **`placement_fees` gains `paid_at`, `stripe_invoice_status`, `discount_pct`, `waived_reason`.**
   `discount_pct`/`waived_reason` are **admin-applied only** — no automatic first-placement rule
   (locked decision). Server-side amount = derived tier price, then discount applied, then
   recorded with the reason.

3. **`stripe-webhook/index.ts:142-189` currently only logs** `invoice.payment_succeeded`. Make it
   write `paid_at`. Add `invoice.payment_failed` and `invoice.marked_uncollectible`.

4. **Wire `send-followup-emails` or delete it.** It is deployed, hardened, and has **never fired** —
   `011:58-80` schedules a flag-setter, and no cron or code posts to the function
   (`028:17-18` recorded this and moved on). Day-7/14 chasers are how a Net-14 invoice actually
   gets paid. If they are not wanted, delete the function — deployed-but-dead is the worst option.

5. **`admin_revenue_reconciliation` RPC + `/admin/revenue`** — invoiced vs paid vs overdue.

6. **Make the invoice legible.** A bare "$400" reads as a tax; "$400 — you hired Sarah M., 12
   matched candidates, 9 days from post to hire" reads as cheap. Include the placement context in
   the Stripe invoice description. This is the strongest lever available at the moment of payment,
   and it costs one string.

## Task 2.5 — Prove it in test mode

Follow `docs/STRIPE-TEST-HARNESS.md`. Reuse the Phase 1 probe method: throwaway accounts, real
JWTs over the public API, **before/after pairs**, mandatory cleanup verified by read-back.

| # | Check | Expect |
|---|---|---|
| R1 | Full loop: post → pay (test card) → webhook → job `active` | 200, `listing_fees` row at the correct tier price |
| R2 | Replay the same event | **no second row** |
| R3 | Free listing → delete job → second listing | **charged** (2.2) |
| R4 | `acknowledge-placement-fee` with `amount_nzd: 0` on a senior job | row written at **80000** (2.1) |
| R5 | CV mint pre-placement / post-placement | **403** then **200** (2.3) |
| R6 | `stripe trigger invoice.payment_succeeded` | `paid_at` set; appears in reconciliation (2.4) |
| R7 | Legitimate employer path end to end | **2xx throughout — run FIRST** |

**R7 runs first**, as in Phase 1: after adding enforcement, over-restriction is the likelier
failure. Evidence to `docs/evidence/phase-2-revenue.md`.

---

## Definition of done

1. No money value originates in the browser. Client keeps display-only copies.
2. Free listing cannot be consumed twice, proven by the delete-and-retry probe.
3. CV releases only on placement, enforced in **both** the policy and the Edge Function.
4. `paid_at` populated by the webhook; an aged-debtors list is answerable from SQL.
5. Follow-up emails either fire or the function is deleted.
6. `docs/evidence/phase-2-revenue.md` committed, R7 green, prod restored by read-back.
7. **PRD and `/pricing` updated in the same PR** as any pricing-behaviour change — the audit found
   11 doc-vs-reality deltas; do not create the twelfth.
8. `tsc -b` · lint · vitest · build · CI green; `deno check` clean. Ledger + `LEDGER.md` updated.

## House rules

CLAUDE.md §9 throughout: stage explicit paths, never discard an exit code, verify before anything
destructive, read the real schema before writing SQL, label provenance, let the gate define done.
§3 show SQL before applying. §4 no history rewriting. **Stripe stays in test mode — the live swap
is Phase 7 and nothing in this phase should touch it.**
