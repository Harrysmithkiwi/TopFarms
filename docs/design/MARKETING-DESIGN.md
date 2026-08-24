# MARKETING-DESIGN.md — TopFarms public marketing surface (v14)

Adopted 2026-08-24 from the operator's comp `design-reference/Landing pages /TopFarms
landing page final draft.png`. Supersedes `v12-DIRECTIVE.md` as the marketing canon.
Format follows the design.md convention (awesome-design-md): one file an agent can read
and restyle from without opening Figma.

**The one big decision:** the marketing surface now uses the PORTAL material — the same
green family around `#16A34A`, the same Inter body, the same near-white canvas as
`docs/DESIGN.md`. There are no longer two design worlds. A farmer sees one product before
and after signing in, and the hero can preview the real product in its own tokens.

Scope: `Home`, `ForEmployers`, `Pricing`, `legal/`, `src/components/landing/`,
`src/components/shell/`. Portals stay owned by `docs/DESIGN.md` (which this now agrees
with). All tokens live in `src/index.css` under "v14 marketing world" — components never
hardcode a hex.

---

## 1. Visual theme & atmosphere

Clean, light, product-forward SaaS with a rural warmth. Calm and trustworthy over clever:
the audience is farmers and farm workers, not design-conscious SaaS buyers. Generous
white space, hairline borders instead of heavy shadows, one green used with intent. The
illustrated NZ paddock survives from v12 only as grounding bands (under the hero, in
the split cards, behind the close) — never as a full-bleed hero again.

Dials (taste-skill): VARIANCE 5 · MOTION 3 · DENSITY 4. Trust-first audience overrides
the landing default; the comp is symmetric and quiet on purpose.

## 2. Color palette & roles

| Token | Hex | Role |
|---|---|---|
| `paper` | `#F7F8F6` | page canvas |
| `linen` | `#FFFFFF` | raised band / card surface |
| `rule` | `#E5E8E2` | every border |
| `bark` | `#0B1F10` | primary text |
| `sage` | `#5B6B5F` | secondary text (5.31:1 on paper) |
| `fern-600` | `#16A34A` | THE brand green: icons, accents, decorative fills. **Never a text-bearing fill** (3.30:1 with white) |
| `fern-700` | `#15803D` | text-bearing green: button fill (white on it 5.02:1), links (4.71:1 on paper) |
| `fern-800` | `#166534` | hover state (7.13:1 with white) |
| `fern-900` | `#14532D` | display headings (8.55:1 on paper) |
| `fern-100` | `#E8F5EC` | green tint: chips, eyebrow pill, icon plates |
| `fern-50` | `#F1F8F3` | faintest green tint |

One accent, locked page-wide. All ratios re-measured 2026-08-24 (comment block in
`src/index.css` is the authority).

## 3. Typography rules

- **Display**: Newsreader (`font-serif`), weight 500, `tracking-[-0.01em]`, `fern-900`.
  Hero h1 `clamp(2.4rem, 4.2vw, 3.25rem)`; section h2 `clamp(1.8rem, 3.4vw, 2.4rem)`.
  Italic same-family for emphasis (the hero's second line, in `sage`). Newsreader ships
  old-style figures: add `lining-nums` wherever a numeral must be unambiguous (legal
  clause numbers already do).
- **Body**: Inter (`font-body`), 15–18px, `sage` for supporting copy, `bark` for primary.
- Never mix a foreign family for emphasis. Headlines ≤ 2 lines at desktop, subtext ≤ 20
  words.

## 4. Component stylings

- **Btn** (`V12Kit.tsx`, the one action component): pill, 1px border.
  primary = `fern-700` fill/white text, hover `fern-800`; outline = white fill,
  `rule` border, `bark` text; onScene = solid white (for buttons over illustration —
  transparent outlines over art are unmeasurable and banned). Trailing arrow on all.
- **Cards**: white, `rounded-2xl`, `border-rule`, shadow tinted to brand ink
  (`rgba(11,31,16,…)` ≤ 0.07) — never pure-black shadows.
- **Chips/tags**: `rounded-full`, `fern-100` + `fern-800` text for brand chips; `paper` +
  `rule` border + `sage` for neutral meta.
- **Nav**: ONE bar, ≤ 72px, `paper` bg, border-b. Logo left (leaf + wordmark, green
  full stop), links center-left, right side = "Sign in" (quiet link) + "Post a job"
  (the page's one green action). No audience toggle. Authed states keep the role links
  and avatar menu verbatim.
- **Footer**: brand column + For job seekers / For employers / Company. Only registered
  routes — the seeker signup lives here.

## 5. Layout principles

- Container `max-w-[1120px]` (sections) / `1200px` (shell), `w-[92%]`.
- Section rhythm `py-16` → `py-24`. Hero top padding ≤ `pt-16`.
- Hero: split 5/7 — copy left, product preview right. Preview collapses under the copy
  below `lg`; its filter rail hides below `md`.
- One eyebrow per page (the hero's). Section headings stand alone.
- 12-col grid, `gap-6`; explicit single-column collapse below 768.

## 6. Depth & elevation

Three layers only: canvas (`paper`) → surface (white + `rule` border) → floating (white +
border + one tinted shadow). Nothing floats above that except the avatar menu. No
glassmorphism, no glows.

## 7. Do's and don'ts

- DO use word match-chips ("Strong match") — a numeric score is never shown publicly
  (directive 1.4, carried forward; the admin-gate ruling "score is a word" binds).
- DO keep every link a real route (dead-link gate). "Resources"/"About" from the comp
  have no route and are not rendered.
- DO keep ONE label per intent sitewide: seeker action = **"Find work"** (→ `/jobs`),
  employer action = **"Post a job"** (→ `/signup?role=employer`), seeker signup =
  **"Create a profile"** (→ `/signup?role=seeker`). "Hire staff", "Browse jobs" and
  "Join TopFarms" are retired labels.
- DON'T show fake counters, fake window chrome (macOS dots), version labels, or
  invented precision anywhere.
- DON'T put real lead/farm names in illustrative previews — invented NZ-plausible only.
- DON'T reintroduce em dashes in marketing copy (legal text is exempt, 1.17b).
- DON'T restyle marketing with a green other than this family, and never `fern-600`
  under small text.

## 8. Responsive behavior

Breakpoints: Tailwind defaults. 44px minimum touch targets (`min-h-11`). Nav links wrap
to a scrollable second row with an edge fade below `md`. Every multi-column section
declares its own mobile collapse. Verified at 1440 / 768 / 390 via Playwright CLI on
2026-08-24.

## 9. Agent prompt guide

"Restyle X to match the TopFarms marketing surface" means: `paper` canvas, white cards
with `rule` hairlines, Newsreader `fern-900` display with one italic accent, Inter body
in `sage`/`bark`, pill buttons filled `fern-700`, chips in `fern-100`, one eyebrow
maximum, labels "Find work" / "Post a job" only. Contrast pairs are pre-measured in
`src/index.css` — reuse them rather than inventing new pairs.

Carried forward from v11/v12 (still binding): §1.3 mechanic underplayed in marketing,
§1.4 no worker-facing numeric scores, §1.5 never disparage applicants, 1.15 honest
empty states, 1.17b legal em-dash exemption. The four required states (loading, empty,
error, unauthorised) apply to anything that fetches — `V12Roles` is the reference.
