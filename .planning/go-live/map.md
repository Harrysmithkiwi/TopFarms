# Map: TopFarms goes live in one week

Label: `wayfinder:map` · Charted 2026-08-07 · Launch target: **2026-08-14**

## Destination

TopFarms is live at www.topfarms.co.nz with real inventory, both funnels working end to end,
money accepted, and the launch gate closed. Product architecture, design and feel are
launch-ready: seamless, viable, GTM-ready.

This map absorbs the operator's earlier "map 2" (everything merged, prod coherent) and
"map 1" (live and taking money) — map 3, the design gate, completed 2026-08-07
(`.planning/design-gate/map.md`, 11/11 tickets closed).

## Notes

**Execution override, standing for this map.** The operator commissioned a phased execution
roadmap, an assessment, and a shipped feature — not decisions-only. Tickets still hold the
genuine open decisions; the milestone bodies below hold execution.

**Path override** as with the design-gate map: `.planning/go-live/`, not `.scratch/` — a
roadmap is a decision record, tracked.

**Operator-owned, never this map's work** (flagged wherever a phase depends on them):
Stripe live keys (PEND-01), admin-level credentials, legal review, the Supabase dashboard
toggles. Engineering phases route around them; nothing below silently assumes them done.

**Measured baseline, 2026-08-07** (prod, via MCP — not estimates): 0 jobs, 0 match_scores,
1 employer profile, 3 seeker profiles, 62 staged leads, 10 auth users, migrations at 078.
Launch-readiness audit standing at 91/100 (`LAUNCH.md`, rerun prompt at
`docs/LAUNCH-READINESS-PROMPT.md`).

**Standing constraints that bind every phase:** `main` auto-deploys to prod, so nothing
merges without deciding it can be live that minute. Directive §1.15: **production is never
seeded** — real inventory comes from the leads pipeline; the counter gate keeps an empty
board honest meanwhile. Preview deploys share the prod database, so "seed on preview" means
seed on prod — verification needing fake data happens on a **local** Supabase stack only.

## The roadmap

```
Day  1    2    3    4    5    6    7
M1   ████████████░                        merge train → prod coherent
M2   ███░                                 auth redirect allowlist (operator toggle)
M3   ██████████████████████████░          real inventory ramp (operator-led, continuous)
M4                  ░████████████████     launch gate closure
M5   ░░░░░░░░ polish, strictly non-blocking ░░░░░░░░
S1   ██████░ demand form (separable — cannot block)
M6                                        post-launch: training & quals (gated)
```

---

### M1 — Merge train: everything built gets to `main` (Days 1–3) · LAUNCH-BLOCKING

**Delivers:** the three in-flight branches merged, prod == everything built. `design/admin-gate`
(PR #86, draft, CI green — 24 commits: the design gate, honest ProtectedRoute, a11y blocking,
match-score §1.4 compliance, CI ratchet + E2E guard), `pricing/model-v3` (launch pricing),
`v13-stage3b-framework-mode`.

**Why launch needs it:** prod currently has none of this. Launch pricing isn't live; workers
would see the match-score violation §1.4 forbids; the CI safety net isn't on `main`.

**Order, and it is a constraint:** ① `design/admin-gate` merges first (everything else then
inherits the gate + guard). ② Pricing **Edge Function deploys before the pricing frontend**
(`gh workflow run supabase-deploy.yml --ref pricing/model-v3` — the established path). ③
`pricing/model-v3`. ④ `v13-stage3b-framework-mode`.

**Verification inside this phase:** an integration branch carrying all three → one Vercel
preview → **the one-pass, both-roles UAT** already planned (OAuth + real inbox are the
human-only parts). Pre-merge check PR #86 still owes: the match-display browser pass against
a scored job — prod has none and must not be seeded, so it runs on a **local Supabase stack**
with seed data (§1.15's sanctioned place). Wizard titles and employer pages get their first
visual pass in the same UAT (the `ci-employer` credential now exists).

**Depends on:** operator UAT participation (~1 hr). No operator credentials.

### M2 — Auth redirect allowlist (Day 1, parallel) · LAUNCH-BLOCKING · OPERATOR TOGGLE

**Delivers:** password-reset and OAuth redirects working on the real domain. Measured
2026-08-07: `/auth/v1/verify` ignores `redirect_to` and falls back to the apex Site URL while
prod serves `www` — every `redirectTo` flow burns its token on the mismatch
(`project_supabase_redirect_www`). Signup confirmation itself verified working.

**Why launch needs it:** the first real user who forgets a password hits a dead reset link.

**Depends on:** operator — Supabase dashboard, Auth → URL Configuration. Exact values in
[Fix the auth redirect allowlist](issues/02-auth-redirect-allowlist.md). Engineering then
re-verifies reset + OAuth end to end (no credentials needed beyond the CI accounts).

### M3 — Real inventory: the cold-start ramp (Days 1–6, continuous) · LAUNCH-BLOCKING · OPERATOR-LED

**Delivers:** real employer-posted listings live by Day 7. §1.15 rules out seeding, so the
only honest path is the one already built: **62 staged leads → outreach → employer signups →
listings**. Engineering supports: outreach batch prep in the admin queue, signup friction
fixes same-day, the counter gate keeping the board honest below 10.

**Why launch needs it:** a marketplace launching with a visibly empty board is dead on
arrival, and GTM has nothing to point at. Even 5–10 real listings changes the picture (the
v2.1 gate's own words).

**Target and lead selection are the operator's call:**
[How many real listings by launch day?](issues/01-launch-inventory-plan.md).

**Free rider:** the first real listing + a real seeker profile produces the first honest
`match_scores` row — prod-verifying the §1.4 match display without any seeding.

### M4 — Launch gate closure (Days 5–7) · LAUNCH-BLOCKING, mixed ownership

**Delivers:** the human gate emptied and independently re-verified.

| Item | Owner |
|---|---|
| Stripe test→live swap — 9-step checklist, $0.50 smoke charge + refund ([PEND-01](issues/03-stripe-live-swap.md)) | **Operator** (flagged, not this map's work) |
| Legal pages review | **Operator** |
| UAT-account purge, reconciled so `+ci-seeker`/`+ci-employer` survive ([ticket](issues/04-uat-purge-vs-ci-accounts.md)) | **Operator + engineering** |
| Double-`h1` on `/jobs` and `/pricing`, double-`<main>` on `/jobs` (SEO/a11y, pre-existing on `main`) | Engineering |
| Re-run `docs/LAUNCH-READINESS-PROMPT.md` against live prod; score ≥ 90 held or raised | Engineering |
| Cold-start check: real signup → browse → apply on the live site, fresh account | Engineering + operator inbox |

**Why launch needs it:** this *is* the launch gate — the items every earlier audit agreed are
the difference between deployed and launched.

**Depends on:** M1 merged (auditing prod means auditing the final build), Stripe keys
(operator), M3 far enough that the funnel test isn't against an empty board.

### M5 — Polish (continuous, strictly non-blocking)

Admin design-gate execution leftovers (DailyBriefing critique closures, Phases C/D), the 44px
tap-target ratchet, the shared-component pass (`06`'s order), `DetailSkeleton`/`PanelSkeleton`
announcements, the 14px ruling. **None of it gates launch; none of it may displace M1–M4
work.** Listed so it isn't lost, bounded so it can't creep.

### S1 — Demand-validation form (separable stream — cannot block launch)

Item 3 of the brief. Own branch, own migration, zero coupling to M1–M4; if it isn't wired by
Day 7 nothing about launch changes. Placement needs operator sign-off before any user-facing
wiring: [Where does the training-demand form live?](issues/05-demand-form-placement.md).

### M6 — Post-launch: Training & Qualifications (GATED)

Assessed, not built: [Training & qualifications: fit, data model, sequencing, risks](issues/06-training-quals-assessment.md).
Sequencing: liquidity gate (≥ N real jobs, v2.1's own criterion) **and** demand-form signal
(S1's data names which competencies and which side is asking). Phase order 25 → 24 → 26 per
the assessment. The kill signals from `v2.1-MILESTONE-SCOPING.md` stand.

## Decisions so far

- [Where does the training-demand form live?](issues/05-demand-form-placement.md) —
  **Option A, ruled by the operator and wired 2026-08-07**: dismissible card on both
  dashboards, in the onboarding-complete branch, outside every launch funnel. Live
  click-through captured a prod row with the clicked skills resolved by name through the
  taxonomy join, then purged. Branch `feat/training-demand-form`, stacked on PR #86.

- [Training & qualifications assessment](issues/06-training-quals-assessment.md) — fits the
  existing architecture cleanly (the 24-competency taxonomy is the join key); it is v2.1
  Phases 24–26 already scoped with a zero-added-cost constraint; sequence 25→24→26 after
  liquidity + demand signal; principal risks are content rot, third-side temptation, and
  pre-liquidity distraction — all with existing mitigations. Do not build now.

## Not yet specified

- **GTM assets beyond the product** (announcement copy, outreach cadence for launch week).
  Operator territory; charts here only if asked.
- **Post-launch monitoring cadence** — what gets watched daily in week one (signups funnel,
  counter gate, harvest cron, Stripe events). Sharpens once M4's audit rerun lands.
- **The employer a11y CI spec** still skips without an active listing (§1.15 forbids a fake
  one). Resolves naturally when M3 produces real listings — or a draft-listing probe, M5.

## Out of scope

- **Training & quals build** — M6, post-launch, gated. Assessment only, per the brief.
- **Immigration phase** — parked until post-launch (standing decision).
- **Lead-harvest scale work** (60s-gateway fix, non-NZ dropping) — deferred, standing.
- **New verticals, mentorship, bookings/payments for training** — rejected/deferred in
  `v2.1-MILESTONE-SCOPING.md` with reasons; not reopened here.
