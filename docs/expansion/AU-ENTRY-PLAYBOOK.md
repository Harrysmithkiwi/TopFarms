# TopFarms — Australia Entry Playbook

> **STATUS: FORWARD STRATEGY — activates on EXPANSION-MODEL triggers; nothing here is live.**
> Created 2026-07-08 (Stage-2 remediation, expansion workstream). This playbook IMPLEMENTS
> `docs/commercial/EXPANSION-MODEL.md` — it does not amend it. If the two disagree,
> EXPANSION-MODEL wins. Labels: [V] verified (source noted) · [A] assumption ·
> [MODELLED] derived · [OPINION] founder-judgement call awaiting evidence.

---

## 1. Entry preconditions (the 6 gates, restated from EXPANSION-MODEL §3 — unchanged)

ALL must hold before entry. No calendar dates.

1. **≥2 NZ regions past the liquidity gate** (≥15 listings / ≥150 seekers per NORTH-STAR.md).
2. **Repeat-placement rate ≥30% within 12 months** — playbook repeatability, not heroics.
3. **≥$25k MRR NZ or 6 months placement-cash-positive** (bootstrap constraint, LOCKED #4).
   This is also the affordability gate: the AU cold-start costs $100–180k (EXPANSION-MODEL §5)
   and is funded from NZ placement cash.
4. **Segment B activated with ≥3 accounts** — AU is B-heavier (80/20 mix, MARKET-SIZING §2);
   enter with the tier proven, not theoretical.
5. **An AU in-market operator hired or contracted — "requires hire 1."** A marketplace cannot
   cold-start on video calls from Hamilton. See §6 for the profile.
6. **AU entity/tax/rails cleared** — GST registration, Stripe AU, Fair Work framing reviewed
   by an AU employment lawyer.

Nothing below this line is actioned until all six hold.

## 2. Beachhead choice — one state, one vertical

Three candidates assessed:

| Candidate | For | Against |
|---|---|---|
| **Dairy — VIC (Gippsland first), TAS second** | Identical playbook to NZ's proven home vertical: roster structure, relief-milking/calf-rearing wedge, same buyer psychology, same seasonal calendar shape (Southern Hemisphere — Seasonal Insights data model ports with AU seed data). VIC is the centre of gravity of AU dairy [A — VIC carries the majority of national milk production; confirm exact share from Dairy Australia In Focus report before entry]. Gippsland is dense, family-farm-weighted, and geographically compact — the closest AU analogue to Waikato. Dairy Australia already runs a **free** dairy jobs board [V — dairy.com.au/careers/find-a-job, live listings sighted July 2026], which proves demand exists and sets a bar we clear on matching, trust, and accommodation/roster depth rather than on listing alone. | Free incumbent board (see COMPETITIVE-DEFENCE.md); dairy is a smaller share of AU ag than of NZ ag. |
| Horticulture — QLD/VIC | Huge seasonal volume; PALM + working-holiday labour pools. | Buyer is often a labour-hire contractor or PALM-approved employer, not an owner-operator — that's a Segment-B/agency sale we haven't proven; crowded with established agencies (Agri Labour Australia et al. [V — agrilabour.com.au]); compliance-heavy (PALM deed obligations sit on employers). Wrong first fight. |
| Broadacre — NSW/WA | Big farms, real money, harvest-operator demand. | Thin hiring frequency per farm, machinery-skills niche, vast geography kills density. No liquidity flywheel. |

**Recommendation [OPINION]: Dairy, Victoria, Gippsland first — then Northern VIC/Goulburn
Valley, then TAS North West.** It is the maximum-port / minimum-translation option: the NZ
dairy playbook (relief-milking wedge, roster/accommodation depth, matched-not-sorted voice)
transfers nearly whole. Horticulture is the *second* AU vertical, switched on per the
EXPANSION-MODEL §2 discipline (taxonomy mapped · ≥1 seasonal wedge · ≥20 target accounts ·
no live region drops below the liquidity gate), and only once the AU dairy beachhead holds.

## 3. Localisation checklist (implements EXPANSION-MODEL §4 port-vs-localise table)

### 3.1 Region taxonomy — by state, then farming region

Replace the NZ region list with a state → region tree. Working seed [A — validate against
Dairy Australia's regional structure and hire-1's ground truth before lock]:

- **VIC:** Gippsland · Northern Victoria (Goulburn/Murray) · Western Districts / South West
- **TAS:** North West Coast · Northern Midlands
- **NSW:** Riverina · North Coast · Southern Highlands/Tablelands
- **QLD:** Darling Downs · Wide Bay/Burnett · Atherton Tablelands
- **SA:** Limestone Coast / South East · Fleurieu
- **WA:** South West

Schema: the `country` axis is already spec'd (EXPANSION-MODEL §4); regions are data, not
code. Ship VIC + TAS at entry; add states as verticals/regions switch on.

### 3.2 Visa / right-to-work module — full rework (NZ AEWV logic does not port)

- **Working Holiday Maker 417/462 [V]:** the backpacker workforce. Key mechanics: 88 days
  of specified work (plant/animal cultivation counts anywhere in regional Australia) earns
  the 2nd-year visa; 179 days the 3rd. From 1 July 2026: application fee A$840 first
  visa / A$1,000 for 2nd–3rd; age limit raised to 35 for Cyprus, Finland, Germany, South
  Korea (417). [V — immi.homeaffairs.gov.au; solmigration.com.au / emigratelawyers.com.au
  July-2026 change summaries.] Product implication: "counts toward your 88 days" is a
  first-class seeker-side filter/badge — a matching signal NZ never needed.
- **PALM scheme [V]:** Pacific Australia Labour Mobility — 10 Pacific countries (Fiji,
  Kiribati, Nauru, PNG, Samoa, Solomon Is, Timor-Leste, Tonga, Tuvalu, Vanuatu; New
  Caledonia pilot starting 2026), ~30k+ workers, ~90% in agriculture and meat processing
  [V — dfat.gov.au, palmscheme.gov.au]. Employers must be PALM-approved (deed of agreement;
  active compliance enforcement — a deed was terminated as recently as 1 July 2026 [V]).
  Product implication: TopFarms does **not** place PALM workers directly (that's the
  approved employer's channel); we flag "PALM-approved employer" as an employer trust
  badge and stay out of the sponsorship path. [OPINION — revisit if hort vertical opens.]
- **Fair Work / awards framing [V — pre-2026 knowledge; gate-6 legal review mandatory]:**
  AU farm employment sits under modern awards — Pastoral Award (covers dairy/livestock
  farm work) and Horticulture Award — with minimum rates, overtime and allowances that NZ
  employment law has no equivalent for. TopFarms is a marketplace, not the employer: we
  frame ("this role is award-covered; check current rates at fairwork.gov.au"), we never
  calculate or warrant pay compliance. Collateral framing only, no price mechanics change
  (PRICING-MODEL §8).

### 3.3 Entity, tax, rails

- **ABN + entity:** AU entity or NZ company registered as a foreign company with an ABN
  [A — structure is an accountant/lawyer call at gate 6, not a product call].
- **GST-AU:** 10% GST on fees to AU employers; registration threshold and invoicing
  handled at gate 6. Pricing already parity-spec'd: ~A$110 listing / ~A$400 placement
  [MODELLED — PRICING-MODEL §8].
- **Stripe AU:** AUD account + invoicing rail mirroring the NZ Net-14 Stripe Invoice flow.
  Trust/verification: NZBN check → **ABN Lookup** (EXPANSION-MODEL §4).

### 3.4 Photo library + voice localisation

- **Photo library:** AU-shot imagery (herringbone/rotary dairies, Gippsland/Riverina
  landscapes, AU breeds and gear). NZ photos read wrong to the target instantly.
- **The credibility test becomes: "would a Riverina grower / Gippsland dairy farmer read
  this and nod?"** — direct port of the 55-yo-Waikato-farmer test (EXPANSION-MODEL §4).
- **Idiom deltas NZ → AU** (extend the outreach config's word-blacklist/variation kit per
  market; examples, not exhaustive [A — hire-1 owns the final list]):
  - *Gypsy Day / Moving Day (June 1)* — NZ-only institution. No AU equivalent; kill it
    from all AU copy and seasonal-insights labels.
  - *sharemilker / 50:50 sharemilking* → AU says **sharefarmer / sharefarming**.
  - *cowshed / "the shed"* → AU dairy farmers call the milking shed **"the dairy"**.
  - *wages worker on a dairy* → "farmhand" travels; award-band language matters more in AU.
  - Keeps: paddock, ute, calving, "flat out", "no worries" — shared vocabulary.
  - Drops: "chur", "yeah nah" as written NZ-isms, "wee" (as in "a wee bit").
- The Outreach Reply Config's hard rules (never on-behalf-of, no money in first touch, no
  em dashes, never bash how they hire now, UK/NZ spelling — which AU shares) port as-is;
  only the idiom layer and the sender identity change (hire-1 sends as themselves, same
  person-not-company principle).

## 4. Channel strategy — WITHOUT the owned-FB-group advantage

The single biggest NZ GTM asset — admin of an owned FB group with thousands of seekers —
**does not port** (EXPANSION-MODEL §4). AU starts with zero owned audience. Honest
consequences: CAC is real money at 3–5× NZ effective CAC (EXPANSION-MODEL §5), and the
channel mix reweights:

1. **In-market hire (hire 1) doing founder-style outreach** — the funnel spine ports
   (7-stage spine, 4-touch cadence, Lane A/B discipline from funnel-design.md), the person
   changes. Target maths at NZ-playbook rates [MODELLED]: 200-account Gippsland target
   list → ~60 conversations → ~25–30 onboarded employers in the first two quarters.
2. **Industry-body partnerships** — Dairy Australia, VFF/UDV, state field days (see
   PARTNERSHIP-BATTLECARDS.md). In AU these carry the credibility the FB group carried in
   NZ. First asks are distribution and Index-AU data collaboration, not money.
3. **SEO + Index-AU** — the TopFarms Index localised with AU cells becomes the owned-media
   engine ("what does a farm assistant earn in Gippsland?" content). Slow-burn; starts
   day 1 precisely because it is slow.
4. **Existing AU FB groups (participant, not owner)** — post and engage under group rules;
   we own nothing there, so it is a supplement, never the engine. Ban-risk discipline from
   funnel-design.md compliance section applies doubly on a fresh account.
5. **Paid pilot [MODELLED — bands, not commitments]:** seeker-side Meta ads in Gippsland
   only, A$2–4k/month for 90 days (cap ~A$10–12k total pilot spend inside the
   $100–180k country budget). Kill the channel if blended seeker CAC > A$25 or
   seeker→application activation < 20%. Employer side stays outbound-led; do not buy
   employer clicks before liquidity.

## 5. The in-market hire-1 profile (requires hire 1)

- **Who:** one person, Gippsland-based or willing to be, from dairy (ex-farm manager,
  sharefarmer, dairy-co field rep, or stock agent type) with a live local network. Sales
  temperament over ag-tech pedigree. 0.5–1.0 FTE, A$60–90k full-time-equivalent
  (EXPANSION-MODEL §5 band).
- **Owns day one:** the AU target list and all outreach (in their own name, config voice);
  employer onboarding and first placements; the idiom/word-list localisation sign-off;
  region-taxonomy ground-truthing; field-day presence; weekly funnel numbers to founder.
- **Does NOT own:** product, pricing architecture (locked), brand system, NZ anything.
- **Founder owns:** partnerships/battlecard conversations (founder-to-CEO), Segment-B
  accounts, hiring hire-1, the kill decision.

## 6. 90-day entry plan skeleton

| Weeks | Milestones |
|---|---|
| 1–2 | Hire-1 starts. Localisation punch-list closed: region taxonomy live, visa module (417/462 + PALM badges) shipped, Stripe AU + GST invoicing tested end-to-end, AU photo/voice pass done. 200-account Gippsland target list built (Tier A/B/C per funnel-design fit rules). |
| 3–6 | Outreach begins (hire-1, ~10 touches/week ramping to NZ-playbook volume). First 10 employer conversations; first listings live. Seeker-side: SEO/Index-AU content seeded; paid pilot switched on in Gippsland only. Dairy Australia + VFF first-ask meetings booked (founder). |
| 7–10 | Target: 10–15 onboarded employers, 100+ seeker profiles in Gippsland [MODELLED]. First AU placement. Weekly funnel review against NZ-playbook conversion baselines — deviations >2× worse trigger diagnosis, not spend. |
| 11–13 | Target: 20–25 employers, first repeat listing, Segment-B pipeline ≥2 AU multi-farm accounts in conversation. Go/adjust review against §7 kill criteria trendline. Decide whether Northern VIC opens next quarter. |

## 7. Kill criteria — what observed at 6 months = withdraw

Withdraw (or freeze to maintenance) if at month 6 **any two** of the following hold
[MODELLED thresholds — set them now so the decision isn't emotional later]:

1. **Liquidity:** Gippsland below half the liquidity gate (<8 active listings or <75
   active seekers) despite full outreach volume delivered.
2. **Conversion collapse:** employer contact→onboard conversion running at <⅓ of the NZ
   playbook baseline after cadence and voice fixes — the market is telling us the
   playbook doesn't translate.
3. **Placement drought:** <10 placements total by month 6.
4. **Economics:** blended seeker CAC stuck >3× the modelled band with no owned-channel
   traction (SEO/Index impressions flat), meaning growth is purchasable-only.
5. **Repeat signal absent:** zero repeat listings from the first 15 employers.

Withdrawal is cheap by design: hire-1 is the only fixed commitment (contract with a
6-month review), spend is pilot-banded, and the NZ machine was gated (precondition 3) so
retreat doesn't wound home. Log the post-mortem; UK entry re-gates on a *successful* AU
repeat (EXPANSION-MODEL §3), so an AU kill pauses the whole international sequence — by
design, not accident.

---
*Sources for [V] items: dfat.gov.au / palmscheme.gov.au (PALM); immi.homeaffairs.gov.au +
July-2026 migration-agent summaries (417/462); dairy.com.au + dairyaustralia.com.au (Dairy
Australia jobs board); nff.org.au (federation structure); agrilabour.com.au (Agri Labour
Australia). Award coverage flagged for gate-6 legal review.*
