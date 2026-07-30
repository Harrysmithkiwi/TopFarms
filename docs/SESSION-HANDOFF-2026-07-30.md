# Session handoff — 2026-07-30

`main` green at **`f38cb50`**. Production clean: **6 users / 0 jobs / 0 applications / 0 fees**.
Test suite **484 → 559**. Working tree clean, no open PRs.

Next session: read **`docs/PHASE-2-PROMPT.md`** and run it.

---

## What happened

An adversarial four-domain audit scored TopFarms **53/100** against `LAUNCH.md`'s 93. Not a
contradiction — the 93 accurately scored a checklist of known items; it never asked whether
authorization and revenue enforcement survive a hostile user. They didn't. Phases 0 and 1 of the
uplift programme are now complete.

| Phase | Status | PRs |
|---|---|---|
| **0 · Foundations** | ✅ complete | #68–#72 |
| **1 · Authorization spine** | ✅ complete | #74, #75 |
| **2 · Revenue enforcement** | brief ready | — |
| 3–7 | planned | `docs/UPLIFT-ROADMAP-2026-07-30.md` |

**On effort estimates:** the roadmap's per-phase hours are human-engineer estimates. Actual
throughput has been roughly **one phase per session**. Don't quote the hours as elapsed time.

## The documents that matter

| File | What it is |
|---|---|
| `docs/AUDIT-PRELAUNCH-2026-07-30.md` | The findings — 4 domains, scored, evidenced |
| `docs/UPLIFT-ROADMAP-2026-07-30.md` | 8-phase plan to ≥90 in every domain |
| **`docs/PHASE-2-PROMPT.md`** | **Next up.** Revenue enforcement, decisions locked |
| `docs/evidence/phase-1-probes.md` | Live before/after attack evidence |
| `docs/STRIPE-TEST-HARNESS.md` | How to exercise money without live keys |
| `CLAUDE.md §9` | Verification discipline — read before touching anything |

## Phase 1's headline

Every Edge Function attack **succeeded against production** before the fix, probed over the public
API with a real user JWT. Employer B, who owned nothing:

- **published employer A's job for free** (tier 2, `listing_fees` billed to A, `amount 0`)
- **forged a $0 placement fee against A** — and that write flipped the `seeker_contacts` gate
  open, releasing the seeker's phone and email

After: all five refused, **zero writes from B**, and the legitimate employer path still 200.
Production restored to baseline and verified by read-back.

It also fixed **LAUNCH.md O8** (empty applicant AI summary), open and unexplained since
2026-07-23 — `generate-candidate-summary` queried `seeker_profiles` by `user_id` while the client
passes a `seeker_profiles.id`. The security fix and the bug fix were the same change.

## What is NOT fixed

**`amount_nzd` and `fee_tier` are still client-supplied.** Tenancy is closed — you can't act on
someone else's application — but an employer can still acknowledge their **own** placement at $0.
That is Phase 2 Task 2.1. Do not describe revenue as enforced until it lands.

Also open, recorded not dropped: `applications.application_notes` column exposure and the
`authenticated` residual on `employer_verifications` (both need a view or table split → Phase 5);
orphaned `message_threads` on account deletion (FKs are `ON DELETE SET NULL`).

## Operator actions outstanding

1. **Error tracking is inert.** Sentry is wired but has no DSN. Decision was to revisit at Phase 6
   with **PostHog** instead — 100k errors/month free *and* it closes the zero-product-analytics
   gap the audit called the biggest GTM hole. Until then we are blind to production errors (low
   risk at 0 traffic, but real).
2. **Stripe stays in test mode** until Phase 7, by design. The harness runbook has not yet been
   run end-to-end — it needs your Stripe CLI session.
3. **~14 MB of scratch is in git history** from a `git add -A` mistake I made in #68 (untracked in
   #72). Removing it needs a history rewrite, which I won't do without your explicit instruction.
   Recommendation: leave it.

## Two things worth your eye in Phase 2

- **Task 2.3** — before locking the CV behind the placement fee, look at the pre-payment surface
  as an employer would. If a real hiring decision needs something only the CV carries, fix that
  first; otherwise you protect the fee by breaking the funnel.
- **Task 2.4 item 6** — the invoice currently says "$400". Making it say *"$400 — you hired
  Sarah M., 12 matched candidates, 9 days from post to hire"* costs one string and does more for
  willingness-to-pay than any discount. Highest leverage line in the phase.

## Method that has been working — keep it

1. **Write the brief first**, grounded in live state, not in the previous document's summary.
2. **Probe before and after.** A 403 alone proves nothing — it could be a bad token. A
   200-with-effect → 403-with-no-effect pair proves causation.
3. **Run the legitimate path first** after adding any restriction. Having just added checks,
   over-restriction is the likelier failure.
4. **Leave a test, not just a fix.** The Phase 0 ledger guard caught a missing row in Phase 1; the
   Phase 1 authz guard found a fifth vulnerable function before merge. Both earned their keep one
   phase after they were written.
