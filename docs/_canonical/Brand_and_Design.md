# TopFarms — Brand & Design System (Canonical)

> **Status:** CANONICAL · **Consolidated:** 2026-06-20
> **Authoritative live source:** `src/index.css` (Tailwind v4 `@theme` tokens — wins on any hex/value).
> **Consolidated from:** `.planning/v2-migration/TopFarms_Brand_Spec_v2.md` (brand bible), `.planning/v2-migration/DESIGN.md` (implementation contract), verified against `src/index.css`.
> **Supersedes (archived):** `_archive/2026-06-20/docs/design-system.md` — the **retired v1 brand** (soil/moss earth-tones + Fraunces/DM Sans). Do not use it.

---

## North star

"The Farm Office" — confident, grounded, clear: a modern Kiwi trade tool. One green, no brown.

## The rules

- **One-Green:** a single brand green. No secondary/accent greens.
- **No-Brown:** the entire v1 soil/moss/fern/meadow/hay/cream earth-tone palette is **retired**.
- **Tinted-Neutral:** neutrals carry a faint green tint, not pure grey.

## Colour tokens (v2 — live in `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| `--color-brand` | `#16A34A` | primary green (buttons, links, emphasis) |
| `--color-brand` hover | `#15803D` | hover state |
| `--color-brand-900` | `#0F3D22` | darkest green (optional dark nav, headings) |
| brand tint | `#E8F5EC` | subtle brand-tinted fills |
| `--color-bg` | `#FAFBF9` | page background (near-white, tinted) |
| `--color-surface` | `#FFFFFF` | cards / surfaces |
| `--color-surface-2` | `#F3F5F0` | input backgrounds / secondary surface |
| `--color-text` | `#0B1F10` | primary text |
| text muted | `#5B6B5F` | secondary text |
| text subtle | `#8A968D` | tertiary text |
| `--color-border` | `#E5E8E2` | borders / dividers |
| `--color-warn` | `#F59E0B` | mid match-score / warnings |
| `--color-info` | `#0EA5E9` | info / verified |
| `--color-ai` | `#8B5CF6` | AI-related accents |

> Stripe Elements cannot take CSS variables, so `PaymentForm.tsx` hardcodes `#16A34A` — this is
> the one sanctioned hex literal and it matches `--color-brand`.

## Typography

- **Inter** throughout (weights 400 / 500 / 600 / 700) — both display and body.
  (`--font-display` and `--font-body` both point at Inter — a deliberate migration decision.)
- **JetBrains Mono** for code / monospace.
- v1 **Fraunces (serif)** and **DM Sans** are retired.

## Layout & shape

- **Spacing:** 4-pt grid (`4·8·12·16·20·24·32·40·48·64·80·96`).
- **Radius:** 8 / 12 / 16; fully-rounded pills for chips/badges.
- **Accessibility:** WCAG AA; 44×44 minimum touch targets; `--text` on `--bg` ≈ 17.8:1.

## Logo

Inter semibold "TopFarms" wordmark + geometric leaf in `--color-brand`.

## Voice

Confident, grounded, clear — a modern Kiwi trade tool. Kiwi-isms acceptable. Verb-first CTAs.

## Known v1 residue (code hygiene, non-blocking)

A handful of dead `border-t-moss` utility classes and stale soil/cream/fern code-comments
survive in ~10 components (e.g. `ProtectedRoute.tsx`, `AuthLayout.tsx`). `moss` is no longer a
defined token, so these render nothing — cosmetic dead code, safe to sweep opportunistically.

## Source-of-truth hierarchy

`src/index.css` (live tokens) → `TopFarms_Brand_Spec_v2.md` (brand bible) → `DESIGN.md`
(implementation contract) → this canonical summary. All four agree; the archived v1
`design-system.md` does not and must not be used.
