# Restart prompt — pre-launch, written 2026-08-19

**Paste this whole file as the opening prompt of a fresh session.** It supersedes
`.planning/NEXT-BATCH-PROMPT.md` and `.planning/D4-AND-SEARCHHERO-PROMPT.md`, both of which are
complete.

Read first, in this order: this file, `.planning/NOW.md`, `CLAUDE.md` §3 §4 §9 §10.

---

## Where prod actually is — measured 2026-08-19, not assumed

| | |
|---|---|
| Employer profiles | **0** |
| Jobs (any status) | **0** |
| Applications | **0** |
| Seeker profiles | **1** |
| Leads staged, pending | **125** (63 reachable farms: not a recruiter + has a contact) |
| Leads contacted | **0** |
| Resend last 100 sends | 37 total, 26 delivered, **11 bounced (29.7%)** |

**The binding constraint is not code. Nobody has been contacted.** Every feature built in the
last fortnight serves an employer who does not exist. Re-verify these numbers before planning
anything on top of them — they are the whole argument for what to do next.

## What shipped in the previous session (all live in prod)

- **D4 Stage 0** — the INZ register was opened in a browser and its terms read. It IS keyed on
  NZBN and DOES publish an expiry, and INZ's terms forbid scripted access ("standard web
  browsers only"). Evidence: `docs/immigration/06-inz-register-verification.md`. **Stages 2–3
  are CLOSED, not deferred.**
- **D4 Stage 1** — migration `101`, `admin_record_inz_register_check`, two buttons on
  `/admin/documents`. Three operator decisions are load-bearing and must not be quietly
  reversed: a refusal clears the claim and nothing else; accreditation stays an attribute, never
  a trust-ladder rung, and the seeker badge is deliberately NOT built until there is an
  accredited employer to show it on; not chargeable.
- **SearchHero** — `/jobs`'s hero was mounted with no props at all (search box, region dropdown
  and five pills all inert, plus a fifth region vocabulary matching nothing in the DB). Wired;
  verified in a browser on live prod.
- **Audit F-19** — `notification_sends` + claim-by-insert (migration `102`). `notify-job-filled`
  emailed every unresolved applicant again on every fill→reopen→fill.
- **Two dead model IDs** — `claude-sonnet-4-20250514` returns 404; it backed
  `generate-candidate-summary` and `generate-match-explanation`, both swallowing the error into a
  null. Now `claude-sonnet-5` with `thinking: {type:'disabled'}`, and
  `tests/anthropic-model-ids-live.test.ts` pins every model ID to a live-verified allowlist.

---

## The next five steps, in order

**1. Triage the 29.7% bounce rate. Operator-owned, ~2 minutes, and it gates everything.**
Open the Resend dashboard and classify the 11 bounces: old UAT/test addresses, or real harvested
ones? `get-resend-stats` only exposes the aggregate and `RESEND_API_KEY` is an Edge secret, so
this cannot be answered from the repo. **Test addresses** → historical noise, but the reputation
hit is real: warm up at 10–15/day, not 63 at once. **Real addresses** → the harvest needs email
verification before any batch goes out. Providers throttle above ~5%; Resend suspends accounts
that sustain 30%. Do not send anything before this is answered.

**2. Set `VITE_SENTRY_DSN` in Vercel prod. Operator-owned, ~5 minutes.**
Confirmed absent from the served bundle — `src/lib/observability.ts` is gated on it and is
currently a complete no-op. When the first real employer hits a bug you hear about it from them
or not at all. Carried on the go-live map since 2026-08-13.

**3. Walk one real employer signup on prod, end to end. Operator-owned, ~15 minutes.**
Real email → verify → onboard → post a job → confirm it appears on `/jobs` → confirm the match
digest fires. Zero employers means this path has never been walked live; E2E covers it on
preview with CI accounts, which is not the same thing. Use a throwaway address and purge it
after. This is also the only way to exercise D4 Stage 1's two buttons against a real NZBN.

**4. Prepare the first outreach batch. Can be delegated to the session.**
From the 63 reachable farms, pick the first tranche sized to whatever step 1 decided. Draft each
one through `lead-draft-email` (prompt + `lead_outreach_config` are both populated and
CI-guarded for UEMA), then stage them for the operator to read, edit and send. **The session must
not send.** Note before drafting: the CTA is currently the bare homepage (`appUrl()` →
`topfarms.co.nz`, which 308s to www) — decide whether it should point at `/for-employers` or
straight at signup, a one-line change in `lead-draft-email`.

**5. Send the first batch, warmed up. Operator-owned.**
Then watch: `admin_lead_mark_contacted`, replies into `hello@` → `admin.topfarms@gmail.com`, and
the bounce rate after the first tranche before sending the second.

---

## Wider phases before launch

**A — Deliverability hardening.** Depends on step 1. If the bounces are real: add email
verification to the harvest before promotion, and consider dropping Lane B (no contact) leads
entirely. Then a warm-up ramp, and once `rua=` reports are clean, move DMARC from `p=none` to
`quarantine`. Today: SPF via `send.topfarms.co.nz` → amazonses, DKIM at the apex, DMARC `p=none`
collecting, MX → Cloudflare for replies. All verified 2026-08-19; auth is not the problem,
list quality is.

**B — First-employer readiness.** Steps 2 and 3, plus two known copy issues: the CTA target
above, and a contradiction between the two outreach lanes — `lead_outreach_config` says *"Never
mention money, price, or 'free' in this first message"* while `lead-draft-email`'s prompt says
*"inviting them to also list it free"* and *"free means free"*. Pick one.

**C — Silent-failure sweep.** Three defects this month shared one shape: something failed and
wrote a null or a 200 instead of saying so (the dead model ID in a swallowing catch; no delivery
record before F-19; `accredited_employer` with no reader). Worth one deliberate pass for the rest
of the family. Known starting points: the Edge functions import
`https://esm.sh/@anthropic-ai/sdk` **unpinned**, so a deployed function silently tracks whatever
esm.sh resolves; and `sector` is read by `JobSearch` but is in no filter registry, so it filters
without a pill or a way to clear.

**D — The seeker lane has never run in production.** All 127 `lead_staging` rows are
`type='employer'` (81 nzfarmingjobs, 24 trademe, 20 fb_manual_capture, 2 manual_paste). **Zero
seeker rows have ever been staged.** The fork is coded and tested but unexercised, so pasting one
seeker post is a FIRST RUN, not a regression check — budget for it failing on something other
than credit. The Anthropic key is live again as of 2026-08-19 (verified 200).

**E — Waiting on a real employer, by design.** The verified-accreditation badge (D4 Stage 1
deliberately stopped short of it: nothing renders `accredited_employer` to a seeker yet, so a
"verified" flag would be a column with no reader — it lands in the same commit as the badge, and
the `/jobs` filter copy changes once more then). Also the placement/payment flow, which has never
run against a real listing.

**F — Closed or parked; do not reopen without a reason.** D4 Stages 2–3 (INZ terms forbid
scripted access; the only routes are an agreement with MBIE or an OIA request for the list as a
dataset — recorded in `06` §6 with its staleness cost). The immigration phase generally.
The automated email to an employer whose accreditation claim was cleared — at this scale the
founder writes a better one by hand, and the admin screen shows the cleared claim with its date.

---

## Standing constraints

- Prod has **zero employer profiles** and the operator's requirement is that the first real
  employer is the first row in the table. Prove behaviour inside a transaction you `ROLLBACK` —
  the pattern used throughout migrations 092–102, and the one that caught a real defect in `101`
  (two audit rows written in one transaction share `now()`, so `ORDER BY created_at DESC` tied).
- Migrations through the claude.ai Supabase connector, SQL saved to `supabase/migrations/`, a
  `LEDGER.md` row, verified via `pg_catalog` — never the banner.
- Edge functions deploy on push to `main` (path filter `supabase/functions/**`); Vercel
  auto-deploys `main` → prod. **Pushing is a production deploy of both — ask first.**
- Gates: `tsc -b` 0 · `deno check` on any edge function touched · vitest green · lint 0 errors at
  the 53 pin · `npm run build` 0. `tests/no-phantom-coverage.test.ts` ratchets the todo count
  down only.
- An audit's proposed fix is a hypothesis. Read the live `pg_proc` / `pg_policies` /
  `pg_attribute` before implementing one. Two of four DSA fixes would have caused incidents as
  written.
- Model IDs are not memory. `claude-sonnet-4-20250514` looked fine in the source for weeks.
  Call it before you ship it, and add it to `tests/anthropic-model-ids-live.test.ts` with the date.

## Ask, do not assume

Step 1's answer changes step 4's size and step 5's schedule. Do not draft a batch against an
assumed bounce classification, and do not send on the session's own initiative under any
circumstances.
