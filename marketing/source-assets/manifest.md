# TopFarms — Video Assets Manifest

Standalone, framework-free HTML for the HyperFrames launch video. Sourced from the
claude.ai/design **"Design System"** HTML lineage (`styles.css` token sheet + the
design-system HTML files) — **not** the React app. Every file renders by opening it
directly: tokens embedded inline, Inter + JetBrains Mono via CDN `<link>`, no build,
no router, no auth, no external CSS, no external images.

**Targeting convention:** every element the film moves carries a stable `data-anim`
attribute (same naming as app PR #3). Select with `[data-anim="…"]`.

**Brand invariants (do not substitute), updated 2026-08-25:** one green in four steps —
`#15803D` fill, links and any green text · `#16A34A` icons and decorative fills, **never
text** · `#14532D` dark surfaces and hover (was `#0F3D22`, retired) · `#E8F5EC` tint.
Match-score accent purple `#8B5CF6` (rings and AI moments only); surfaces
`#FAFBF9`/`#FFFFFF`/`#F3F5F0`; text `#0B1F10`. No gradients. Shadows only if tinted
`#0B1F10` — never black.

---

## Components (animated as discrete pieces)

### `components/match-score-ring.html` — HERO element
- **What:** the large match-score ring, AI-purple, preset to **92%**.
- **Natural size:** 200 × 200 px (the ring); canvas centers it on `#FAFBF9`.
- **Animate the fill (single settable value):** the arc reads progress from **one CSS
  custom property `--ring-offset`** on `[data-anim="ring-fill"]`.
  Geometry r=86 → circumference **C ≈ 540.35**.
  - `0%` (empty) → `--ring-offset: 540.35`
  - `92%` (preset) → `--ring-offset: 43.23`  ( = C × 0.08 )
  - **Fill-on:** tween `--ring-offset` 540.35 → 43.23. (Verified: setting the var drives
    `stroke-dashoffset` live.) Equivalent to animating the circle's `stroke-dashoffset`.
- **Selectors:** `[data-anim="match-ring"]` (container) · `[data-anim="ring-fill"]` (arc) ·
  `[data-anim="ring-pct"]` (the `92%` readout, for a count-up).

### `components/job-card.html` — Job listing card
- **What:** Dairy Farm Manager · Riverbend Dairy · Waikato, chip row **Dairy · Rotary
  shed · Accommodation · AEWV**, salary, and a 94% green ring-badge.
- **Natural size:** card 380 px wide (content height ≈ 150 px).
- **Selectors:** `[data-anim="job-card"]` (whole card) · `[data-anim="chip"]` ×4 (stagger-in) ·
  `[data-anim="match-ring"][data-variant="badge"]` + its `[data-anim="ring-fill"]`
  (badge arc: r=22 → C ≈ 138.23; 94% = offset 8.29; fill-on 138.23 → 8.29).

### `components/shortlist-row.html` — Shortlist row (single)
- **What:** one ranked candidate row (Alex R. · Dairy Farm Manager, skills, **92%** match
  badge). **Instantiate ×3 for the bubble-collapse payoff.** The other two data sets:
  Jordan M. · Herd Manager — 85%; Sam T. · Relief Milker — 81%. (All three composed
  together also live in `screens/employer-shortlist.html`.)
- **Natural size:** row 520 px wide (height ≈ 84 px).
- **Selectors:** `[data-anim="shortlist-row"]` (the row; `[data-top]` marks a brand-tinted
  "worth calling" row) · `[data-anim="match-badge"]` (the % pill).

### `components/chip.html` — Chip / pill (animatable check)
- **What:** a filter pill, **default UNCHECKED** (not hardcoded checked).
- **Animate unchecked → checked:**
  1. set `[data-anim="chip"]` `data-state="unchecked"` → `"checked"` (crossfades fill/
     border/text to brand-tint and expands the tick slot)
  2. the tick `[data-anim="chip-tick"]` is a normalised path (`pathLength="1"`); tween its
     `stroke-dashoffset` **1 → 0** to draw the ✓. CSS transitions are pre-wired to
     `data-state`, or drive the values directly for exact timing.
- **Natural size:** ~28 px tall, content-width pill.
- **Selectors:** `[data-anim="chip"]` · `[data-anim="chip-tick"]`.

### `components/logo-lockup.html` — Logo (draw-on leaf)
- **What:** geometric leaf + "TopFarms" wordmark. The leaf path is exposed **both** as a
  fillable shape and a strokeable outline so it can be drawn-on then flooded.
- **Draw-on order** (all strokeable paths normalised `pathLength="1"`; tween
  `stroke-dashoffset` 1 → 0): `[data-anim="logo-leaf-stroke"]` (outline strokes on) →
  `[data-anim="logo-leaf"]` (fill fades in, opacity 0→1) → `[data-anim="logo-vein"]`
  (interior vein strokes on) → `[data-anim="logo-word"]` (wordmark in).
- **Natural size:** leaf 56 px, lockup ≈ 240 × 56 px.
- **Selectors:** `[data-anim="logo-lockup"]`, `logo-leaf`, `logo-leaf-stroke`, `logo-vein`, `logo-word`.

---

## Screens (assembled — establishing / wide shots)

### `screens/seeker-job-feed.html`
- **What:** Seeker · Job Feed — profile card (92% **purple** profile-fit ring + 2 skill
  bars), then 3 job cards with green ring-badges (94 / 88 / 81).
- **Natural frame:** 390 px wide phone column, ≈ 844 px tall (content-driven).
- **Selectors:** `[data-anim="logo-leaf"]` · `[data-anim="match-ring"][data-variant="score"]`
  (+ `[data-anim="ring-fill"]`) · `[data-anim="skill-bar"]` ×2 (+ `[data-anim="skill-fill"]`)
  · `[data-anim="job-card"]` ×3 · `[data-anim="chip"]` ×8 ·
  `[data-anim="match-ring"][data-variant="badge"]` ×3 (each with its `ring-fill`).

### `screens/employer-shortlist.html`
- **What:** Employer · Shortlist — dark job-context band (14 Applicants / 3 Shortlisted /
  92% Top match), then "Three worth calling" (3 brand-tinted rows: 92 / 85 / 81), a
  divider, and 2 more rows (68 / 54).
- **Natural frame:** 390 px wide phone column, ≈ 844 px tall (content-driven).
- **Selectors:** `[data-anim="logo-leaf"]` · `[data-anim="shortlist-row"]` ×5
  (`[data-top]` on the 3 "worth calling") · `[data-anim="match-badge"]` ×5.

---

## Establishing asset (live landing page)

### `landing-establishing.html` — **establishing-scroll**
- **What:** flattened static snapshot of the **live refreshed launch page** (PR #2 /
  commit `9c558e2`), full hero-to-footer. Scroll-reveal sections are locked to their
  revealed state, scripts stripped, all CSS embedded, zero external images.
- **Use:** **slow wide auto-scroll with a gentle push-in at the top of the reveal** —
  establishing shot, NOT a feature walkthrough.
- **Dimensions:** **1440 px wide × full scroll height 6204 px.** (Verified renders +
  scrolls standalone; all 20 key blocks visible.)
- **Selector:** `[data-anim="establishing-scroll"]` (the document body). Time the scroll
  against the 6204 px height; push-in lives over the first viewport (~0–900 px).
- **Section order (top → bottom)** for cueing: hero → capabilities band → match engine →
  how-it-works → farm sectors → live listings (empty-state) → "what we match on" band →
  employer dashboard preview → values strip → final CTA → footer.

---

## Provenance & notes
- Source of record: claude.ai/design project **"Design System"** (`557bb822-…`).
- Mock data (names, farms, scores, salaries) is illustrative, copied from the design.
- The React app keeps its own copy of these (PR #3, `feat/design-system-screens`); this
  bundle is the separate framework-free export for video. The two are independent.
- Generated 2026-06-24.
