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
### ▶ IN PROGRESS — integration branch built, UAT prepped, awaiting the operator pass

`integration/launch` = `main` + all three branches. Merged 2026-08-07 with **one conflict**
(`v11-DIRECTIVE.md`, both branches appending a section; kept both, §1.18 then §1.19).
Combined-tree gates: `tsc -b` 0, vitest **644 passed / 0 failed**, lint 0 errors at the 54
pin, design-gate 17 at pin, `npm run build` succeeds. Preview live and public, 200 on
`/`, `/jobs`, `/pricing`, `/login`.

**Script: [`M1-UAT.md`](M1-UAT.md)** — ~45 min, one sitting, both roles.
**Preview:** https://top-farms-7huocqf7d-harrysymmanssmith-gmailcoms-projects.vercel.app

**Blocker found while prepping, needs an operator call:** `create-payment-intent` is
substantially rewritten on the pricing branch (55 insertions, 118 deletions) and **is not
deployed**. Previews share prod Supabase, so the UAT's payment step would run the new
frontend against the old function. Deploying first is low risk today (Stripe test-mode, 0
paid listings) and satisfies the Edge-Fn-before-frontend ordering early:
`gh workflow run supabase-deploy.yml --ref integration/launch`. Not run unasked — it changes
production behaviour.


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
| ✅ Double-`h1` on `/jobs` and `/pricing`, double-`<main>` on `/jobs` — **done 2026-08-07**, see below | Engineering |
| Re-run `docs/LAUNCH-READINESS-PROMPT.md` against live prod; score ≥ 90 held or raised | Engineering |
| Cold-start check: real signup → browse → apply on the live site, fresh account | Engineering + operator inbox |

**Why launch needs it:** this *is* the launch gate — the items every earlier audit agreed are
the difference between deployed and launched.

**Depends on:** M1 merged (auditing prod means auditing the final build), Stripe keys
(operator), M3 far enough that the funnel test isn't against an empty board.

#### Landmark/heading closure — done 2026-08-07, riding the merge train

Fixed on the owning branches rather than straight to `main`, so no extra production release
is needed and the UAT preview covers the final tree.

| Defect | Fix | Branch (merge slot) |
|---|---|---|
| `/jobs` two `h1` — `SearchHero` plus `JobSearch`'s mobile sticky bar | mobile bar → `h2` | `design/admin-gate` ① |
| `/jobs` nested `<main>` — one in `PublicShell`, one round the desktop results column | results column → `div` | `design/admin-gate` ① |
| `/jobs` desktop headings jump `h1 → h3` (the only `h2` is `md:hidden`) | `sr-only` `h2` naming the results region | `design/admin-gate` ① |
| `/pricing` two `h1`, one per audience view, both in the client DOM | one shared hero, strings swapped by `emp-only`/`seek-only` spans inside a single `h1` — the pattern `HeroSection` already uses | `pricing/model-v3` ③ |
| `/jobs/:id` nested `<main>` — the same defect, on the sibling route, **and this one is server-rendered** | `JobDetail`'s wrapper → `div` | `design/admin-gate` ① |
| `/login` and `/signup` had **no `<main>` at all** — `AuthLayout` has no shell around it | inner wrapper → `main` | `design/admin-gate` ① |

**Why a `<span>` swap and not a JS branch:** directive 1.11 requires both audience strings in
the DOM so the page is correct without JavaScript. A conditional render would break that.

**Regression guard**, in `tests/e2e/a11y.spec.ts`: `/`, `/jobs`, `/pricing`, `/for-employers`
each assert exactly one `h1`, one `main`, **and which `h1` they got**; `/` and `/pricing` run
through **both audience lenses**; `/login` and `/signup` assert their landmark separately.
**The existing axe sweep already visited these routes and stayed green through every one of
these defects**, because `landmark-no-duplicate-main` and the heading rules are *moderate*
impact and `runAxe` only logs moderate. Same blind spot the admin heading-navigation test was
written for.

The guard is split across two branches on purpose, and each half sits with its fix so neither
branch's own preview CI goes red before the train runs: the route block on `pricing/model-v3`
(③, since `/pricing` only satisfies it then), the `/login` block on `design/admin-gate` (①).
**Both append to the end of `a11y.spec.ts`, so merge ③ conflicts there — keep both blocks.**
Already resolved that way on `integration/launch`, so the resolution can be copied.

**A verifier briefed to refute is what produced the last three rows above and the guard's own
two holes.** It also corrected a claim: the commit message for `efbe2f1` justifies the
`/pricing` fix with "both sit in the served HTML, so a crawler reads two competing h1s" —
that premise is **false**, and finding 2 below says why. The fix is still right for
JS-rendering crawlers and for the document outline; the stated reasoning was not.
Two further corrections, made out loud rather than quietly: the fixes are not *purely*
semantic — the employer `h1`'s `max-w` moved `18ch → 20ch`, inert for a 13-character string
but it shifts the wrap boundary for any longer headline later. And my first run of the
strengthened guard **failed on my own regex**, not on the product: the landing `h1` is
CSS-uppercased so `innerText` returns `"THE RIGHT MATCH,"`. Patterns are case-insensitive now.
That failure only surfaced because the guard was run against a live preview instead of
assumed green.

Evidence: gates on the merged tree — `tsc -b` 0, vitest 644/0, lint 0 errors at the 54 pin,
design-gate **16** at the 17 pin (one literal below; ratchet the pin to 16 once all four
branches are on `main`), `npm run build` OK. Live preview
`top-farms-7zjk4eotu`: **15/15** — guard 6/6 across both lenses, `/login`+`/signup` landmark,
and the anonymous axe sweep; `/jobs`'s
`heading-order` moderate is gone; both audience views of `/pricing` screenshot-checked, and
the seeker CTA pill measured 135.9px, not stretched — `.seek-only` forces `display:block`, so
the class sits on a wrapper `div` rather than the `Link`.

#### Advisor sweep — prod, read-only, 2026-08-07

Run early because the score inputs it measures are prod-state facts the merge train cannot
change. **0 ERROR, 73 WARN, 10 INFO.** The 67 headline WARNs are
`authenticated_security_definer_function_executable` on `admin_*` RPCs — expected by design
(CLAUDE.md §10: the boundary is `_admin_gate()`, not the grant), and **verified rather than
assumed**: a `pg_proc` sweep for `admin_*` definer functions whose body omits `_admin_gate`
returns **zero rows**. `set_user_role` also survives inspection — it requires `auth.uid()`,
whitelists `('employer','seeker')` so **admin is not settable**, writes only for the caller,
and refuses any later change with `42501`. One WARN is operator-owned:
`auth_leaked_password_protection` is off (Supabase dashboard, Auth → Passwords). The 10 INFOs
are `rls_enabled_no_policy` on deny-by-default tables such as `admin_audit_log`, which is the
intended posture. One WARN did not survive — see item 4 below.

#### Filed, not fixed — found while closing the above

1. **`/` has the same `heading-order` skip**, `h1` then three `h3`s with no `h2`, at both
   widths. Confirmed **pre-existing**: identical heading list on the pre-fix preview
   `top-farms-7huocqf7d`. One `sr-only` `h2` fixes it, same shape as the `/jobs` fix. Not
   done unasked — `/` is the settled marketing canon and CLAUDE.md §10 puts only the *filing*
   of a11y findings in scope there, not unrequested edits. Operator's call.
2. **`/`, `/pricing` and `/for-employers` serve no HTML content** — a 6KB shell and the
   generic site `<title>`, versus 60KB of real markup on `/jobs`. Deliberate and documented
   (`src/routes.ts`, directive 1.16: only routes that must appear in raw HTML get a module),
   and identical to prod today, so **not a regression**. But the reasoning in that comment is
   about *gated* routes — "a crawler cannot see a dashboard" — and these three are the public
   marketing surfaces a crawler most wants. Promoting a route is a two-file change plus a
   hydration audit. Post-launch SEO item, not a blocker: Google renders JS.
3. **A `vite preview` from 1 August was still holding port 4173** on this machine, serving a
   six-day-old `dist/`, and the first local verification run silently tested against it.
   Killed. `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so any local
   `npx playwright test` will attach to whatever is on 4173 — a standing false-green risk
   locally. CI is unaffected (`reuseExistingServer` false there).
4. **`compute_match_score(seeker_id, job_id)` and `compute_match_scores_batch` are
   `SECURITY DEFINER`, take an arbitrary `seeker_id`, and carry `GRANT EXECUTE … TO
   authenticated` with no `auth.uid()` check** (`pg_proc`, verified live). Any signed-in user
   holding a `seeker_profiles.id` can recompute that seeker's full per-dimension breakdown —
   shed, location, accommodation, skills, salary, visa, couples — against any job, which is
   exactly the data directive §1.4 keeps from workers and which routes around
   `employer_may_view_seeker`. **Nothing in `src/` calls either RPC** (`grep -rn '\.rpc('`),
   so the grant is vestigial: migration `037_definer_function_hardening.sql:105-106` re-granted
   them as part of a blanket list after revoking from `PUBLIC, anon`, not as a considered
   decision about these two. Remediation is one line each —
   `REVOKE EXECUTE ON FUNCTION public.compute_match_score(uuid,uuid) FROM authenticated;` —
   and safe, because the trigger and precompute paths call it inside owner-context definer
   functions. **Deliberately not applied:** a prod grant change with three branches queued to
   merge is the wrong moment, and mis-scoping it would break match precompute silently.
   Needs a confirming read that no Edge Function calls it either. Exploitation needs a known
   uuid, so this is moderate, not a blocker.
5. **`E2E_EMPLOYER_EMAIL`/`_PASSWORD` are absent from the local `.env`**, so the employer
   storage-state setup skips every local e2e run. CI has them; a local run is quietly
   thinner than CI. Also: the preview's first sign-in **cold** exceeded the 30s setup timeout
   twice, then passed in 4.6s warm — worth remembering when the M4 cold-start check runs.

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
