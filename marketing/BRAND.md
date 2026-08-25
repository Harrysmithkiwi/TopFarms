# Marketing — Brand reference

All marketing creative in this folder follows the canonical TopFarms brand & design system.

**Source of truth:** [`../docs/_canonical/Brand_and_Design.md`](../docs/_canonical/Brand_and_Design.md)
(v2.1) and its token file [`../docs/_canonical/topfarms-tokens.css`](../docs/_canonical/topfarms-tokens.css).
`src/index.css` is the live implementation and wins on any hex.

> **Why this file nearly became a fourth brand document.** It carried a "quick recall" list
> that drifted silently: by the time the design-system sync ran on 2026-08-25, every single
> bullet in it was wrong — it still named the pre-v2.1 green, claimed Inter was the only
> typeface, and denied the existence of an accent green. Nothing pointed at it and nothing
> checked it. A summary of a canon is a copy of a canon, and copies rot. This block is kept
> only because marketing work happens outside the app and needs *something* at hand; if it
> disagrees with the canonical doc again, the canonical doc is right and this is a bug.

Quick recall (the canonical doc wins on any conflict — and on 2026-08-25 every line of this
block was wrong, so treat it as a reminder of what to go and read, never as a source):

- **One green, four tonal steps:** `#14532D` display, dark bands and primary hover ·
  `#15803D` primary fill, links and any green text · `#16A34A` icons, focus rings, the logo
  and decorative fills — **non-text only**, it measures 3.30:1 on white · `#E8F5EC` tints and
  selected states. No lime, no second hue, no brown.
- **Type:** **Newsreader 500** for display — marketing H1/H2 and app page titles, never under
  20px, never a card title or a button. **Inter** for the entire interface (400/500/600/700);
  card titles are Inter 600 / 17px. JetBrains Mono for data and code.
- **Logo:** Inter 700 title-case "TopFarms" wordmark, a single stroked leaf, and a full stop.
  Both marks take the brand green — but the full stop is a text glyph, so it uses `#15803D`,
  not the accent.
- **Radius:** four values only — `8` `12` `16` `pill`.
- **Elevation:** four levels, all tinted `#0B1F10`. Never a black shadow.
- **Voice:** confident, grounded, clear — a modern Kiwi trade tool. Verb-first CTAs.

## What lives here

- `video/` — HyperFrames film projects (`act4-hero`, `product-cut`) + `FILM-NOTES.md` handoff.
- `posters/` — social + landscape-hero posters by audience: `employer/`, `seeker/`, `brand/`.
- `source-assets/` — framework-free `components/`, `screens/`, `landing-establishing.html`, and `manifest.md` (the index the video pulls from).
