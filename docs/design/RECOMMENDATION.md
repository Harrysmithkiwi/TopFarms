# TopFarms Landing Redesign — Recommendation

> Written **after** building and screenshotting all four architectures at 1440 and 390.
> Ranked from the renders, not from the brief. Governing spec: `TOPFARMS-STYLECARD.md`.
> Artefacts: `docs/design/heroes/0{1..4}-*.html` + `docs/design/heroes/shots/`,
> `docs/design/TYPOGRAPHY.html`, `docs/design/LOGO.html`. Date: 2026-07-10.

---

## The ranking

| # | Architecture | Audience resolution | 0-inventory answer | Ceiling | Risk | One-line |
|---|---|---|---|---|---|---|
| **1** | **Drafting Gate** (`01`) | Spatial two-door, diagonal shear | Founding scarcity (12 of 25) | Highest | Med-high | The gesture that *is* the two-sided market. Most ownable. |
| **2** | **Contextual Default** (`03`) | One worker-default door, employer whisper | Regional coverage | High | Low | The safe pick that still reads *decided*. Calmest, most farmer-credible. |
| **3** | **Ledger / Almanac** (`04`) | Persistent toggle-above-nav | Seasonal work almanac | Medium | Low-med | A real artefact (the almanac) carries it. Asks you to read, not act. |
| **4** | **Segmented Search** (`02`) | Segmented seeker/employer + search | Alert capture | Medium | Low | Marketplace-native and competent. Also the most generic. |

**Committed lead: the Drafting Gate (`01`), with Contextual Default (`03`) as the sanctioned safe fallback** if the gate tests too bold with real farmers. Reasoning below.

---

## What building them changed about my prose ranking

On paper, before building, my order was **Gate → Search → Ledger → Default.** The search-first architecture *sounded* like the smart, safe, marketplace-native answer (it is how Seek and Zeil open), and the editorial default *sounded* like the plainest, least distinctive option.

Rendering flipped the middle two, hard.

- **Search rendered as the most generic thing on the board.** A segmented control over a search field is a structural carrier, and exp-03 is exactly right that structural carriers tax into template on the way to legibility. Built and screenshotted, `02` looks like every job site — competent, ownable by no one. The paddock-geometry grid is the only thing that stops it being wallpaper. It dropped from #2 to #4.
- **The editorial default rendered as the most *confident* page.** `03` was supposed to be the wallflower. Instead the worker-default masthead, the contour hairlines, and the calm regional strip read as the most "decided-not-defaulted" of the four, and by far the most credible to a 55-year-old on a work phone. It rose from #4 to #2.

That is the exp-03 lesson landing in practice: **the visible spatial/compositional gestures (the gate's shear, the editorial masthead) hold their distinctiveness; the structural gesture (the search box) does not.** I would not have believed the search box was the weakest until I saw all four side by side. If nothing had changed from my paper ranking, that would have meant I hadn't looked hard enough — it changed a lot.

One more change: the **Ledger only works because we killed the pay index.** As a wage table it was a strategic mistake (see below) *and* it was the exp-03 "type-only editorial carrier floors" prediction coming true — a ruled table of numbers is still a template. Reframed as the **seasonal almanac**, the ledger now carries a genuinely distinctive, useful, ownable artefact, which is what lifts it off the floor. The carrier didn't save it; the *content* did.

---

## Per-architecture notes

### 1. Drafting Gate — `01-drafting-gate.html`
The diagonal fenceline shears the fold into two unequal pens: a wide warm white worker pen (57%) and a tighter tinted employer wedge (43%), diverging in weight, tint, tone, and CTA treatment. This is the one architecture where the audience split *is* the composition rather than a control bolted on top — the "diagonal-shear equivalent" the stylecard was hunting for. It is the most nameable ("the one that splits like a drafting race") and the most defensible against the AI-tell charge.
- **0-inventory:** founding scarcity, ledger-treated (`12 of 25`, meter). Converts "we're empty" into "we're early and exclusive," the strongest honest reframe.
- **Risk:** the employer wedge carries dead space at the bottom on desktop, and the boldness is real — a conservative farmer might find the shear "designed." Mitigation: it stacks to two honest tinted pens on mobile with the drama removed, so the risk is desktop-only.

### 2. Contextual Default — `03-contextual-default.html`
Leads with one confident worker door (workers are the larger audience and never pay, so warmth-first is correct), employer demoted to a quiet ghost link. Editorial-paper register: 80px Fraunces masthead, contour hairlines as the only texture, generous white. The regional-coverage strip answers zero-inventory with real footprint and no volume claim.
- **Why it's the safe pick:** lowest risk, highest farmer-credibility, and it still looks decided. If we want a launch that cannot embarrass us, this is it.
- **Watch:** the italic emphasis word ("*matched*") is dark, not green — it is the contrast lever, deliberately **not** the rejected v1 "green-italic-emphasis-word" bundle. Keep it dark; the moment it goes green it becomes the v1 tell.

### 3. Ledger / Almanac — `04-ledger-index.html`
Stock-book carrier: ruled rows, tabular figures, mono column heads, a persistent seeker/employer toggle in the nav. The fold artefact is **the TopFarms Almanac** — when calving, lambing, harvest and shearing peak, by region.
- **0-inventory:** timing value instead of volume. Honest (real NZ seasons), employer-safe, and a genuine reason to bookmark.
- **Note:** this replaced a public pay-index table, removed on founder direction (below). The ledger aesthetic is strong for tables; as a *whole-page* carrier it is content-dependent, which is why it ranks below the two gesture-led pages.

### 4. Segmented Search — `02-segmented-search.html`
Search is the fold: a real CSS-only seeker/employer segmented toggle over a region+role finder, paddock-geometry grid of category links below. Search that finds nothing sets a real alert, so no chip dead-ends.
- **0-inventory:** alert capture ("searching sets an alert"), reinforced by a dark honest "be first" capture band.
- **Verdict:** the most conventional and the most immediately legible, and therefore the least ownable. Keep it in reserve as the pattern to fall back to if the gate and the default both get vetoed — it will never be wrong, only never distinctive.

---

## The 0/0/0 counters — three solutions, one committed

The live site opens on "0 / 0 / 0 · Jobs / Workers / Matches." Three honest replacements were built into the architectures. **The wage-data / open pay-index option is removed** on founder direction — a public wage index broadcasts employer benchmarks and repositions us as a salary-data site, not a matcher. The three that stand:

1. **Founding scarcity** — "Founding farms: 12 of 25 spots." Real, creates urgency, converts emptiness into exclusivity. **← committed primary.**
2. **Regional coverage** — "Live in Waikato · Canterbury · Southland." Real footprint, no volume claim. **← committed secondary / fallback** once founding spots fill.
3. **Seasonal almanac** — the farm-work year by region. Real, distinctive, employer-safe. Best as a standing feature (arch `04`), not the 0/0/0 patch.

**Commit:** lead the old counter slot with **founding scarcity**, fall back to **regional coverage** when the 25 spots are gone. Never again ship a component labelled "EXAMPLE" or a fabricated count.

---

## Typography — decide from `TYPOGRAPHY.html`

Five faces set in the real headline at 66px, each graded to ship. The render's one surprise: **Inter-800 (tight) is a genuine contender, not a fallback** — pulled hard it stops reading as defaulted, adds zero bytes, and is bombproof on rural 4G. So the choice is a brand call, not a type call:

- **Recommended: Fraunces 500 display + Inter body.** Highest ceiling, carries the almanac/field-record warmth Inter can't, and a warm serif set with restraint is the most "decided" move on the board. **Conditional:** it only survives the default-AI-serif charge while the discipline holds (flat, left-aligned, one green, tabular numerals). Add a gradient and it becomes the cliché.
- **Honest second: Inter-800.** If the founder wants the safest possible launch, this cannot embarrass us. I will not argue it.
- Newsreader (thins at display), Bricolage Grotesque (reads urban), Zilla Slab (one note too loud) are foils — Zilla is worth keeping as a table-numeral face.

---

## Logo — see `LOGO.html`

Replace the generic leaf with **the gable mark**: two nested peaks in a rounded tile — a woolshed gable over a contour ridge, carrying the paddock-geometry and contour motifs at once. Holds its read to a 16px favicon, works mono and reversed on `#0F3D22`, needs no photograph. One green, flat, no gradient. Inter-600 lockup is default; Fraunces-600 lockup is the editorial alternate if display lands on Fraunces.

---

## Compliance check (all four)

- **One green `#16A34A`, held exactly** — no pasture shift smuggled in, ~3% coverage, no second green. ✓
- **Flat** — no gradient, glass, or drop shadow anywhere; depth from hairline borders + tinted surfaces. ✓
- **Honest** — no fabricated job counts, no "EXAMPLE" components; zero-inventory answered as a design problem four different ways; pay-index removed. ✓
- **Motifs** — drafting gate (`01`), paddock geometry (`02`), contour lines (`03`), ledger treatment (`04`); ear tag stayed killed. ✓
- **Type** — Inter body kept; display under trial; contrast via weight+size, never widened heading tracking. ✓
- **Motion** — CSS-only staggered load + hover/focus; `prefers-reduced-motion` honoured globally; no Lenis, no GSAP, no WebGL. ✓
- **Copy** — verb-first CTAs, NZ spelling, concrete pricing ("first listing free, $100 after that"), no blacklist words, no em dashes in the page copy. ✓
- **HeroSection.tsx untouched** — these are standalone prototypes; nothing wired into the app yet. ✓

---

## Decisions I need from you

1. **Lead architecture:** ship the **Drafting Gate** (bold, most ownable) or play safe with **Contextual Default**? My pick is the gate, with the default as the fallback if it tests too bold with farmers.
2. **Display face:** **Fraunces** (warm, higher ceiling, needs discipline) or **Inter-800** (bombproof, zero-risk)?
3. **Logo:** does the **gable mark** land, or do you want to see a monogram / wordmark-only direction too?
4. **Counter:** confirm **founding scarcity → regional coverage** as the 0/0/0 replacement.

Once 1–2 are decided I can wire the chosen fold into `HeroSection.tsx` + `Nav.tsx` against the live tokens.

---

## One flag (not a blocker)

The seven Meng To reference skills named in the session brief (`landing-page`, `animation-on-scroll`, and the five layout-systems) **are not present on this machine** — searched the repo, `~/dev/websites/dossier`, `~/.claude/plugins`, and the home tree. I did not fabricate having read them. Their substance (split/asymmetric-technical, editorial-paper, book-serif/ledger, technical-wireframe) is already encoded in the stylecard's LAYOUT + MOTIFS sections, which is what the four architectures were built against. If those skill files exist elsewhere and should feed a v2 pass, point me at them.
