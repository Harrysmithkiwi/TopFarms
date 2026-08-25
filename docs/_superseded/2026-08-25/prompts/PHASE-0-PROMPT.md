# Phase 0 — Foundations: make the work reproducible, observable and verifiable

Operating prompt. Companion to `docs/UPLIFT-ROADMAP-2026-07-30.md` (the plan) and
`docs/AUDIT-PRELAUNCH-2026-07-30.md` (the findings).

**Phase goal.** Nothing in Phases 1–7 is trustworthy until three things are true: the migration ledger
describes reality, production failures are visible, and the money path is testable without live Stripe.
Phase 0 establishes those, plus a batch of quick wins that close two audit P0s outright.

**Effort:** ~12 h · **Score movement:** D1 data model 60→80, observability 30→75; D3 trust 25→60
(fabricated stats removed); D4 PII 55→70 (UEMA line).

---

## Correction to the audit — read this first

The audit's **P0-8** claimed *"two applied migrations have no file on disk — production schema exists
that is not in version control."* **That is wrong and this phase does not act on it.** Verified
2026-07-30:

- Ledger entry `20260722232729 fix_get_applicants_for_job_joins` — its SQL is on disk inside
  `058_fix_admin_profile_doc_queue_applicants.sql:6-45` (identical `CREATE OR REPLACE`; live function
  confirmed to carry `LEFT(a.id::text, 8)` and `v_employer_user_id`).
- Ledger entry `20260729095445 leads_list_expose_draft` — its SQL is on disk inside
  `064_lane_a_outreach_worklist.sql:~129` (live `admin_leads_list` confirmed to expose
  `drafted_email/draft_model/contacted_at`, carry `follow_up_date`, and order by
  `status_changed_at DESC` — matching 064).

Both are the "apply a delta, then amend the source file" pattern. **The disk does describe
production.** The real defect is narrower: the ledger is missing 21 rows and carries 2 duplicate
entries, so no tool can reason about migration state and replay-from-zero has never been tested.
**Severity: P1, not P0.** Do not create `065_`/`066_` files — they would duplicate 058 and 064 and
make replay produce a different (though equivalent) path.

---

## Task 0.1 — The CV/contact product decision *(operator-owned; does NOT block Phase 0)*

Blocks **Phase 2 Task 2.3** only. Recommendation stands: **Option C** — do not serve the CV document
pre-placement; serve the structured profile, match breakdown and AI summary instead, and release the
document at placement. Rationale in the roadmap §Phase 0.

Phase 0 proceeds without this answer. Record the decision in `docs/DECISIONS.md` when made.

---

## Task 0.2 — Reconcile the migration ledger

**Constraint:** this must land before any other migration in the programme, or the drift compounds.

**Pre-verified (2026-07-30, read-only SQL) — all 21 of `036`–`056` are genuinely applied.** Do not
re-derive; the evidence is:

| Migration(s) | Live artefact confirming application |
|---|---|
| 036 | 2 photo-listing policies present |
| 037 | 65 definer functions with `proconfig` pinned |
| 038 | view `marketplace_employer_profiles` exists |
| 039 | `admin_analytics_funnel` exists |
| 040 | the dropped seeker→employer_profiles policy is absent (count 0) |
| 041 | `leads`, `lead_staging`, `lead_suppression` all exist |
| 042 | `admin_analytics_leads` exists |
| 043 | 2 harvest cron jobs scheduled |
| 044 | `admin_lead_approve` exists |
| 045 | `lead_harvest_runs` exists |
| 046 | `admin_lead_categorise` exists |
| 047, 055 | `admin_outreach_list` exists |
| 048, 053, 054 | `admin_leads_staging_list` exists |
| 049 | `lead_outreach_config` seeded (1 row) |
| 050 | `admin_get_daily_briefing` exists |
| 051 | `admin_get_signups_trend` exists |
| 052 | `admin_get_placements_summary` exists |
| 056 | `lead_harvest_notify_check` exists |

**Steps.**
1. **Show the SQL body before running it** (CLAUDE.md §3). Backfill `supabase_migrations.schema_migrations`
   with one row per file `036`–`056`, `version` = the numeric prefix, `name` = the file slug.
2. Write `supabase/migrations/README.md` recording: the pooler-auth constraint, the connector write
   path, the rule that Studio/connector-applied SQL must be manually recorded, the two duplicate
   ledger entries and what they correspond to, and the numbering gap at 018–020.
3. Extend `tests/` with a ledger-drift guard: assert every `.sql` on disk has a ledger row (list of
   known-duplicate ledger entries allowlisted, with reasons). This is the regression guard that stops
   the drift recurring — same idiom as `tests/admin-staging-source-filter.test.ts`.

**Exit gate:** every disk migration has a ledger row; the only ledger rows without a 1:1 disk file are
the two documented duplicates; the drift-guard test is green.

---

## Task 0.3 — Error tracking + a real error boundary

Closes audit **F-A2** (P1): no error tracking anywhere, and `src/main.tsx:174` sets
`errorElement: s(<NotFound />)` so a render crash is presented to the user as a **404 page** — they
don't report it, and you have no telemetry either.

**Steps.**
1. Add `@sentry/react`. Initialise in `src/main.tsx` **gated on `VITE_SENTRY_DSN`** — absent DSN means
   a complete no-op, so this is safe to merge before the operator creates the project (same
   host-gating idiom as the Vercel Analytics mount). Add `VITE_SENTRY_DSN` to `.env.example`.
2. Configure `beforeSend` to strip PII: no request bodies, no `email`/`phone`/`visa_status` values.
   The audit's whole PII posture depends on not shipping seeker data to a third party by accident.
3. Build `src/components/layout/AppErrorBoundary.tsx` — a real error surface ("something went wrong",
   retry, link home) distinct from `NotFound`. Wire it as the router `errorElement`; keep `NotFound`
   for the `*` route only.
4. Add `src/lib/reportError.ts` and route the 33 bare `console.error` call sites through it (console in
   dev, Sentry in prod).

**Operator step (manual, flagged not silent):** create the Sentry project and set `VITE_SENTRY_DSN` in
Vercel. Until then the SDK is inert by design.

**Exit gate:** a deliberate thrown error in a preview deploy renders the error boundary (not a 404);
with a DSN set it also appears in Sentry; `grep -rc "console.error" src/` shows only the reporter.

---

## Task 0.4 — Stripe test harness

Closes the audit finding that the webhook has **no automated test — only a manual
`tests/stripe-webhook-events-UAT.md`** — and establishes the loop every Phase 2 change is proved
against. **Live keys are explicitly out of scope until Phase 7.**

**Steps.**
1. `docs/STRIPE-TEST-HARNESS.md` — the operator runbook:
   - `stripe listen --forward-to https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook`
   - `stripe trigger payment_intent.succeeded` (hits `stripe-webhook/index.ts:62`) and
     `stripe trigger invoice.payment_succeeded` (`:142`)
   - test cards, replay-for-idempotency, malformed-signature and unknown-event cases
   - **The trap:** `stripe listen` mints its own `whsec_…`, different from the dashboard endpoint's.
     Whichever is in play must be the `STRIPE_WEBHOOK_SECRET` Edge secret; a mismatch looks exactly
     like a code bug.
   - **The other trap:** every `stripe_payment_id`/`stripe_invoice_id` written during this programme is
     a test-mode id. Phase 7 purges them so prod never holds a mix.
2. `tests/stripe-webhook.test.ts` — follow the repo's established static-source-guard idiom
   (`tests/webhook-secret-presence.test.ts`), because the handler is Deno and cannot be imported into
   vitest. Assert: `constructEventAsync` is called with the secret and a crypto provider; signature
   failure returns 400 **before** any body handling; both event types are handled; the natural-key
   dedup guards (`stripe_payment_id`, `stripe_invoice_id`) are present; no unhandled event 500s.
3. Add a real HMAC signature builder as a test utility + a documented `curl` recipe, so the operator
   can hit the deployed function directly without the Stripe CLI.

**Exit gate:** `npx vitest run tests/stripe-webhook.test.ts` green; the runbook has been executed once
end-to-end and the result recorded (this step needs the operator's Stripe CLI session).

---

## Task 0.5 — Quick wins

Two of these are audit P0s; the rest are ≤30-minute items with disproportionate payoff.

| # | Item | File | Audit ref |
|---|---|---|---|
| 1 | Delete the fabricated stats block — "3 avg days", "120+ seekers", "85% actively looking" shown to an employer who has just paid, on a DB with 3 seekers and 0 jobs | `src/pages/jobs/steps/JobStep8Success.tsx:75,83,91` | **P0-10** |
| 2 | Add UEMA unsubscribe + sender identification to outreach | `docs/OUTREACH-EMAIL.md`, `lead-draft-email/index.ts:25-48`, `lead-intake/index.ts:543-567` | **P0-11** |
| 3 | `REVOKE EXECUTE ON admin_leads_staging_list FROM anon, PUBLIC` | migration | F-S4 |
| 4 | `border-t-moss` → `border-t-brand` — `moss` is not a token, so the loading spinner has no visible rotation cue | `ProtectedRoute.tsx:19,47`, `SelectRole.tsx:20` | D2 P2 |
| 5 | `bg-red` (undefined token) + Bootstrap `#dc3545` → `bg-danger` | `EmployerDashboard.tsx:618-619` | D2 P2 |
| 6 | Delete the unused `orange` Tag variant (1.93:1 — dead and dangerous) | `src/components/ui/Tag.tsx:14` | D2 P3 |
| 7 | `.gitignore` `.tmp-audit/`, `docs/design/`, `content/` (14 MB of untracked, un-ignored noise) | `.gitignore` | §7 |
| 8 | Archive root `PRD.md` (384 lines, 2026-04-02) — superseded by `docs/_canonical/PRD.md` but has the filename a newcomer opens first | root | D9 |

**Exit gate:** `grep -rE "120\+|85%|3 avg days" src/` returns nothing; the outreach template and both AI
system prompts contain an unsubscribe line; `bg-red`/`border-t-moss` return no hits; `git status` is
clean of the three untracked dirs.

---

## Phase 0 definition of done

1. `tsc -b` clean · `npm run lint` 0 errors · `npx vitest run` green · `npm run build` clean
2. CI green on `main`; every PR merged through branch protection
3. Ledger reconciled + drift-guard test green
4. Error boundary renders on a thrown error; `reportError` in place
5. Webhook test suite green; harness runbook written
6. All 8 quick wins verified by the greps above
7. `LAUNCH.md` + memory updated; audit P0-8 correction recorded

## House rules

`tsc -b` never `--noEmit`. DB writes via the claude.ai Supabase connector, SQL saved to
`supabase/migrations/`, verified via `pg_catalog`. **Show every SQL body and diff before applying.**
Atomic commits, one workstream per PR. No history-rewriting without explicit operator instruction.
No fabricated stats — this phase *removes* the last one; never reintroduce. Immigration work stays parked.
