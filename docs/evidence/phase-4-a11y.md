# Phase 4 · Task 4.7 — accessibility & mobile evidence

All checks executed 2026-07-30 on branch `phase-4-a11y` against the production Vite bundle
served locally (`vite preview`, Supabase project `inlagtgpynemhipnqvty` for data). Every claim
carries its command or file provenance; anything an environment limit prevented from executing
is listed as such, not claimed.

**No probe data was seeded anywhere for this phase** — the marketplace being empty (see A8
note) was accepted as a limit rather than seeding a job, per the phase brief.

---

## A8 — Legitimate journeys unchanged (run first)

`npm run e2e` (hermetic: `npm run build && vite preview`, Chromium):
**13 passed, 17 skipped, 0 failed.** Skips are the role-gated specs (no local `E2E_*` creds —
they run in CI e2e-preview) plus the data-dependent a11y skips below. Signup-through-real-UI,
visitor marketplace, admin gate and prod-smoke specs all green. `tsc -b`, `eslint`
(46-warning cap, pre-existing), `vitest` **609 passed / 0 failed**, `vite build` clean.

> **Finding for the operator (pre-existing, not fixed here):** the marketplace REST query
> currently returns **zero jobs** in prod (`GET /rest/v1/jobs?... → 200, []`). The existing
> guard test "visitor sees a non-empty marketplace" still passes because its empty-state
> filter checks `hasNotText: 'No jobs match'` — but the *unfiltered* empty state says
> "No jobs listed right now", which slips through. The RLS-MKT-01 regression guard is
> therefore not guarding right now. Fixing it would turn CI red until a job exists, so it
> was surfaced, not changed. `tests/e2e/seeker-browse-jobs.spec.ts:17`.

## A1 — Every semantic token pair, computed

`node scripts/contrast.mjs` — exit 0. Committed table: `docs/design/contrast.md`
(28 pairs, every text pair ≥ 4.5:1; retired pairs kept in-table as the record of why).
The script recomputed the brief's own numbers exactly (5.66, 5.02, 3.30, 2.15, 6.37, 4.83),
which validates the math, and found **two corrections to the brief** (§9.7):

- "green, warn and grey [Tag variants] pass" — **false**. Green was `#16a34a` on `#e8f5ec`
  = **2.94:1**. A `--color-success-text-on-bg` (#166534, 6.35:1) was added beyond the brief.
- The gate also fails on any *raw semantic text colour on a tinted background* re-entering
  `src/` (source scan in the same script). Proven trippable: deliberately reverting the blue
  Tag made it exit 1.

## A2 / A3 — axe-core, six routes, 1200 px and 360 px

`tests/e2e/a11y.spec.ts` — committed, runs in the existing `npm run e2e` job (`ci.yml` e2e).
serious/critical fail the build; moderate logged (`heading-order`, `landmark-one-main`,
`region` on /jobs — the ratchet's next targets).

Local result: **/, /jobs at both widths: zero serious/critical** (5 passed). `/jobs/:id`
skips (labeled) because the marketplace is empty — no job id exists to visit; the test
self-discovers an id from the marketplace's own REST response, so it arms automatically as
soon as one job is live. Seeker dashboard, /onboarding/seeker and the employer applicant
dashboard skip locally (labeled) without creds and run in CI e2e-preview. The
/onboarding/seeker test prints which surface it scanned if an onboarded seeker bounces.

The gate is proven real, not vacuous: **its first run failed on 7 genuine violations** —
`button-name`/`select-name` critical (region + DairyNZ Radix triggers, sort select, listing
select) and `color-contrast` serious (Nav signup pill, nav links at white/50, three landing
CTAs at brand-900-on-brand 3.33, Live badge, footer alphas 0.35–0.5). All fixed in
`feat(4.6)`. One narrow, documented exclusion: `[data-decorative]` (the aria-hidden
HowItWorks watermark numerals — WCAG 1.4.3 decorative-text exemption axe cannot infer).

## Lighthouse (roadmap exit-gate item, not in the operating prompt's tasks)

Run via Chrome DevTools Lighthouse against the built bundle: `/` desktop **a11y 96**,
`/jobs` mobile **a11y 97** (gate: ≥ 95). The single deduction on `/` is the decorative
watermark numeral (1.23:1, `aria-hidden`, WCAG 1.4.3-exempt — the same element the axe gate
excludes with justification; Lighthouse has no exclusion mechanism). Best-practices and SEO
100 on both. **Partial-close note (§7):** the roadmap gate says "public + app" — app
surfaces were not Lighthouse-scored (auth-gated; local session lacks role creds). They are
covered by the axe gate in CI e2e-preview; a Lighthouse pass over the app surfaces remains
open if the operator wants the letter of the roadmap gate.

## A4 — 360 px horizontal scroll

Asserted inside the same spec: `scrollWidth <= clientWidth` on every scanned route at
360×740 — green for all routes that ran. Both fixed sidebars
(`ApplicantDashboardSidebar`, `MyApplicationsSidebar`) are now reachable at 360 px via
Radix bottom sheets (the JobSearch FilterSidebar pattern, not a third invention);
desktop rails are `hidden md:block`. Wide admin tables verified already inside
`overflow-x-auto` (`AdminTable.tsx:356,359`, `AdminRevenue.tsx:116`) — no change needed.

## A5 — Keyboard traversal

Scripted probe (Playwright, headless Tab traversal recording `document.activeElement` +
computed outline/box-shadow per stop) against the built bundle:

- `/signup`: 14 stops, **0 without a visible indicator**, no trap (cycle returns to body).
- `/jobs`: 12 stops, **0 without a visible indicator**.
- `/jobs` mobile filter sheet: focus lands **inside** the dialog on open, **Escape closes**,
  focus **restores to the trigger**.

**This probe found the phase's biggest defect, which axe could not see:** under Tailwind v4,
`outline-none` sets `--tw-outline-style: none`, which `focus-visible:outline-2` then
inherits — so the codebase's standard ring idiom **never painted a focus ring** on Button,
Select, Checkbox, Toggle, Pagination, Breadcrumb, ChipSelector, Input or the FilterSidebar
radios. Fixed in `fix(4.4b)` by dropping `outline-none` from the combo; probe rerun clean.
Dialog gaps closed in `fix(4.4)`: HireConfirmModal gained role/aria-modal/label/Escape/trap;
PlacementFeeModal + MarkFilledModal gained trap + Escape; both saved-search modals gained
the trap. (§9.7 correction: the brief said PlacementFeeModal and MarkFilledModal "use Radix
Dialog" — they are bespoke; verified by import grep before editing.)

## A6 — Bookmark + star hit boxes

- Class contract: `tests/tap-targets.test.tsx` (vitest, runs in CI) asserts `h-11 w-11` on
  the SearchJobCard bookmark and all five HireConfirmModal stars, and **zero nested
  interactive elements** in SearchJobCard.
- Computed: built CSS resolves `.h-11 { height: calc(var(--spacing) * 11) }` with
  `--spacing: .25rem` → **44 px** at default root size. The e2e computed-box assertion
  (`getBoundingClientRect ≥ 44×44`) is committed and currently skips (labeled) on the empty
  marketplace; it arms automatically with the first live job.

## A7 — prefers-reduced-motion honoured by JS animation

`tests/e2e/a11y.spec.ts` "reduced motion honoured": `page.emulateMedia({ reducedMotion:
'reduce' })` on `/`, samples inline transforms twice 400 ms apart — **identical → no
JS-driven animation running**. Passed. This is the behavioural check the CSS clamp could
never provide; `<MotionConfig reducedMotion="user">` wraps the app in `main.tsx` and is
asserted by `tests/a11y-focus-motion.test.tsx`.

## Visual regression check (phase warning #1)

Before/after full-page screenshots of `/`, `/jobs`, `/signup` at 1200 px and 360 px
(before = `main` @ 287b65f built in a worktree, after = this branch; both served via
`vite preview` and compared visually). Layout is pixel-identical; the only changes are the
intended ones — CTA fills one shade deeper (`#15803d`), nav/footer text brighter, Tag/badge
text darker on the same tints. The brand still reads as the same green; nothing muddy.
Screenshots were session artefacts (scratchpad), not committed — the contrast table and axe
gate are the durable evidence.

## Score treatment (Task 4.5)

- MatchCircle: <60 renders **neutral** (`bg-surface-2` / `text-text-muted`), 60–79
  `warn-text-on-bg` on `warn-bg` (6.37), ≥80 `success-text-on-bg` on `brand-50` (6.35).
  No applicant-facing surface renders a score in an error colour (all score rendering routes
  through MatchCircle/MatchBreakdown — grep-verified).
- The dead initial score-sort in ApplicantDashboard was **verified dead before deletion**
  (the render pipeline re-sorts on every render at `ApplicantDashboard.tsx:498`) and removed.
- The raw integer stays visible (now readable in every band); MatchBreakdown remains one
  interaction away. Moving the number a click in was considered and declined — with the
  colour de-escalated and the breakdown honest, hiding the number reduces information
  without an a11y gain.

## Process notes

- **Git-safety violation (self-reported, §4/§8):** during the gate-trippability test the
  session ran `git checkout src/components/ui/Tag.tsx`, which restored the *pre-phase* index
  state over an uncommitted Phase 4.1 edit. Damage: one file, immediately re-applied from
  session context; the contrast gate itself caught the regression. No reflog surgery needed.
  Prevention: revert-tests now use file copies, never `git checkout --`.
- `.gitignore` for `docs/design/` was narrowed to `docs/design/*` + `!docs/design/contrast.md`
  so the mandated artefact could be committed.
- Deferred to the ratchet (logged, not failing): axe moderate findings `heading-order`,
  `landmark-one-main`, `region` on /jobs; bookmark icon colour (`--color-warn` on white,
  2.15) is a non-text WCAG 1.4.11 question (needs 3:1) — out of this phase's text scope.

## Commits

| Commit | Task |
|---|---|
| d6bbf3a | 4.1 tokens, brand demotion, contrast script + table |
| bb472c6 | 4.2 sidebars → bottom sheets |
| dd9c96d | 4.3 un-nest SearchJobCard, 44 px targets |
| b25d74e | 4.4 focus ring, dialog semantics, MotionConfig |
| f974969 | 4.5 dead score-sort removed |
| 60b9e55 | 4.6 axe gate + the violations it caught |
| e334a14 | 4.4b invisible focus rings (Tailwind v4 outline-none combo) |
