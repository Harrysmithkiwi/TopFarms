# TopFarms v12 Design Directive — the marketing world

> **SUPERSEDED 2026-08-24 by `MARKETING-DESIGN.md` (v14).** The operator's comp
> "TopFarms landing page final draft.png" moved the marketing surface onto the portal
> material (one green around #16A34A, Inter, Newsreader display) and retired the
> illustrated-hero world this document specified. The v12 token NAMES survive with v14
> VALUES; the pastoral scene survives only as grounding bands. The product principles
> this document carried forward from v11 (§1.3, §1.4, §1.5, 1.15, 1.17b) remain binding
> and are restated in MARKETING-DESIGN.md §9. Kept readable for its decision history.

**Status: SUPERSEDED (was: active). Superseded `v11-DIRECTIVE.md` for the public marketing surface only.**
Written 2026-08-19 on the operator's instruction to replace the landing page with the
approved comp at `docs/design/design-reference/topfarming landing concept 3.png`.

**Scope.** `Home` and the public shell (utility bar, nav, footer). `ForEmployers`, `Pricing`
and `legal/` still render the v13 world and are ported separately — v12 tokens are new names
alongside the v13 ones precisely so those routes keep working during the gap.

**Out of scope, unchanged, still governed by `docs/DESIGN.md`:** every gated portal — admin,
employer, seeker. The two-worlds rule in `CLAUDE.md` §10 is not relaxed by this document; the
marketing half simply changed its costume.

---

## 0. What this reverses, and what it does not

v11 mixed *visual* decisions with *product* decisions in one numbered list. The supersede is
not a wholesale deletion, because CLAUDE.md §10 binds the **portals** to some of those
numbers. Read this table before assuming any v11 rule is dead.

| v11 | Rule | v12 |
|---|---|---|
| 1.1 | Match panel is explanatory, not decorative | **Section retired.** The panel is not on the v12 landing page at all. The rule still binds any surface that shows one. |
| 1.2 | "The page is zero-photography" | **REVERSED.** The v12 landing world is illustration-led. See §3. |
| 1.3 | Mechanic underplayed in marketing, prominent in the portal | **CARRIED FORWARD, unchanged.** |
| 1.4 | A worker is never shown a personal score | **CARRIED FORWARD, unchanged.** Pinned by test. |
| 1.5 | The page never disparages applicants | **CARRIED FORWARD as a prohibition.** The affirmative sentence that used to carry it lived in `MatchBandSection`, which is retired; the equivalent promise now lives on `/for-employers` ("Every applicant stays on the list"). |
| 1.6–1.8 | Alternating green panels, bar treatment, 01/02/03 numerals | **Retired with their sections.** |
| 1.9 | The audience toggle | **CARRIED FORWARD.** It still drives the utility bar and the `?role=` on signup. |
| 1.11 | Per-audience headline | **Retired for the hero.** The comp's headline is deliberately two-sided — "The right people" is the employer's half, "The right farm" is the seeker's. One string now serves both. Recorded as an open test in §6. |
| 1.12 | Pricing lives at `/pricing`; the position stays on the page | **CARRIED FORWARD.** Pinned by test. |
| 1.15 | Inventory honesty — no invented listings | **CARRIED FORWARD.** Pinned by test. |
| 1.19 | Pricing model v3 | **CARRIED FORWARD.** Unchanged; it is a commercial fact, not a design decision. |

**PRODUCT.md was edited in the same commit.** Its anti-reference list named "cream
backgrounds", "editorial serif display fonts" and "green-gradients-over-rolling-hills" as
things TopFarms must never look like. The operator was shown that collision, in those words,
and chose the comp anyway. Leaving the anti-references in place would have left every future
audit fighting the shipped design — so they are amended, with the reversal recorded rather
than quietly deleted.

---

## 1. The thesis

**A visitor is either hiring or looking, and the page asks which before it says anything
else.**

The page this replaces opened with a dark product panel explaining a matching algorithm to
someone who had not yet decided the site was for them. It was competent and it was mistimed.
v12 spends the first viewport establishing *where you are* — a New Zealand paddock — and the
second on *which of two people you are*. The mechanism is not hidden; it is simply not the
opening argument.

---

## 2. Tokens

Declared in `src/index.css` under `@theme`, prefixed away from the v13 set so both worlds
coexist during the port.

### Colour

| Token | Hex | Role |
|---|---|---|
| `fern-900` | `#1a3c2a` | display headings |
| `fern-800` | `#234d36` | button hover, link hover, sector labels |
| `fern-700` | `#2d6a45` | **primary fill**, links, icon plates |
| `fern-600` | `#3a7d52` | feature icons on light ground |
| `fern-500` | `#4a9a65` | fills only — **banned as text on dark panels**, measures 3.54:1 on `fern-900` |
| `fern-lite` | `#7cc493` | the accent that *is* legal on dark: 5.90:1 on `fern-900` |
| `fern-100` | `#e8f5ec` | icon plates, banner panel |
| `fern-50` | `#f4faf6` | chips, sector plates |
| `bark` | `#1c2b22` | body text |
| `sage` | `#5a6b60` | secondary text |
| `paper` | `#fdfcfa` | page ground |
| `linen` | `#f8f6f1` | alternating band ground |
| `rule` | `#e2e8e0` | hairlines |

Every pairing was measured on the real hexes before it shipped, not assumed. The full table
is in the `index.css` comment beside the tokens so it cannot drift away from them.

### Type

**Cormorant Garamond** (display) over **Inter** (body). Cormorant is operator-pinned by the
comp. It appears **only** on the marketing surface — a portal that reaches for it has crossed
the line CLAUDE.md §10 draws.

Display sizes are `clamp()` throughout. The body ramp is four steps and only four:

| Step | Size | Use |
|---|---|---|
| micro | `0.875rem` | chips, feature body |
| body | `0.9375rem` | card copy, links |
| intro | `1.0625rem` | section lead-ins, card headings |
| lead | `1.1875rem` | hero subhead, split-card headings |

The concept HTML carried `0.92 / 0.95 / 1.02 / 1.05 / 1.15 / 1.2rem`, which is six values and
no scale. Normalising them is not a deviation from the comp — at these sizes the difference is
sub-pixel, and the comp is a rendered PNG, not a type specimen.

### Form

Pills (`rounded-full`) for every action. `1rem` card radius. One shadow:
`0 4px 24px rgba(26,60,42,0.08)` — offset and blur, never a zero-offset halo.

---

## 3. The illustration is the design

Strip the scenes out and this is an ordinary layout. That is the honest test of where the
value sits, and it is why the assets are not a later phase.

**They are authored SVG, not raster and not stock photography.** Three reasons, in order of
weight:

1. **Medium.** The comp is painted. A photograph dropped into a painted layout reads as a
   mistake. There was no illustrator and no image-generation key available in the session
   that built this.
2. **Weight.** PRODUCT.md's accessibility note is load-bearing: many seekers are "on older
   Android devices on rural-NZ data". The whole scene system is a few kB gzipped and is
   resolution-independent. The raster equivalent is ~400kB before a 2× asset.
3. **Coherence.** Every green in the scene comes from the fern ramp, so the illustration and
   the interface are one material rather than a picture pasted onto a UI.

`PastoralScene.tsx` exposes three: `PastoralHero` (full-bleed), `PastoralBand` (short
horizon, no figures, for the banner and the close) and `PastoralVignette` (four variants for
card bleeds). Every one is `aria-hidden` — decorative by construction, with every fact the
page asserts living in text beside it.

**Depth is carried by four things at once**, which is what stops layered-hill SVG reading as
flat bunting: value, saturation, atmosphere, and detail density. The first build got this
wrong — a 0.55 haze plus a white top wash bleached the ranges into the sky, and the screenshot
beside the comp is what caught it. Both were cut.

**The figures face away.** The comp's pair are seen from behind. Keeping that is not
laziness: it dodges the "smiling-farmer-with-arms-crossed stock photo" cliché PRODUCT.md still
names, and it is the honest option, because a rendered front-on face implies a real person
endorsing a product they have never seen.

**Open asset slot.** If a real illustrator is ever commissioned, the hero is the one to
replace first, and the swap is a single component.

---

## 4. Routes — every action goes somewhere real

| Label | Route | Note |
|---|---|---|
| Find work · Browse jobs · Browse all jobs | `/jobs` | |
| Hire staff · Post a job · Post the first job | `/signup?role=employer` | pre-selects the role; walked on live prod 2026-08-19 |
| Learn more about TopFarms | `/for-employers` | |
| Sign in | `/login` | owned by the utility bar |
| Join TopFarms | `/signup?role=<audience>` | carries the toggle's current audience |

**The comp's `Resources` and `About` nav items are not rendered.** They have no route and no
content behind them. A dead nav link on the first page a farmer sees costs more than a missing
one, and a test pins that no `href` on this page is `#` or empty.

---

## 5. NOT THIS

- **No invented listings.** The jobs grid is live. With zero active jobs it renders an empty
  state that says so and offers a route out. Four plausible fake farms is the one lie a job
  board cannot come back from.
- **No emoji as icons.** The concept HTML used 🐄🐑🍇🌿🌾🌲 and ☆. The comp does not — it shows
  drawn green marks. `LandingIcons.tsx` is that set: one 24px box, one stroke weight,
  `currentColor` only.
- **No newsletter form.** The concept footer has one. There is no list, no consent record and
  no sender behind it, so shipping the input would be collecting addresses into nothing.
- **No numeric match score.** v11 §1.4, carried forward and pinned by test.
- **No unlicensed photography.** The concept HTML pointed at Unsplash URLs. Third-party host,
  wrong medium, and not ours.
- **No eyebrow labels** above headings anywhere on this surface.

---

## 6. Open tests

1. **Hero headline, per-audience vs shared.** v11 §1.11 swapped the headline on the toggle.
   v12 uses one two-sided line. Worth an A/B once there is traffic to test with; the machinery
   (`emp-only` / `seek-only`, still in `index.css`) has not been removed.
2. **CTA order by audience.** Today "Find work" is primary for everyone, per the comp. Flipping
   the pair for a visitor whose toggle says Employer is a one-line change and an obvious test.
3. **Sector row as navigation.** The six sectors are currently labels. Making them filter links
   into `/jobs?sector=` is the natural next move once there are listings to filter.

---

## 7. Gates

- `npm run lint` — 0 errors (**not** `npx eslint src tests`; the explicit-path form reports a
  different, smaller set and let three errors reach CI on 2026-08-19).
- `tsc -b` 0 · `npx vitest run` green · `npm run build` 0.
- `tests/landing-page.test.tsx` pins the v12 contract: one `h1`, both audiences present,
  routes real, no `%` figure anywhere, no disparaging vocabulary, pricing position without
  pricing cards, honest empty state, every `<svg>` `aria-hidden`, sector list is a real list.
- Contrast is measured, never eyeballed. The table in §2 is the record.
