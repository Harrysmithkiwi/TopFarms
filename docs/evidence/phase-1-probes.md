# Phase 1 · Task 1.4 — adversarial probe evidence

Live probes against production (`inlagtgpynemhipnqvty`). Every claim below is a recorded
request/response pair, not an assertion.

**Status: steps 1–3 COMPLETE (pre-merge).** Steps 4–6 (merge → deploy → after-probes →
cleanup) pending operator go-ahead.

**Headline: every Edge Function attack SUCCEEDED against production.** These are not
theoretical findings. Employer B — an account that owns nothing — published another
employer's job for free and forged a $0 placement fee that opened the seeker's PII paywall.

---

## ⚠️ CLEANUP OWED — read this first

Three throwaway accounts exist in production `auth.users` right now. If this session ends
before step 6, **run this**:

```sql
DELETE FROM auth.users WHERE id::text LIKE 'deadbeef-0000-4000-8000-%';
-- then verify:
SELECT (SELECT count(*) FROM auth.users)   AS users,   -- must be 6
       (SELECT count(*) FROM jobs)          AS jobs,    -- must be 0
       (SELECT count(*) FROM applications)  AS apps;    -- must be 0
```

| Handle | UUID | Role | Purpose |
|---|---|---|---|
| probe-seeker | `deadbeef-0000-4000-8000-000000000001` | seeker | victim profile / skills / application |
| probe-employer-a | `deadbeef-0000-4000-8000-000000000002` | employer | owns the job — the legitimate caller |
| probe-employer-b | `deadbeef-0000-4000-8000-000000000003` | employer | the attacker — owns nothing |

Emails `phase1probe-*@example.com` (RFC 2606 reserved domain — cannot receive mail).
Seeded 2026-07-30 with `email_confirmed_at` set, so no confirmation mail was ever sent.
Roles were assigned by the `handle_new_user` trigger from `raw_user_meta_data->>'role'`,
not by calling `set_user_role` — which matters, because 1.3a made that RPC
first-assignment-only.

---

## Method

Probes run over the public REST/Functions API with real user JWTs obtained via the password
grant (`POST /auth/v1/token?grant_type=password`) — i.e. exactly the path a hostile user
would take, not a privileged DB session. A probe that passes only because the MCP connection
is privileged proves nothing.

**Before/after design.** A 403 on its own is not evidence — it could be a bad token, a wrong
URL, or a typo'd payload. Each Edge Function attack is therefore run **twice**: once against
the currently-deployed (vulnerable) build, and again after the fix deploys. A 200-with-
cross-tenant-data → 403 pair demonstrates causation; a lone 403 does not.

No real user's data is touched at any point. Every read targets the throwaway seeker.

---

## Step 1 — Seed

| Object | Id | Notes |
|---|---|---|
| accounts | see table above | roles set by trigger |
| seeker_profile | `deadbeef-1111-…-0001` | probe-seeker, `visa_status: working_holiday` |
| employer_profile A | `deadbeef-2222-…-0002` | Probe Farm A |
| employer_profile B | `deadbeef-2222-…-0003` | Probe Farm B — owns no job |
| job | `deadbeef-3333-…-0001` | owned by A |
| application | `deadbeef-4444-…-0001` | seeker → A's job |
| message_thread | `deadbeef-5555-…-0001` | A ↔ seeker |
| employer_verifications | `deadbeef-6666-…-0002/0003` | A (public job) and B (no job) |

`visa_status` was deliberately set to `working_holiday` — a migrant worker's status — because
that is the field whose exposure carries the most consequence for this platform's users.

## Step 2 — "Before" probes (currently-deployed vulnerable build)

| # | Attack as employer B | Expect (vulnerable) | Result |
|---|---|---|---|
| P1 | `generate-candidate-summary` on A's application | 200 | **HTTP 200** — accepted a cross-tenant request. Body `{"summary":null}` (no `ANTHROPIC_API_KEY` in prod), but the 200 is the finding: no caller check ran |
| P2 | `generate-match-explanation` on seeker's profile | 200 | **HTTP 200** — same |
| P3 | `acknowledge-placement-fee` on A's application, `amount_nzd: 0` | row written | **HTTP 200**, `placement_fee_id: 6c899192-…`. DB read-back: `billed_to = employer A`, `amount_nzd = 0`, `pii_gate_open = true`, `contacts_now_reachable = 1` |
| P4 | `create-payment-intent` on A's job, tier 2 | 200 | **HTTP 200**, `{"is_free":true}`. DB read-back: `listing_fees` row billed to **A**, `amount 0`; A's job → `status active`, `listing_tier 2`, `expires 2026-08-29` |
| P5 | `create-placement-invoice` on A's application | 200 | HTTP 500 (Stripe/env, not a refusal) — **inconclusive**; it did not reject the caller. Re-test post-fix expects a clean 403 |

**P3 in plain terms.** An account with no relationship to the job forged a placement-fee row
against a different employer at $0, and that write flipped the `seeker_contacts` RLS gate
open — releasing the seeker's phone and email. Both the revenue line and the worker-privacy
promise failed in a single request.

**Honest note on P3's first attempt:** it returned 500 because *I* sent
`fee_tier: "tier_1"` while the CHECK constraint requires `entry|experienced|senior`. That
was my error, not a defence. Re-run with a valid value: 200. Recorded because a 500 that
looks like protection is exactly the kind of false comfort this exercise exists to prevent.

## Step 3 — RLS probes (migration 066, already live)

| # | Attack | Target | Expect | Result |
|---|---|---|---|---|
| P7 | `set_user_role('employer')` as the seeker | 1.3a | raises | ✅ **HTTP 403** `42501 Role already set; contact support to change it` |
| P8-neg | B reads `seeker_skills` — no application, seeker not open_to_work | 1.3b | 0 rows | ✅ `[]` |
| P8-pos | A reads `seeker_skills` — seeker applied to A's job | 1.3b | rows | ✅ 1 row — binding does not over-restrict |
| P9 | B inserts `messages` into the A↔seeker thread | 1.3c | refused | ✅ **HTTP 403** `42501 new row violates row-level security policy` |
| P10 | anon `GET /employer_verifications` | 1.3d | only public-job employers | ✅ returns **A only**; B (no job) hidden. Pre-066 both would return |
| P11 | seeker `GET /employer_verifications` | 1.3d | same | ✅ A only |
| P12 | anon read of `seeker_profiles` / `seeker_contacts` / `applications` | regression | 0 rows | ✅ `[]` on all three |

### P10 exposed a gap 066 did not close → migration 067

A row policy cannot restrict *columns*. With the rows correctly narrowed, anon could still
read `document_url`:

```
GET /rest/v1/employer_verifications?select=document_url   (apikey only, no JWT)
-> [{"document_url":"employer-documents/probe-a-secret.pdf"}]   HTTP 200
```

Every employer who verified and had a live listing was publishing the storage path of their
verification document to anonymous visitors. **067** revokes anon's table-level SELECT and
grants back only the safe columns.

After 067 — closed, without an outage:

| Check | Result |
|---|---|
| anon `select=document_url` | ✅ **HTTP 401** `42501 permission denied for table employer_verifications` |
| anon `select=employer_id,method,status` | ✅ HTTP 200 — the legitimate read still works |

Severity, stated honestly: the path is not access. `employer-documents` is a private bucket
and its `storage.objects` policies scope to `auth.uid()`, so a filename does not fetch a
file. This was information disclosure, closed because anon had no reason to see it — not
because it was exploitable.

## Steps 4–6 — after merge

| # | Check | Expect |
|---|---|---|
| P6 | **legitimate path**: A performs all five calls on A's own resources | 2xx — run FIRST |
| P1–P5 | re-run as B | 403 |
| — | cleanup + read-back | 6 users / 0 jobs / 0 applications |

**P6 runs before the re-run of P1–P5 deliberately.** Having just added authorization checks,
the likelier failure is over-restriction — breaking the real employer — not under-restriction.
Confirm the legitimate path is alive before admiring the refusals.
