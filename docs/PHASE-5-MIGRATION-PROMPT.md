Phase 5.1 — the bulk inline-style migration

Operating prompt for the largest remaining chunk of Phase 5. Companion to
`docs/PHASE-5-PROMPT.md` (the brief — its locked decisions still hold) and
`docs/design/phase-5-ledger.md` (the work list, regenerate it first).

**Supersedes the "5.1 remainder" section of `docs/PHASE-5-CONTINUATION-PROMPT.md`.** That document
remains the authority for tasks 5.3, 5.4, 5.8 and 5.9; this one owns 5.1. Where they disagree about
migration order, **this one is correct** — the reasoning is below and it is new information.

**State: branch `phase-5-design-system`, PR #84 open. 751 inline styles across 93 files remain
(was 947 / 112). 5.1b, 5.5, 5.6 and 5.7 are complete. All gates green at every commit.**

***
THE CHANGE TO THE ORDER — read this first

The continuation prompt said **employer → auth → admin → shared → marketing**, reasoning that
employer and auth carry the 5.6 fixes. 5.6 is now finished, so that reason has expired. Meanwhile
a harder constraint has held across three sessions: **there are still no local `E2E_*` creds**, and
employer plus admin are **353 of the 751 remaining styles on surfaces that cannot be rendered
locally at all**.

The brief's stated success condition for every page is a before/after screenshot that is
*identical*. On employer and admin that check cannot run. Migrating them first means doing the
riskiest 47% of the work with the weakest verification, and finding out later.

**Revised order — verifiability first:**

| # | Surface | Styles | Locally renderable? | Why here |
|---|---|---|---|---|
| 1 | **marketing** | 217 | **Yes** — `/`, `/pricing`, `/for-employers`, `/privacy`, `/terms` | Biggest single block, fully screenshot-verifiable, lowest blast radius. Proves the loop at scale before anything unverifiable |
| 2 | **auth** | 108 | **Yes** — `/login`, `/signup`, `/forgot-password` | Every user passes through once, usually on a phone |
| 3 | **shared** | 73 | Partly — via the pages above | `components/ui`, `layout`, `tremor`. Consumed by everything, so late enough that pages are already done, early enough to catch shell regressions on renderable routes |
| 4 | **employer** | 171 | **No** | Unverifiable visually — do it once the transform has 398 styles of evidence behind it |
| 5 | **admin** | 182 | **No** | Same, and desktop-only, so 360px risk is lowest |

Marketing being first also inverts the brief's density note in a useful way: marketing is **out of
cheat-sheet scope** and keeps its airier scale, so it is a pure colour-token migration with no type
judgement — the simplest possible proving ground.

**Before starting surface 4, push the branch and let CI run.** `e2e-preview` has the creds this
machine lacks; it exercises the employer error-state and axe checks that skip locally. That is the
only verification available for surfaces 4 and 5, and it is worth having *before* migrating them
rather than after.

***
Blocker, restated once, then work around it

`E2E_*` creds remain absent locally. Asked twice, not yet resolved; not a reason to stall. The
order above is the workaround. If the creds appear, migrate employer and admin with the full
screenshot loop and delete this paragraph.

**Under no circumstances claim visual parity on a screen that was never rendered.** For surfaces 4
and 5 the evidence doc says exactly what was checked: transform diff read line by line, `tsc -b`,
contrast gate, vitest, CI axe — and *not* a screenshot. Phase 4 labelled its skips; this must too.

***
Ground truth, measured at `e8ee5d2`

Regenerate before starting: `node scripts/phase-5/ledger.mjs`

| Surface | Files | `style={{` | colour refs |
|---|---|---|---|
| marketing | 17 | 217 | 195 |
| admin | 24 | 182 | 192 |
| employer | 26 | 171 | 181 |
| auth | 8 | 108 | 156 |
| shared | 18 | 73 | 78 |
| **total** | **93** | **751** | **802** |

**Residue the transform cannot handle — 219 sites, ~29% of the total.** Do not plan as if
`migrate.mjs` does all of it:

| Shape | Count | Treatment |
|---|---|---|
| multi-property `style={{` objects | 101 | Hand edit. This is where the real bugs hide — the 3.95:1 error message was one |
| raw `rgba()` / `rgb()` | 114 | Hand edit to a token, or `bg-*/opacity`. Heaviest in `HeroSection` (29), `LandingFooter` (14), `TestimonialsSection` (7) — i.e. **surface 1** |
| hex literals | 34 | Task 5.3, not this one — but note them as you pass |
| ternary colour | 4 | Conditional className |

***
The execute loop — per page, do not compress

    1. SHOT_DIR=/tmp/p5 node scripts/phase-5/shot.mjs before-<page> <route>   (renderable only)
    2. node scripts/phase-5/migrate.mjs <file>        # read its SKIP report
    3. hand-fix the residue it reported
    4. node scripts/contrast.mjs                      # NEW failures = the gate working
    5. npx tsc -b > /tmp/t.log 2>&1; echo $?          # never pipe to tail, see below
    6. npx vitest run
    7. shot again, compare                            # identical is the success condition
    8. commit that page or tight group, explicit paths

**Type sizes** migrate in the same pass: `9,10 → text-micro` · `11 → text-micro` · `12 → text-xs` ·
`13 → text-label` · `14 → text-sm` · `15 → text-sm or text-base` · `17 → text-base or text-lg` ·
`18 → text-lg` · `22 → text-2xl` · `28 → text-3xl`. 15 and 17 are judged by looking at the render,
not by rule — marketing is where most of them live and where you can actually see them.

***
Hard-won rules — every one of these cost real time this phase

1. **Read the diff, not just the gates.** A perl sweep stripped `borderColor` without adding the
   replacement class; 11 spinners would have shipped inheriting `currentColor`. `tsc -b` and 609
   tests were green with the bug present.
2. **Never pipe a command whose exit code you need.** `npx tsc -b 2>&1 | tail -3` reported success
   while tsc was failing with exit 2 — `PIPESTATUS` does not survive. Redirect to a file, read `$?`.
3. **Assert anchors, never compute line numbers.** An insert shifted every subsequent line and the
   next edit landed in the wrong place. Assert the target string is present at the line you think it
   is; a count mismatch must fail loudly.
4. **Anchor imports on a complete single-line import** (`/^import .*from '[^']+'$/`). "Insert after
   the last import line" landed inside a multi-line `import type {` block.
5. **JSX comments cannot sit between attributes.** Put them in children position, above the element.
6. **No apostrophes inside `@theme` comments** — Tailwind v4 parses `'` as a string delimiter even
   in a comment and fails the build somewhere unrelated-looking.
7. **Recover originals with `git show HEAD:<file>`, never `git checkout --`.** (Phase 4 §8.)
8. **Verify a measurement before planning around it.** Three separate figures in this phase were
   wrong: `text-brand\b` also matches `text-brand-hover`; BSD grep silently ignores `-P`, so any
   lookahead you write there does nothing; and "6 `Loading...` sites" missed four that spelled the
   same idiom differently. When a count drives a decision, compute it in node with a real regex.

***
Per-surface notes

**1 · marketing (217).** Out of cheat-sheet density scope — keeps its airier scale, so this is a
pure colour migration. `HeroSection` alone holds 29 raw `rgba()` and 37 style props; expect it to be
a third of the surface's effort. Routes: `/`, `/pricing`, `/for-employers`, `/privacy`, `/terms`.
Shoot all five at 1200 and 360.

**2 · auth (108).** 156 colour refs against 108 style props — the highest ratio in the repo, so
expect multi-property objects. Routes: `/login`, `/signup`, `/forgot-password`. Mobile-first surface;
check 360 carefully.

**3 · shared (73).** `components/ui`, `components/layout`, `components/tremor`. **Run the Phase 4
gates after any change here** — `npx vitest run tests/tap-targets.test.tsx
tests/a11y-focus-motion.test.tsx`. `SearchJobCard`, `Tag`, `Button`, `MatchCircle` and `Toggle` all
carry class contracts from Phase 4. `components/ui/Skeleton.tsx` and `ErrorState.tsx` are already
token-clean — skip them.

**4 · employer (171).** Unverifiable locally. `PostJob` and its 8 wizard steps dominate. The wizard
is the revenue funnel: a broken step is a lost listing, so read every diff twice and lean on CI.

**5 · admin (182).** Unverifiable locally, desktop-only, dense tables. This is where the rico
cheat-sheet density genuinely applies (see the brief) — but **do not redesign while migrating**.
Colour and type only; density is a separate decision with its own before/after.

***
Verify

| Check | Method | Passes when |
|---|---|---|
| D1 | `grep -ro "style={{" src/pages \| wc -l` + ledger | colour props 0; layout-only survivors counted and each commented |
| D2 | `grep -rho 'text-\[[0-9]*px\]' src --exclude=index.css \| sort \| uniq -c` | empty |
| D3 | `node scripts/contrast.mjs` | exit 0, **including the 5.1b `text-brand` rule** |
| D8 | `npm run e2e` · `npx vitest run` · `tsc -b` · `npm run build` | all green |
| visual | per-page shots, surfaces 1–3 | identical, or every difference named |
| CI | push before surface 4 | `e2e-preview` green with the creds this machine lacks |

Update `docs/design/phase-5-ledger.md` as surfaces complete — it is the resumption point, and a
stale ledger is worse than none.

***
House rules

CLAUDE.md §9 throughout: stage explicit paths, never discard an exit code, verify before anything
destructive, label provenance, let the gate define done. §3 diagnose before fix. §4 no history
rewriting. §7 partial-close — "migrated" needs a count per surface, not a spot check.

Known trap: `outline-none` + `focus-visible:outline-*` paints no ring at all under Tailwind v4. If a
migrated page reintroduces the combo, keyboard focus vanishes silently and axe will not catch it.
