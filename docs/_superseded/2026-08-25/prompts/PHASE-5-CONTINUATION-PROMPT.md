Phase 5 — continuation: plan, execute, verify the remainder

Operating prompt for a fresh session. Companion to `docs/PHASE-5-PROMPT.md` (the brief — read its
locked decisions, they still hold), `docs/design/phase-5-ledger.md` (the work list), and
`docs/evidence/phase-4-a11y.md`.

**State: branch `phase-5-design-system`, PR #84 open, not merge-ready. 182 of 947 inline styles
migrated (19%). Six commits. All gates green at every commit.**

Goal unchanged: one way to do each thing. What follows is the remaining 81%, plus the five tasks
that have not started — two of which the brief says must never be cut, and which the original batch
plan wrongly scheduled last.

***
THE ONE CHANGE TO THE PLAN — read this before anything else

**Do 5.6 and 5.7 FIRST. Before finishing the migration.**

The brief warned: *"If time is short, cut scope from 5.1 — never from 5.6."* The batch plan in
`phase-5-ledger.md` then scheduled 5.6 after the whole migration, which contradicts it. One session
of solid work moved 182 of 947 styles; 765 remain. On that measured rate the migration alone is
several sessions, and 5.6 would be reached last — exactly the failure mode the brief named.

5.6 and 5.7 are also the only tasks in this phase a user would ever notice. The migration is
invisible to users and resumable by design; the false-empty-state bug is neither.

Revised order: **5.6 → 5.7 → 5.1b (the text-brand sweep) → 5.5 → 5.1 remainder → 5.3 → 5.4 → 5.8**.

***
Blockers and recommendations — decide these first

**1. Local verification of auth-gated surfaces. THE REAL BLOCKER.**

Everything left except marketing sits behind auth: employer (175 styles), admin (191), seeker
dashboards, plus every screen 5.6 touches. There are no `E2E_*` creds in the local environment, so
the per-page screenshot loop — the brief's stated success condition — cannot run on the majority of
the remaining work. Phase 4 hit this and labelled it; Phase 5 cannot, because here the visual diff
*is* the verification.

Three options, in order of preference:

| Option | Cost | Assessment |
|---|---|---|
| **A · Operator supplies `E2E_*` creds locally** | one env file | **Recommended.** They already exist in CI (`e2e-preview` runs with them). Unblocks the screenshot loop, the 5.6 abort tests on real dashboards, *and* closes the Phase 4 app-surface Lighthouse carryforward |
| B · Temp admin via SQL | ~15 min | Documented and sanctioned (memory `project-verify-with-temp-admin`), but seeds accounts into prod, which the brief explicitly discourages for this phase |
| C · Stub the session in Playwright | ~1 h, brittle | `ProtectedRoute` reads a live Supabase session; faking it means faking token refresh too. Cost is real, payoff is worse than A |

**Recommendation: A.** If A is refused, proceed with C for the 5.6 abort tests only and label every
unverified surface in the evidence doc — do not claim visual parity on a screen never rendered.

**2. `text-brand` at 3.30:1 — ~99 sites. A Phase 4 gap, not a Phase 5 one.**

Phase 4.1 demoted `--color-brand` to a fill-and-border colour. ~99 class sites still paint text with
it at **3.30:1**, an AA failure. They survived because axe only scanned six routes and these live
mostly on dashboards and admin, and because `scripts/contrast.mjs`'s source scan checks only raw
semantic colours on *tinted* backgrounds — `text-brand` on white is a different shape of the same
bug, and the gate has no rule for it.

**Recommendation: fix it as task 5.1b, and close the gate hole in the same commit.** Two parts:

- Per-site classification. `text-brand` on an `<svg>`/Lucide icon is a non-text fill needing only
  3:1 — 3.30 passes, leave it. On a `<p>`, `<span>`, `<button>`, `<Link>` it is text and must move
  to `text-brand-hover` (5.02:1). Roughly 5 icon-ish, ~70–99 text-ish by a crude heuristic that
  misclassified Lucide components — **classify by reading, the heuristic is not trustworthy enough
  to automate**.
- Extend `scripts/contrast.mjs`: fail on `text-brand`/`text-success` used on any element that is not
  an icon. If the scan cannot tell, fail closed and require an inline exemption comment.

**3. Production still holds zero jobs.** Unchanged, and no longer blocking Phase 5 — the screenshot
harness stubs the REST `/jobs` response via `page.route`, so `/jobs` and `/jobs/:id` both render.
Still blocking the Phase 4 carryforwards (the vacuous marketplace guard, two skipped a11y checks).
**Recommendation: operator posts one real job.** It is the cheapest single action available and arms
three tests at once. Not a Phase 5 task.

**4. Scale.** 765 styles + five untouched tasks will not fit one context window. This prompt is
written to be resumed: every stage ends at a committed, green state, and the ledger records what
remains. **Do not compress the verification loop to fit more migration in.**

***
Ground truth, measured at `1516729` — supersedes the brief's opening figures

| Metric | Phase start | Now |
|---|---|---|
| files with inline styles | 112 | **94** |
| `style={{` in `src` | 947 | **765** |
| — seeker | 173 | **0** ✅ |
| — marketing | 217 | 217 |
| — admin | 191 | 191 |
| — employer | 182 | 175 |
| — auth | 109 | 109 |
| — shared | 75 | 73 |
| arbitrary `text-[Npx]` | 14 distinct | 14 distinct, 602 sites |
| `Loading...` sites | 6 | 6 |
| `set-state-in-effect` warnings | 27 | 28 |

Figures from `node scripts/phase-5/ledger.mjs`, which is the authority — an ad-hoc grep over
hand-listed paths disagreed with it during this session and the ledger was right. Re-run it at the
start of the session; do not trust the table above once you have changed anything.

**Silent error-return sites (Task 5.6): 22 across 17 files.** Measured, not estimated:

    3  pages/dashboard/employer/ApplicantDashboard.tsx   (144, 159, 200)
    2  pages/dashboard/seeker/MyApplications.tsx         (62, 76)
    2  pages/verification/FarmPhotoUpload.tsx            (47, 67)
    2  pages/verification/EmployerVerification.tsx       (156, 187)
    1  each: admin/PlacementPipeline.tsx:84 · dashboard/EmployerDashboard.tsx:119 ·
       verification/DocumentUpload.tsx:36 · jobs/JobSearch.tsx:382 · jobs/MarkFilledModal.tsx:48 ·
       jobs/JobDetail.tsx:190 · onboarding/steps/SeekerStep4Skills.tsx:31 ·
       ui/DocumentUploader.tsx:154 · ui/SkillsPicker.tsx:123 · ui/FileDropzone.tsx:168 ·
       landing/CountersSection.tsx:50 · admin/LeadsFunnel.tsx:33 ·
       saved-search/SavedSearchesDropdown.tsx:67

**CORRECTION TO THE BRIEF, and it changes how you sweep.** The brief called this
"silent-catch-then-empty-state" and named `ApplicantDashboard.tsx:198-201`. The construct is not
`try/catch` — there are only 31 `catch` occurrences in `src` and nearly all surface an error. The
real idiom is Supabase's error-return:

    if (appError) {
      console.error('ApplicantDashboard: failed to load applicants', appError)
      setLoading(false)
      return            // <- applicants stays [], render shows "no applicants"
    }

Grepping for `catch` finds almost none of the 22. Grep for `if (<x>Error)` followed within ~8 lines
by a `return` with no `setError`. 73 other sites *do* surface an error — the pattern to copy already
exists in this codebase; find one and match it.

***
Tasks, in the revised order

**5.6 — One error idiom. Do this first. (22 sites, 17 files)**

Three states, never collapsed: **loading** · **empty (verified zero)** · **failed (unknown)**. Today
the third renders as the second.

Highest-value site is `ApplicantDashboard.tsx:200` — an employer who paid to list a job, on a flaky
rural connection, is told nobody applied. That is a revenue event caused by an `if` block. Second is
`JobSearch.tsx:382`: the marketplace itself silently rendering "no jobs" on a failed fetch, which
also happens to be indistinguishable from the genuinely-empty marketplace we currently have.

Introduce the error+retry surface once, in `components/ui`, and consume it. Do not invent it 17
times — that is the variance this phase exists to remove.

**5.7 — Offline. `navigator.onLine` listener, global banner, retry affordance.** Rural connectivity
is the stated audience condition. Small task, do it while the error surface from 5.6 is fresh —
they share the retry affordance.

**5.1b — The `text-brand` sweep.** See blocker 2. Fix the sites and close the gate hole together, or
the next migration re-introduces them.

**5.5 — One loading idiom. (6 sites)** `ProtectedRoute.tsx` (×2), `SelectRole.tsx`,
`AdminLoginPage.tsx`, `SeekerDashboard.tsx`, `EmployerDashboard.tsx`. Note `components/admin/
Skeleton.tsx` already exists and there is **no** shared `components/ui` skeleton — promote the admin
one rather than writing a second.

**5.1 remainder — SUPERSEDED.** Owned by `docs/PHASE-5-MIGRATION-PROMPT.md`, which reorders the
surfaces for verifiability (marketing and auth first, employer and admin last) because 5.6 is now
complete and the local-creds blocker has not been resolved. Read that document, not the paragraph
below, which is kept only for the tooling notes.

~~Order:~~ **employer → auth → admin → shared → marketing.** Employer
and auth first (they carry the 5.6 fixes and every user passes through auth); marketing last
(highest count, lowest risk, out of cheat-sheet density scope — colour tokens still migrate).

Tooling is **committed at `scripts/phase-5/`** — read its README before using it:
- `node scripts/phase-5/migrate.mjs <file>` — single-property colour styles → utilities, merged into
  the enclosing tag's className. Reports anything it cannot handle instead of dropping it. Handled
  160 of 182 automatically; the rest were hand edits.
- `node scripts/phase-5/shot.mjs <label> <route...>` — before/after at 1200 and 360, with the REST
  stub. Needs `npx vite preview --port 4173`; `SHOT_DIR` overrides the output path.
- `node scripts/phase-5/ledger.mjs` — regenerates `docs/design/phase-5-ledger.md`.

Delete `scripts/phase-5/` at phase exit. It is scaffolding, not a gate.

Residue the transform cannot do, expect to hand-edit: multi-property style objects, ternary colours,
`className={cn(...)}` expressions, raw `rgb()`/`rgba()` literals.

**5.3 — Kill untokened hex. (34 literals)** Two sanctioned exceptions keep a comment saying why:
`PaymentForm.tsx:89-103` (Stripe's `appearance` API takes hex, not classes) and third-party logo
fills. Named offenders: `#2563eb`, `#1a3a10`, `#28c840`.

**5.4 — Component consolidation.** Merge `JobCard.tsx` (181 lines) and `SearchJobCard.tsx` (226)
into one variant-driven card; give the five sidebars (`ApplicantDashboard`, `Filter`, `JobDetail`,
`LivePreview`, `MyApplications`) a shared shell.

**NON-NEGOTIABLE:** `SearchJobCard` was un-nested in Phase 4.3 and its bookmark is a 44×44 target
guarded by `tests/tap-targets.test.tsx`. The merge must keep the stretched-link pattern
(`after:absolute after:inset-0` on the title button, bookmark at `relative z-10`) and keep that test
green. **If the merge makes the test fail, the merge is wrong — not the test.**

**5.8 — Client state, surgically. (28 warnings)** Fix races and double-fetches. Add a small
`useAsyncData` hook, use it for the 5.6 pages and new work only. **Leave working pages alone** —
audit §11.3 rules out a rewrite and the risk register names scope creep here as this phase's main
risk.

**5.9 — Evidence.** `docs/evidence/phase-5-design-system.md`, checks D1–D8, **D8 first**. Carry the
cheat-sheet reconciliation table with its computed ratios — the next person to bring an external
reference needs the precedent. Record the two corrections to the brief (six-step scale → two tokens;
silent-catch → error-return) and the `text-brand` finding with its provenance.

***
The execute loop — unchanged, and do not compress it

    1. screenshot at 1200 and 360                    <- before
    2. migrate
    3. node scripts/contrast.mjs                     <- NEW failures here are the gate working
    4. npx vitest run
    5. screenshot, compare                           <- identical is the success condition
    6. commit that page/surface alone, explicit paths

Hard-won rules from the completed 19%:

- **Read the diff, not just the gates.** The spinner sweep stripped `borderColor` without adding the
  replacement class — 11 spinners would have shipped inheriting `currentColor`. `tsc -b` and 609
  tests were both green with the bug present. Only reading the diff caught it.
- **Recover originals with `git show HEAD:<file>`, never `git checkout --`.** (Phase 4 §8.)
- **Assert the site count when scripting a multi-file edit.** A `WARN` on count mismatch is what
  stopped a wrong colour landing in `JobStep7Payment.tsx`.
- **No apostrophes inside `@theme` comments.** Tailwind v4 parses `'` as a string delimiter even in
  a comment and the build fails somewhere unrelated-looking.
- **Tailwind tree-shakes unused theme vars**, so grepping built CSS for a utility nobody uses proves
  nothing. Prove with a temporary probe component.
- **`text-[9px]` etc. appear in the `index.css` comment.** The D2 gate command needs
  `--exclude=index.css` or it counts prose.

***
Verify — Stage 3, D8 first

| Check | Method | Passes when |
|---|---|---|
| **D8** journeys | `npm run e2e` · `npx vitest run` · `tsc -b` · `npm run build` | all green, run **first** |
| D1 migration | `grep -ro "style={{" src/pages \| wc -l` + ledger | colour props 0; layout-only survivors counted and each commented |
| D2 type scale | `grep -rho 'text-\[[0-9]*px\]' src --exclude=index.css \| sort \| uniq -c` | empty |
| D3 contrast | `node scripts/contrast.mjs` | exit 0 **and** the evidence doc names the violations the migration exposed. One is already banked: `SaveSearchModal` 3.95:1 |
| D4 hex | `grep -rE '#[0-9a-fA-F]{6}' src` minus 2 sanctioned | 0 |
| D5 loading | grep `Loading...` | 0; skeleton on every async surface |
| **D6 error states** | Playwright `page.route('**/rest/v1/**', r => r.abort())` per screen | every screen shows an error **with retry**; none shows an empty state. **Behavioural, not a grep** |
| D7 offline | `page.context().setOffline(true)` | banner appears, retry works |
| D8b Phase 4 gates | `npm run e2e` + `tap-targets` + `a11y-focus-motion` | no regression from the card merge |

**D6 is the check most likely to be faked.** A grep proves nothing — the whole finding is that the
code *handles* the error and renders the wrong thing. Abort the request and look at what the user
sees. Same discipline as Phase 4's A7, where a source grep would have missed that the CSS
reduced-motion clamp never reached JS animation.

***
Exit gate

1. Colour props at 0 in `src/pages`; survivors counted in the evidence doc — no silent caps
2. Zero untokened hex outside the two sanctioned sites
3. `scripts/contrast.mjs` exits 0 with the newly-visible surface included, and **with the
   `text-brand` rule added**
4. One skeleton in use on every async surface
5. Induced network failure on every major screen shows an error with retry — demonstrated
6. `npx vitest run tests/tap-targets.test.tsx` green after the card merge
7. `npm run e2e` green including the Phase 4 axe gate
8. `tsc -b` clean, vitest green, lint within the 46-warning cap

***
House rules

CLAUDE.md §9: stage explicit paths, never discard an exit code (`$?` after any pipe — `PIPESTATUS`
does not survive), verify before anything destructive, label provenance, let the gate define done.
§3 diagnose before fix. §4 no history rewriting. §7 partial-close discipline — "migrated" needs a
count per surface, not a spot check.

Known trap: under Tailwind v4, `outline-none` + `focus-visible:outline-*` paints no ring at all.
Phase 4.4b removed it from 12 components. A migrated page that reintroduces it loses keyboard focus
silently, and axe will not catch it.
