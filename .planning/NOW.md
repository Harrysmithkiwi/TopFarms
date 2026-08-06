# NOW — where the work actually is

One screen. Written 2026-08-06 because state had spread across `STATE.md` (5 weeks stale),
four off-roadmap stream directories, session memory, and 66 git branches.

**Read this first, then the authority for whichever stream you're in.** If this file and a
stream doc disagree, the stream doc wins and this file is out of date — fix it.

---

## Shipped and live

`main` = `c4fd592`, auto-deploys to prod at **www.topfarms.co.nz** (apex 308s to www; DNS at
Cloudflare, proxy OFF on the Vercel CNAMEs or SSL breaks).

Through GSD Phase 28 + 28b: the marketplace, admin portal, lead triage, and the
nzfarmingjobs harvest cron with its watchdog. v13 design port stages 1–3c are in prod.

## In flight — 3 branches, and the order matters

| Branch | Ahead | What it is | Gate before merge |
|---|---|---|---|
| `pricing/model-v3` | 2 | Free unlimited listings, banded placement, contract_type-scoped guarantee | **Edge Function deploys BEFORE the frontend.** Directive 1.19 is the authority. |
| `v13-stage3b-framework-mode` | 5 | Framework mode, built and preview-green | Merge drags to prod immediately — needs the UAT pass |
| `design/admin-gate` | 6 | Admin design gate. **Gate A met** | One operator ruling open, see below |

`main` auto-deploys, so **nothing merges without deciding it can be in prod that minute.**

**The next UAT is one pass, both roles, against a single preview carrying both the framework
and pricing branches.** Not an auth-nav test — the full journey. OAuth and a real inbox are
the human-only parts. It also forces the stuck match-display ruling (below).

## Blocked on a human, not on code

1. **PEND-01 — Stripe test→live swap.** 9-item checklist in `DECISIONS-PENDING.md`. Blocks
   `/gsd:complete-milestone v2.0`. Needs a real $0.50 charge and refund; deferred twice
   because it wants dedicated focus.
2. **The launch gate** — legal review, a Supabase toggle, purging 3 UAT accounts, a cold-start
   check. Rerun prompt at `docs/LAUNCH-READINESS-PROMPT.md`.
3. **Match-score display.** `v11-DIRECTIVE.md` §1.4 says workers never see a personal number;
   `JobDetail.tsx` shows signed-in seekers a numeric total plus per-dimension scores, and
   visitors a fabricated blurred `78`. **Nothing arbitrates it.** A product decision, not a
   gate condition — rule before the seeker design phase or the audit reopens the argument.
4. **`ProtectedRoute`** — one guard, 24 routes, all three portals. Decides where admin-gate
   Phase B starts. Detail in `.planning/admin-design-gate/STATE.md` § Open rulings.

## Streams and their authorities

| Stream | Authority | State |
|---|---|---|
| GSD roadmap | `.planning/ROADMAP.md` | v2.2 current; Phase 28 closed; 24–26 sales-gated |
| Admin design gate | `.planning/admin-design-gate/STATE.md` + `docs/ADMIN-DESIGN-PROMPT.md` | Phase A done, B–D open |
| Gated-portal design canon | `docs/DESIGN.md` (+ `docs/PRODUCT.md`) | `src/index.css` wins on any hex |
| Public marketing canon | `docs/design/v11-DIRECTIVE.md` | **Settled. Out of scope. Do not audit.** |
| Pricing v3 | directive 1.19 | Built, not deployed |
| Leads | `.planning/leads-triage/` | Phase 1 + Leads v2 in prod; A4 draft step pending operator config |
| Immigration | `docs/immigration/` | **Parked until post-launch** |

Two design systems ship here on purpose (`CLAUDE.md` §10). Applying one to the other's surface
is the failure mode that rule exists to prevent.

## Milestones

- **v1.0 MVP** ✅ 2026-03-17 · **v1.1 SPEC compliance** ✅ 2026-03-23
- **v2.0 Launch Readiness** — all phase work done; close blocked on PEND-01 only
- **v2.1 Match + Train + Retain** — Phase 23 done; 24–26 gated on first sales
- **v2.2 Lead Acquisition & Admin Ops** — current; Phase 28 closed
- **Off-roadmap, operator-directed:** leads triage, lead harvest, v13 design port, pricing v3,
  admin design gate. Deliberately outside GSD, same as `.planning/leads-triage/` always was.

## Branch hygiene — 66 branches, 55 are dead

`git branch -vv` shows 55 branches at **0 ahead of `main`** and 100–540 behind. All merged or
abandoned; they are pure noise when finding the live ones.

Eight more are ahead but far behind and probably abandoned — `remediation/stage-2` (11 ahead /
173 behind), `docs/gtm-funnel-spec` (5/173), `feat/landing-refresh` (3/278),
`design/landing-refresh` (2/171), `hotfix/truth-pass` (1/173), `hotfix/truth-pass-2` (1/172),
`feat/design-system-screens` (1/277), `docs/phase-5-handoff` (1/10). **Check each before
deleting** — an "ahead" count means commits that exist nowhere else.

Not deleted. `git branch -D` needs explicit operator instruction in chat (`CLAUDE.md` §4, and
§8 records what happened the last time a reset ran unasked).
