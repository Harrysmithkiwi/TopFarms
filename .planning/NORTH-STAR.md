# TopFarms — North Star & Operating Targets

> **Status:** DECIDED 2026-07-08 (founder-locked, Stage-2 remediation LOCKED #1–#3).
> This is a decision record, not research. Change it deliberately, with a dated note.

## Ambition

**$10M ARR at high gross margin** is the long-term goal, reached via the locked path:
segmented pricing (Segment A flat now, Segment B % dormant) → NZ vertical depth →
Australia → UK, all primary industries. Not the lifestyle alternative. [DECIDED]

## North Star metric

**Verified placements per month.**

A verified placement = an application transitioned to `hired` with the placement fee
confirmed (`placement_fees.confirmed_at` set via `create-placement-invoice`) — the same
event that already gates revenue and contact release in the schema. One number, fraud-
resistant (invoice-backed), meaningful to both sides, and the denominator for every
prioritisation call: *"does this work increase verified placements per month?"*

**Supporting stack (watch, don't headline):**
- Liquidity: active listings · open-to-work seekers · per-region ratio
- Velocity: time-to-placement (job activated → hired)
- Quality: fill rate (jobs filled / jobs listed) · repeat-employer rate
- Economics: blended fee/placement · CAC per side · contribution margin/placement
- Input (founder weekly headline while placements ≈ 0): **revenue conversations/week**

## Liquidity gate ("N") — [MODELLED], tunable here only

A region is **live** when it holds **≥15 active listings AND ≥150 open-to-work seekers**.
This is the audit's placeholder, founder-accepted (LOCKED #3). It also resolves the
previously-undefined gate for Phases 24–26 (`ROADMAP.md:489` "N TBD"): **the v2.1 gate
"real ag employers posting" = the first region reaching this bar.**

Do not open region N+1 (or vertical N+1, or country N+1) until the current one clears
the bar. Tune the numbers here, with a dated note, when real data says otherwise.

## Operating targets

| Horizon | Target | Label |
|---|---|---|
| 90 days | 25 paying Segment-A employers · 300 seekers · first verified placements invoiced LIVE | [MODELLED — GTM funnel maths] |
| 6 months | $70–100k MRR NZ — **stretch/forcing function, not a promise**; what must be true is set out in the pricing model (`docs/commercial/PRICING-MODEL.md`) — if the arithmetic doesn't support it, that document says so plainly | [MODELLED] |
| 12 months | Waikato + 1 South Island region past the liquidity gate; pricing decision (flat vs blend) made on real conversion data; bootstrap cash-positive on placement flow | [MODELLED] |

## Capital posture

**Bootstrap for ≥12 months** (LOCKED #4). Growth funded from placement cash flow
(Net-14, near-zero COGS). A small seed is an optional lever to compress the AU/UK
density-building years — noted, not assumed.
