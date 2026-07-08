# TopFarms GTM — Region Density Rollout Plan

*2026-07-08 · Stage-2 remediation, density workstream. The sequenced answer to "where, in what order, and what does opening a region actually mean for one founder". Labels: [V]/[A]/[MODELLED]/[OPINION].*

> **The rule that governs everything here [V — NORTH-STAR.md]:** a region is live at **≥15 active listings AND ≥150 open-to-work seekers**, and we **do not open region N+1 until region N clears the bar**. Density beats breadth: a half-liquid region produces bad matches on both sides, and in a community this small, one farmer telling the saleyard "nothing on there for us" costs more than a quarter of outreach. [OPINION]

## 1. The sequence

| Order | Region | Basis | Status |
|---|---|---|---|
| 1 | **Waikato** | [V] data-backed centre of gravity | open now (it's where we already are) |
| 2 | **Canterbury** | [V] study cluster; [A] large-herd/corporate profile | prep only until Waikato passes the gate |
| 3 (candidate) | **Southland** | **[A — verify scale before committing]** | watchlist |

**Region 1 — Waikato.** The Master Report is unambiguous: *"Waikato is the centre of gravity"* for seeker supply, with the other clusters (Canterbury/Selwyn, Taranaki, Northland, Manawatu) behind it [V — `docs/_canonical/TopFarms_Master_Report.md` Part A]. It is also where every structural advantage already sits: the owned FB group's gravity, the founder's network, the "few Waikato dairy farms are on it now" honest line in the outreach templates [V], and the winter-milk autumn-calving catchment that adds a second annual demand wave (Feb–Mar) on top of spring calving [V — SEASONAL-INSIGHTS-SPEC.md seed row 3].

**Region 2 — Canterbury.** Study-backed second: Canterbury/Selwyn is the first-named cluster after Waikato on the seeker side [V]. The employer profile skews large — the employer sample runs 200–1,250 cows with heavy tech adoption (Halter, Protrack, ACRs, pivot irrigation named in 58% of listings) [V — Part B]; Canterbury's large-herd, corporate/multi-farm operator structure is the standing industry picture **[A — the n=12 sample doesn't isolate Canterbury; verify with DairyNZ regional herd-size stats before building the target list]**. Two strategic kickers: (a) large/multi-farm operators are exactly the Segment-B-profile accounts the pricing model wants surfacing organically (PRICING-MODEL §6a trigger [V]); (b) Canterbury holds ≈68% of NZ arable area with a Jan–Apr harvest labour wave [A — Seasonal spec row 11], giving the region a counter-cyclical second vertical. And NORTH-STAR's 12-month target names "Waikato + 1 South Island region" past the gate [V] — Canterbury is that region.

**Southland — flagged, not committed [A — verify scale before committing].** Not present in the study sample at all [V — absence in Master Report geography]. The prior says big dairy conversion country with chronic labour shortage, but we hold zero owned data: no seeker cluster in the sample, no leads-pipeline evidence yet, no founder network there. Verification path before it earns a slot: (1) DairyNZ regional herd/employment stats, (2) 60 days of leads-harvest counts filtered to Southland (the pipeline tags region [V — 041+]), (3) seeker-signup geography once volume exists. If Southland out-signals Canterbury on owned data, resequence — this table is a plan, not a vow.

## 2. Liquidity-gate maths per region [MODELLED]

All numbers derive from the funnel's own verified ratios (`funnel-design.md`: 200 targets → ~60 conversations (30%) → ~30 meetings (50%) → ~25 signups (80%)) — i.e. **~8 raw targets per signed employer**.

### Listings side: what ≥15 active listings takes

- 15 *active* listings ≠ 15 employers-ever. With listing decay/fills, assume ~1.2–1.5 concurrent-to-employer ratio only for repeat/multi-role farms; conservatively, **~15–20 posting employers** keeps ≥15 live at any time in season [MODELLED].
- At the funnel's 8:1 ratio → **~120–160 qualified raw targets per region**, worked at the standing ~10 touches/week ≈ **a 12–16 week outbound cycle per region** — one quarter, matching the Playbook's 90-day/25-employer shape [V].
- **Sources:** leads pipeline (FB Lane A/B + Seek + Trade Me harvest, already region-tagged [V]) + founder outreach; time entry to the sector's hiring window (`sell_now`/`next_up`, SEASONAL-INSIGHTS-SPEC §5) — open the outbound cycle **2–3 months before the regional peak**, same rule the vertical switch-on uses [V — EXPANSION-MODEL §2].

### Seeker side: what ≥150 open-to-work seekers takes

Channel mix per the funnel's pull engine [V], region-scoped:

| Channel | Waikato | Canterbury | Note |
|---|---|---|---|
| Owned FB group + content | primary (~½ of target) | **weaker — the group's gravity is Waikato/NI-skewed [A]** | For Canterbury: join + become useful in existing Canty/Southland farming groups before opening; budget the group-cold-start the way EXPANSION-MODEL §4 does for countries [V — "the owned-FB-group advantage does not port"] |
| Application-pull | grows with listings | same | supply pulls demand — listings-first sequencing matters |
| Referral | per `referral-mechanics.md` | *stronger* early lever where the group is weak | measured, not assumed |
| Cold-DM supplement | ~30/day under the shared account cap [V] | same account, same cap — Canterbury DMs compete with Waikato DMs for the ~20–40/day ceiling [V] | another reason not to run two regions' cold outreach at once |

- **Order of operations per region: seekers slightly ahead of employers.** 34% of seekers need work ASAP [V] — they'll sign up before listings exist if asked warmly, and a first employer meeting where the founder can say "we already have [n] open-to-work people near you" converts meetings at the Playbook's 80% instead of burning them [OPINION]. Target **≥50 regional open-to-work seekers before the employer outbound cycle starts**, ≥150 by end of the cycle.
- **Waikato check [MODELLED]:** the existing 90-day plan (300 seekers, Waikato-weighted) already clears 150 for one region if roughly half land Waikato — the national plan and the Region-1 gate are the same work.

## 3. What "open a region" operationally means (solo founder + AI)

Opening a region is a checklist, not a launch. All founder+AI; **nothing below needs a hire** (contrast: opening a *country* requires hire-1 [V — EXPANSION-MODEL §3]).

**Pre-open (the density check) — go/no-go:**
1. **Seeker density check:** ≥50 open-to-work profiles in-region (`seeker_profiles.open_to_work` + region — one SQL) plus leads-harvest seeker volume trending up for 60 days.
2. **Target list built:** ≥120 qualified employer rows, region-tagged, fit-filtered per the funnel's qualification rules, Tier A/B/C scored [V — funnel-design].
3. **Group presence established:** admitted + contributing in the region's 2–3 main farming FB groups for ≥4 weeks (value posts, zero pitch) before the first DM. The account ceiling is shared — plan the DM budget split.
4. **Season timing:** the region's dominant sector shows in `next_up` (1–2 months pre-window) — enter on the wave, not against it [V — Seasonal spec §5.2].
5. **Gate discipline:** current region has passed ≥15/≥150 — the NORTH-STAR do-not-open rule, restated because it will be tempting to break the first time a Canterbury lead looks shiny [OPINION].

**Open (the 12–16 week cycle):** run the standard weekly rhythm pointed at the region — Mon call block on Tier A, alternating-week farm-visit day physically in-region (Canterbury = planned trips, batch 2–3 days), content calendar carries region-flavoured proof, referral link seeded through any placed seekers there.

**Declare live:** both gate numbers hold for 4 consecutive weeks (not a single-day spike), then the region enters maintenance (retention loops per `retention-playbook.md` — pre-season call-backs are what *keep* a region above the bar year over year) and the next region's pre-open checklist starts.

## 4. Vertical interplay per region

Rule inherited from the expansion model: **a region can pass the gate on dairy alone; wedge verticals deepen it** — switch-ons follow the EXPANSION-MODEL §2 order (dairy → sheep/beef+drystock → rural contracting → hort/vit → arable) and must not drop any live region below the gate [V].

- **Waikato:** dairy alone carries the gate — ~40% of national events, spring calving *plus* the autumn winter-milk wave [V/A per Seasonal seed rows 1,3,5]. Sheep/beef (order 2) is the natural deepener for the Nov–Jan dairy trough.
- **Canterbury:** dairy-led entry (same playbook), but the region's real shape is multi-vertical — arable harvest Jan–Apr [A], large-scale operators with year-round hiring. Expect Canterbury to be where **rural contracting (order 3)** and **arable (order 5)** first make sense, and where Segment-B-profile accounts first surface [MODELLED]. Do not switch a vertical on for Canterbury before its EXPANSION-MODEL gate items clear (taxonomy, wedge, ≥20 accounts [V]).
- **Southland (if verified):** dairy + sheep/beef from day one — lambing Aug–Nov is [V] national and Southland-heavy; the two sectors share regions and buyers [V — EXPANSION-MODEL §2 rationale].
- **The interplay in one line:** verticals give a region *rolling* demand (Seasonal spec §1.1: every month has ≥3 high/extreme events nationally [V]) — so region N stays above the gate off-peak while founder attention is on region N+1. Depth funds breadth. [OPINION]

## 5. Measurement

One dashboard row per region (fold into `metrics-dashboard.md`): active listings · open-to-work seekers · ratio vs 15/150 gate · weeks-at-gate counter. The per-region ratio is already a named North Star supporting metric [V — NORTH-STAR.md]; this doc just gives it a rollout to govern.
