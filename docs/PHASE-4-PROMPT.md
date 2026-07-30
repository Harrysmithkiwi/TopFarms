Phase 4 — Accessibility & mobile reality

Operating prompt. Companion to docs/UPLIFT-ROADMAP-2026-07-30.md, docs/AUDIT-PRELAUNCH-2026-07-30.md,
docs/evidence/phase-3-truth.md. Phases 0–3 are complete.

Goal. The product works for someone one-handed, in sunlight, on a rural connection.

Phase 1 closed who may act. Phase 2 closed what they may charge. Phase 3 closed what the product
claims. This phase closes who can actually use it — and the honest framing is that the people most
likely to be excluded are the ones this marketplace exists to serve: a worker reading a job card
on a phone in a paddock at midday, and a migrant worker whose visa-sponsorship chip is currently
the least readable element on the page.

Effort ~24 h. No Stripe work; the live swap is Phase 7. No schema changes are expected — this is
almost entirely a token, layout and semantics phase.

Score movement: D2 a11y 35→90, responsive 50→92.

***
Locked decisions (Claude as CTO/head of product — overturn any and the affected task is rewritten)

Question    Decision
Fix contrast at the token level or per component?    **Token level.** Add the missing `*-text-on-bg` pairs; components consume them
`--color-brand` as a text/CTA colour    **Demote it to a fill-and-border colour only.** Text and CTAs use `--color-brand-hover`
Sub-60 match scores in danger red    **Neutral treatment.** Red is for errors, not for people
How the a11y gate is enforced    **`@axe-core/playwright` in the existing e2e job**, not a manual audit
360 px scope    **Six named routes**, listed below — not "every surface"

Reasoning:

**Token level.** `--color-warn` at 2.15:1 is not a Tag bug, it is a token being used for text when
it was only ever safe as a fill. The codebase already solved this once — `--color-warn-text-on-bg`
(#92400e, 6.37:1) exists and the `warn` Tag uses it correctly. Two of the remaining semantic
colours need the same treatment. Fixing at the call site instead would leave the next component to
rediscover the problem, which is exactly how `orange` got shipped and then deleted.

**Demoting `--color-brand`.** White on #16a34a is **3.30:1**. That is every primary CTA in the
product, and it fails AA for normal text. `--color-brand-hover` (#15803d) is **5.02:1** and is
already in the palette as the hover state. Promoting the hover green to the default for text and
CTA fills costs one token change and no new colour; keeping #16a34a for large display type, icon
fills, borders and chart series keeps the brand intact. This is the single highest-leverage change
in the phase.

**Neutral low scores.** `MatchCircle` renders sub-60 in `--color-danger` — the error token —
beside a person's name, and 60–79 in `--color-warn` at 2.15:1, so the number itself is barely
readable in the middle band. A 55 % match is not an error; it is a candidate who is a partial fit.
Red says "something went wrong with this human". Use a neutral for low, reserve warn/danger for
states that are actually wrong, and let `MatchBreakdown` — which Phase 3 made honest — carry the
explanation.

**axe-core in CI.** Playwright is already installed and the `e2e` job is already a required check.
Adding `@axe-core/playwright` makes the gate mechanical and permanent, which CLAUDE.md §9 says is
the only kind that holds. A one-off manual audit decays the week after it is run.

***
Ground truth, verified live 2026-07-30 (post-Phase-3)

**Contrast ratios are computed from `src/index.css`, not quoted from the audit.** Where this
disagrees with the audit, this is correct.

| Pair | Ratio | AA text (4.5) | Note |
|---|---|---|---|
| `--color-warn` #f59e0b on white | **2.15** | FAIL | fails even AA-large |
| `--color-info` #0ea5e9 on white | **2.77** | FAIL | fails even AA-large |
| `--color-info` on `--color-info-bg` | **2.42** | FAIL | the audit labelled this "info on white" |
| **white on `--color-brand` #16a34a** | **3.30** | **FAIL** | **every primary CTA** |
| white on `--color-brand-hover` #15803d | 5.02 | PASS | the fix, already in the palette |
| `--color-text-subtle` #8a968d on white | **3.08** | FAIL | decorative-only, or darken |
| `--color-danger` on `--color-danger-bg` | **3.95** | FAIL | **not in the audit** |
| `--color-ai` #8b5cf6 on white | **4.23** | FAIL | **not in the audit** |
| `--color-ai` on `--color-ai-bg` | **3.86** | FAIL | **not in the audit** |
| `--color-warn-text-on-bg` on `--color-warn-bg` | 6.37 | PASS | the pattern to copy |
| `--color-text-muted` #5b6b5f on white | 5.66 | PASS | |
| `--color-danger` on white | 4.83 | PASS | |

**Three of six `Tag` variants fail, not one.** `Tag.tsx:12-19`: `blue` (`text-info` on
`bg-info-bg`) 2.42, `purple` (`text-ai` on `bg-ai-bg`) 3.86, `red` (`text-danger` on
`bg-danger-bg`) 3.95. The file's own comment flags only `blue` for this phase — `purple` and `red`
are unflagged and equally broken. `green`, `warn` and `grey` pass.

**`MatchCircle.tsx:20-37`** returns `text-warn` for 60–79 and `text-danger` for <60 — so the
score is 2.15:1 in the middle band and red for the bottom one.

**Nested interactive content is real, and here is the proof** — `SearchJobCard.tsx` button ladder:
`line 92 OPEN depth 1` → `line 171 OPEN depth 2` → `line 184 CLOSE` → `line 199 CLOSE`. The
bookmark button is inside the card button. Invalid HTML; unpredictable for keyboard and screen
readers.

**Tap targets.** `HireConfirmModal.tsx:104-116` star buttons are `h-4 w-4` with `p-0.5` — about
**20 px**, against the 44 px in `Brand_and_Design.md:53`. Same class of miss on the
`SearchJobCard` bookmark (`h-4 w-4`).

**Fixed-width sidebars, no responsive classes:** `ApplicantDashboardSidebar.tsx:25` and
`MyApplicationsSidebar.tsx:38` are both `w-[260px] flex-shrink-0`. The codebase already got this
right at `JobSearch.tsx` (mobile bottom-sheet + `hidden md:grid`) and `PostJob.tsx` — copy that,
do not invent a third pattern.

**Focus:** 40 `outline-none` occurrences against 18 `focus-visible:`. No global `:focus-visible`
rule in `src/index.css`.

**Dialogs:** `useFocusTrap` exists (`src/hooks/useFocusTrap.ts`) but is consumed by only two admin
components (`AdminSidebar`, `DrawerShell`). `HireConfirmModal` has **zero** dialog semantics — no
`role="dialog"`, no `aria-modal`, no trap. `PlacementFeeModal`, `MarkFilledModal` and the
`JobSearch`/`JobDetail` sheets use Radix `Dialog`, which supplies them.

**Motion:** `src/index.css:83-92` has a `prefers-reduced-motion` clamp, but it only reaches CSS
animations. Eight files animate through `motion/react`, and there is **no `MotionConfig`**
anywhere, so JS-driven motion ignores the user's setting entirely.

**Tooling:** Playwright is installed and `npm run e2e` is a required check. `@axe-core/playwright`
is **not** installed. There is no Lighthouse CI.

**Already done in Phase 3, do not redo:** emoji-as-UI is gone from `src/components` and
`src/pages` (they carried no accessible name); `FarmTypesStrip` links have `focus-visible` rings;
`MatchBreakdown` renders "Not applicable" with `aria-hidden` on decorative bars.

***
Task 4.1 — Contrast, fixed once at the token layer

Add the missing on-background tokens, mirroring `--color-warn-text-on-bg`:
   `--color-info-text-on-bg`, `--color-ai-text-on-bg`, `--color-danger-text-on-bg`. Each must
   clear 4.5:1 against its `*-bg` partner — compute it, do not eyeball it.
Point the three failing `Tag` variants at them (`blue`, `purple`, `red`).
Demote `--color-brand` for text and CTA fills (locked decision). `Button.tsx` primary,
   every `text-brand` at body size, and the `SignUp.tsx:37-38` sites move to
   `--color-brand-hover`. Keep `--color-brand` for large display type, icon fills, borders,
   chart series and the `bg-brand-50` tints.
`MatchCircle.tsx:20-37`: neutral for <60, and stop using raw `text-warn` for 60–79.
`--color-text-subtle` (3.08): either darken it or restrict it to genuinely decorative use.
   It is currently used for real prose — including copy Phase 3 added — so decide and sweep.
Commit a computed contrast table to `docs/design/contrast.md`: every token pair, its ratio,
   and pass/fail. The table is the artefact; a claim without the number is not evidence.

Gate: a script (committed, runnable) prints the table and exits non-zero if any text pair is
under 4.5:1 · no `text-warn`, `text-info`, `text-ai` or `text-danger` on a tinted background
survives in `src/`.

Task 4.2 — 360 px

`ApplicantDashboardSidebar.tsx:25` and `MyApplicationsSidebar.tsx:38` — apply the
   bottom-sheet + `hidden md:*` pattern the codebase already uses in `JobSearch.tsx`.
Sweep these six routes at 360 px: `/`, `/jobs`, `/jobs/:id`, the seeker dashboard, the
   employer applicant dashboard, and `/onboarding/seeker`. Nothing may scroll horizontally and
   no control may be clipped.
Watch the tables. `/admin/revenue` (Phase 2) and the document queue (Phase 3) are wide; they
   need an `overflow-x-auto` container rather than a squeezed layout.

Gate: Playwright at 360×740 asserts `document.scrollingElement.scrollWidth <= clientWidth` on
all six routes, and that both sidebars are reachable.

Task 4.3 — Targets & semantics

Un-nest `SearchJobCard.tsx` (line 92 wraps line 171). Make the card a non-button container
   with a single interactive title link, or lift the bookmark out of the header button — either
   way, no interactive element inside another.
44 px minimum on the bookmark (`SearchJobCard.tsx:183`, `JobDetailSidebar.tsx:110`) and the
   star rating (`HireConfirmModal.tsx:104-116`) — pad the hit area without growing the glyph.
Sweep for other sub-44 px controls on touch surfaces.

Gate: axe-core reports zero `nested-interactive` violations · a committed test asserts the
computed hit box of the bookmark and star controls is ≥44×44.

Task 4.4 — Focus & motion

Global `:focus-visible` in `src/index.css`, then reconcile the 40 `outline-none` sites
   against it — each either gains a `focus-visible` ring or loses the `outline-none`.
`HireConfirmModal` gets `role="dialog"`, `aria-modal`, Escape-to-close and `useFocusTrap`
   (the hook exists — reuse it, do not write a second one). Audit the other bespoke modals for
   the same gaps; the Radix ones already comply.
Wrap the app in `<MotionConfig reducedMotion="user">`. The CSS clamp does not reach the eight
   `motion/react` files, so a user who asked for less motion is currently ignored by all of them.

Gate: keyboard-only traversal of signup → onboarding → search → apply with focus always visible
and no trap · axe-core zero violations for `aria-dialog-name` and `focus-order-semantics` ·
`MotionConfig` present and asserted by a test.

Task 4.5 — The match score is attached to a person

Implemented by 4.1's `MatchCircle` change; this task is the surrounding judgement.

Remove the dead score-sort at `ApplicantDashboard.tsx` (it contradicts both the `sortBy`
   state and the project's "matched, not sorted" framing — verify it is still dead before
   deleting).
Consider moving the raw integer one click in, keeping the `MatchBreakdown` explanation as the
   primary surface. Phase 3 made that breakdown honest — an inapplicable dimension now reads
   "Not applicable" rather than 0/25 — so it can carry more weight than it could before.

Gate: no applicant-facing surface renders a score in an error colour · the breakdown remains
one interaction away.

Task 4.6 — Make the gate mechanical

Install `@axe-core/playwright` and add an a11y spec to the existing `e2e` job covering the
   six routes at 1200 px and 360 px. This is the deliverable that outlives the phase.
Fail the build on any violation of `serious` or `critical` impact. Log `moderate` without
   failing, so the ratchet can tighten later without blocking this phase.

Gate: `npm run e2e` fails when a contrast or nested-interactive regression is introduced
deliberately, and passes on `main`.

Task 4.7 — Prove it

Same method as Phases 1–3. Evidence to `docs/evidence/phase-4-a11y.md`.

#    Check    Expect
A1    Every semantic token pair, computed    all text pairs ≥ 4.5:1, in a committed table
A2    axe-core, six routes, 1200 px    zero serious/critical
A3    axe-core, six routes, 360 px    zero serious/critical
A4    360 px horizontal scroll    none on any of the six
A5    Keyboard traversal signup → apply    focus always visible, no trap, Escape closes dialogs
A6    Bookmark + star hit boxes    ≥ 44×44 computed
A7    `prefers-reduced-motion: reduce`    JS animations suppressed, not just CSS
A8    Legitimate journeys unchanged    seeker + employer + admin paths still 2xx — run FIRST

A7 needs a real emulated preference (`page.emulateMedia({ reducedMotion: 'reduce' })`), not a
source grep — the whole finding is that the CSS clamp lies about coverage.

A8 runs first. This phase rewrites the primary button colour and the card markup on the busiest
screen in the product; a visual regression that breaks a flow is the likelier failure than an
a11y miss.

***
Definition of done

Every text token pair clears 4.5:1, proved by a committed computed table.
No primary CTA fails AA — the 3.30:1 white-on-#16a34a case is gone product-wide.
No score, and no person, is rendered in an error colour.
axe-core runs in CI on six routes at two widths and fails on serious/critical.
Nothing scrolls horizontally at 360 px; both fixed sidebars are reachable.
No interactive element nests inside another; touch targets ≥ 44 px.
Reduced motion is honoured by JS animation, not only CSS.
docs/evidence/phase-4-a11y.md committed, A8 green, prod untouched (this phase should need no
   probe data at all — if you find yourself seeding accounts, ask why).
tsc -b · lint · vitest · build · e2e · CI green. Ledger updated only if a migration was needed.

House rules

CLAUDE.md §9 throughout: stage explicit paths, never discard an exit code, verify before anything
destructive, label provenance, let the gate define done. §3 diagnose before fix. §4 no history
rewriting. §7 partial-close discipline — "contrast fixed" is a claim that needs a number per pair,
not a spot check.

Two warnings specific to this phase.

**The token change is product-wide and visual.** Promoting `--color-brand-hover` to the default
CTA colour touches every button in the product. Screenshot-diff the six routes before and after;
a contrast fix that makes the brand look muddy will get reverted by the next person, and then the
CTA fails AA again.

**Do not let axe-core's clean report end the phase.** Automated tools catch roughly half of real
accessibility problems. The keyboard traversal in A5 and the 360 px sweep in A4 are the parts a
human has to do, and they are where the findings that matter will come from — the same way every
defect that mattered in Phase 3 came from executing something rather than reading it.
