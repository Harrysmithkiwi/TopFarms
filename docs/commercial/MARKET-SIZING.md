# TopFarms — Market Sizing (TAM / SAM / SOM, bottom-up)

> **Created:** 2026-07-08 (Stage-2 WS2). Method: `farms × hiring-farm share ×
> hires/farm/yr × fee capture` per **country × vertical** — no single blended number,
> bands not point estimates. Base figures: `.planning/research/MARKET-DATA.md`.
> Fee assumptions: `PRICING-MODEL.md` (segmented blend). Labels: [V] verified ·
> [A] assumption band · [MODELLED] derived. **The NZ workforce cell is banded pending
> FOUNDER-ACTION FA-09 — the single input that most sharpens this file.**

## 0. The driver, restated

Placement TAM = **annual hiring events**, not farms or headcount. Bands used throughout
(from MARKET-DATA): hires = workforce × 15% (low) / 25% (base) / 40% (high) — NZ ag's
seasonal churn (Gypsy Day turnover, calving/harvest blocks) sits at the high end of
normal industries; only FA-09 + our own flow data settles it.

## 1. Country-level hiring-event pools [MODELLED]

| Country | Farms | Workforce | Hire events/yr (low/base/high) |
|---|---|---|---|
| NZ | 49,000 [V] | 60–100k [A — FA-09; base 80k] | **9k / 20k / 40k** |
| AU | 85,000 [V] | 292,200 [V] | **44k / 73k / 117k** |
| UK | 209,000 [V] | 471,000 [V — verify release, FA-10] | **71k / 118k / 188k** |

## 2. Fee-pool TAM per country (segmented blend, [MODELLED])

Blended fee per placement = Segment-A/B mix × fees (PRICING-MODEL §2): NZ blend ~$505
(90/10 A/B), AU ~$660 (80/20 — deeper corporate-ag layer), UK ~$800 NZD-equiv (65/35 —
enterprise + Seasonal Worker scheme operators). Mix shares are [A] — the weakest
assumption in this file after FA-09; noted per row.

| Country | TAM (base events × blended fee) | Band (low–high) |
|---|---|---|
| NZ | 20k × $505 ≈ **$10M** | $4.5M – $20M |
| AU | 73k × $660 ≈ **$48M** | $29M – $77M |
| UK | 118k × $800 ≈ **$94M** | $57M – $150M |
| **3-country TAM** | **≈ $152M** | $90M – $247M |

**The headline honesty:** NZ's entire TAM ≈ the $10M goal — i.e. NZ alone requires ~100%
share and is therefore **not a path to $10M** (confirms LOCKED #7 strategy read). The
goal = **~6–7% blended capture of the 3-country pool** — ambitious, not absurd.

## 3. Vertical decomposition (NZ first; AU/UK replicate at entry)

Vertical farm-splits are [A] until verified against Stats NZ/industry-body counts
(logged in FA-09 scope). Shares shown of the NZ base 20k events/yr:

| Vertical | Share of events [A] | Events (base) | Notes |
|---|---|---|---|
| Dairy | ~40% | 8,000 | 86% of FB job posts [V — PROJECT.md:104] but dairy is ~22% of farms; high churn + roster structure concentrates hiring here |
| Sheep/beef & drystock | ~20% | 4,000 | Larger farm count, lower per-farm hiring; shearing/lambing seasonal |
| Rural contracting (shearing, harvesting, spraying, fencing) | ~15% | 3,000 | Large seasonal-labour pool; crews not farms — different buyer shape |
| Horticulture (kiwifruit, apples) + viticulture | ~15% | 3,000 | RSE-scheme-heavy; block hiring; v3.0+ scope promoted to sequenced plan (LOCKED #8) |
| Arable/grain | ~5% | 1,000 | Feb–Apr harvest window |
| Forestry, apiculture, aquaculture/seafood | ~5% | 1,000 | Verify per-sector before switch-on |
| **Adjacency verdicts** (per LOCKED #8): | | | **Processing (meat/seafood): OUT for now** — shift-work volume hiring is HR-department territory (ATS buyers, not marketplace); revisit only as an Index data customer. **Equine: OUT** — small, specialised, existing niche boards. [OPINION] |

## 4. SAM → SOM (per the locked sequencing)

**SAM** = verticals switched on × regions past the liquidity gate × country entered.
**SOM** = credible share of SAM given cold-start pace [MODELLED]:

| Horizon | Scope | SAM | SOM (share) | Revenue |
|---|---|---|---|---|
| Yr 1 (NZ) | Dairy + drystock + contracting wedge; 2 regions | ~7k events | 3–6% | **$75–150k** |
| Yr 2 (NZ) | + hort/vintage wedges; 4 regions; B active | ~12k events | 8–12% | **$0.4–0.8M** |
| Yr 3 (NZ+AU) | NZ national; AU 2 states dairy+hort | NZ 16k + AU 15k | NZ 12–18% / AU 2–4% | **$1.4–2.4M** |
| Yr 4–5 (+UK) | AU scaling; UK B-led entry | ~60k events | blended 4–7% | **$3.5–6M** |
| Yr 6–7 | 3 countries + Index + Pass layer | ~80k events | 6–9% + non-placement lines | **$8–12M** |

Cross-check vs PRICING-MODEL §2 NZ-mature ($2.3M at ~15% NZ share): consistent.
Cross-check vs GTM 90-day plan (25 employers, 120 placements yr-1 ≈ 0.6% of NZ events):
consistent with Yr-1 low band. The plan's near-term numbers and the long-term goal are
**only** reconcilable through AU+UK+Segment-B — stated per LOCKED #7.

## 5. What would falsify this model

1. **FA-09 lands low** (NZ hires <10k/yr): NZ SOM halves; AU/UK weight rises further.
2. **Hiring-farm concentration**: if 70% of hires come from 10% of farms, the market is
   an *enterprise* market wearing owner-operator clothes — Segment B becomes primary
   earlier; watch the lab (§PRICING 9 Q5).
3. **Blend mix wrong** (B never exceeds 5% anywhere): 3-country TAM at pure-A fees drops
   to ~$60M and $10M requires implausible share → the goal would need a 4th line (data,
   SaaS) to carry more weight. This is the same crux as PRICING §7 — one assumption,
   both models.
