# TopFarms — Brand & Design System (Canonical)

> **Status:** CANONICAL · **Version:** v2.1 · **Amended:** 2026-08-25 (row 0 of the design-system sync)
> **Authoritative live source:** `src/index.css` (Tailwind v4 `@theme` tokens — wins on any hex/value).
> **Reference build:** [TopFarms Design System](https://claude.ai/code/artifact/6b2d0491-4716-48cc-903e-a04b4ae99f22) — the spec sheet, rendered in its own tokens.
> **Sized by:** `docs/design/AUDIT.md` — the codebase survey this doc was measured against. Where this doc and the audit disagree, the audit measured and this doc asserted.
> **Supersedes:** `docs/_superseded/2026-08-25/Brand_and_Design-v2.0.md` (v2.0, 2026-06-20) and `docs/_superseded/2026-08-25/v12-DIRECTIVE.md`.
> **Supersedes (archived):** `_archive/2026-06-20/docs/design-system.md` — retired v1 brand (soil/moss earth-tones + Fraunces/DM Sans). Do not use it.
> **Also supersedes:** the "DESIGN SYSTEM v1.0" board (Satoshi / `#FFFFFF` ground / two-leaf logo). It has never matched what ships — see the audit below.

---

## What changed in v2.1

v2.0 was written on 2026-06-20 and has since drifted from the live product in three ways. All three are resolved here.

1. **The serif is reinstated.** v2.0 retired all serifs and pointed `--font-display` and `--font-body` both at Inter. The landing page has since shipped **Newsreader 500** on every H1 and H2. Rather than strip it out, we keep it — it is the single thing that stops TopFarms reading as another green SaaS — and scope it: display only, never under 20px.
2. **The green ramp is four steps, not one value plus a hover.** The live landing page uses `#14532D` for headings, `#15803D` for button fills and `#16A34A` for accents. v2.0 named only two of those and got the hierarchy backwards. The One-Green rule still holds: one hue, tonal steps, no second hue.
3. **`--color-brand` moves from `#16A34A` to `#15803D`.** `#16A34A` measures **3.30:1 on white** — it fails WCAG AA for body text and links, which is what v2.0 used it for. `#16A34A` stays in the system for icons, focus rings, the logo and decorative fills, where the 3:1 non-text threshold applies.

### Amended after the codebase audit (2026-08-25)

v2.1 was drafted from computed styles on the live site, not from the source. Five of its
values lost to what actually ships, in every case because the shipped value carries more
contrast. **The spec was wrong, not the code.**

| Token | v2.1 draft | Canonical | Why |
|---|---|---|---|
| `--color-text-subtle` | `#8A968D` | **`#5C6A60`** | The draft measures 2.96:1 on bg, 2.80:1 on surface-2. It was `#8a968d` once, darkened in Phase 4.1 "because 3.08:1 on white was carrying real prose", then darkened again on 2026-08-24 after the `/jobs/:id` axe sweep caught it failing four more surfaces. Re-adopting it reintroduces a bug fixed twice. |
| `--color-warn-text-on-bg` | `#B45309` (4.51) | **`#92400E`** (6.37) | Higher contrast, already shipping. |
| `--color-danger-text-on-bg` | `#B91C1C` (5.30) | **`#991B1B`** (6.80) | Same. |
| `--color-info-text-on-bg` | `#0369A1` (5.17) | **`#075985`** (6.59) | Same. |
| `--color-ai-text-on-bg` on `--color-ai-bg` | `#6D28D9` on `#EDE9FE` (5.98) | **`#5B21B6`** on **`#F5F3FF`** (8.19) | Same. |
| `--color-border-strong` | `#D3DAD3` | **`#D0D5CC`** | Near-miss. Decorative hover border; the 3:1 non-text threshold does not apply to either. |

**Naming.** The semantic pairs keep the repo's `-text-on-bg` and `-bg` suffixes, not the
draft's `-text` and `-tint`. `-text-on-bg` states the one surface a value is legal on, and
`scripts/contrast.mjs` gates the pairs *by name*. That suffix is what stopped a 1.93:1
`orange` variant re-shipping in July 2026. A rename would cost the rule.

Two claims in the v2.1 draft were also struck as untrue of the codebase:

- **"`/jobs` has 35 elements at `3px`."** There is exactly **one** `rounded-[3px]` in source
  (`Checkbox.tsx`). The 35 computed nodes are that plus `rounded-sm` and `rounded-md`.
- **"`border-t-moss` and other v1 soil/cream utilities survive in ~10 components."** They do
  not. Grepping `moss|soil|meadow|hay|sand|clay|wheat` as a Tailwind utility returns zero
  hits in `src/`. That sweep was already done. The one real dead-token reference is
  `--color-clay`, read by `JobStep5Description.tsx` and defined nowhere.

## North star

"The Farm Office" — confident, grounded, clear: a modern Kiwi trade tool. One green, no brown.

## The rules

- **One-Green:** one green *hue*, in four tonal steps. No lime, no teal, no second hue.
- **No-Brown:** the v1 soil/moss/fern/meadow/hay/cream earth-tone palette is **retired**, including the sand tones still live on `/signup` and `/jobs`.
- **Tinted-Neutral:** neutrals carry a faint green tint, not pure grey. Shadows are tinted `#0B1F10`, never black.
- **No stray hex:** every hex literal outside `src/index.css` is a bug. One sanctioned exception (Stripe, below).

## Colour tokens (v2.1)

### Ground & neutrals

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FAFBF9` | page ground, every screen |
| `--color-surface` | `#FFFFFF` | cards, panels, sheets, popovers |
| `--color-surface-2` | `#F3F5F0` | inputs at rest, table headers, meta chips |
| `--color-border` | `#E5E8E2` | every 1px rule and divider. One border colour only. |
| `--color-border-strong` | `#D0D5CC` | hover borders on interactive surfaces |
| `--color-text` | `#0B1F10` | body and UI text · 16.6:1 on bg |
| `--color-text-muted` | `#5B6B5F` | secondary copy, captions · 5.5:1 on bg |
| `--color-text-subtle` | `#5C6A60` | placeholders and disabled by intent · 5.5:1 on bg, and it clears 4.5:1 on all eighteen surface pairs in `scripts/contrast.mjs` |

### Green ramp

| Token | Hex | Use |
|---|---|---|
| `--color-green-900` / `--color-brand-900` | `#14532D` | display headings, dark bands, primary:hover · 8.8:1 on bg |
| `--color-green-700` / `--color-brand` | `#15803D` | primary button fill, links, any green text · 5.0:1 on white |
| `--color-green-600` / `--color-brand-accent` | `#16A34A` | icons, focus rings, logo, decorative fills · **non-text only** |
| `--color-green-50` / `--color-brand-tint` | `#E8F5EC` | selected states, success pills, subtle brand fills |

### Semantic — fill plus its AA-safe text pair

| Role | Fill `--color-*` | Background `--color-*-bg` | Text `--color-*-text-on-bg` | Ratio |
|---|---|---|---|---|
| success | `#16A34A` | `#E8F5EC` | `#166534` | 6.35:1 |
| warn | `#F59E0B` | `#FEF3C7` | `#92400E` | 6.37:1 |
| danger | `#DC2626` | `#FEE2E2` | `#991B1B` | 6.80:1 |
| info | `#0EA5E9` | `#E0F2FE` | `#075985` | 6.59:1 |
| ai | `#8B5CF6` | `#F5F3FF` | `#5B21B6` | 8.19:1 |

Never set the lighter fill value as text on its own background. The `-text-on-bg` suffix is
not decoration — it names the single surface the value is legal on, and `scripts/contrast.mjs`
gates each pair by that name.

> Stripe Elements cannot take CSS variables, so `PaymentForm.tsx` hardcodes one hex. This is the single sanctioned literal — update it to `#15803D` to match `--color-brand`.

## Typography

- **Newsreader** — display only. Weight 500, negative tracking. Marketing H1/H2 and app page titles ("Your applications", "Post a job", "Create your account"), plus empty-state headlines. Weight 400 italic for a second display line. **Never** under 20px, never a card title, label, table header or button.
- **Inter** — the entire interface. 400 / 500 / 600 / 700. Card titles are Inter 600 / 17px on every surface.
- **JetBrains Mono** — data and code. Tabular numerals wherever digits line up.
- Retired: **Archivo** (currently running all of `/signup`), **Satoshi** (v1.0 board only, never shipped), **Fraunces**, **DM Sans**.

| Style | Face | Size / line | Tracking |
|---|---|---|---|
| Display XL | Newsreader 500 | 60 / 62 | −1.5% |
| Display L | Newsreader 500 | 38 / 43 | −1.2% |
| Display M | Newsreader 500 | 25 / 31 | −1.0% |
| Display italic | Newsreader 400 italic | 25 / 31 | — |
| Heading | Inter 600 | 17 / 23 | −0.5% |
| Body L | Inter 400 | 18 / 29 | — |
| Body | Inter 400 | 16 / 25 | — |
| Body S | Inter 400, muted | 14 / 21 | — |
| Label | Inter 500 | 14 / 17 | — |
| Eyebrow | Inter 600, muted, caps | 11 / 13 | +13% |
| Data | JetBrains Mono 400 | 13 / 20 | tabular |

## Layout & shape

- **Spacing:** 4-pt grid — `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`.
- **Container:** 1280 max, 24 gutter, 12 columns, 20px page padding under 720.
- **Section rhythm:** 96 on marketing, 64 in app views, 48 on mobile.
- **Radius — four values, nothing else:** `8` inputs and in-card chips · `12` cards and callouts · `16` large panels and modals · `pill` buttons, badges, chips. `3 / 4 / 6 / 10 / 14 / 24 / 32` all collapse into these. **`10px` collapses to `12`** — 28 uses, the commonest off-system radius in the codebase, and it sits on cards and callouts rather than inputs.
- **Elevation — four levels, all tinted `#0B1F10`:** flat (1px border, no shadow — the default) · raised `0 1px 2px /.04` · floating `0 10px 34px /.05` · overlay `0 20px 50px /.10`. Hover promotes an interactive card from flat to floating. **Tailwind's default `shadow-sm/md/lg/xl` are black `rgb(0 0 0 / *)`**, so the tokens are redefined in `@theme` rather than the 28 call sites edited — the black is inside Tailwind, not in our source, which is why grepping for it finds nothing.
- **Accessibility:** WCAG AA. 44×44 minimum touch targets — the 36px small button needs a padded hit area on touch. Focus is a 2px `#16A34A` ring at 2px offset.

## Components

- **Buttons** — all pill. `lg` 54px / 16px-600 / 28 pad · `md` 44px / 14px-600 / 18 pad · `sm` 36px / 14px-500 / 14 pad. Primary `#15803D` → hover `#14532D`. Secondary is white on a `#E5E8E2` border. Tertiary is `#15803D` text.
- **Inputs** — 46px, 8px radius, white fill on `#E5E8E2`.
- **Badges — two families only.** *Status pills* carry a semantic tint and its AA-safe text pair. *Meta chips* are always `#F3F5F0` on `#5B6B5F`. Job attributes (Full-time, Seasonal, Rotary shed) are facts, not signals — colouring them costs the ability to signal anything. The v1.0 board's eight variants collapse to these two.
- **Selected state** — `#E8F5EC` fill with a `#16A34A` border. Never amber; the `#FEF3C7` selected card on `/signup` is a bug.

## Logo

Single stroked leaf in `--color-brand-accent`, wordmark `TopFarms` in Inter 700 title case, followed by a full stop in `--color-brand-accent`. The v1.0 board's two-leaf mark with letterspaced `TOPFARMS` caps is **not** the lockup and has never shipped.

## Imagery

The product ships no photography. The v1.0 board's photographic direction (cows, landscapes, portraits) describes an intent that no surface uses — treat it as unbuilt, not as a rule. If photography is introduced later it needs its own spec; until then the visual language is typographic plus hairline line icons at ~1.5px stroke.

## Voice

Confident, grounded, clear — a modern Kiwi trade tool. Kiwi-isms acceptable. Verb-first CTAs.

---

## Audit: where the product forked (measured 2026-08-25)

Computed styles read live from topfarms.co.nz, counted by DOM node.

| Property | Landing `/` | Jobs `/jobs` | Signup `/signup` | v1.0 board |
|---|---|---|---|---|
| Typeface | Newsreader 500 + Inter | Inter only (99 nodes, 0 serif) | **Archivo 800** (24 nodes) | Satoshi |
| Ground | `#FAFBF9` | `#FAFBF9` + sand `#FBF9F3` `#EBE5D6` | sand `#F2EDE1` `#FBF9F3` | `#FFFFFF` |
| Darkest green | `#14532D` | `#141812` | `#123324` | absent |
| Action green | `#15803D` | `#15803D` | `#123324` | `#16A34A` |
| Rogue accent | — | — | lime `#8CC63F`, amber `#FEF3C7` | — |
| Body text | `#0B1F10` ×153 | `#0B1F10` + `#141812` | `#141812` | `#0B1F10` |
| Border | `1px #E5E8E2` ×30 | `#E5E8E2` + `#DCD5C4` | `#DCD5C4` | `#E5E8E2` |
| Dominant radius | pill ×38 | `3px` ×35 | `8 / 12px` | `4→32`, no pill |
| Shadow | one, tinted | one | none | 5-step black ramp |

**The v1.0 board scores ~40% against the landing page.** Aligned: neutral palette, grid, semantic roles. Drifted: page ground, green ramp, radius, badges. Off-system: typography, logo lockup, elevation.

`/signup` is the outlier — the only surface on Archivo, the only one using lime, the only one still on sand. Its lime on white measures **2.05:1**, well under the 4.5:1 AA floor.

## Retired — delete on sight

**Colour:** `#8CC63F` `#F2EDE1` `#FBF9F3` `#EBE5D6` `#DCD5C4` `#123324` `#0F3D22` `#141812` `#585E51` `#61675A` `#F7F8F6` `#F1F8F3`
**Type:** Archivo · Satoshi · Fraunces · DM Sans
**Radius:** `3px` `4px` `6px` `10px` `14px` `24px` `32px`
**Shadow:** any `rgba(0,0,0,*)`
**Tokens:** `--color-clay` — read by `JobStep5Description.tsx:72`, defined nowhere, renders as nothing.

~~**Classes:** `border-t-moss` and other v1 soil/cream utilities surviving in ~10 components.~~ **Struck 2026-08-25** — zero hits in `src/`; that sweep was already done.

`#141812`, `#585E51` and `#61675A` are near-miss duplicates of the real text tokens — the kind of drift nobody notices individually and everybody feels collectively.

## Migration — ordered by inconsistency removed per hour

| Priority | Change | Where |
|---|---|---|
| P0 | Replace Archivo with Inter + Newsreader | `/signup` and any auth screen sharing its layout — 24 nodes. The most visible fork in the product. |
| P0 | Delete the sand palette | `#F2EDE1` `#FBF9F3` `#EBE5D6` `#DCD5C4` on `/signup` and `/jobs` → `#FAFBF9` `#F3F5F0` `#E5E8E2` |
| P0 | Delete lime `#8CC63F` | `/signup` stat figures → `#86EFAC` on the dark panel |
| P0 | Unify the dark panel green | `/signup` `#123324` → `#14532D` |
| P1 | Collapse near-miss text greys | `#141812` → `#0B1F10`; `#585E51` / `#61675A` → `#5B6B5F` |
| P1 | Move links off `#16A34A` | global → `#15803D`. Fixes a 3.30:1 AA failure with no visible change. |
| P1 | Normalise radii to 8 / 12 / 16 / pill | `/jobs` — 35 elements at `3px` |
| P1 | Bring the serif into app page titles | `/jobs`, dashboard, applications, `/signup` — H1 only |
| P2 | Redraw the v1.0 board | replace Satoshi specimens and the two-leaf logo, drop the photography direction, cut badges from eight to two families |
| P2 | ~~Sweep dead v1 utilities~~ → **delete the 11 orphaned pre-v12 landing components** | `src/components/landing/` — nothing imports them. −95 retired-token uses, −5 `font-bricolage`, −12 `rounded-3xl`. |
| P2 | Tint `--shadow-sm/-md/-lg/-xl` in `@theme` | fixes 28 black-rgba shadows across 23 files with zero component edits |

## Source-of-truth hierarchy

`src/index.css` (live tokens) → `docs/_canonical/topfarms-tokens.css` → this doc → the rendered spec sheet artifact. `docs/DESIGN.md` remains the portal *implementation* contract (states, authorisation, a11y) and defers to this doc on every colour, type and shape value; `docs/design/MARKETING-DESIGN.md` remains the marketing *layout and voice* guide and does the same. Any other design artefact — including the "DESIGN SYSTEM v1.0" board and the archived v1 `design-system.md` — is historical and must not be used.
