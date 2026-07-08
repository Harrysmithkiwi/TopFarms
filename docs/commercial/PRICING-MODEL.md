# TopFarms — Pricing & Monetisation Model (segmented)

> **Status:** DECIDED architecture (founder LOCKED #5/#6, 2026-07-08) + [MODELLED] numbers
> pending the Founding-25 pricing lab. Companions: `MARKET-SIZING.md`, `EXPANSION-MODEL.md`,
> `.planning/research/MARKET-DATA.md`. Every number here is [MODELLED] unless labelled
> otherwise; the WTP lab (FA-07) replaces model numbers with observed ones.
> **Divergence from audit noted in REMEDIATION-LOG.md:** the audit recommended a single
> %-of-salary model; the founder locked a segmented architecture because %-of-salary reads
> as "recruiter" to owner-operators and fights the not-a-recruiter brand. This document
> models both and the blend.

---

## 1. The architecture (locked)

**SEGMENT A — owner-operators (launch ICP, LIVE):** flat, legible pricing.
- Listing: **first FREE** (liquidity hook, retained by founder decision), then **~$100**
  (Featured/Premium tiers retained at $150/$200 as placement-visibility upsells).
- Placement: **flat ~$300–400** [MODELLED — WTP-test $300 vs $400 in the lab before locking],
  success-billed on hire confirmation (existing Net-14 Stripe Invoice rail, unchanged).
- Sales assets, scripts, Founding-25 offer: **Segment A only** (asset discipline, LOCKED #5).

**SEGMENT B — enterprise / multi-farm / processors (SPECCED NOW, DORMANT):**
- **2.5–3.5% of first-year salary** per placement (floor $500, soft cap $3,000) and/or a
  negotiated annual **Season Pass / master agreement** (unlimited listings + discounted
  success fees + priority support). Currency-localised at AU/UK entry.
- No public collateral until activation. One spec, not a fork of every document.

**Sequencing:** prove liquidity on A → activate B when triggers fire (§6) → B carries the
up-market and international arithmetic.

**What does NOT change:** workers never pay — ever. The seeker side is the moat, not a
revenue line. Any future fee that touches seekers is out, permanently.

## 2. Four architectures compared

Common scenario for comparability — **NZ mature-state** [MODELLED]: 3,000 placements/yr
(2,500 Segment-A-profile + 500 enterprise-profile), 2,000 active employers, salary median
$57k (study-derived band [A]).

| Architecture | Mechanics | NZ mature ARR | Margin shape | Key risk |
|---|---|---|---|---|
| **1. Current flat** (status quo) | $100–200 listing; $200/$400/$800 placement (blended ~$400) | 3,000×$400 + listings ≈ **$1.35M** | ~90% GM | Underprices enterprise 5–15×; ceiling far below goal |
| **2. Segment-A flat everywhere** | $100 listing; $350 flat placement | 3,000×$350 + ≈$0.2M listings ≈ **$1.25M** | ~90% GM | Simple, brand-safe — but a hard ceiling; leaves the entire enterprise surplus uncollected |
| **3. Pure %** (audit's Model B) | 3% of salary all buyers (~$1,700 blended) | 3,000×$1,700 ≈ **$5.1M** | ~88% GM | Reads "recruiter" to owner-operators; conversion risk at the thin end; brand dissonance — rejected as sole model (LOCKED) |
| **4. Blended segmented (LOCKED)** | A: $350 flat · B: %/Pass (~$1,900 blended eff.) | 2,500×$350 + 500×$1,900 + Pass ~$0.3M + listings ~$0.2M ≈ **$2.3M** | ~89% GM | The blend's upside lives in Segment-B attach — see §7 crux |

Read: **in NZ alone, no architecture reaches $10M.** The blend beats pure-flat ~2×
domestically and — unlike pure-% — survives the owner-operator brand test. Its full value
unlocks in AU/UK where the enterprise layer is deeper (`EXPANSION-MODEL.md`).

## 3. Margin per line (contribution, [MODELLED])

| Line | Price | Direct COGS | Contribution | Notes |
|---|---|---|---|---|
| Segment-A listing | $100 | ~$3 Stripe + <$1 infra | **~96%** | |
| Segment-A placement | $350 | ~$2–4 invoice fees + ~$0.10 Claude prose | **~98%** before guarantee cost | Fill-guarantee makegoods are the real COGS — model at 5–10% of placement revenue until measured [MODELLED] |
| Segment-B placement | ~$1,900 eff. | fees + **founder/CS hours** (est. 2–4 hrs/account/mo) | ~85–90% at scale; founder-time-heavy at start | The margin threat is labour creep — hours logged per account from day one |
| Season Pass | $990–$4,990/yr by size | support hours | ~90% | Cannibalisation guard: Pass discounts success fees, never replaces them |
| Index/data (future) | licence | analyst-hours amortised | ~95% | see `INDEX-SPEC.md` |

## 4. Elasticity & sensitivity

**Where price most moves conversion:** the placement fee at hire-confirm. Blunted by
(a) success-only billing — no fee without a hire; (b) the fill guarantee ("3 qualified
applicants or you don't pay", LOCKED #6); (c) the anchor stack — $350 sits an order of
magnitude under the ~$7–10k recruiter alternative [A — verify recruiter norms, FA-07
interviews] and one impossible-to-fill calving roster under the cost of a vacant seat.

**Where fees deter supply:** nowhere by design — seekers never pay. The supply-side risk
is *indirect*: if listing fees suppress job volume, seekers see a thin board. First-free
plus $100 keeps this negligible; monitor listings-per-employer in the metrics dashboard.

**Sensitivity table [MODELLED]:**
| Lever | Move | Effect at 1,000 placements/yr |
|---|---|---|
| A-flat placement | $300→$400 | +$100k ARR; conversion effect unknown → the lab's primary question |
| Listing fee | $100→$0 | −$60–80k ARR; +unknown listing volume — only pull if listings, not employers, prove to be the bottleneck |
| B % | 2.5→3.5% at $70k salary | +$700/placement; enterprise WTP question, not owner-operator |
| Guarantee makegood rate | 5→15% | −$35k contribution; quality/verification investment is the counter |

## 5. Decision structure — "if we believe X, price this way"

| If the lab shows… | Then… |
|---|---|
| Owner-operators anchor on recruiter cost / vacancy pain | Hold or raise A-flat toward $500; consider $450 with stronger guarantee |
| Owner-operators anchor on Facebook-free | Hold $300–350; lead with guarantee + time-saved; revisit after 25 placements |
| ≥60% accept $350–400 without price objection | Lock $400; grandfather the cohort |
| <30% accept | Investigate framing before price retreat (per audit sketch 2 rule); test $300 + stronger guarantee variant |
| Enterprise-profile accounts appear organically | Activate Segment B early (trigger §6a) — don't make them wait on A pricing |
| Fill-guarantee triggers >15% of placements | Fix supply density/verification before touching price |

## 6. Segment-B activation triggers (any one fires it)

a. An account with **≥5 hires/yr or ≥3 farms** asks for terms (inbound pull — serve it).
b. **Two NZ regions past the liquidity gate** (≥15 listings/≥150 seekers, NORTH-STAR.md)
   **and** repeat-placement rate ≥30% within 12 months (repeatability proof).
c. **AU entry decision** taken (EXPANSION-MODEL triggers) — B launches with AU, not after.
Capability precondition: entity/insurance/contracting confirmed (FA-05).

## 7. The honest cruxes

**The blend's $10M case rests on Segment B attaching up-market and abroad.** If enterprise
buyers won't pay %/Pass — if they treat TopFarms as a $350 utility — the model tops out
~$2–3M globally on Segment A volume alone. This is the single pricing assumption that,
if wrong, breaks the plan. The lab can't test it (wrong cohort); the first three inbound
enterprise conversations can. Log them verbatim.

**The 6-month $70–100k NZ MRR stretch target (LOCKED #9) is NOT supported by this
arithmetic.** Stated plainly, per the honesty rule:
- $70k MRR on Segment-A pricing ≈ **~185 placements/month** (at $350 + listing flow).
- NZ base-case hiring volume ≈ 17–22k hire events/yr ≈ ~1,600/mo nationally [MODELLED from
  MARKET-DATA bands]. 185/mo = **~11% national share by month 6**, starting from zero
  liquidity, one region, with the autumn dairy wave already missed (LOCKED #10).
- For the target to be reachable, ALL of the following would have to be true: early
  Segment-B activation with 5–10 enterprise/master accounts at $3–8k/mo effective (that's
  $15–80k of the target on its own — and trigger §6b won't have fired legitimately);
  immediate multi-vertical demand capture (Seasonal Insights identifying a live wave and
  converting it at >20% of contacted employers); and placement velocity ~8× the GTM plan's
  own 120/yr first-year target.
- **Verdict: treat $70–100k as the forcing function it was declared to be — it forces
  Segment-B spec-readiness and multi-vertical GTM — and plan cash/decisions against the
  modelled base case: ~$5–8k MRR at month 6, ~$12–20k stretch** [MODELLED]. If actuals
  beat the base case 3×, revisit; do not build spend plans on the stretch number.

## 8. Per-country/vertical pricing variation (forward spec, dormant)

- **AU:** A-flat ≈ A$110 listing / A$400 placement (parity-adjusted, round numbers);
  B unchanged in %; award/Fair-Work framing in collateral only, no price mechanics change.
- **UK:** B-led entry (enterprise density + Seasonal Worker scheme operators): % + Pass
  primary, A-flat secondary (£90/£300 [MODELLED]). Rationale in `EXPANSION-MODEL.md`.
- **Verticals:** same architecture everywhere; only the *seasonal wedge products* differ
  (short-tenure placements — relief milking, picking blocks — may warrant a lighter
  "casual placement" flat fee ~$150 [MODELLED]; spec'd when a wedge vertical goes live,
  not before).

## 9. What the Founding-25 lab must answer (LOCKED #6 re-cut)

Full-price A pricing (no lifetime discounts — the 50%-off-for-life clause is dead), fill
guarantee, badge/founder-access/community perks, case-study rights in return. The lab's
questions, in order: (1) does $350–400 flat clear without price objection at ≥60%?
(2) what do owner-operators anchor against, verbatim? (3) does the guarantee shift the
yes-rate materially? (4) how many listings does a paying employer post in 90 days?
(5) do any enterprise-profile accounts surface (→ §6a)?
