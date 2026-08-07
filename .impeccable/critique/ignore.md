# Critique ignore list — TopFarms

Findings matching an entry below are dropped silently on future `/impeccable critique` runs.
This is the only prior-run input critique consumes.

Established by the Gate A calibration run, 2026-08-06, on
`src/pages/admin/DailyBriefing.tsx` (dual-agent: A design review, B detector + browser).
Each entry states *why* it is a false positive on this repo, so a later session can retire an
entry when the underlying cause is fixed rather than inheriting it as folklore.

**Scope note:** these apply to the **gated portals** (admin, employer, seeker), whose canon is
`docs/DESIGN.md`. Public marketing (`Home`, `ForEmployers`, `Pricing`, `legal/`,
`src/components/landing/`) has a different canon (`docs/design/v11-DIRECTIVE.md`) and is out of
scope entirely — a finding there is discarded, not filed. See `CLAUDE.md` §10.

---

## 1. Locked design decisions — never file these

`docs/DESIGN.md` §6 pins these deliberately, with the anti-drift reasoning stated inline. A
recommendation to change any of them is a false positive regardless of how it is argued.

- **Hex over OKLCH.** Hex is canonical in this repo. `src/index.css` wins on any colour value.
  Do not propose converting the palette to OKLCH, LCH, or `color-mix()`.
- **Inter, and only Inter.** The One-Family Rule. Do not propose Geist, Satoshi, Söhne, or any
  replacement, and do not file `overused-font` / "Primary font: inter (100% of text)" — 100%
  Inter is the requirement, not a defect. Chosen because Xero uses Inter and NZ farmers already
  read it daily.
- **One green.** `#16A34A` with `#15803D` as its hover. Do not propose a secondary accent, an
  expanded palette, or additional semantic hues beyond the declared status tints.
- **No "Responsive Behavior" top-level section.** §6 forbids it by design; breakpoint guidance
  lives inline in §5. Do not propose restructuring the six-section layout.

## 2. Detector: `design-system-font-size` on 13px and 17px — **RETIRED 2026-08-06, fixed at source**

Kept as provenance; no longer suppresses anything.

`detect.mjs` reads the YAML block at `docs/DESIGN.md:29-58`, which declared only 5 type steps
while the prose ramp at `:198-205` declared 8 — omitting `Subtitle 17/24`, `Body Large 17/26`
and `Small 13/20`. 13px and 17px were canon and the detector could not see them: **67 of 94**
admin-tree findings were 13px alone, a 71% false-positive rate from three missing YAML keys.

The three roles were added to the YAML rather than ignored here. Measured effect:
**94 → 27** findings across `src/pages/admin` + `src/components/admin`, **10 → 4** on
`DailyBriefing.tsx`. The detector parses every key under `typography` and reads `.fontSize`
(`scripts/detector/design-system.mjs:422-427`), so key names are free — only the values matter.

**Still genuine, do file:** sizes off both the YAML and the prose ramp. Remaining 27, by value:
14px×13, 11px×7, 24px×3, 28px/22px/18px/16px×1. The admin KPI numeric scale (24px at
`DailyBriefing.tsx:143,320,326`, 28px elsewhere) is undeclared in either place and needs a
ruling, not an ignore entry.

## 3. In-page detector: CSSOM-derived rules that render nowhere on the target

`detect.js` reads **stylesheet rules**, not the rendered tree, so a Vite build serving one CSS
bundle reports marketing-surface declarations on gated-portal pages. Verified by walking
`#root *` for computed style on `/admin`: **zero** matching elements in every case.

- **`bounce-easing` — `animation: var(--animate-bounce)`.** `animate-bounce` has **no
  occurrence anywhere in `src/`**; it is an unused Tailwind v4 theme keyframe.
- **`layout-transition` — `transition: height`.** 0 elements with `transitionProperty`
  containing `height`.
- **`repeating-stripes-gradient`.** 0 elements. Every `repeating-linear-gradient` in the repo
  lives on the marketing surface — `src/components/landing/*` (HeroSection, WorkerSplitSection,
  MatchBandSection, CloseSection, CardRowSection), `src/pages/Pricing.tsx`,
  `src/pages/ForEmployers.tsx`, `src/components/layout/AuthLayout.tsx` — which is out of scope
  per §10.

File one of these **only** with a named element from the rendered tree of the page under review.

## 4. In-page detector: `text-occlusion` on `.impeccable-*` nodes

The detector auditing its own injected overlay. The occluded span's ancestor chain is
`span > div.impeccable-label > div.impeccable-overlay.impeccable-visible > body`, with
`inReactRoot: false`. Removing the overlay nodes and re-running drops the finding. Drop any
finding whose selector chain contains `impeccable-overlay`, `impeccable-label`, or which reports
`inReactRoot: false`.

## 5. Contrast failures measured without canvas normalisation

**Not an ignore rule — a method requirement.** A contrast walker that reads colour strings
directly resolves this repo's `oklch()` and `color-mix()` tokens to `#000000` and fabricates
failures. Any contrast finding must state the computed ratio and both resolved hex values, and
must have normalised through a canvas (`ctx.fillStyle` → `getImageData`) and composited ancestor
backgrounds with alpha, scoring gradients against their worst-case stop.

Measured correctly on `/admin` at 1440×900 and 390×844: **0 failures.** Precedent for why this
matters: `#8A968D` (3.08:1) was darkened to `#647268` (measured 5.03:1) — recorded at
`src/index.css:23-26`. The current values pass.

## 6. Focus-ring findings sampled mid-transition

**Not an ignore rule — a method requirement.** The admin rail carries `transition-all` at
`0.15s`, which animates `outline-color`. Sampling immediately after `Tab` catches the ring
part-way and reads 1.77:1; the settled value is `2px solid #15803d` at 4.57:1 against the rail,
which passes SC 1.4.11. **Wait ≥900ms after focus before measuring**, and confirm the unfocused
state computes `outline-style: none` so an always-on border is not being mistaken for a ring.

A failing-focus-ring finding was withdrawn on this basis during the calibration run.

*Genuine and unrelated:* the Tailwind v4 trap (`outline-none` combined with
`focus-visible:outline-*`, which never paints in v4) has **0 occurrences** in this repo. If it
reappears, file it — that one is real.
