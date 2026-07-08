# Seasonal Insights — full spec

*2026-07-08 · Stage-2 remediation, Seasonal Insights workstream. Status: SPEC (nothing built). Verification labels: **[V]** = timing verified against a named source (URL in the seed table), **[A]** = best estimate, authoritative source named to confirm before the row is trusted for outreach targeting.*

---

## 1. Purpose

Two things fused into one feature:

**(a) Admin demand-forecasting dashboard.** Encode the hiring calendar of every NZ primary sector — sector × region × event × timing window × labour intensity — so the founder sees incoming demand waves before they arrive. Dairy calving doesn't surprise anyone who grew up on a farm; the point is having *all* the sectors' waves on one screen, correlated with what the leads pipeline is actually harvesting.

**(b) GTM sequencing layer.** Sectors peak at different times. A multi-vertical marketplace therefore gets *rolling* year-round demand instead of one dairy spike. That does three jobs: (i) smooths liquidity (there's always a sector hiring, so there's always a reason for seekers and employers to be on the platform), (ii) tells the founder **what to sell this month** (which sector × region × role to point the ~10 outbound touches/week and the content calendar at), (iii) tells the founder **which vertical to switch on next** (open the vertical 2–3 months before its labour peak, so supply is seeded when demand lands).

Solo-founder constraint honoured throughout: the calendar is reference data in Postgres, the monthly signal is a cron + RPC, the surface is one admin page + one Daily Briefing card. No spreadsheet to maintain.

### 1.1 The staggered-waves insight, quantified

Month-by-month count of sectors with a **high or extreme** labour event active (from the verified calendar in §3; sectors counted once per month even with multiple events):

| Month | High/extreme events active | Sectors | Verification mix |
|---|---|---|---|
| **Jan** | 4 | sheep (main shear), arable (harvest), apiculture (honey harvest), summerfruit (cherries) | 2 [V] / 2 [A] |
| **Feb** | 6 | sheep, arable, apples, viticulture (vintage), apiculture, dairy (pre-Moving-Day hiring) | 4 [V] / 2 [A] |
| **Mar** | 5 | arable, apples, viticulture, kiwifruit (harvest starts), dairy hiring | 3 [V] / 2 [A] |
| **Apr** | 5 | arable, apples, viticulture, kiwifruit, dairy hiring | 3 [V] / 2 [A] |
| **May** | 3 | viticulture (tail), kiwifruit, dairy hiring | 2 [V] / 1 [A] |
| **Jun** | 3 | forestry (planting), sheep (pre-lamb shear), viticulture (winter pruning) | 2 [V] / 1 [A] |
| **Jul** | 4 | dairy (calving — extreme), dairy (calf rearing), forestry, sheep (pre-lamb) | 4 [V] |
| **Aug** | 5 | dairy ×2, forestry, sheep (pre-lamb + lambing starts) | 5 [V] |
| **Sep** | 5 | dairy ×2 (tail), sheep (lambing + main shear starts), forestry (tail) | 5 [V] |
| **Oct** | 3 | dairy (calf rearing), sheep (lambing + main shear) | 3 [V] |
| **Nov** | 3 | sheep (lambing tail + main shear), apiculture (honey flow) | 3 [V] |
| **Dec** | 3 | sheep (main shear), apiculture, summerfruit (cherries from late Dec) | 2 [V] / 1 [A] |

**Reading:** every month of the year has at least 3 high/extreme labour events running across NZ primary sectors. Dairy alone gives TopFarms roughly a Jul–Sep intensity spike plus a Feb–May hiring run-up to Moving Day — maybe 6 hot months. The full ag-broad calendar gives 12. The quiet dairy trough (Nov–Jan) is exactly when shearing, apiculture, arable and summerfruit peak; the horticulture wall (Feb–May: apples + vintage + kiwifruit simultaneously, ~20,000+ workers for kiwifruit alone per NZKGI) is the single biggest labour event in the country and lands when dairy is mid-season-stable. That's the vertical-sequencing argument in one table.

---

## 2. Data model

One table. Reference data, admin-maintained, ~30–60 rows for NZ. Country column + absolute calendar months make AU/UK a data problem, not a schema problem (see §7). House conventions followed: CHECK-constraint controlled vocab (no native enums), RLS deny-by-default with zero client policies, all access via `_admin_gate()`-ed SECURITY DEFINER RPCs, corrected-037 grants pattern.

Migration: **`058_seasonal_events.sql`** (next free number after 057; NAMING.md conventions — `BEGIN;…COMMIT;`, `IF NOT EXISTS` guards, Studio apply path per CLAUDE.md §2).

```sql
-- DDL sketch (spec, not final migration)
CREATE TABLE IF NOT EXISTS public.seasonal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Where. Absolute calendar months per country row = hemisphere handled by
  -- data, not code. UK lambing goes in as Feb-Apr on a country='UK' row; no
  -- hemisphere-offset logic anywhere.
  country text NOT NULL DEFAULT 'NZ' CHECK (country IN ('NZ', 'AU', 'UK')),
  region text,          -- NULL = nationwide; else the shared 16-region canon
                        -- (Platform Audit §2.1 — align with the region picker,
                        -- do NOT invent a parallel vocab)

  -- What.
  sector text NOT NULL CHECK (sector IN (
    'dairy', 'sheep_beef', 'arable', 'kiwifruit', 'apples_pears',
    'viticulture', 'apiculture', 'forestry', 'aquaculture', 'fishing',
    'summerfruit'
  )),
  event_name text NOT NULL,        -- human label: 'Spring calving', 'Main shear'
  event_type text NOT NULL CHECK (event_type IN (
    'peak_labour',      -- the work itself needs bodies (calving, harvest)
    'hiring_window',    -- recruitment runs ahead of the work (pre-Moving-Day)
    'staff_turnover',   -- churn moment (Moving Day itself)
    'maintenance'       -- pruning/thinning-class work, steadier crews
  )),

  -- When. 1-12; windows may wrap the year end (main shear Sep-Feb =
  -- start 9, end 2). RPCs handle wrap with modular month arithmetic.
  start_month int NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  end_month int NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  peak_month int CHECK (peak_month BETWEEN 1 AND 12),

  -- How hard.
  labour_intensity text NOT NULL CHECK (labour_intensity IN (
    'low', 'medium', 'high', 'extreme'
  )),
  roles text[] NOT NULL DEFAULT '{}',   -- free-text role tags for now
                                        -- ('calf_rearer', 'picker', 'shearer');
                                        -- CHECK vocab once the role canon lands
                                        -- (Platform Audit §2.1 role_type work)

  -- Provenance — every row carries it, non-negotiable.
  verification text NOT NULL DEFAULT 'assumed'
    CHECK (verification IN ('verified', 'assumed')),
  source text NOT NULL,                 -- named body: 'DairyNZ', 'NZKGI', ...
  source_url text,
  notes text
);

CREATE INDEX IF NOT EXISTS seasonal_events_country_sector_idx
  ON public.seasonal_events (country, sector);

ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: RLS on, zero policies (041 posture). All reads/writes via
-- admin RPCs. The Index (§6) gets its own SECURITY DEFINER read function —
-- not a client policy — because this table is non-PII reference data but we
-- keep one access pattern across the schema.
```

**Deliberate simplifications** (`ponytail:` class — named ceiling + upgrade path):

- **Month granularity, not dates.** Hiring waves are month-scale; week-scale precision is false precision for a calendar sourced from industry-body prose. Ceiling: if the founder ever wants "kiwifruit starts week 2 of March in Te Puke", add `start_week`/nudge columns then.
- **No year column.** This is a *recurring* calendar, not an events log. Year-specific drift (early vintage 2026 — NZ Winegrowers noted the earliest start on record) belongs in `notes` or in actuals from the leads pipeline, not in the reference row.
- **`roles text[]` unchecked for now.** The platform-wide role vocab is itself still being canonicalised (Audit §2.1/§2.2 — `role_type` has no CHECK yet). Constraining here first would create a second competing vocab. Follow the platform canon when it lands.

---

## 3. The NZ seasonal calendar — seed dataset

This is the seed data for migration 058 (INSERT block), reproduced here as the source-of-truth table. **Every row labelled.** [V] = timing statement verified 2026-07-08 via the cited source; [A] = best estimate, named body to confirm. Regions use the platform canon; "—" = nationwide.

| # | Sector | Event | Type | Window (peak) | Region | Intensity | Roles | Ver. | Source |
|---|---|---|---|---|---|---|---|---|---|
| 1 | dairy | Spring calving | peak_labour | **Jul–Sep** (Jul–Aug) | — | **extreme** | calf_rearer, farm_assistant, relief_milker | **[V]** | DairyNZ — "calving takes place late winter/early spring (July to September)"; 12-week window, ~86% of herd calved by week 6. <https://www.dairynz.co.nz/animal/cow-reproduction-and-mating/calving-pattern/> |
| 2 | dairy | Calf rearing | peak_labour | **Jul–Oct** (Aug) | — | high | calf_rearer | **[V]** (derived) | Follows calving directly; window derived from DairyNZ calving pattern (row 1). |
| 3 | dairy | Autumn calving (winter-milk herds) | peak_labour | **Feb–Mar** | Waikato, Taranaki, Northland (winter-milk catchments) | medium | calf_rearer, farm_assistant | **[V]** | DairyNZ autumn-management guidance + Journal of NZ Grasslands farm-system study (autumn calving Feb–Mar, growing North Island interest driven by dry summers + winter milk premium). <https://www.dairynz.co.nz/feed/fundamentals/autumn-management/> |
| 4 | dairy | Moving Day / season turnover | staff_turnover | **Jun** (1 June) | — | high | all dairy roles | **[V]** | Dairy season runs 1 Jun–31 May; sharemilkers, contract milkers and employees shift farms on 1 June. DairyNZ / Federated Farmers / MPI coordinate the day. <https://agscience.org.nz/cows-will-be-on-the-move-on-june-1-but-the-language-used-to-describe-the-occasion-can-raise-hackles/> |
| 5 | dairy | Pre-season hiring window | hiring_window | **Feb–May** (Mar–Apr) | — | high | 2ic, herd_manager, farm_assistant, contract_milker | **[A]** | Inference from row 4: contracts for 1 June starts are signed over late summer/autumn. Confirm the recruitment-ad seasonality with DairyNZ workforce team / Farm Source job-ad data — and against TopFarms' own leads actuals after one cycle. |
| 6 | dairy | Mating (AB season) | peak_labour | **Oct–Dec** | — | medium | ab_technician, farm_assistant | **[A]** | Spring-calving herds mate ~Oct onward (gestation ≈282 days back from Jul calving). Confirm against DairyNZ InCalf book. <https://www.dairynz.co.nz/media/ve2lkbzv/the-incalf-book.pdf> |
| 7 | sheep_beef | Lambing | peak_labour | **Aug–Nov** (Sep–Oct) | earlier north, later south | **extreme** | shepherd, general_hand | **[V]** | Te Ara "The sheep farming year": lambing Aug–Nov, peak Sep–Oct; northern farms lamb Aug–Sep, southern Sep–Nov. <https://teara.govt.nz/en/interactive/16679/the-sheep-farming-year> — cross-check Beef+Lamb NZ lambing calculator for regional detail. |
| 8 | sheep_beef | Pre-lamb shearing | peak_labour | **Jun–Aug** | — | high | shearer, wool_handler, presser | **[V]** | Winter shearing ahead of early-spring lambing; mid-winter shear at 50–100 days gestation, not within ~6 weeks of lambing (Tararua Vets; NZ Herald The Country). <https://tararuavets.nz/mid-winter-shearing/> — NZ Shearing Contractors' Assn is the body to confirm crew-demand months. |
| 9 | sheep_beef | Main shear | peak_labour | **Sep–Feb** | — | high | shearer, wool_handler, presser | **[V]** | Main shear runs September through February (The Sheep Shearer; Te Papa shearing-industry material). <https://sheepshearer.co.nz/pages/sheep-shearing-main-shear> |
| 10 | sheep_beef | Docking / tailing | peak_labour | **Oct–Nov** | — | medium | general_hand, casual | **[A]** | Standard practice 4–6 weeks after lambing ends per block. Confirm with Beef+Lamb NZ farm-calendar resources. |
| 11 | arable | Grain / small-seed harvest | peak_labour | **Jan–Apr** (Feb–Mar) | Canterbury (≈68% of arable area), Otago, Southland | high | harvest_operator, truck_driver, general_hand | **[A]** | Te Ara confirms autumn sowing + dry-summer harvest in Canterbury but doesn't state months; FAR's 2025 harvester study ran "January to May". Best estimate Jan–Apr. **Confirm exact window with FAR (far.org.nz).** <https://teara.govt.nz/en/arable-farming/page-8> |
| 12 | arable | Autumn sowing | peak_labour | **Apr–Jun** (May) | Canterbury, Otago, Southland | medium | tractor_operator | **[V]** | Te Ara: ~75% of wheat sown autumn (May), balance early spring; barley mid-spring. <https://teara.govt.nz/en/arable-farming/page-3> |
| 13 | kiwifruit | Harvest + packhouse | peak_labour | **Mar–Jun** (Apr–May) | Bay of Plenty (Te Puke core), Northland, Gisborne | **extreme** | picker, packhouse_worker, forklift | **[V]** | NZKGI: "from around March to June, a large seasonal workforce is needed… well over 20,000 people to pick and pack." Zespri: RubyRed first (early Mar), then Gold, then Green. <https://www.nzkgi.org.nz/new-zealand-kiwifruit-harvest-underway-as-first-crop-picked/> |
| 14 | kiwifruit | Winter pruning | maintenance | **Jun–Aug** | Bay of Plenty + | medium | pruner | **[A]** | Standard vine-work cycle (Te Ara "The production year" outlines the annual cycle). Confirm months with NZKGI labour updates. <https://teara.govt.nz/en/kiwifruit/page-4> |
| 15 | kiwifruit | Summer canopy / thinning | maintenance | **Nov–Jan** | Bay of Plenty + | medium | orchard_hand | **[A]** | Same cycle source as row 14; confirm with NZKGI. |
| 16 | apples_pears | Harvest + packhouse | peak_labour | **Feb–Apr** (Mar) | Hawke's Bay (~62% of crop), Nelson–Tasman (~26%), Otago (late Feb start) | **extreme** | picker, packhouse_worker | **[V]** | Season starts mid-Feb North Island / upper South Island, late-Feb Otago; runs ~10–11 weeks to April. Production split per NZ Apples & Pears (NZAPI) figures. <https://nzpocketguide.com/apple-picking-season-in-new-zealand/> + NZ Herald Hawke's Bay harvest coverage. |
| 17 | apples_pears | Winter pruning | maintenance | **May–Aug** | Hawke's Bay, Nelson–Tasman | medium | pruner | **[A]** | Standard pipfruit cycle. Confirm with NZAPI. |
| 18 | apples_pears | Thinning | maintenance | **Nov–Dec** | Hawke's Bay, Nelson–Tasman | medium | orchard_hand | **[A]** | Standard pipfruit cycle. Confirm with NZAPI. |
| 19 | viticulture | Vintage (grape harvest) | peak_labour | **Feb–May** (Mar–Apr Marlborough) | Marlborough (dominant), Hawke's Bay, Central Otago, Gisborne, Northland (earliest) | **extreme** | vintage_cellar_hand, machine_operator, hand_picker | **[V]** | NZ Winegrowers vintage-2026 release: harvest began Northland 23 Jan (earliest on record — trend is earlier starts), Marlborough into gear Feb–Mar; harvest "normally commences in northern regions late February and continues until May". <https://www.nzwine.com/en/media/media-releases/vintage-2026/> |
| 20 | viticulture | Winter pruning | maintenance | **Jun–Aug** | Marlborough + | high | pruner (large RSE component) | **[A]** | Marlborough's biggest steady winter labour demand; Te Ara Marlborough yearly-cycle interactive shows the annual pattern. Confirm crew months with NZ Winegrowers / Wine Marlborough. <https://teara.govt.nz/en/interactive/31781/yearly-cycle> |
| 21 | apiculture | Spring build-up / hive management | peak_labour | **Aug–Oct** | — | medium | beekeeper, hive_hand | **[V]** | NZ beekeeping year begins Aug: population build-up before main nectar flow from mid-Nov (Waikato DBA calendar; ApiNZ seasonal material). <https://www.waikatobeekeepers.org.nz/bee-information/beekeeping-calendar/> |
| 22 | apiculture | Honey flow + harvest | peak_labour | **Nov–Feb** (Dec–Jan) | — (mānuka blocks concentrated Northland, East Coast, central NI) | high | beekeeper, extraction_hand | **[V]** | Main flow mid-Nov–Dec; extraction Jan–Feb; varroa treatment in by end Feb (ApiNZ "culmination of the season" + club calendars). <https://apinz.org.nz/getting-to-the-culmination-of-the-season/> |
| 23 | forestry | Planting season | peak_labour | **Jun–Sep** (Jul–Aug) | — (Central NI, East Coast, Northland heavy) | high | planter | **[V]** | Forestry Careers NZ: "tree planting is done over the winter months (June–September)… the main seasonal job in forestry"; NZFFA notes nursery stock from ~May. <https://www.forestrycareers.nz/forestry-careers/seasonal/planting> |
| 24 | fishing | Bluff oyster season | peak_labour | **Mar–Aug** (opens 1 Mar) | Southland | medium | deckhand, processor | **[V]** | Season 1 March–31 August or until quota (NIWA; MPI-set season). Note: iwi/industry paused harvest 2025–26 over fishery health — check season status each year before selling against it. <https://niwa.co.nz/news/oysters-ahead-bluff-season-begins> |
| 25 | fishing | Wild-catch peaks (hoki winter season etc.) | peak_labour | **Jun–Sep** | Nelson, Southland, West Coast | medium | deckhand, processor | **[A]** | Hoki spawning-season fishery runs winter (Jun–Sep West Coast). Confirm with Seafood NZ / MPI before encoding as fact. |
| 26 | aquaculture | Mussels / salmon — year-round harvest | peak_labour | **Jan–Dec** (no peak) | Marlborough Sounds (~80% of farmed seafood), Coromandel, Stewart Is. | low | farm_hand, processor, boat_crew | **[V]** | Aquaculture NZ / Te Ara: mussels reach harvest 12–18 months from spat, harvested year-round; salmon ~16-month cycle. Steady roles, not a seasonal wave — kept in the model for completeness, excluded from wave counts. <https://www.aquaculture.org.nz/farmed-seafood> |
| 27 | summerfruit | Cherry / summerfruit harvest | peak_labour | **Dec–Feb** (late Dec–Jan cherries) | Central Otago, Hawke's Bay | high | picker, packhouse_worker | **[A]** | Well-known Central Otago cherry window (pre-Chinese-New-Year export). Confirm with Summerfruit NZ before targeting. |

**Verification tally: 17 [V] / 10 [A].** Every dairy row that TopFarms sells against today is [V] except the pre-season hiring window (row 5), which is an inference from the verified Moving Day anchor and should be validated against TopFarms' own leads actuals after one Feb–May cycle. The [A] rows are deliberately conservative: they're good enough to render on the dashboard (flagged), not good enough to base an outreach campaign on until confirmed.

---

## 4. Admin surface

### 4.1 Views

New route **`/admin/seasonal`** (AdminSidebar entry: "Seasonal"), following the existing admin page pattern (Audit §1.7 — vendored Tremor components at `@/components/tremor/`, `AdminPageHeader`, RPC-fed).

Layout, top to bottom:

1. **Sell-this-month panel** (Card). The current month's `sell_now` list (§5): sector × region × roles, one line each, ordered by intensity then window status (`starting` > `peaking` > `ending`). [A]-sourced rows render with an "unverified timing" badge. This panel is the whole feature for 80% of visits.
2. **12-month heatmap** (plain CSS grid inside a Card — no chart lib needed; Tremor has no heatmap and a coloured `<table>` is the lazy correct answer). Rows = sector (filterable to region), columns = Jul→Jun (NZ season order, current month highlighted), cell colour = max `labour_intensity` of any event active that month, cell tooltip = event names + verification flag. This is the staggered-waves picture from §1.1, live from data.
3. **Upcoming demand list** (Card): events starting or peaking in the next 3 months, with the correlated actuals column — leads captured in the last 60 days matching that sector/region (from the leads pipeline, §4.3) — so "calendar says calving is coming" sits next to "and we've harvested 14 Waikato dairy leads".
4. **Calendar admin** (collapsed section): table of `seasonal_events` rows with edit/add — this is where [A] rows get flipped to [V] as sources are confirmed, and where AU/UK rows get added later. Founder-only CRUD, audited.

A single **Daily Briefing card** ("Selling this month: dairy pre-season, Waikato — 3 sectors active") links to `/admin/seasonal`. No other surface.

### 4.2 RPC signatures (`admin_analytics_*` style — 039 pattern: `_admin_gate()` first, `jsonb` out, STABLE for reads, audit-log on mutation, corrected-037 grants)

```sql
-- Full 12-month grid for the heatmap.
admin_analytics_seasonal_calendar(
  p_country text DEFAULT 'NZ',
  p_region  text DEFAULT NULL      -- NULL = all; region rows + nationwide rows
) RETURNS jsonb
-- { months: [ { month: 1..12, sectors: [ { sector, max_intensity,
--   events: [ { id, event_name, event_type, window_status, verification } ] } ] } ] }

-- Upcoming events + leads-pipeline actuals correlation.
admin_analytics_seasonal_upcoming(
  p_months  int  DEFAULT 3,
  p_country text DEFAULT 'NZ'
) RETURNS jsonb
-- { rows: [ { event fields…, window_status: 'starting'|'peaking'|'ending',
--   months_until_peak, leads_60d: int,        -- count from public.leads where
--                                             -- region/role_or_category match
--   jobs_active: int } ] }                    -- live jobs in matching region

-- The GTM output (§5). Pure function of (seasonal_events, month).
admin_seasonal_sell_now(
  p_month   int  DEFAULT NULL,     -- NULL = current month
  p_country text DEFAULT 'NZ'
) RETURNS jsonb                     -- exact shape in §5.1

-- CRUD (mutations write admin_audit_log rows, 023 pattern).
admin_seasonal_event_upsert(p_event jsonb) RETURNS jsonb   -- {id}
admin_seasonal_event_delete(p_id uuid)     RETURNS jsonb   -- {deleted: true}
```

Window-wrap rule shared by all reads: month `m` is inside `[start_month, end_month]` when `start_month <= end_month AND m BETWEEN start_month AND end_month`, OR `start_month > end_month AND (m >= start_month OR m <= end_month)`. `window_status` = `starting` (m = start_month), `peaking` (m = peak_month), `ending` (m = end_month), else `active`.

### 4.3 Leads correlation (calendar vs. actual)

The join to actuals is deliberately coarse: `public.leads` (041) carries `region` and `role_or_category` free-text; match on region equality + sector keyword list per sector (e.g. dairy ⇒ role_or_category ILIKE any of dairy/milk/calf/2ic…). That's a heuristic and it lives inside `admin_analytics_seasonal_upcoming` only — `ponytail:` keyword-match correlation, upgrade to a proper `leads.sector` column when the role canon lands (Audit §2.1). The value is directional ("calendar wave ↔ pipeline actually filling"), not precise attribution.

### 4.4 Automation — the monthly cron

`pg_cron`, 1st of each month, 03:00 (alongside the existing 041 crons):

```sql
SELECT cron.schedule('seasonal-sell-now-refresh', '0 3 1 * *',
  $$INSERT INTO public.admin_metrics_cache (metric_key, value, cached_at)
    VALUES ('seasonal_sell_now',
            public._seasonal_sell_now(extract(month from now())::int, 'NZ'),
            now())
    ON CONFLICT (metric_key) DO UPDATE
      SET value = EXCLUDED.value, cached_at = EXCLUDED.cached_at$$);
```

Reuses the existing `admin_metrics_cache` (023: `metric_key` PK, `value jsonb`, `cached_at`) — no new table, and the Daily Briefing already knows how to read that cache. `_seasonal_sell_now()` is the internal (no-gate) core that `admin_seasonal_sell_now()` wraps with `_admin_gate()` — same internal/wrapper split as `_lead_intake()`/`admin_lead_capture()` in 041. Verify the cron via returned jobid, per the Studio-paste house rule.

That's the whole "automate the demand signal" requirement: the calendar is data, the signal is a cron refreshing one cache row, the founder never touches a spreadsheet.

---

## 5. GTM sequencing output — "what to sell this month"

### 5.1 The `sell_now` shape (exact contract)

`admin_seasonal_sell_now()` / the cached `seasonal_sell_now` metric value:

```jsonc
{
  "month": "2026-07",
  "country": "NZ",
  "generated_at": "2026-07-01T03:00:00Z",
  "sell_now": [                       // events active this month, high+extreme
    {                                 // first, ordered intensity desc then status
      "sector": "dairy",
      "event": "Spring calving",
      "region": null,                 // null = nationwide
      "roles": ["calf_rearer", "farm_assistant", "relief_milker"],
      "window_status": "peaking",     // starting | peaking | active | ending
      "intensity": "extreme",
      "verification": "verified",     // [A] rows surface as "assumed" — badge in UI,
      "source": "DairyNZ"             // and NOT eligible for outreach targeting
    }
  ],
  "next_up": [ /* same shape; events starting within 2 months — this is the
                  "which vertical to switch on next" signal: open a vertical
                  when it appears here, not when it hits sell_now */ ],
  "winding_down": [ /* events ending this month — stop-selling signal */ ]
}
```

### 5.2 How it lands in the weekly rhythm

Two insertion points in `.planning/gtm/weekly-operating-rhythm.md`, both founder-pull (no push infrastructure):

- **First Monday of the month, inside the existing "Mon AM target-list review" block:** read the Daily Briefing sell-now card (or `/admin/seasonal`). Set the month's outreach focus = top `sell_now` entries whose sector is a live vertical. The ~10 employer touches/week and the ~30/day seeker-DM targeting inherit that sector × region × role focus for the month. `next_up` entries in non-live verticals feed the "switch on next vertical?" judgement — target opening a vertical when it shows in `next_up` (i.e. 1–2 months pre-peak), so supply seeds before demand lands.
- **Fri weekly review, inside the existing content-calendar review:** the month's content theme aligns to the top `sell_now` entry (e.g. July = calving-support content into the FB group; February = "sorted for June 1?" Moving-Day content). One line in the rhythm doc: *"Content theme follows `sell_now[0]` unless there's a reason not to."*

Doc change is one short subsection added to `weekly-operating-rhythm.md` — part of this build, not a separate workstream. Copy stays in the house frame: matching, never sorting/triage; warm to workers, relief for employers.

Hard rule carried into GTM use: **[A]-verified rows never drive outreach targeting** — they render greyed in `sell_now` until flipped to [V] in the calendar admin. Selling against an unverified window in a small rural community costs credibility that doesn't come back.

---

## 6. TopFarms Index integration contract

`docs/commercial/INDEX-SPEC.md` (in flight, parallel workstream) owns the Index. This section defines only the shared surface — what both features consume, who owns what. Reference, don't duplicate.

| Aggregate | Owner | Seasonal Insights consumes | Index consumes | Access path |
|---|---|---|---|---|
| `seasonal_events` reference calendar | **Seasonal Insights** (this spec; single source of truth for expected seasonality) | directly (admin RPCs) | expected-demand overlay ("calving window" bands on Index charts) | new `index_seasonal_calendar()` SECURITY DEFINER read fn — non-PII reference data, [V]/[A] flags included; grant per Index spec's access model, NOT a client RLS policy |
| Monthly demand actuals: jobs posted per sector × region × month | **Index** (its core series) | `admin_analytics_seasonal_upcoming` correlation column (§4.3) reads the same underlying tables today; migrate to the Index aggregate once it exists | directly | whatever INDEX-SPEC.md defines |
| Leads-harvest volume per sector × region × month (aggregate counts only, ≥ threshold, never row-level lead data — 041 privacy posture) | **Index** | same as above | directly | per INDEX-SPEC.md; k-threshold on small cells is the Index's call, floor of ≥5 suggested |
| `seasonal_sell_now` cache row | **Seasonal Insights** | Daily Briefing + rhythm | not consumed (GTM-internal) | — |

Two contract rules: (1) **the calendar lives here, actuals live in the Index** — Seasonal Insights never re-derives demand series, the Index never maintains its own copy of the seasonal calendar; (2) the `verification` flag travels with every calendar row into any Index surface, so a public Index chart never presents an [A] window as fact.

---

## 7. AU / UK extension notes

Designed-in, not built:

- **Schema already covers it.** `country` CHECK vocab widens ('AU', 'UK' already listed); windows are absolute calendar months per row, so hemisphere is a data-entry fact, not a code path. UK lambing enters as country='UK', Feb–Apr; AU dairy calving as country='AU' with its regional split. Zero migration beyond seed rows.
- **Region vocab per country.** `region` values must come from a per-country canon (NZ 16-region canon now; AU states / UK counties later). Enforce in the upsert RPC by country at that point, not with a cross-country CHECK now.
- **RPCs are country-parameterised already** (`p_country` on every read). The admin page grows a country switcher; nothing else changes.
- **Verification discipline transfers:** AU rows cite Dairy Australia / MLA / Hort Innovation; UK rows cite AHDB / NFU. Same [V]/[A] rule, same "no outreach off [A] rows".

---

## 8. Build estimate

| Component | Size | Notes |
|---|---|---|
| Migration `058_seasonal_events.sql` — table + ~27 seed rows + 5 RPCs + `_seasonal_sell_now()` internal + cron + grants | **M** | The seed INSERT is the §3 table verbatim; RPCs follow 039/041 patterns closely, mostly mechanical |
| `/admin/seasonal` page — sell-now panel, CSS-grid heatmap, upcoming list, calendar CRUD table | **M** | Vendored Tremor Card + plain grid; CRUD table is the biggest chunk |
| Daily Briefing sell-now card | **S** | Reads existing `admin_metrics_cache` key |
| `weekly-operating-rhythm.md` subsection (§5.2 insertion points) | **S** | Doc-only |
| Index read function `index_seasonal_calendar()` | **S** | Blocked on INDEX-SPEC.md landing its access model; stub the fn, wire when spec freezes |
| [A]→[V] verification pass (10 rows: FAR, NZSCA, B+LNZ, NZKGI, NZAPI, NZ Winegrowers, Seafood NZ, Summerfruit NZ, DairyNZ workforce) | **S–M** | Desk research; can trickle post-launch since [A] rows are display-only |

Total: one focused build phase (~M overall). No Edge Functions, no new external services, no new dependencies.

### Not in this build

- AU/UK seed data (schema-ready only, §7)
- Weather/NIWA or payout-forecast signals adjusting windows (calendar is static reference; actuals correlation is the adaptive layer)
- ML/statistical forecasting from historical leads (needs ≥1 full year of actuals first)
- Public-facing seasonal content pages / programmatic SEO off this data (real option later; it's the Index's public surface first)
- Push notifications / email alerts (founder-pull via Daily Briefing is the solo-founder-correct amount of automation)
- Week-level timing precision or per-farm calendars
- A `leads.sector` column + proper sector attribution (waits for the platform role/sector canon — Audit §2.1)
- Any change to matching, jobs, or seeker surfaces — this is admin + GTM only

---

## 9. Sources index

DairyNZ (calving pattern; autumn management; InCalf) · agscience.org.nz / Federated Farmers / DairyNZ (Moving Day, 1 June) · Te Ara Encyclopedia (sheep farming year; arable farming; kiwifruit production year; Marlborough yearly cycle; aquaculture) · The Sheep Shearer / Te Papa (main shear) · Tararua Vets + NZ Herald (pre-lamb shearing) · NZKGI + Zespri (kiwifruit harvest, workforce ~20,000+) · NZ Apples & Pears via NZ Herald + NZ Pocket Guide (pipfruit harvest, regional split) · NZ Winegrowers nzwine.com (vintage 2026 release, earliest-ever start) · Apiculture NZ + Waikato DBA (beekeeping season) · Forestry Careers NZ + NZFFA (winter planting) · NIWA / MPI (Bluff oyster season 1 Mar–31 Aug) · Aquaculture NZ (year-round mussels/salmon). Full URLs inline in §3.

To-confirm list (the [A] rows' named authorities): FAR (arable harvest window), NZ Shearing Contractors' Assn (crew-demand months), Beef+Lamb NZ (docking; regional lambing calculator), NZKGI (pruning/thinning months), NZAPI (pruning/thinning months), NZ Winegrowers / Wine Marlborough (winter pruning), DairyNZ workforce (pre-Moving-Day hiring seasonality), Summerfruit NZ (cherry window), Seafood NZ / MPI (hoki winter season).
