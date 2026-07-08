# TopFarms — Expansion Model (NZ → AU → UK · verticals · triggers)

> **Created:** 2026-07-08 (Stage-2 WS2, LOCKED #7/#8). Companions: `MARKET-SIZING.md`
> (the cells), `PRICING-MODEL.md` (the fees), `.planning/NORTH-STAR.md` (the gate).
> Rule inherited from the locked brief: **every jump gates on trigger conditions, not
> calendar dates**, and **every new country restarts the cold-start liquidity problem** —
> that cost is priced in below, not papered over.

## 1. Sequence (locked) and why

**NZ vertical depth → Australia (full primary-industries suite) → UK (full suite).**
NZ proves the playbook (small, trust-dense, founder-native). AU scales it (same
hemisphere/seasons ≈ playbook ports with least translation; 3.6× NZ's hiring pool). UK
carries the enterprise weight (largest pool, B-led entry, Seasonal Worker scheme
operators as anchor accounts). The $10M arithmetic lives disproportionately in AU+UK —
NZ alone cannot reach it (MARKET-SIZING §2, stated honestly per LOCKED #7).

## 2. Vertical switch-on sequence (NZ, before any country jump)

Order by: seasonal-labour intensity × hiring pain × taxonomy delta × liquidity effect.
Not big-bang — one wedge at a time, each entering through its seasonal window
(Seasonal Insights `sell_now` output drives timing):

| Order | Vertical | Wedge product | Taxonomy/schema delta | Why this order |
|---|---|---|---|---|
| 1 (live) | Dairy | relief milking / calf rearing rush tier (LOCKED #10) | none — built | 40% of events; the brand's home |
| 2 | Sheep/beef + drystock | lambing/shearing crews | small: shed-hand/shearing roles exist in taxonomy | adjacent buyers, same regions, smooths Aug–Oct |
| 3 | Rural contracting | crew-hire (shearing/harvest/spraying/fencing gangs) | medium: crew-not-individual placement shape — spec before build | large pool, year-round waves; different buyer (contractor, hires repeatedly — B-profile early) |
| 4 | Horticulture + viticulture | picking/pruning/vintage blocks | medium: block-hiring + RSE-adjacent framing; short-tenure "casual placement" fee (PRICING §8) | fills Feb–Jun demand trough; promoted from v3.0+ per LOCKED #8 |
| 5 | Arable | harvest operators (Feb–Apr) | small | machinery-skills overlap with 3 |
| 6+ | Forestry · apiculture · aquaculture/seafood | assess per-sector when 1–5 hold | verify counts first (FA-09 scope) | thin data today |
| OUT | Meat/seafood **processing**, equine | — | — | processing = HR/ATS buyer not marketplace; equine = niche boards. Revisit processing as an **Index customer** only. [OPINION] |

Each switch-on must clear: taxonomy mapped · ≥1 seasonal wedge identified · ≥20
target accounts listed · does not drop any live region below the liquidity gate.

## 3. Country triggers (ALL must hold before entry — no dates)

**AU entry when:** (1) ≥2 NZ regions past the liquidity gate; (2) repeat-placement rate
≥30%/12mo (playbook repeatability, not heroics); (3) ≥$25k MRR NZ **or** 6 months
placement-cash-positive (bootstrap constraint, LOCKED #4); (4) Segment B activated with
≥3 accounts (AU is B-heavier — enter with the tier proven); (5) **an AU in-market
operator hired or contracted — "requires hire 1"** (a marketplace cannot cold-start on
video calls from Hamilton; stated honestly); (6) AU entity/tax/rails cleared (GST,
Stripe AU, Fair Work framing reviewed).

**UK entry when:** AU playbook has repeated (same 6 gates, UK-localised) **and** UK
anchor-account motion validated — ≥2 Seasonal Worker scheme operators or estate/enterprise
accounts signed as design partners *before* consumer-side spend. **"Requires hire 2."**

## 4. What ports · what localises · what breaks

| Layer | Ports as-is | Localise | Breaks / rebuild |
|---|---|---|---|
| Platform, schema, match engine, RLS/leads discipline | ✅ (add `country` axis — schema spec'd in metrics/Seasonal specs) | region taxonomy per country | — |
| Pricing architecture | ✅ segmented A/B | currency + rounding (PRICING §8); UK enters B-led | — |
| Brand system (Inter/green/photos) | ✅ | photo library per country; credibility test per market: 55-yo Waikato dairy farmer → **Riverina grower** → **Yorkshire farmer** | — |
| Voice/outreach config | structure ✅ | idiom, saleyard→saleyard equivalents, word-blacklist per market | NZ-isms (Gypsy Day) |
| Visa/right-to-work module | concept ✅ | **full rework per country**: AU 417/462 backpacker + PALM + Fair Work awards; UK Seasonal Worker visa + post-Brexit labour rules + NMW bands | NZ AEWV logic |
| Seasonal Insights | data model ✅ (hemisphere-aware) | AU/UK calendar seed data [V]-sourced per country | — |
| GTM channel mix | funnel spine ✅ | **the owned-FB-group advantage does NOT port** — that's the single biggest GTM asset and it is NZ-only. Each country starts with zero owned audience → in-market hire + partnerships + SEO carry more weight | FB-group-centred seeker engine |
| Trust/verification | flow ✅ | NZBN→ABN→Companies House; local referee norms | — |

## 5. The cold-start restart cost (priced, not hand-waved)

Per country, before meaningful revenue [MODELLED]:
- **Liquidity build:** 9–15 months from entry to first region past gate (NZ took ~4
  months of GTM design + is still pre-gate; assume better with playbook, worse with no
  founder network).
- **Cash cost:** in-market operator (0.5–1 FTE, $60–90k/yr local) + travel + localisation
  (legal, visa module, calendars, photo/brand) ≈ **$100–180k per country** before
  break-even, funded per LOCKED #4 from NZ placement cash flow — which sets the real
  pace: **AU entry is affordable at ≈$25k+ NZ MRR, not before.** A small seed compresses
  exactly this (optional lever, noted not assumed).
- **CAC shift:** NZ CAC ≈ founder time (near-$0 cash). AU/UK CAC is real money + salaried
  time; model at 3–5× NZ effective CAC until owned channels (SEO/Index/email) mature.

## 6. Expansion-aware path to $10M (folds MARKET-SIZING §4 + PRICING blend)

| Year | Milestone | ARR contribution by cell [MODELLED] |
|---|---|---|
| 1 | NZ dairy+drystock, 2 regions, lab priced | NZ-A $75–150k |
| 2 | NZ multi-vertical + B active | NZ-A $0.3–0.5M · NZ-B $0.1–0.3M |
| 3 | AU entry (hire 1) | NZ $0.9–1.4M · AU $0.3–0.6M |
| 4–5 | AU scale + UK B-led entry (hire 2) | NZ $1.4–2M · AU $1.2–2.2M · UK $0.5–1.2M · Index $0.2–0.5M |
| 6–7 | 3 countries + Pass + Index mature | **$8–12M total** (NZ ~$2M · AU ~$3.5M · UK ~$3.5M · data/Pass ~$1–2M) |

**The one assumption that, if wrong, breaks the model:** **Segment-B attach in AU/UK**
(same crux as PRICING §7 and MARKET-SIZING §5.3). If enterprise/estate/scheme-operator
buyers won't carry %/Pass pricing, the 3-country model tops out ~$3–4M on Segment-A
volume — still a good business, not the locked goal. Second-order breaker: FA-09 landing
at the low band *and* AU/UK hiring pools proving similarly thin would shrink every cell;
watch both before committing the AU hire.

## 7. What expansion changes at home

Each entry taxes the NZ machine: founder attention (mitigate: hire-1 owns AU day-to-day),
support hours across time zones (UK), and the automation boundary moves — everything in
the Team plan marked "automate by $1M" must actually be automated **before** AU entry,
or the hire-1 budget gets eaten running NZ manually. Gate #3 exists for this reason.
