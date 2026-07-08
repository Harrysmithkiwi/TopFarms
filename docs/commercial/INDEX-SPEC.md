# TopFarms Index — Data Product Spec

> **Created:** 2026-07-08 (Stage-2 remediation, data-product workstream). **Status: SPEC — nothing built.**
> The audit found "TopFarms Index" existed only as a name (`TopFarms_Master_Report.md:77` — "feeding the founder pipeline / TopFarms Index view"; `PRICING-MODEL.md:60` — "Index/data (future) … see `INDEX-SPEC.md`"). This document makes it a real, specced data product.
> **What the Index is:** the public + licensable NZ (later AU/UK) agricultural workforce data product — the aggregate demand/supply cuts the platform already generates as exhaust, packaged on a monthly cadence.
> Labels: [V] verified in code/doc at the cited line · [A] assumption · [MODELLED] derived number · [OPINION] founder-judgement candidate.
> Companions: `MARKET-SIZING.md`, `PRICING-MODEL.md` §3, `docs/product/SEASONAL-INSIGHTS-SPEC.md` §6 (integration contract), `docs/product/PARSER-EXTENSION-SPEC.md` (the upstream field supply).

---

## 0. Why this exists (grounded, not invented)

1. **The analytics are already defined.** The demand-signal study's Part B cuts ARE the Index cuts [V — `TopFarms_Master_Report.md:77`]: *demand by role & region, accommodation-offered rate, right-to-work-restriction rate, tech-adoption rate, roster patterns*. Part A adds the supply mirror: seeker mobility mix, migrant/visa share, certification rate (`TopFarms_Master_Report.md:26-41`).
2. **The raw material is already flowing.** The leads pipeline (migrations 041–056) files structured employer + seeker signal daily; the marketplace schema (`jobs`, `seeker_profiles`, `applications`, `placement_fees`) holds the transactional actuals; the 039 `admin_analytics_*` family is the proven aggregate-RPC pattern.
3. **The free cut is already a GTM asset.** The Day-9 outbound touch is "pure value: regional wage data, no ask" [V — `.planning/gtm/funnel-design.md:69`]. Today that email has no product behind it. The free monthly Index cut IS that email's content, plus a public page for SEO/PR.
4. **A buyer class is already named.** Market sizing rules meat/seafood processing OUT as a marketplace vertical but says "revisit only as an Index data customer" [V — `MARKET-SIZING.md:56`]. The Index is where that revenue line lives.

**What the Index is NOT:** a real-time dashboard product, a per-farm benchmarking tool, or anything that exposes an identifiable farm or person. It is monthly aggregates with the sample size printed on every number.

---

## 1. Product tiers

### Tier 0 — Free monthly public cut (marketing / SEO / PR asset)

- **Surface:** one public page (`/index` or `/nz-farm-workforce-index` [OPINION — SEO naming call at build time]) + one section in the Day-9 value email and the monthly FB-group value post (`funnel-design.md:40` — 2 value posts/week already planned; the Index post is one of them, once a month).
- **Content (per month, national + any region clearing the n-gates in §3):**
  - Demand by role (top 5 roles by new-listing/lead volume, with direction arrows vs prior month)
  - Accommodation-offered rate (share of employer signals offering accommodation)
  - Right-to-work-restriction rate (share of employer signals gated on citizenship/no-sponsorship)
  - Seeker supply by role + mobility mix (anywhere / conditional / region-bound)
  - Salary observations — **published as bands and counts, never as a mean/median until n ≥ 30** (§3)
- **Every figure carries its n.** "Based on 84 employer signals across 5 sources, June 2026." That honesty is the brand differentiator against glossy recruiter "market reports" — and it is mandatory, not optional (§3).
- **Price:** free forever. This tier is CAC reduction and PR, not revenue. It also seeds the Founding-25 conversations (the founder walks in holding the only public dataset on NZ farm hiring).

### Tier 1 — Subscriber cut [MODELLED pricing]

- **Who:** rural professionals with recurring workforce questions but no analyst — farm consultants, rural accountants, larger owner-operators, regional industry-body staff. [OPINION]
- **What over Tier 0:** regional breakdowns below the free cut's threshold-clearing regions, role × region matrices, roster-pattern mix, tech-adoption rate, 12-month history + CSV download, quarterly commentary note.
- **Price:** ~$49–99/mo or ~$490–990/yr [MODELLED — WTP untested; anchor against DairyNZ Econ Tracker (free) and paid rural-intelligence newsletters. Do not lock before 3 real conversations].
- **Mechanics:** existing Stripe rail; gated behind an authenticated page. No new billing infrastructure.

### Tier 2 — Institutional licence [MODELLED pricing, OPINION buyer list]

- **Who (realistic NZ archetypes, all [OPINION] until a conversation happens):**
  - **Rural banks** — Rabobank NZ, ANZ/BNZ agri divisions: labour availability as a lending-risk input for dairy conversions and sharemilking deals.
  - **Rural insurers** — FMG: workforce churn correlates with farm-risk profiles.
  - **Industry bodies** — DairyNZ workforce team, Federated Farmers, Beef+Lamb NZ: they publish workforce commentary today with weak primary data; the Index is a primary series they don't have.
  - **Processors** — Fonterra / Silver Fern Farms supplier-services teams: on-farm labour stress is a supply-security input. (This is the `MARKET-SIZING.md:56` "Index data customer" re-entry path for the processing adjacency.)
  - **Government / research** — MPI workforce, MBIE regional-skills units, university ag-econ groups: procurement-slow but credibility-rich.
- **What:** full series licence — all cuts, all history, methodology note, quarterly briefing call, agreed citation rights ("Source: TopFarms Index").
- **Price:** $5k–25k/yr per licence [MODELLED — institutional data licences in NZ primary industries span roughly this band; the first licence conversation sets the real anchor]. At ~95% contribution margin per `PRICING-MODEL.md:60`, 3–5 licences is a meaningful non-placement revenue line, which matters because MARKET-SIZING §5.3 names "a 4th line (data, SaaS)" as the fallback if the Segment-B blend assumption fails.
- **Hard rule carried from the brand:** licensees get aggregates and methodology, never row-level data, never re-identifiable cells. No exceptions, no "enterprise data-sharing agreements". The seeker side is the moat (`PRICING-MODEL.md:32-33`) and seeker trust dies the day a farm worker's post shows up in a bank's dataset.

---

## 2. Data pipeline — which tables feed which aggregates

### 2.1 Sources (all existing; one dependency flagged)

| Source table | Fields consumed | Feeds | Status |
|---|---|---|---|
| `leads` (041/044/046) | `type`, `region`, `role_or_category`, `source`, `status`, `category`, `salary_text` (044:21), `created_at` | demand by role/region, seeker supply, source-mix, salary bands | [V] live |
| `lead_staging.structured` (041:57; jsonb) | `shed_type`, `herd_details`, `lane` — and post-extension: `accommodation`, `roster`, `right_to_work`, `start_timing` | accommodation-offered rate, roster mix, RTW-restriction rate, start-timing cuts | ◐ **the marquee rates are BLOCKED on the parser extension** — today the parser drops these fields (`TopFarms_Platform_Audit.md` §2.5 LH-2). See `PARSER-EXTENSION-SPEC.md`. |
| `jobs` | `role_type`, `region`, `salary_min/max`, `accommodation`, `visa_sponsorship`, `visa_requirements`, `status`, `created_at` | marketplace-actuals series (jobs posted per sector × region × month — the series the Seasonal Insights contract assigns to the Index, `SEASONAL-INSIGHTS-SPEC.md` §6) | [V] live, near-zero volume pre-liquidity |
| `seeker_profiles` | `region`, `role_type_pref`, `visa_status`, `accommodation_needed`, `open_to_relocate` | supply-side mirror cuts | [V] live, low volume |
| `applications` + `placement_fees` | status transitions, `confirmed_at` | fill-rate and time-to-placement series (later; needs volume) | [V] live, ~zero rows |
| Study dataset (`TopFarms_Combined_Data.md`, 35+12 rows) | all coded columns | **the launch-issue backfill and the coding template** — the first Index issues lean on it, clearly labelled as the Feb–Jul 2026 study sample | [V] in repo |
| `seasonal_events` (058, Seasonal Insights) | calendar rows + verification flag | expected-demand overlay bands on Index charts | consumed via the §6 contract in `SEASONAL-INSIGHTS-SPEC.md`; the Index never maintains its own calendar |

### 2.2 Anonymisation / k-threshold rules (the honesty contract)

Aligned with the leads privacy posture (`PHASE-LEADS-DESIGN.md` §8: "Leads PII never enters analytics aggregates — the 039 PII tests pattern extends to the new RPCs"):

1. **Aggregates only, ever.** No `display_name`, `contact`, `source_ref`, `locality`, or any row-level lead/job/seeker data crosses into `index_snapshots` or any Index output. `locality` (town) is explicitly excluded from Index dimensions — town-level cells in a thin rural market are farm-identifiable by construction.
2. **Cell suppression: k < 5 → suppressed.** Any cell (metric × region × role × month) built on fewer than 5 underlying records publishes as "suppressed" (n shown as "<5", value withheld). Floor adopted from the Seasonal Insights contract suggestion (`SEASONAL-INSIGHTS-SPEC.md` §6, "floor of ≥5 suggested") — one floor across both features.
3. **Small-n honesty: no precision claims below n = 30.** Cells with 5 ≤ n < 30 publish **counts and directions only** ("14 employer signals, up on May") — never rates, means, medians, or percentages. n ≥ 30 unlocks rates ("accommodation offered in 78% of 41 listings"). This threshold is stamped into the schema as the `confidence` column (§2.3), not left to editorial discipline.
4. **No farm-identifiable output.** Dimension combinations are capped at `region × role` (never region × role × herd-band × shed-type — a 4-way cut in Southland identifies the farm). Salary observations publish as $5k-wide bands, never as point values that could echo a single listing.
5. **Anonymised leads still count.** The 6-month dead-lead anonymise cron (041:424-433) keeps the aggregate row — Index counts survive anonymisation by design, so history doesn't decay.
6. **Study rows are labelled as study rows.** Where a published cut mixes live-pipeline and hand-coded study data, `source_mix` (§2.3) makes the blend explicit, and the public page says so in plain words.

---

## 3. The aggregate schema — `index_snapshots`

House conventions: CHECK-constraint vocab (zero native enums — `TopFarms_Platform_Audit.md:23`), RLS deny-by-default with zero client policies, SECURITY DEFINER access functions on the corrected-037 grant pattern, `country` column so AU/UK is data not schema (same move as `seasonal_events`, `SEASONAL-INSIGHTS-SPEC.md` §2).

```sql
-- DDL sketch (spec, not final migration). Migration number assigned at build
-- time — 058 is claimed by seasonal_events (SEASONAL-INSIGHTS-SPEC.md §2), so
-- this lands as 059+.
CREATE TABLE IF NOT EXISTS public.index_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- When / where
  period_month date NOT NULL,             -- first day of the month measured
  country text NOT NULL DEFAULT 'NZ' CHECK (country IN ('NZ', 'AU', 'UK')),
  region text,                            -- NULL = national; else the 16-region
                                          -- canon (lead-intake REGIONS list,
                                          -- supabase/functions/lead-intake/index.ts:26-43)
  sector text,                            -- NULL = all-ag; else the seasonal_events
                                          -- sector vocab (SEASONAL-INSIGHTS-SPEC §2)
                                          -- — one sector vocab across both features

  -- What
  metric text NOT NULL CHECK (metric IN (
    'demand_by_role',            -- employer signals per role
    'seeker_supply_by_role',     -- seeker signals per role
    'accommodation_offered_rate',
    'rtw_restriction_rate',
    'tech_adoption_rate',
    'roster_pattern_mix',
    'seeker_mobility_mix',
    'salary_band_count',         -- count per $5k band (never point values)
    'listing_volume',            -- marketplace actuals: jobs posted
    'lead_volume',               -- pipeline actuals: leads filed
    'placement_volume'           -- verified placements (North-Star series)
  )),
  dimensions jsonb NOT NULL DEFAULT '{}',  -- e.g. {"role":"farm_assistant"} or
                                           -- {"band":"70000-75000"}; keys capped
                                           -- per §2.2 rule 4 (max region × role)

  -- The honesty columns (non-negotiable, every row)
  n int NOT NULL,                          -- underlying record count
  suppressed boolean NOT NULL DEFAULT false, -- k<5 → true, value forced NULL
  confidence text NOT NULL DEFAULT 'directional' CHECK (confidence IN (
    'directional',   -- 5 <= n < 30: counts + direction only
    'indicative',    -- 30 <= n < 100: rates allowed
    'robust'         -- n >= 100
  )),

  -- The value
  value numeric,                           -- count or rate per metric semantics;
                                           -- NULL when suppressed
  direction text CHECK (direction IN ('up', 'down', 'flat')), -- vs prior month
  source_mix jsonb NOT NULL DEFAULT '{}',  -- {"leads": 34, "jobs": 3, "study": 47}

  UNIQUE (period_month, country, region, sector, metric, dimensions)
);
CREATE INDEX IF NOT EXISTS index_snapshots_period_idx
  ON public.index_snapshots (period_month, country);

ALTER TABLE public.index_snapshots ENABLE ROW LEVEL SECURITY;
-- Deny-by-default, zero client policies (041 posture). Reads via:
--   admin_index_snapshots(...)  — _admin_gate()-ed, full table (039 pattern)
--   index_public_snapshot(p_month date DEFAULT NULL) — SECURITY DEFINER, anon-
--     grantable, returns ONLY Tier-0 metrics with suppression + confidence rules
--     applied server-side. The public page can never query around the k-rules
--     because the rules are enforced in the function, not the client.
```

`CHECK`-widening for new metrics is a one-line migration (the 044:32-37 DROP/ADD pattern). The suppression + confidence values are **computed at snapshot-build time and stored**, not derived at read time — the published history must never silently change when a threshold is tuned.

---

## 4. Cadence + automation

Monthly, in the 039/`admin_analytics_*` house style, with the internal/wrapper split from 041 (`_lead_intake` / `admin_lead_capture`) and the cron-verification rule from MEMORY (verify by returned jobid, never the Studio banner):

```sql
-- Internal builder (no gate; called by cron). Reads leads / lead_staging /
-- jobs / seeker_profiles, computes every metric for the prior month, applies
-- §2.2 suppression + confidence, UPSERTs into index_snapshots.
CREATE OR REPLACE FUNCTION public._index_snapshot_build(p_month date DEFAULT NULL) ...

-- Gated admin read (039 pattern: _admin_gate() first, jsonb out, STABLE).
CREATE OR REPLACE FUNCTION public.admin_index_snapshots(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_country text DEFAULT 'NZ'
) RETURNS jsonb ...

-- Public read for the free cut (Tier-0 metrics only, rules enforced inside).
CREATE OR REPLACE FUNCTION public.index_public_snapshot(p_month date DEFAULT NULL)
RETURNS jsonb ...

-- 2nd of the month, 03:30 UTC — after the 041 crons and the Seasonal Insights
-- 1st-of-month sell-now refresh, so the month boundary is fully closed.
SELECT cron.schedule('index-snapshot-monthly', '30 3 2 * *',
  $$SELECT public._index_snapshot_build()$$);
```

- **No Edge Function needed.** Pure SQL over local tables — the pg_cron+pg_net quirks (`PHASE-LEADS-DESIGN.md` §7) don't apply because no HTTP is involved.
- **The Day-9 email + monthly FB post are founder-pull, not push:** the founder reads the fresh snapshot (admin page or public page) and writes the touch. No email automation in scope — consistent with the Seasonal Insights "founder-pull is the solo-founder-correct amount of automation" call (`SEASONAL-INSIGHTS-SPEC.md` §8).
- **Backfill:** at first build, run `_index_snapshot_build()` for each month Feb–Jul 2026 with the study dataset loaded as a coded fixture (`source_mix.study` carrying the count) so issue #1 has a history spine — labelled per §2.2 rule 6.

---

## 5. Seasonal Insights integration contract (honoured, not duplicated)

`SEASONAL-INSIGHTS-SPEC.md` §6 defines the shared surface. This spec confirms its side of the deal:

| Contract item | Their side | Index side (this spec) |
|---|---|---|
| Seasonal calendar (`seasonal_events`) | Single source of truth; exposes `index_seasonal_calendar()` read fn | Index consumes it for expected-demand overlay bands only; **never maintains its own calendar copy** |
| Demand actuals (jobs posted per sector × region × month) | Their §4.3 correlation column migrates here once this exists | **Index owns it** — the `listing_volume` metric in §3 IS that aggregate; Seasonal Insights should read `index_snapshots` (via a gated read) once built |
| Leads-harvest volume aggregates | consume | **Index owns it** — the `lead_volume` metric; k ≥ 5 floor confirmed (their suggested floor, adopted §2.2.2) |
| Verification flag | travels on every calendar row | Index public charts render [A]-verified calendar bands as "expected (unconfirmed)" — an assumed window is never presented as fact on a public surface |
| Sector vocab | their CHECK list | reused verbatim as `index_snapshots.sector` (§3) — one vocab, no drift |

Generic interface rule for anything future: **calendar/reference data lives in Seasonal Insights; measured actuals live in the Index; each side consumes the other via a named SECURITY DEFINER read function, never by re-deriving.**

**Conflict check (2026-07-08):** none found. Their §6 anticipated this spec correctly; the only decision they deferred to us — the k-threshold — is settled here at their suggested ≥5.

---

## 6. The honest cold-start

Current data volumes [V as of 2026-07-08]: n ≈ 47 hand-coded study rows (35 seekers + 12 employers, dairy-skewed, five FB groups — "directional, not statistically representative", `TopFarms_Master_Report.md:110`) plus a few hundred pipeline leads, concentrated in one lane. Marketplace actuals ≈ zero (pre-liquidity).

**Therefore: the first ~6 months of Index output is directional-only, and says so.** Concretely, under the §2.2 rules, early issues will publish mostly counts + directions with visible n's — which is fine, because the honesty IS the product's credibility. What is not fine is faking rates off 12 employer rows.

**Volume gates per tier [MODELLED — tune with a dated note, NORTH-STAR.md style]:**

| Tier | Launch gate | Rationale |
|---|---|---|
| Tier 0 free cut | ≥ 100 new employer-side signals/month nationally for 2 consecutive months, OR any single headline metric reaching n ≥ 30 | below this, the "monthly" cut has nothing new to say month-on-month; publish quarterly until the gate clears |
| Tier 1 subscriber | ≥ 2 regions sustaining n ≥ 30 on ≥ 3 headline metrics for 3 consecutive months, AND ≥ 3 months of Tier-0 publication history | nobody pays for regional cuts that are mostly "suppressed"; Tier 0 first proves the cadence |
| Tier 2 institutional | 12 months of continuous series + national n ≥ 100/month + at least one metric with marketplace actuals (not just leads) | institutions buy series, not snapshots; a bank licensing 4 months of FB-lead counts damages credibility permanently |

Until Tier 0's gate clears, the Index exists as: (a) the Day-9 email section, (b) the monthly FB-group value post, (c) the Founding-25 conversation asset — all fed by the same `_index_snapshot_build()` output, no public page yet. The pipeline gets built now; the tiers switch on when the data can carry them.

**What would falsify the product [A]:** if 12 months in, pipeline volume still can't clear n ≥ 30 regionally, the Index is a dairy-Waikato newsletter, not a national data product — at that point fold it back into pure GTM content and stop pretending, per the PRICING-MODEL honesty rule.

---

## 7. Effort (solo-founder + AI sizes)

| # | Component | Size | Notes |
|---|---|---|---|
| 1 | Migration: `index_snapshots` + `_index_snapshot_build()` + 3 read fns + cron + grants | **M** | The builder function is the real work — ~10 metric queries with suppression/confidence logic; 039/041 patterns cover the rest mechanically |
| 2 | Study-dataset backfill fixture (Feb–Jul 2026 coded rows → snapshot rows) | **S** | One-off script; depends on the coding-template mapping in `PARSER-EXTENSION-SPEC.md` §5 |
| 3 | Admin surface: Index panel in `/admin/analytics` (existing AdminAnalytics + Tremor pattern) | **S–M** | Read `admin_index_snapshots`; table + trend sparkline; no new page needed at first |
| 4 | Public free-cut page (Tier 0) | **M** | One route, anon-readable via `index_public_snapshot()`; static-feeling, SEO-friendly; gated on §6 |
| 5 | Day-9 email / FB-post template feeding off the snapshot | **S** | Doc + copy work, house voice rules (`TopFarms_Outreach_Reply_Config.md` §2 — no overselling, no em dashes) |
| 6 | Tier 1 subscriber surface + Stripe gate | **M** | Deferred until its §6 gate clears — do not build now |
| 7 | Tier 2 licence collateral (methodology note, sample pack) | **S** | Docs only; produce when the first institutional conversation is scheduled, not before |
| — | **Dependency:** parser extension (accommodation/roster/RTW/start-timing keys) | see `PARSER-EXTENSION-SPEC.md` | Without it, `accommodation_offered_rate`, `rtw_restriction_rate`, `roster_pattern_mix` have no live feed — study-rows only. Build it first. |

Build order: parser extension → components 1–2 → 3 → 5 → (gate) → 4 → (gates) → 6–7.
