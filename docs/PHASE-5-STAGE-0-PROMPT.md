Phase 5 · Stage 0 — get the suite honest

Operating prompt. Companion to `docs/PHASE-5-STAGING-PLAN.md` (the order), `docs/PHASE-5-PROMPT.md`
(the brief — its locked decisions hold), and `docs/evidence/phase-4-a11y.md`.

**Goal: `npm run e2e` green with credentials loaded, or every skip carrying a labelled reason.**

Stage 0 blocks stages 1–7. The migration's only safety net is the test suite; migrating 751 inline
styles against a red suite means never being able to tell which red is yours. Nothing in this stage
is migration work — it is repairing the instrument before trusting the readings.

**State: branch `phase-5-design-system`, PR #84. `npm run e2e` locally = 20 passed / 7 failed /
8 skipped with creds loaded. All 7 failures are pre-existing and were invisible until 2026-07-31,
when local `E2E_*` credentials existed for the first time.**

***
Run tests like this — Playwright does not read `.env`

    set -a; . ./.env; set +a
    npx playwright test

Without that, everything role-gated skips and the suite looks green while testing nothing. That
false-green is precisely what hid all of the below.

***
The four tasks

### 0a — Fix the active-nav contrast violation (SERIOUS, do first)

**4 axe violations, `impact: serious`**, selector `a[aria-current="page"] > span`, on
`/dashboard/seeker` and `/onboarding/seeker` at both 1200 and 360. Phase 4 never saw it because
those routes were unreachable without credentials.

Find the sidebar/nav component that sets `aria-current="page"` and read what colour the active state
paints. Expect a brand-family colour on a tinted active background — the same shape as every other
finding this phase.

**The fix is the standing token contract, not a new colour:** text on a tint uses the matching
`*-text-on-bg` token; `--color-brand` is fill-and-border only. If the active state needs to be
distinguishable *and* readable, carry the distinction with weight, a left rule, or the background —
not with a colour that fails 4.5:1.

**Verify:** `node scripts/contrast.mjs` exits 0, then the a11y spec goes green on those four cases.
Do not add an axe exclusion. The only sanctioned exclusion in this repo is `[data-decorative]`, and
an active nav item is not decorative.

### 0b — Make the marketplace specs honest (do NOT weaken them)

Three specs fail because production holds zero jobs:
`seeker-browse-jobs.spec.ts` (2) and `saved-search.spec.ts` (1). One of them is the RLS-MKT-01
regression guard that Phase 4 flagged as *passing vacuously*. It is no longer vacuous — it is now
failing honestly, which is an improvement, and it must not be quietly re-vacuum-ed.

**Decision, made — do not defer this upward.** Adopt the pattern Phase 4 already used for
`/jobs/:id`: **discover the state, then either assert or skip with a stated reason.**

    - Query the marketplace's own REST response for a job id (findJobId() in a11y.spec.ts:46
      already does exactly this — reuse it, do not write a second one).
    - Zero jobs  -> test.skip with an explicit message naming WHY, e.g.
      'marketplace is empty in this environment — RLS-MKT-01 guard cannot run'.
    - One or more -> assert fully, as today.

This is self-arming: the moment a job exists the guard runs for real, with no further edits. It also
tells the truth in the report instead of either failing forever on a legitimately empty marketplace
or passing while checking nothing.

**Forbidden:** loosening an assertion, broadening a `hasNotText`, or deleting a case. That is how
this guard became vacuous the first time, and it took a credentials change to notice.

**Operator note, not a blocker:** posting one real job arms these 3 specs plus `/jobs/:id` axe plus
the computed bookmark hit box — five checks for one action. Founder task; Stage 0 completes without
it.

### 0c — De-flake `admin/analytics`

`admin-gate.spec.ts:26` "sees all four panels" fails intermittently. **Diagnosed, not guessed:**
loading `/admin/analytics` with the admin storage state renders the `Founder Analytics` heading with
**zero console errors** — the page is fine. The assertion races the analytics RPCs.

Fix by waiting for the panels themselves (`expect(...).toBeVisible({ timeout })` per panel, or a
count assertion that retries) rather than a fixed wait. **Do not add a bare `waitForTimeout`** — that
trades a flake for a slow flake.

### 0d — CI secrets: recommend, do NOT set them yet

CI has **no** `E2E_*` secrets at repo or environment level, so every role-gated spec has been
skipping there too. That is why all of the above went unseen: CI has been green while testing
none of it.

**Deliberately not doing this yet.** The operator stated on 2026-07-31 that these passwords will be
rotated — they were shared in a chat transcript. Loading them into GitHub secrets now guarantees a
broken CI the moment they rotate, and spreads a known-compromised credential to a second system.

**Correct sequence:** rotate first → then set six secrets
(`E2E_{SEEKER,EMPLOYER,ADMIN}_{EMAIL,PASSWORD}`) → then confirm a CI run exercises the role-gated
specs rather than skipping them. Record this in the evidence doc as an open item with its reason, so
"CI is green" is never again mistaken for "CI checked this".

***
The employer account — analysed, resolved, not blocking

The operator hit `email rate limit exceeded` resetting `harryssmith11@icloud.com`, and proposed
deleting `harry.properprivacy@gmail.com` (a test seeker) to re-create it as an employer.

**That plan does not work, and is not needed.** Evidence from `auth.users` on 2026-07-31:

- `e2e-signup-…@topfarms.co.nz` sits at `confirmed: false`. Supabase's email rate limit covers
  **confirmation** emails as well as recovery ones, so a newly created account would be unconfirmed
  and unable to sign in — the same wall, one deletion later.
- `harryssmith11@icloud.com` holds the **only `employer_profile` in the database**. A fresh employer
  account would need the full onboarding wizard completed before it could test anything.
- `harry.properprivacy@gmail.com` has a `seeker_profile` and 0 applications. Deleting it destroys a
  little real test data for no gain.

**Resolution: delete nothing. Wait out the rate limit (~1 h on the free tier) and retry the reset on
`harryssmith11@icloud.com`.** Stage 0 needs no employer credential; employer is Stage 6.

***
Verify — run in this order

| # | Check | Command | Passes when |
|---|---|---|---|
| 1 | contrast gate | `node scripts/contrast.mjs > /dev/null 2>&1; echo $?` | `0`, with the 5.1b `text-brand` rule intact |
| 2 | unit | `npx vitest run` | 609 passed |
| 3 | types | `npx tsc -b > /tmp/t.log 2>&1; echo $?` | `0` — **redirect, never pipe; `PIPESTATUS` does not survive** |
| 4 | build | `npm run build > /tmp/b.log 2>&1; echo $?` | `0` |
| 5 | lint | `npx eslint src tests scripts --max-warnings 46` | `0` |
| 6 | **a11y** | `set -a; . ./.env; set +a; npx playwright test tests/e2e/a11y.spec.ts` | 0 failed; the 4 nav violations gone |
| 7 | **full e2e** | `set -a; . ./.env; set +a; npx playwright test` | **0 failed**; every skip carries a stated reason |

**Trippability is not optional.** For 0a and 0b, prove the check can still fail: re-introduce the
bad colour (via a *file copy*, never `git checkout --`) and confirm the a11y spec goes red; confirm
the marketplace guard asserts rather than skips when a job id is present. A check that cannot fail is
not a check — the admin auth setup and this very guard were both that shape, and both shipped.

***
Commits

One per task, explicit paths, in order: `0a` → `0b` → `0c`. `0d` is a docs note, not a change.
Then update `docs/PHASE-5-STAGING-PLAN.md` to mark Stage 0 closed and Stage 1 (marketing, 217
styles) ready.

***
Standing rules

CLAUDE.md §9: stage explicit paths, never discard an exit code, verify before anything destructive,
label provenance, let the gate define done. §3 diagnose before fix. §4 no history rewriting — and
note the precedent: recover originals with `git show HEAD:<file>`, never `git checkout --`.
§7 partial-close: "green" needs the command output, not a spot check.

Traps already paid for this phase: `outline-none` + `focus-visible:outline-*` paints no ring under
Tailwind v4; BSD grep silently ignores `-P`, so any lookahead written there does nothing; and a
count that drives a decision must be computed in node with a real regex, because three separate
figures in this phase were wrong.
