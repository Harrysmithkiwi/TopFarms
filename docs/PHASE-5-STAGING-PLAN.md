Phase 5 — sequential staging plan

Written 2026-07-31 after local `E2E_*` credentials were supplied for the first time. Supersedes the
ordering in `docs/PHASE-5-MIGRATION-PROMPT.md`, because the creds changed what is verifiable and
immediately exposed work that must land before the migration continues.

**State: branch `phase-5-design-system`, PR #84. 751 inline styles across 93 files remain.
5.1b, 5.5, 5.6, 5.7 complete. `npm run e2e` is now RED locally — 7 failures, all pre-existing and
newly visible. That is the point of the creds, not a regression.**

***
What the credentials revealed

Nothing here is new breakage. These are defects that existed all along, in code no test could reach.

| Finding | Severity | Where |
|---|---|---|
| **Admin auth setup was vacuous** — saved a pre-auth storage state, so every admin spec silently redirected to `/login` | harness | Fixed already, commit on this branch |
| **No `E2E_*` secrets exist in CI either** — repo and both environments. These specs have never run anywhere | process | Operator decision, below |
| **Active nav item fails contrast** (`a[aria-current="page"] > span`) | **serious a11y** | Seeker dashboard + onboarding, 4 axe violations |
| **Marketplace specs fail on an empty marketplace** | test integrity | `seeker-browse-jobs`, `saved-search` — 3 failures, all "there are no jobs" |
| **`admin/analytics` panel assertion is flaky** | flake | Passes on manual render with no console errors; timing assumption never validated |

***
Stages, in order. Each ends green and committed.

### Stage 0 — get the suite honest — ✅ COMPLETE (2026-07-31)

`npm run e2e` = **27 passed / 0 failed / 10 skipped**, every skip carrying a stated reason.
Closed: 0a (active-nav 3.04:1 **and** a `cn()` bug of mine that silently stripped text colours
product-wide), 0b (marketplace guards assert-or-skip; a real save race in saved-search), 0c
(admin bare-goto races; Panel titles were `<div>`, not headings). 0d recommended, deliberately
deferred until the passwords are rotated. **Stage 1 (marketing, 217 styles) is ready.**

Original scope below, kept for the record.

#### Stage 0 — get the suite honest (do first, blocks everything)

The migration's safety net is the test suite. Migrating 751 styles against a red suite means never
knowing which red is yours.

**0a. Fix the nav contrast violation.** `a[aria-current="page"] > span` on the dashboard sidebar,
4 serious axe violations across seeker dashboard and onboarding at both widths. This is a token
question, which is exactly this phase — and Phase 4 would have caught it if the routes had been
reachable. Fix, then confirm the a11y spec goes green.

**0b. Decide the empty-marketplace question.** Three specs now fail because production holds zero
jobs, including the RLS-MKT-01 regression guard that Phase 4 flagged as passing vacuously. It is no
longer vacuous — it is failing honestly. Options:

  - **Post one real job** (recommended). Arms these 3 specs, plus `/jobs/:id` axe, plus the computed
    bookmark hit box. Five checks for one action. Founder task, not engineering.
  - Gate the specs on job count and skip cleanly with a label. Keeps CI green, keeps the coverage
    hole, and needs undoing later.

  **Do not "fix" them by weakening the assertion.** That is how the guard became vacuous the first
  time.

**0c. Stabilise `admin/analytics`.** Renders correctly on manual load; the spec's four-panel
assertion races the RPCs. Wait on the panels rather than a fixed timeout.

**0d. Operator: put the creds in GitHub secrets.** CI is currently green while skipping every
role-gated spec — a weaker signal than it looks, and the reason all of the above went unseen. Six
secrets: `E2E_{SEEKER,EMPLOYER,ADMIN}_{EMAIL,PASSWORD}`.

**Exit:** `npm run e2e` green locally with creds loaded, or every skip labelled with a reason.

### Stage 1 — marketing (217 styles, 17 files)

Fully renderable: `/`, `/pricing`, `/for-employers`, `/privacy`, `/terms`. Out of cheat-sheet
density scope, so pure colour migration, no type judgement. Heaviest residue lives here — 29 raw
`rgba()` in `HeroSection` alone. Screenshot per route at 1200 and 360.

### Stage 2 — auth (108 styles, 8 files)

`/login`, `/signup`, `/forgot-password`. 156 colour refs against 108 style props — the highest ratio
in the repo, so expect multi-property objects. Mobile-first surface; check 360 carefully.

### Stage 3 — shared (73 styles, 18 files)

`components/ui`, `components/layout`, `components/tremor`. Consumed by everything, so it lands after
the pages that reveal breakage. **Run the Phase 4 gates after every change here:**
`npx vitest run tests/tap-targets.test.tsx tests/a11y-focus-motion.test.tsx`. `Skeleton.tsx` and
`ErrorState.tsx` are already token-clean — skip them.

### Stage 4 — seeker dashboards (now verifiable)

Newly unblocked by the seeker credential. Screenshot `/dashboard/seeker`, `/dashboard/seeker/*`,
`/onboarding/seeker` for real.

### Stage 5 — admin (182 styles, 24 files)

Now verifiable with the admin credential. Desktop-only, dense tables. This is where the rico
cheat-sheet density genuinely applies — but **do not redesign while migrating.** Colour and type
only; density is its own decision with its own before/after.

### Stage 6 — employer (171 styles, 26 files) — STILL BLOCKED

**No employer password was supplied.** `harryssmith11@icloud.com` exists and has signed in, but its
password is unknown to this environment, so `/dashboard/employer`, `/jobs/new`, the 8 wizard steps
and `/onboarding/employer` cannot be rendered or screenshotted.

`PostJob` and its wizard are the revenue funnel — a broken step is a lost listing. This is the worst
surface to migrate blind and it is deliberately last.

**Needs one of:** the employer password added to `.env`, or a throwaway employer account created
through `/signup`. Until then, either defer Stage 6 or ship it with the evidence doc stating plainly
that it was verified by diff, `tsc`, contrast, vitest and axe — **and not by looking at it.**

### Stage 7 — 5.3, 5.4, 5.8, 5.9

Per `docs/PHASE-5-CONTINUATION-PROMPT.md`: untokened hex (34), component consolidation, client-state
races (28 warnings), evidence doc. 5.4 must keep `tests/tap-targets.test.tsx` green — if the card
merge breaks it, the merge is wrong, not the test.

***
Running with credentials

`.env` holds them and is gitignored + untracked (verified). Playwright does not read `.env`
automatically:

    set -a; . ./.env; set +a
    npx playwright test

**Security note.** These passwords were shared in a chat transcript on 2026-07-31 and the operator
has said they will rotate. Until then, treat the transcript as sensitive. `admin@topfarms.co.nz` is
a full-access account.

***
Standing rules

CLAUDE.md §9: stage explicit paths, never discard an exit code (`$?` after a redirect — `PIPESTATUS`
does not survive a pipe), verify before anything destructive, label provenance, let the gate define
done. §3 diagnose before fix. §4 no history rewriting. §7 partial-close.

Two traps already paid for: `outline-none` + `focus-visible:outline-*` paints no ring in Tailwind v4;
and a check that cannot fail is not a check — the admin auth setup and the marketplace guard were
both of that shape.
