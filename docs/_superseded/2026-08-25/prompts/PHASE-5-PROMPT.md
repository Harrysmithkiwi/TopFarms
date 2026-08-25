Phase 5 — Design system consolidation

Operating prompt. Companion to docs/UPLIFT-ROADMAP-2026-07-30.md, docs/AUDIT-PRELAUNCH-2026-07-30.md,
docs/evidence/phase-4-a11y.md. Phases 0–4 are complete; PR #82 merged as `ef77ff2`.

Goal. One way to do each thing.

Phase 1 closed who may act. Phase 2 closed what they may charge. Phase 3 closed what the product
claims. Phase 4 closed who can use it. This phase closes how it is built — and the honest framing
is that Phase 4's gates only cover the surface that speaks Tailwind. There are 673 bare
`var(--color-…)` references sitting in `style={{…}}` props in `src/pages` that the contrast
script cannot see. Phase 5 is not tidying. It is bringing the other half of the product under the
gate we already built.

Effort ~20 h. No Stripe work; the live swap is Phase 7. No schema changes. This is a page-layer
refactor with two behavioural fixes hiding in it (error states, offline).

Score movement: D2 tokens 55→90, states 60→90, components 70→85 · D1 client state 60→80.

***
Locked decisions (Claude as CTO/head of product — overturn any and the affected task is rewritten)

Question    Decision
Migration order    **Page by page, heaviest first**, each page its own commit. Not a global find/replace
Type scale    **Adopt a fixed 6-step scale.** 14 arbitrary `text-[Npx]` values collapse to 6 tokens
`text-[9px]` and `text-[10px]`    **Delete.** Nothing in this product may render below 11px
The rico cheat sheet    **Adopt the structure, reject the colours.** Reasoning and numbers below
Cheat-sheet scope    **App screens only** (~30 routes below). Marketing keeps its airier scale
Desktop button height    **Stay at 36px (`md:h-9`).** Do *not* take the cheat sheet's 32px — reasoning below
Badge shape (pill vs 6px)    **Keep the pill.** Deferred as a brand decision, not smuggled into a refactor
`Brand_and_Design.md:53` "44×44"    **Amend the canon** to separate touch from pointer contexts. It is currently wrong
Client state    **Surgical.** Fix races behind the 27 `set-state-in-effect` warnings. No rewrite
Error states    **Never a false empty state.** A failed fetch shows an error with retry, always

Reasoning:

**Page by page.** 947 `style={{` occurrences across 112 files. A global codemod on colour values
would be one unreviewable commit touching the entire product, and the visual regression surface is
the whole app. Heaviest-first ordering means the highest-risk pages get the most attention while
reviewer patience is highest, and each commit can be reverted alone.

**Fixed type scale.** The repo has no documented scale and has accumulated 14 distinct arbitrary
pixel sizes, two of which (`9px`, `10px`) are below anything legible for the audience this product
serves — a worker reading a job card outdoors on a phone. This is the same class of defect Phase 4
found in contrast: not a bug in any one component, a missing token that every component
re-improvises. `--font-display`/`--font-body` already point at Inter, so the family is settled;
only the scale is missing.

**Keep the pill.** The cheat sheet's 20px/6px-radius badge is a coherent choice inside its own
system. TopFarms' badge is `rounded-full` and appears on every job card. Changing badge geometry
is a brand-language decision that belongs to a design review with the founder, not to a phase whose
stated goal is removing variance. Note it in the evidence doc as an open question.

***
On the rico cheat sheet (@_heyrico, 2026-07-29)

The operator supplied this and it is largely good — but it is a web/desktop-dense system, and two
of its three colour values fail the gate this project already runs. Computed today with the same
`scripts/contrast.mjs` maths, not eyeballed:

Pair    Ratio    Verdict
`#333333` on white    **12.63:1**    PASS
`#777777` on white    **4.48:1**    **fails AA by 0.02** — and 4.31:1 on TopFarms' actual `--color-bg` #fafbf9
`#15B042` on `#CAFACE` (the badge)    **2.47:1**    **FAIL** — worse than the 2.94:1 green Tag Phase 4 just fixed
white on `#0077E6` (switch track)    4.39:1    OK as non-text (needs 3:1); fails if a label sits on it

**Adopt (structure):**

1. **Type scale.** 16/20px Medium titles · 13/16px Medium labels · 14px Regular body. This is the
   single most useful thing in the cheat sheet for this codebase and it maps cleanly onto Task 5.2.
   See "the 13→14 promotion" below — it is the biggest legibility win available in this phase.
2. **44px rows for anything tappable, 40px for pure data.** The cheat sheet's own
   40px-data/44px-stores split is exactly the right instinct: a row that is a link is a tap target,
   a row that is data is not. Adopt this distinction verbatim.
3. **"Strong states make settings easier to scan."** The governing principle, and it is why Task
   5.6 is in this phase: a connected/disconnected state must be unmistakable, which means a failed
   fetch may never render as an empty state.

**Adopt with the density scoped by surface.** "The app" is ~30 routes and they are not one context:

Surface    Routes    Density
**Admin**    `/admin/*` (11 routes)    **Full cheat-sheet density.** Desktop-only, dense tables. It fits here better than anywhere else in the product
**Employer**    `/dashboard/employer/*`, `/jobs/new`, `/jobs/:id/edit`, `/onboarding/employer`    **Density above `md:` only.** Farmers are not guaranteed to be at a desk
**Seeker + marketplace**    `/jobs`, `/jobs/:id`, `/dashboard/seeker/*`, `/onboarding/seeker`    **Mobile-first, density above `md:` only.** Highest a11y stakes in the product
**Auth**    `/login`, `/signup`, `/auth/*`    **Mobile-first.** Every user passes through it once, often on a phone

Provenance note: we have **no analytics**, so the mobile-weighting above is inferred from the
audience (audit D3, and the reason Phase 4 existed), not measured. The zero-product-analytics gap
is Phase 6's to close; until then this is a judgement, and it is labelled as one.

**Do not take the 32px button.** The repo is at `md:h-9` (36px) and I am keeping it. The cheat
sheet's 32px is coherent *in its own system*, where buttons carry 13px labels; ours carry 15px
(`Button.tsx:20-22`), and 32px with 15px type is cramped. So taking the height means taking the
type down too — a coupled change. Of that pair, the type scale is the half worth having and the
4px of height is the half that is churn: it touches every button in a phase already making 947
edits, and forces re-verification of every tap target for no measurable gain. Take the type, keep
the height.

**The 13→14 promotion — the substantive win hiding in the type scale.** The repo's most-used size
is `text-[13px]` (**266 occurrences**), and the cheat sheet puts 13px on *labels* and 14px on
*body*. Applied honestly, that pushes real prose up a step. For an audience reading outdoors on a
phone, one step of body copy is worth more than every other line of this cheat sheet combined.
**But it needs per-site judgement, not a codemod** — I have not verified how many of the 266 are
prose versus labels, and asserting a count I have not measured is exactly what CLAUDE.md §9.5
forbids. Classify as you migrate each page; report the actual split in the evidence doc.

**The canon conflict, which must be resolved either way.** `docs/_canonical/Brand_and_Design.md:53`
says "**WCAG AA; 44×44 minimum touch targets**", unconditionally. Two problems:

- It **conflates AA with AAA**. WCAG 2.2 SC 2.5.8 *Target Size (Minimum)* is the AA criterion and
  requires **24×24** CSS px. 44×44 is SC 2.5.5 *Target Size (Enhanced)*, which is **AAA**. The canon
  states an AAA number under an AA heading.
- **The code already contradicts it.** `Button.tsx` ships `md:h-9` (36px) at desktop today, and has
  since before this programme started. So canon is not describing the product.

Resolve by amending the canon to say what we actually mean and actually do:

    Accessibility: WCAG 2.2 AA. Touch targets 44×44 minimum (AAA / Apple HIG) on mobile
    breakpoints and for any icon-only control at any width. Pointer-primary surfaces above
    `md:` may go to 36px, never below WCAG 2.5.8's 24×24 AA floor.

That preserves everything Phase 4 built (its 44px gate is on icon-only controls — the bookmark and
the stars — which stay 44 at every width), legitimises the existing desktop heights instead of
leaving them as an undocumented deviation, and closes a Phase-3-class docs-truth defect. This is a
**canon edit**, so it ships as its own commit with the reasoning in the message.

**Reject (colour), with the numbers above as the reason:**

- `#777777` — we already have `--color-text-subtle` #647268 at **5.06:1**, darkened in Phase 4.1
  precisely because its predecessor (#8a968d, 3.08:1) was carrying real prose. Do not regress it.
- `#333333` — passes, but it is a neutral grey. TopFarms' `--color-text` #0b1f10 is brand ink at
  17.25:1. Using both is exactly the variance this phase exists to remove.
- `#CAFACE`/`#15B042` badge — 2.47:1. Our `--color-success-text-on-bg` #166534 on `--color-brand-50`
  #e8f5ec is **6.35:1** and already shipped.
- `#0077E6` switch — TopFarms is a one-green brand. A blue switch track introduces a second accent
  hue with no semantic justification.

**Skip (no gain):** 10px radius. We have `--radius-8/12/16`; a fourth radius token to satisfy one
line of a cheat sheet is variance, not consolidation. The 24×14px switch is *smaller* than the
repo's current 34×18 (`Toggle.tsx:25`) and would leave a 14px-tall control needing a padded hit
area — strictly worse for this audience.

**It is a density reference, not a design system — do not let it become the spec.** The cheat sheet
covers type, four component heights, and six colours. It says nothing about: the spacing scale,
**focus states** (and Phase 4.4b just found every focus ring in this repo was invisible — the one
defect class axe could not see), loading / empty / error states (Task 5.6, the highest-value task in
this phase), motion, or dark mode. Adopting it wholesale as "the design system" would silently
narrow the phase to the quarter of the problem it happens to address. It is a good answer to
*"how dense should a settings screen be"* and no answer at all to *"what does this screen do when
the network fails"*.

**The general rule this establishes, and it should go in the evidence doc:** external design
references contribute *structure* — scale, density, rhythm, state strength. Colour values come
from `src/index.css` and must clear `scripts/contrast.mjs`. Any reference colour is a proposal,
not a token.

***
Ground truth, measured live 2026-07-30 at `ef77ff2` — not quoted from the roadmap

The roadmap's figures have drifted. These supersede them.

Metric    Roadmap said    Measured now
`style={{` occurrences in `src`    917    **947** (612 in `src/pages`, 334 in `src/components`, 112 files)
bare `var(--color-…)` in `src/pages`    726 (whole src)    **673** in `src/pages` alone
hex literals outside `index.css`    34    **34** (unchanged)
`Loading...` text sites    4 named    **6**
distinct `text-[Npx]` values    not measured    **14**, incl. `text-[9px]` ×1 and `text-[10px]` ×12

Heaviest files by `style={{` count: `JobDetail.tsx` 55 · `HeroSection.tsx` 37 · `SignUp.tsx` 33 ·
`SeekerDashboard.tsx` 31 · `EmployerDashboard.tsx` 29 · `ForEmployers.tsx` 28 · `Pricing.tsx` 25 ·
`AdminLeadsStaging.tsx` 23.

Type size distribution: 13px ×266 · 12px ×165 · 11px ×116 · 14px ×53 · 15px ×44 · 16px ×21 ·
10px ×12 · 20px ×9 · 17px ×8 · 24px ×4 · 18px ×3 · 28px ×2 · 22px ×2 · 9px ×1.

Already correct, do not touch: `components/ui` is clean of inline colour styles. `--font-display`
and `--font-body` already resolve to Inter. `--radius-8/12/16` exist. `Button.tsx` already ships
responsive 44px-mobile heights. `AdminTable.tsx` wide tables are already inside `overflow-x-auto`.

***
Tasks

**5.1 — Inline-style migration.** Convert `style={{ color: 'var(--color-…)' }}` and its background/
border siblings to Tailwind utilities, page by page, heaviest first. One commit per page or tight
group of pages.

The rule that makes this a11y work and not tidying: **text on a tinted background lands on the
matching `*-text-on-bg` token**, never the raw semantic colour. That is the Phase 4.1 contract, and
`scripts/contrast.mjs` enforces it for classes — which is exactly why moving these off inline styles
brings them under the gate for the first time.

Run `node scripts/contrast.mjs` after each page. It will start failing on things it previously
could not see. That is the point, not a regression.

**5.2 — Type scale.** Define six steps in the `@theme` block and migrate the 14 arbitrary values
onto them. Suggested mapping, adjust if the render disagrees:

    --text-title:  16px / 20px line, Medium   (cheat sheet: titles)
    --text-body:   14px / 20px line, Regular  (cheat sheet: body)
    --text-label:  13px / 16px line, Medium   (cheat sheet: labels)
    --text-meta:   12px                        (timestamps, secondary meta)
    --text-micro:  11px                        (tags/badges — the current floor)
    --text-display: 20px+ scale for headings   (20/24/28 already in use)

`text-[9px]` and `text-[10px]` are deleted, not remapped — round them up to 11px. 15px and 17px
collapse to 14 or 16; pick per site by looking at the render, not by rule.

**5.3 — Kill untokened hex.** The 34 literals outside `index.css`, minus two sanctioned exceptions
that stay and get a comment saying why: the Stripe Elements block (`PaymentForm.tsx:89-103`, Stripe's
API takes hex, not classes) and third-party logo fills. Named offenders: the second blue `#2563eb`,
the gradient green `#1a3a10`, the traffic-light `#28c840`.

**5.4 — Component consolidation.** Merge `JobCard` and `SearchJobCard` into one variant-driven card,
and give the five bespoke sidebars a shared shell.

**Constraint, non-negotiable:** `SearchJobCard` was un-nested in Phase 4.3 and its bookmark is a
44×44 target guarded by `tests/tap-targets.test.tsx`. The merged card must keep the stretched-link
pattern (`after:absolute after:inset-0` on the title button, bookmark lifted to `relative z-10`)
and keep that test green. If the merge makes the test fail, the merge is wrong — not the test.

**5.5 — One loading idiom.** Skeletons everywhere. Delete the 6 centred `Loading...` text sites.

**5.6 — One error idiom. This is the highest-value task in the phase.**
`ApplicantDashboard.tsx:198-201` catches a fetch failure and renders "no applicants". An employer
who paid to list a job, on a flaky rural connection, is told nobody applied. That is a revenue
event caused by a `catch` block.

Sweep for every silent-catch-then-empty-state across `src/`. Each one shows a real error with a
retry affordance. Distinguish three states explicitly and never collapse them: **loading**,
**empty (verified zero)**, **failed (unknown)**.

**5.7 — Offline.** `navigator.onLine` listener, a global offline banner, retry affordance. Rural
connectivity is the stated audience condition, not a hypothetical.

**5.8 — Client state, surgically.** Fix the races and double-fetches behind the 27
`set-state-in-effect` warnings. Introduce a small `useAsyncData` hook and use it for new work and
for the pages touched by 5.6. **Leave working pages alone** — audit §11.3 rules out a state rewrite
and the risk register names scope creep here as the phase's main risk.

**5.9 — Evidence.** `docs/evidence/phase-5-design-system.md`, checks D1–D8, same discipline as
Phase 4: every claim carries its command output or `file:line`. **D8 (legitimate journeys unchanged)
runs first.** Include the cheat-sheet reconciliation table above with its computed ratios — the
next person to bring an external reference needs to find the precedent.

***
How to run this phase — plan, execute, verify

Three stages. Do not collapse them: this phase's failure mode is a refactor that runs long and
quietly drops the two tasks a user would actually notice.

**Stage 1 · Plan (do this before touching a single file).**

1. Produce the migration ledger: for every file in `src/pages` and `src/components` with a
   `style={{` occurrence, one row — path, occurrence count, surface class (admin / employer /
   seeker / auth / marketing), and whether it is in the Phase 4 axe route set. Commit it as
   `docs/design/phase-5-ledger.md`. **Note `.gitignore` narrows `docs/design/*` — add a second
   negation (`!docs/design/phase-5-ledger.md`) or the file will not commit.** Phase 4 hit this
   exact trap with `contrast.md`.
2. Order the ledger heaviest-first *within each surface class*, and land the canon amendment
   (`Brand_and_Design.md:53`) and the type-scale tokens (Task 5.2) **first** — every subsequent
   page migration consumes them, so doing them late means migrating twice.
3. State the batch plan: which pages land in which commit. Roughly one commit per page for the
   top 8, grouped commits below that.

**Stage 2 · Execute (per page, this loop, no shortcuts).**

    1. screenshot the page at 1200px and 360px          <- before
    2. migrate inline colour styles -> Tailwind utilities
    3. node scripts/contrast.mjs                        <- will surface NEW failures; fix them
    4. npx vitest run                                   <- catches class-contract tests
    5. screenshot again, compare                        <- identical is the success condition
    6. commit that page alone, explicit paths

Rules for the loop:
- **A page whose render changed is not done** until you can name why. "Looks fine" is not a reason.
- When step 3 fails on something it could not see before, that is the gate doing its job — fix the
  colour, do not exclude the file.
- Never `git checkout --` to undo an experiment. File copies. (Phase 4 §8 precedent.)
- Run the Phase 4 gates after any change to `SearchJobCard`, `Tag`, `Button`, `MatchCircle` or
  `Toggle`: `npx vitest run tests/tap-targets.test.tsx tests/a11y-focus-motion.test.tsx`.

**Stage 3 · Verify (empirical, and D8 runs first).**

Check    Method    Passes when
**D8** legitimate journeys    `npm run e2e` + `npx vitest run` + `tsc -b` + `npm run build`    all green, run **before** any other check so a broken build is not discovered last
D1 migration complete    `grep -ro "style={{" src/pages \| wc -l` and the per-page ledger    colour props at 0; surviving layout-only styles counted and each commented
D2 type scale    `grep -rho 'text-\[[0-9]*px\]' src \| sort \| uniq -c`    only the 6 scale steps remain; zero `9px`/`10px`
D3 contrast, newly-visible surface    `node scripts/contrast.mjs`    exit 0 **and** the evidence doc names at least one violation the migration exposed. If it exposed none, the migration did not reach the text
D4 no untokened hex    `grep -rE '#[0-9a-fA-F]{6}' src` minus the 2 sanctioned sites    0 survivors
D5 loading idiom    grep for `Loading...`    0; skeleton on every async surface
D6 **error states**    Playwright `page.route('**/rest/v1/**', r => r.abort())` per major screen    every screen shows an error **with retry**; none shows an empty state. This is a *behavioural* test, not a source grep
D7 offline    `page.context().setOffline(true)`    banner appears, retry works
D8b Phase 4 gates still green    `npm run e2e` (axe, 360px, reduced motion) + the two vitest specs    no regression from the card merge

**D6 is the check most likely to be faked.** A source grep for `catch` proves nothing — the whole
finding is that a `catch` block *exists* and renders the wrong thing. Abort the request and look at
what the user sees. Same discipline as Phase 4's A7, where a source grep would have missed that the
CSS reduced-motion clamp never reached JS animation.

Then write `docs/evidence/phase-5-design-system.md` (Task 5.9). Every claim carries command output
or `file:line`; anything an environment limit prevented is listed as such, not claimed.

***
Exit gate

Empirical, per roadmap:

1. `grep -ro "style={{" src/pages | wc -l` → **0** for colour properties (layout-only inline styles
   that genuinely cannot be expressed as utilities may remain, each with a comment saying why, and
   the count of survivors is stated in the evidence doc — no silent caps)
2. Zero untokened hex in `src/` outside the two sanctioned sites
3. `node scripts/contrast.mjs` exits 0 **with the newly-visible surface included**
4. One skeleton component in use on every async surface
5. An induced network failure on every major screen shows an error with retry, never a false empty
   state — demonstrated, not asserted. Playwright `page.route()` abort is the mechanism
6. `npx vitest run tests/tap-targets.test.tsx` green after the card merge
7. `npm run e2e` green — including the Phase 4 axe gate, which now covers the migrated pages
8. `tsc -b` clean, `vitest` green, lint within the 46-warning cap

***
Two warnings

**This phase is 947 edits across 112 files and every one of them is visual.** Phase 4's screenshot
diff covered 3 routes because the change was one token layer. This change is per-page, so the diff
must be per-page: screenshot each page before and after its own commit. A page that renders
identically is the success condition; anything that moved is either a bug or an improvement you
must be able to name.

**Do not let the migration hide the two behavioural fixes.** Tasks 5.6 and 5.7 are the only parts
of this phase a user would notice, and they are the parts most likely to get deferred when the
refactor runs long. If time is short, cut scope from 5.1 (it is page-by-page and resumable by
design) — never from 5.6.

***
House rules

CLAUDE.md §9 throughout: stage explicit paths, never discard an exit code, verify before anything
destructive, label provenance, let the gate define done. §3 diagnose before fix. §4 no history
rewriting — and note the Phase 4 precedent: revert-tests use file copies, never `git checkout --`.
§7 partial-close discipline: "migrated" is a claim that needs a count per page, not a spot check.

Known trap, do not re-enter: under Tailwind v4, `outline-none` sets `--tw-outline-style: none`,
which `focus-visible:outline-2` inherits — the combo paints no focus ring at all. Phase 4.4b removed
it from 12 components. If a migrated page reintroduces it, keyboard focus vanishes silently and axe
will not catch it.

***
Carried forward into this phase from Phase 4 (§7)

1. **Bookmark icon colour** `--color-warn` on white is 2.15:1. Non-text contrast (WCAG 1.4.11 needs
   3:1). Explicitly in scope now — it is a token question, which is this phase.
2. **axe moderate findings** — `heading-order`, `landmark-one-main`, `region` on `/jobs`. Tighten by
   moving them into the failing filter at `tests/e2e/a11y.spec.ts:22`. Landmark/heading structure is
   a page-layer concern, so this phase is the natural place.
3. **App-surface Lighthouse** not run (auth-gated, no local role creds). Deferred again unless the
   operator supplies creds; the roadmap assigns Lighthouse CI to Phase 6.4 anyway.

Not in this phase, still open, still the operator's: **production holds zero jobs**, which is why
`tests/e2e/seeker-browse-jobs.spec.ts:17` guards nothing and two Phase 4 a11y checks skip. One live
job arms all three.
