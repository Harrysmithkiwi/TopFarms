# Session handoff — 2026-07-30 (Phase 4)

Supersedes `docs/SESSION-HANDOFF-2026-07-30.md`, which was written after Phase 1 and still points
at the Phase 2 brief. Phases 2, 3 and 4 have since shipped.

**State:** branch **`phase-4-a11y`** at **`a86601f`**, pushed, working tree clean.
**PR #82 open with all five checks green** (quality · e2e · e2e-preview · Vercel · Vercel Preview
Comments) — https://github.com/Harrysmithkiwi/TopFarms/pull/82. **Not merged** — that's your call.

Test suite **609 passing** (was 601 at session start; +8 across three new files). Production
untouched: **no migrations, no schema changes, no probe accounts seeded** — this phase needed none.

**Next session:** merge #82 if it reviews clean, then read **`docs/PHASE-5-PROMPT.md`** if it
exists, else `docs/UPLIFT-ROADMAP-2026-07-30.md` §"Phase 5 — Design system consolidation" and
write the brief. Phase 5's headline is the 917 inline `style={{…}}` occurrences (726 of them bare
`var(--color-…)`), which Phase 4 deliberately did not touch.

---

## Phase status

| Phase | Status | Where |
|---|---|---|
| **0 · Foundations** | ✅ complete | PRs #68–#72 |
| **1 · Authorization spine** | ✅ complete | PRs #74, #75 · `docs/evidence/phase-1-probes.md` |
| **2 · Revenue enforcement** | ✅ complete | `docs/evidence/phase-2-revenue.md` |
| **3 · Truth, trust & coherence** | ✅ complete | `docs/evidence/phase-3-truth.md` |
| **4 · Accessibility & mobile** | ✅ complete, **PR #82 awaiting merge** | `docs/evidence/phase-4-a11y.md` |
| 5–7 | planned | `docs/UPLIFT-ROADMAP-2026-07-30.md` |

Throughput remains roughly one phase per session; the roadmap's hour estimates are human-engineer
figures, not elapsed time.

## What Phase 4 changed (9 commits)

| Commit | Task |
|---|---|
| `d6bbf3a` | 4.1 — on-bg text tokens, `--color-brand` demoted to fill/border, contrast script + committed table |
| `bb472c6` | 4.2 — both fixed 260px sidebars become mobile bottom sheets |
| `dd9c96d` | 4.3 — SearchJobCard un-nested, 44px tap targets |
| `b25d74e` | 4.4 — base focus ring, dialog semantics on 5 bespoke modals, `MotionConfig` |
| `f974969` | 4.5 — dead score-sort removed (verified dead first) |
| `60b9e55` | 4.6 — axe-core CI gate + the 7 real violations its first run caught |
| `e334a14` | 4.4b — **invisible focus rings** across 12 components (see below) |
| `93d3b85` | 4.7 — evidence doc |
| `a86601f` | lint fix (`no-console` in the new spec) |

**The find worth remembering:** under Tailwind v4, `outline-none` sets `--tw-outline-style: none`,
which `focus-visible:outline-2` then inherits — so this repo's standard ring idiom
(`outline-none focus-visible:outline-2 focus-visible:outline-brand`) **painted no focus ring at
all** on Button, Select, Checkbox, Toggle, Pagination, Breadcrumb, ChipSelector, Input and the
FilterSidebar radios. axe passed it; only a scripted keyboard traversal caught it. Saved to
Claude memory as `tailwind-v4-focus-ring-trap`. Never pair those classes again.

## Gates now guarding this work

| Gate | Command | Fails when |
|---|---|---|
| Contrast | `node scripts/contrast.mjs` | any text pair < 4.5:1, or a raw `text-warn/-info/-ai/-danger/-brand` reappears on a tinted background in `src/` |
| a11y | `npm run e2e` → `tests/e2e/a11y.spec.ts` | axe serious/critical on 6 routes × 1200/360; also 360px horizontal scroll, bookmark hit box, reduced-motion behaviour |
| Tap targets / nesting | `npx vitest run tests/tap-targets.test.tsx` | hit-area classes drop below 44px, or an interactive element nests |
| Focus / motion | `npx vitest run tests/a11y-focus-motion.test.tsx` | HireConfirmModal loses dialog semantics, `MotionConfig` or the base `:focus-visible` rule disappears |

Regenerate the contrast artefact with `node scripts/contrast.mjs > docs/design/contrast.md`.
Note `.gitignore` was narrowed to `docs/design/*` + `!docs/design/contrast.md` so that one file
is tracked while the rest of that directory stays scratch.

## Open items carried forward (§7 partial-close discipline)

1. **Visitor-marketplace guard is currently not guarding.** Prod has **zero active jobs**, and
   `tests/e2e/seeker-browse-jobs.spec.ts:17` filters the empty state with
   `hasNotText: 'No jobs match'` — but the unfiltered empty state reads *"No jobs listed right
   now"*, so the RLS-MKT-01 regression test passes on an empty marketplace. Fixing the assertion
   turns CI red until a job exists, so it was surfaced rather than changed. **Decide: post a real
   job, or tighten the test and accept red until you do.**
2. **Two a11y checks are armed but skipping** (labeled, not silent): `/jobs/:id` axe scan and the
   computed 44×44 bookmark box. Both self-arm the moment one live job exists — same root cause
   as item 1.
3. **App-surface Lighthouse not run.** Public is green (`/` 96 desktop, `/jobs` 97 mobile, gate
   ≥95) but the roadmap gate says "public + app"; app routes are auth-gated and the local session
   has no role creds. They are covered by axe in CI e2e-preview. Open if you want the literal gate.
4. **axe moderate findings logged, not failing** — `heading-order`, `landmark-one-main`, `region`
   on `/jobs`. The ratchet's next targets; tighten by moving them into the failing filter in
   `tests/e2e/a11y.spec.ts:22`.
5. **Bookmark icon colour** (`--color-warn` on white, 2.15:1) is a non-text contrast question
   (WCAG 1.4.11, needs 3:1) — out of Phase 4's text scope, worth a look in Phase 5.

## Process note (§4 / §8)

One git-safety violation, self-reported: while testing that the contrast gate could actually fail,
this session ran `git checkout src/components/ui/Tag.tsx`, which restored the pre-phase index state
over an uncommitted Phase 4.1 edit. Damage was one file, re-applied immediately from context, and
the gate itself caught the regression. No reflog surgery needed. It is recorded in
`docs/evidence/phase-4-a11y.md` §"Process notes"; it did **not** warrant a `CLAUDE.md` §8 incident
entry (no destroyed commits, no lost work). Prevention adopted: revert-tests use file copies, never
`git checkout --`.

## Corrections to the Phase 4 brief (for whoever writes Phase 5's)

The brief was unusually accurate — its computed ratios all reproduced exactly. Two claims were
wrong and are worth knowing because the same assumptions may recur:

- *"green, warn and grey [Tag variants] pass"* — green was `#16a34a` on `#e8f5ec` = **2.94:1**.
  A `--color-success-text-on-bg` was added beyond the brief's task list.
- *"PlacementFeeModal, MarkFilledModal and the JobSearch/JobDetail sheets use Radix Dialog"* —
  the first two are **bespoke** (verified by import grep before editing) and needed the focus trap
  and Escape handler adding by hand.
