# MARKET-DATA — verified base figures for TAM/SAM/SOM work

> **Created:** 2026-07-08 (Stage-2 seed, founder-supplied figures at stated labels).
> Rule: every figure carries [V]/[A]/[MODELLED]. No unlabelled numbers may leave this
> file into models or copy. Bands, not false point estimates.

## Farm & workforce base

| Figure | Value | Label | Source |
|---|---|---|---|
| NZ farms | ~49,000 | [V] | Stats NZ farm-number reporting to 2022 |
| AU farm businesses | ~85,000 | [V] | ABARES/DAFF sector reporting |
| AU ag/forestry/fishing workers | ~292,200 (≈255,500 narrower agriculture, Aug 2025) | [V] | Jobs and Skills Australia |
| UK farms | ~209,000 | [V] | DEFRA / UK agriculture statistics 2024 |
| UK on-farm workforce | ~471,000 (farmers + managers + workers) | [V — **verify release**] | DEFRA agricultural workforce dataset. Cited release dated 1 Jun 2026; today is 8 Jul 2026 — confirm actually published before treating as established. FOUNDER-ACTION FA-10. |
| **NZ ag workforce / annual hires** | **NOT HELD** | [A — must obtain or band] | Not in supplied data and NZ is the launch market. Do NOT infer from farm count. FOUNDER-ACTION FA-09 (Stats NZ / MPI / DairyNZ). Until obtained, model with bands: low 60k / base 80k / high 100k workers [MODELLED — placeholder bands, replace on FA-09]. |

## The model driver: hires-per-farm-per-year

Placement-marketplace TAM is driven by **annual hiring events**, not farm counts or
headcount. A farm = one opportunity per vacancy per year. NZ ag has high seasonal churn
(Gypsy Day 1 June turnover; calving relief; seasonal blocks), so annual hires are a
large fraction of the workforce.

**Bands [A — MODEL DRIVER, most moves the $10M answer]:**
- Hires as share of workforce/yr: low 15% · base 25% · high 40%
- Only a minority of farms hire externally in a given year (owner-operator/family
  labour): hiring-farm share — low 20% · base 30% · high 45% of farms

These bands are planning parameters, not facts. Sharpen with FA-09 data and with
TopFarms' own observed listing/placement flow as it accrues.

## Strategic read (recorded per Stage-2 brief)

The farm-count base **confirms the locked strategy**: NZ (49k farms) is a small
beachhead that cannot reach $10M on flat owner-operator fees alone; Australia (85k)
scales it; the UK (209k farms, ~471k workers) is where the $10M disproportionately
lives — on enterprise %-pricing + Season Pass + the Index. Build TAM→SAM→SOM bottom-up
per **country × vertical** as `farms × hiring-farm share × hires/farm/yr × fee capture`,
every cell labelled. Each new country **restarts the cold-start liquidity problem** —
cost that in, never paper over it.

Downstream artefacts: `docs/commercial/MARKET-SIZING.md` (TAM/SAM/SOM pack),
`docs/commercial/PRICING-MODEL.md`, `docs/commercial/EXPANSION-MODEL.md`.
