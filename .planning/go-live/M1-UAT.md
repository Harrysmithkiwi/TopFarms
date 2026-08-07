# M1 integration UAT — one pass, both roles, one preview

**Preview:** https://top-farms-7huocqf7d-harrysymmanssmith-gmailcoms-projects.vercel.app
**Branch:** `integration/launch` (`main` + design gate + pricing v3 + framework mode)
**Prepared:** 2026-08-07 · **Time:** ~45 min · **Run it in one sitting, in order.**

## What this is

The single verification gate before three branches reach `main`, which auto-deploys to prod.
Not an auth-nav smoke test: it walks both funnels end to end, because these three branches
have never coexisted until now.

Merge order once this passes: design gate → pricing Edge Fn → pricing frontend → framework
mode. Do not reorder; the Edge Fn precedes the pricing frontend by design.

### Already verified automatically, so do not spend UAT time on it

Merged cleanly (one docs conflict, both sections kept). On the combined tree: `tsc -b` 0,
vitest **644 passed / 0 failed**, lint 0 errors at the 54 pin, design-gate 17 at pin, and
`npm run build` succeeds. Preview returns 200 on `/`, `/jobs`, `/pricing`, `/login`.

## ⚠ Two preconditions — read before you start

**1. The pricing Edge Function is NOT deployed.** `create-payment-intent` is substantially
rewritten on the pricing branch (55 insertions, 118 deletions) and prod still runs the old
one. Previews share the prod Supabase, so **§4 payment steps will exercise the new frontend
against the old function.** Two options:

- **Deploy first** (recommended, low risk today: Stripe is test-mode, 0 paid listings):
  `gh workflow run supabase-deploy.yml --ref integration/launch`
  Then re-run §4 for real. This also satisfies the "Edge Fn before frontend" ordering early.
- **Or** skip §4's payment step this pass and mark it deferred. Everything else still runs.

**2. Anything you post here lands in production.** Preview shares the prod database. Use
titles that are obviously test data, and note the job id so §6 can clean up.

## Accounts

| Role | Account |
|---|---|
| Seeker | `harry.symmans.smith+ci-seeker@gmail.com` — password in your manager (CI secret) |
| Employer | `harry.symmans.smith+ci-employer@gmail.com` — same |
| Admin | `admin@topfarms.co.nz` |

The employer account is **brand new and has never been onboarded** — §3 is its first run,
which is exactly the cold-start path a real employer will hit.

---

## §1 Public surface, signed out (5 min)

- [ ] `/` renders; **no stats band** (counter gate holds below 10 — its absence is correct)
- [ ] `/jobs` shows the empty state honestly, not a spinner or a lie
- [ ] `/pricing` shows the **v3 model**: listings free and unlimited, banded placement fee
- [ ] `/for-employers` loads, cream/Archivo marketing world intact
- [ ] Navigate `/` → `/jobs` → `/pricing` → back. **Framework mode is new here**: watch for
      a flash of unstyled content, a lost scroll position, or a route that 404s on hard reload
- [ ] Hard-reload `/pricing` directly. It must render, not 404 (SSR/route config is the risk)

## §2 Seeker funnel (10 min)

- [ ] Sign in as the seeker → lands `/dashboard/seeker`
- [ ] **Page title is 36px** and green (ruling 11), profile card below it
- [ ] **Training demand card is ABSENT.** It is on `feat/training-demand-form`, not here —
      if you see it, the wrong branch got merged
- [ ] `/jobs` → open any listing (if §3 has produced one; otherwise revisit after §3)
- [ ] **On a job with a match: you see a WORD, never a number** (Strong/Good/Possible).
      No percentage, no per-dimension points, no big circle. This is directive §1.4 and the
      single most important visual check in this pass
- [ ] Signed **out** in a private window, same job: **no fabricated "78% match"** teaser.
      A plain sign-up prompt instead
- [ ] Apply to a job → confirmation → `/dashboard/seeker/applications` shows it
- [ ] Wrong-role probe: visit `/dashboard/employer`. You must get **"Access denied" rendered
      in place**, with a working "Back to your dashboard" link — *not* a silent bounce

## §3 Employer funnel, first run (15 min)

- [ ] Sign in as the employer → onboarding wizard (never completed before)
- [ ] **Wizard titles are 20px** (ruling 11) — first visual check of that tier
- [ ] Complete onboarding. Note anything confusing: this is the exact path M3's real
      employers will walk, and friction here costs listings
- [ ] Dashboard: KPI numbers are **24px** and match the admin console's scale
- [ ] Post a job. Title it obviously test data, e.g. `UAT TEST — delete me`
- [ ] **Step 6 pricing / Step 7:** the v3 model appears (free listing, no per-listing charge)
- [ ] **§4 gate:** if the Edge Fn is deployed, complete the payment step; if not, stop here
      and mark deferred
- [ ] Listing appears on `/jobs` publicly

## §4 Payment path (5 min — only if the Edge Fn was deployed)

- [ ] The payment/confirmation step completes without a console error
- [ ] Stripe **test-mode** dashboard shows the intent
- [ ] No live charge occurred (PEND-01 has not run; live keys are not in play)

## §5 Admin (5 min)

- [ ] Sign in at `/admin`. Daily Briefing renders
- [ ] Page titles **20px**; KPI numerals **24px**; one numeral scale product-wide
- [ ] `/admin/employers` — the new employer appears
- [ ] Any admin table on a phone width: **you can scroll it sideways with the keyboard**
      (the `scrollable-region-focusable` fix)
- [ ] "Back to app" in the rail goes to `/`, not a dead bounce

## §6 Cleanup and record

- [ ] Delete or archive the UAT listing (or keep it if it is genuinely useful inventory —
      but then it is real and must be honest)
- [ ] Record the outcome at the bottom of this file: pass/fail per section, and any defect
      with the section number

---

## If something fails

A failure here is cheaper than the same failure on `main`. Report the section and what you
saw; the fix lands on the owning branch, the integration branch re-merges, and this preview
redeploys. **Do not merge to `main` with an open failure in §2, §3 or §5** — those are the
funnels and the console. §1 and §4 findings can be judged case by case.

## Outcome

*(fill in as you go)*

| Section | Result | Notes |
|---|---|---|
| §1 public | | |
| §2 seeker | | |
| §3 employer | | |
| §4 payment | | |
| §5 admin | | |
