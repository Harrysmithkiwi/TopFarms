# Session restart — TopFarms, 2026-08-21

Written at the end of a session that closed the launch blocker. **Paste the prompt at the
bottom into a fresh session started in `~/dev/topfarms`.**

⚠ **Start the session IN `~/dev/topfarms`.** The previous session was rooted in a different
repo and reached this one over the filesystem — which works for shell commands but means the
project-scoped `.mcp.json` (Supabase ref, `--read-only`) never loads. House rule 1 says do
not proceed on a misconfigured MCP.

---

## Where launch readiness actually stands

Baseline audit `.planning/LAUNCH-READINESS-AUDIT-2026-08-20.md` scored **46/100** and named
two shut gates: nobody could sign up, and nobody had been contacted.

**Gate 1 is now open. 46 → ~64.**

| | |
|---|---|
| `e196116` | Path-based verification route `/auth/confirm/:type/:tokenHash` — no `=` before the token, so the double quoted-printable decode cannot corrupt it |
| `eb0d736` | ⚠ **A FIFTH template was still broken.** Four were already on `{{ .TokenHash }}`; `invite` was not, and was unbranded, while the route already accepted `invite` as a valid type. Not reachable from the app — a user invited from the Supabase dashboard would have hit it. Patched, then all five verified by reading the LIVE config back |
| — | **Proven end to end on live prod:** recovery send → Resend → Gmail in 3s → link byte-identical → real browser → `verifyOtp` accepted → session established (`aud: authenticated`, `amr: ["otp"]`). Purged after |
| — | **Operator then walked a real employer signup and it worked** — delivered link, verification, dashboard |
| `4446fa7` | That walk immediately exposed the NEXT gate: onboarding **step 2 failed every time**. `inz_accreditation_expires` is a DATE column, Postgres rejects `''` with 22007, and the step saves the whole form in ONE upsert — so one empty string failed EVERY field. Reachable without typing a date: react-hook-form v7 keeps values of fields that were mounted then hidden, so toggling INZ on and off leaves `''`. Seeker form already had the guard; employer never did |
| `15e577b` | **`main` CI is green** — first time since 2026-08-19. Four e2e failures, all one cause: the v12 landing replaced the homepage and three assertions still described the old one. None had found a product defect |

**Gate 2 — demand side — is untouched and is the real launch gate.** 1/10 and 1/5. Nothing
in this repo shortens it.

## Phase 2 is next, and its plan needs one revision

`.planning/UPLIFT-95-PROMPT.md` Phase 2 assumes suppression is built from nothing. It is not:
**Resend adds hard bounces and spam complaints to its own suppression list automatically.**
That is a different layer from `lead_suppression` — Resend's stops *Resend* sending, ours
stops *us* drafting — and both are wanted. So step 1 is **reconcile the two lists**, not
build one.

## MCP — wired, needs one action from the operator

`resend` added to `.mcp.json` at project scope, as Resend's **official hosted OAuth
endpoint** `https://mcp.resend.com/mcp`.

- **No API key in any file.** It was not recoverable anyway: Supabase's secrets API returns
  SHA-256 **hashes**, not values (every entry exactly 64 hex chars); not in local `.env`; and
  as an edge-function secret Vercel would not hold it. Rather than route a live key through
  chat, OAuth avoids the secret entirely and is revocable from the Resend account.
- **Provenance was checked**, because this reaches the sending account. `resend-mcp` is
  published from `github.com/resend/resend-mcp` by zenorocha (Resend's CEO) and three Resend
  engineers. ⚠ `mcp-send-email` on npm is a **name-squat** — maintainer
  `vision_123 <jdvision278k@gmail.com>`, no repository field. `resend-mcp-server` is an
  unofficial third-party fork. The hosted endpoint sidesteps npm entirely.
- Tools it brings: `list-suppressions`, `add-suppression`, `batch-add-suppressions`, plus
  emails, logs and events.
- Fallback if OAuth is awkward: `supabase/functions/get-resend-stats/index.ts` already calls
  `GET https://api.resend.com/emails?limit=100` and aggregates `last_event`.

**Operator action:** restart Claude Code (rule 2 — MCP changes only propagate on a full
restart), then `/mcp` → **resend** → complete OAuth.

## Open, deliberately — flagged not silently resolved

- **The numeric-tier invariant is orphaned.** `OpenRolesSection` still holds the
  `.in('listing_tier', [2, 3])` fix and its HOMEBUG-02 comment, but nothing renders it —
  `V12Roles` replaced it. Either it returns or it is dead code. Product call.
- **Empty number inputs store `0`, not null.** The onboarding number fields use
  `z.coerce.number()` and `Number('') === 0`, so a blank herd size or property size saves as
  `0`. No crash, wrong data.
- **A signup-type E2E has been walked by the operator but not by an agent** — an agent cannot
  create accounts. Recovery is proven mechanically; signup is proven by the operator.

## Process notes that will otherwise surprise a fresh session

- **`main` requires a PR + `quality` and `e2e` checks, AND one approving review.** The review
  rule is unsatisfiable solo — the author cannot approve their own PR — so every merge needs
  `--admin`. Either drop that rule or expect the bypass. Three merges today used it; only
  PR #88 bypassed *failing* checks, and that was authorised explicitly.
- **Templates live in Supabase config, not git.** An absent commit proves nothing about them.
  This misled the previous session into reporting "templates not patched" when four of five
  already were. Read the live config back instead.
- **An empty score-tracker row is not evidence of work not done.** Same cause as above.

---

## The prompt — paste this into a fresh session in `~/dev/topfarms`

```
TopFarms, continuing to launch readiness. Read in this order:

1. .planning/SESSION-RESTART.md — where things stand and what is open
2. .planning/NOW.md — the live state block at the top
3. .planning/UPLIFT-95-PROMPT.md — the six-phase work order, Phase 2 next
4. CLAUDE.md — house rules; rules 1, 2, 3 and 4 all bite in this repo

State: Phase 1 CLOSED, 46 -> ~64. main CI green. Signup works end to end,
verified on live prod and walked by me. Phase 2 (deliverability) is next.

Before Phase 2, confirm the resend MCP is connected — I should have completed
OAuth via /mcp. If it is not connected, say so and stop rather than falling
back to asking me to open the dashboard.

Phase 2, with one revision to the work order: Resend AUTO-suppresses hard
bounces and complaints, so step 1 is reconciling Resend's suppression list
against our lead_suppression table, not building ours from nothing. Both
layers are wanted — theirs stops Resend sending, ours stops us drafting.

Four things that will otherwise cost time:

- Diagnose before fixing (rule 3). Last session ruled out grants, RLS and
  payload shape before reading postgres_logs, which named the bug outright.
  Guessing would have burned an hour.
- Read live config back rather than trusting git. Supabase email templates
  and secrets are not in the repo; an absent commit proves nothing, and an
  empty tracker row is not evidence.
- Verify a guard fails before trusting it. A test that cannot fail is worse
  than no test.
- main needs a PR plus two checks plus one review. The review rule cannot be
  satisfied solo, so merges need --admin. Never bypass FAILING checks without
  asking me first.

Two calls are mine, not yours: anything that commits spend, and anything that
sends real email to real people. Draft it and stop.
```
