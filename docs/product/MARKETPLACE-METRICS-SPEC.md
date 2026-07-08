# TopFarms — Marketplace Metrics Spec (marketplace health, not ops)

> **Status:** SPEC — Stage-2 remediation deliverable, 2026-07-08. Closes Operating Audit gap #128
> ("admin analytics measures ops, not marketplace health" — `.planning/audits/TopFarms_Operating_Audit_2026-07-08.md`).
> **North Star source of truth:** `.planning/NORTH-STAR.md` (DECIDED). This doc specifies *measurement*, not targets — where a target appears here it is copied from or derived under the North Star doc and labelled.
> **Rule of the house:** extend the existing `admin_analytics_*` / `admin_get_*` family (migrations 023/034/039/042/050/051/052) — do not duplicate it. Same discipline: SECURITY DEFINER, `SET search_path = public`, `PERFORM public._admin_gate()` first line, jsonb aggregates out, no PII, `REVOKE FROM PUBLIC, anon` + `GRANT authenticated`, CHECK constraints not native enums.
> Labels: **[V]** verified in code · **[MODELLED]** derived numbers, tunable · **[OPINION]** design judgement.

---

## 0. What exists vs what this adds

| Existing surface | Migration | Covers |
|---|---|---|
| `admin_analytics_funnel(p_from, p_to)` | 039 | signup→onboarded→applied/posted→hired counts per side; pipeline snapshot; `placements_confirmed` |
| `admin_analytics_cohorts()` | 039 | retention proxies (sign-in recency + action-in-month) |
| `admin_analytics_match_quality()` | 039 | score-band × hire outcome, mean hired vs declined — **this IS the Quality/match metric; reuse, don't rebuild** |
| `admin_analytics_revenue(p_from, p_to)` | 039 | listing fees by month/tier; placement fees by month/region/tier; unconfirmed pipeline $ |
| `admin_analytics_leads()` | 042 | lead counts by status/type, conversions |
| `admin_get_daily_briefing()` | 023/050 | ops KPI cards + prior-day deltas |
| `admin_get_signups_trend(p_days)` | 051 | 14-day signup series |
| `admin_get_placements_summary()` | 052 | in-flight/overdue/pipeline-$ placement KPIs |
| `admin_skill_coverage()` | 034/035 | supply vs demand per skill — the only supply/demand surface today [V] |

All of the above is **ops instrumentation**: it answers "is the machine running", not "is the marketplace healthy". What's missing (and specified below): North Star tracking, the liquidity gate, velocity, fill/repeat rates, unit economics, and facet-level supply/demand balance (Platform Audit AD-2).

**New objects, total:** 2 small tables (`founder_activity_log`, `application_status_history` + trigger), 5 RPCs (`admin_metrics_*` — new prefix keeps them distinguishable from the 039 family while inheriting the same pattern), 1 dashboard panel section. Nothing else.

---

## 1. Slice dimensions — designed once, used everywhere

Every new RPC in this spec returns rows keyed by:

| Key | Today | Expansion path |
|---|---|---|
| `region` | `jobs.region` / `seeker_profiles.region` / `employer_profiles.region` (free text, 16-region vocab — Platform Audit §1 notes no CHECK) [V] | tighten via shared `normalise_region()` when MA-2 lands |
| `country` | emitted as the constant `'NZ'` | becomes a real column when AU opens (`.planning/NORTH-STAR.md` locked path NZ→AU→UK); dashboard contract already carries it, so expansion is a data change, not an interface change |
| `vertical` | `jobs.sector` where a job is in scope (CHECK-constrained, incl. `mixed/other` [V]); constant `'dairy'` for seeker-side counts until `seeker_profiles` grows a sector answer worth trusting | vertical N+1 is gated behind the liquidity bar anyway (NORTH-STAR.md) |

**[OPINION]** No `p_country`/`p_vertical` parameters yet — YAGNI; filtering one country's rows client-side is free. The *output columns* are the contract worth pre-paying for.

---

## 2. The metrics

### 2.1 North Star — verified placements/month · effort: S

| Metric | Computation | Target | Slices |
|---|---|---|---|
| **Verified placements/month** | `count(*) FROM placement_fees WHERE confirmed_at IS NOT NULL GROUP BY date_trunc('month', confirmed_at)` — the event is `confirmed_at` being set via `create-placement-invoice` (NORTH-STAR.md; table in `001:227-237` [V]) | 90-day: "first verified placements invoiced LIVE" [MODELLED — NORTH-STAR.md operating targets] | region via `employer_profiles.region` join (039 revenue RPC already does this join [V]); country/vertical per §1 |
| **Input proxy: revenue conversations/week** (headline while placements ≈ 0) | `count(*) FROM founder_activity_log WHERE kind = 'revenue_conversation' GROUP BY date_trunc('week', occurred_on)` | ≥10/week [MODELLED — Operating Audit wk-2 habit: "first 10 outreach touches"; audit §266 names weekly revenue-conversation count as the one headline habit] | side (`counterpart_side`), region (free text, optional) |

**Why a new `founder_activity_log` table rather than reusing leads outreach counts [OPINION, justified]:** `leads.outreach_status` (`047`) counts *pipeline* sends/responses — but a revenue conversation is broader than a Lane-A/B outreach touch: a phone call at a field day, a referral chat, a pricing conversation with an existing employer none of which have a `leads` row. Counting only pipeline touches would systematically undercount the exact behaviour the audit says to headline; counting `outreach_status='responded'` would double-count once a lead converts. One tiny founder-writable table keeps the number honest and joinable. The outreach counts stay what they are: a *pipeline diagnostic* (already surfaced by `admin_analytics_leads()`), not the headline.

```sql
-- ~30 lines, CHECK style, no native enums (house rule)
CREATE TABLE public.founder_activity_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_on      date NOT NULL DEFAULT current_date,
  kind             text NOT NULL CHECK (kind IN ('revenue_conversation', 'spend')),
  counterpart_side text CHECK (counterpart_side IN ('employer', 'seeker', 'partner', 'other')),
  region           text,                 -- optional, free text now, normalise later
  amount_nzd       int,                  -- only for kind='spend'
  lead_id          uuid REFERENCES public.leads(id) ON DELETE SET NULL,  -- optional link, no double-count logic needed: this table IS the count
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.founder_activity_log ENABLE ROW LEVEL SECURITY;
-- no policies: write via one admin_log_activity() definer RPC (023 pattern), read via admin_metrics_north_star()
```

The `'spend'` kind exists so CAC (§2.5) has a source the day paid spend starts — one column, not a second table.

### 2.2 Liquidity — the ≥15 / ≥150 gate · effort: S

| Metric | Computation | Target | Slices |
|---|---|---|---|
| Active listings / region | `count(*) FROM jobs WHERE status = 'active' GROUP BY region` (status vocab `draft/active/paused/filled/expired/archived`, `006:12` [V]) | **≥15** per region (NORTH-STAR.md, LOCKED #3) [MODELLED, tunable only in NORTH-STAR.md] | region, country, vertical (`jobs.sector`) |
| Open-to-work seekers / region | `count(*) FROM seeker_profiles WHERE open_to_work AND onboarding_complete GROUP BY region` (`open_to_work bool` `001:69`; `onboarding_complete` `009:13` [V]). The `onboarding_complete` clause matters: `open_to_work` defaults `true`, so raw counts would flatter [V] | **≥150** per region | region, country (vertical: constant per §1) |
| Ratio | seekers ÷ listings per region | ~10:1 implied by the gate; watch, don't target [OPINION] | region |
| **Gate progress** | both counts ÷ their bar, per region; a region is `live` when both ≥ 1.0 | first region live ≈ v2.1 Phases 24–26 unlock (NORTH-STAR.md resolves `ROADMAP.md:489` "N TBD") | region |

The gate-progress widget (§4) is the one piece of this spec the founder should see daily. Do not open region/vertical/country N+1 until the current one clears the bar — the RPC exists to make that rule impossible to fudge.

### 2.3 Velocity — time-to-placement · effort: S (enabler) + S (RPC)

**The honest gap [V]:** `applications` has no status-transition history — only `created_at` (`001:196`); the June analytics design explicitly deferred `application_status_history` as a write path (`.planning/PHASE-ANALYTICS-DESIGN.md` §2.1 "Known gap (deferred, do NOT build now)"). That deferral was correct for a read-only phase; this spec is the decision that un-defers it. Until it lands, velocity is **not computable** and the panel must say so rather than fake it.

**Enabler — `application_status_history` + trigger (S):**

```sql
CREATE TABLE public.application_status_history (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text NOT NULL CHECK (to_status IN ('applied','review','interview','shortlisted','offered','hired','declined','withdrawn')),  -- mirrors 009:33
  changed_at     timestamptz NOT NULL DEFAULT now(),
  changed_by     uuid  -- auth.uid(); NULL for system writes
);
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
-- no policies (definer-read only); AFTER UPDATE OF status trigger on applications
-- writes one row per transition; backfill: none possible, series starts at deploy. Say so in the UI.
```

| Metric | Computation | Target | Slices |
|---|---|---|---|
| Time-to-placement | per hired application: `hired_at` (first `application_status_history.changed_at WHERE to_status='hired'`) minus **job activation** = `listing_fees.paid_at` (stripe-webhook activates the job on payment: `status='active', expires_at=+30 days`, `stripe-webhook/index.ts:121-125` [V]); fallback `jobs.created_at` for unpaid/UAT listings | median ≤ 21 days [MODELLED — placeholder; calving-calendar seasonality will swamp this number twice a year, so report p50/p90, never a mean] | region, month, vertical |
| Time-in-stage | deltas between consecutive history rows per application | none yet — diagnostic | stage |

### 2.4 Quality · effort: S

| Metric | Computation | Target | Slices |
|---|---|---|---|
| Fill rate | `count(jobs WHERE status='filled') / count(jobs WHERE status <> 'draft')` over jobs *activated* in the window (via `listing_fees.paid_at`, fallback `created_at`) — job-level, unlike 039's funnel which counts distinct *employers* [V] | ≥50% of paid listings filled within their 30-day life [MODELLED] | region, month, tier (`listing_fees.tier`), vertical |
| Repeat-employer rate | employers with ≥2 confirmed placements ÷ employers with ≥1, from `placement_fees` grouped by `employer_id` | ≥30% by month 12 [MODELLED — NORTH-STAR.md quality stack] | region |
| Match-score band × hire outcome | **exists — `admin_analytics_match_quality()` (039) [V]**: bands `<50/50-69/70-84/85+/unscored`, placement rate per band, low-N warning under 30 completed. Reference it in the Marketplace panel; build nothing | 85+ band should out-place 50-69 band; if it doesn't, the scoring weights are wrong — this is also the metric the match-evals harness (`docs/product/MATCH-EVALS-SPEC.md`) protects | band |

### 2.5 Economics · effort: S (composition; no new RPC)

Pre-revenue honesty first: every number here is ~0 or undefined until PEND-01 (live Stripe) closes and placements confirm. Build the *formulas* into the panel, render zeros with the 039-style "pre-launch" caption — no fake data (established pattern, `AdminAnalytics.tsx` revenue panel [V]).

| Metric | Computation | Measurable today? | Slices |
|---|---|---|---|
| Blended fee/placement | `admin_analytics_revenue()` placement-fee `total_nzd` ÷ `admin_metrics_north_star()` placement count, same month — client-side division of two existing RPC outputs; **no new RPC** [OPINION: a division doesn't need a definer function] | yes (will be 0/0 → render "—") | month, region, `fee_tier` |
| CAC per side | (`founder_activity_log` `kind='spend'` `amount_nzd` sum + imputed founder hours — hours are NOT logged per-side today, so pre-spend CAC is **imputed, labelled [MODELLED]**, not computed) ÷ new onboarded users per side (`admin_analytics_funnel` onboarded counts [V]) | spend: yes once logged; founder time: only as a stated assumption. Be honest: until there's paid spend, CAC is a modelling exercise, and the panel should show the spend-based number only | side, month |
| LTV per side | employer: blended fee × placements per employer per year × retention years — all three factors currently unmeasured; seeker: $0 direct (seekers don't pay) | **no — deliberately not built** (§6). The inputs (repeat rate §2.4, blended fee) are built; compose LTV in `docs/commercial/PRICING-MODEL.md` when repeat-rate data exists | — |
| Contribution margin/placement | blended fee − direct costs/placement (Stripe fees ~2.9% + Claude API cents/match + Resend cents — near-zero COGS per NORTH-STAR.md capital posture) | yes, as formula with [MODELLED] cost constants in the panel | month |

### 2.6 Supply/demand balance per facet (Platform Audit AD-2) · effort: M

Generalises the `/admin/skills` pattern (`admin_skill_coverage`, 034/035 [V]) to the collision facets the demand-signal study surfaced (Platform Audit §3.4 AD-2, §2.4):

| Facet | Supply side (seekers) | Demand side (jobs) | Why |
|---|---|---|---|
| Visa / RTW | `visa_status IN ('working_holiday','needs_sponsorship')` (vocab per 057 CHECK [V]) | `visa_sponsorship = false` (`001:122` [V]; refine with `accredited_employer` when EM-3 lands) | the study's key structural mismatch: 6 migrant seekers × 6 visa-gated farms (Combined Data §4) |
| Dogs / pets | `pets` jsonb non-empty (proxy until SK-3 `has_working_dog` lands — label as proxy in output) | `accommodation->>'pets' <> 'true'` (proxy until EM-2 `dog_policy`) | hard veto axis (E10 "NO dogs") |
| Accommodation | `accommodation_needed = true` | `accommodation->>'available' = 'true'` | supply-heavy per study; watch for inversion |
| Couples | `couples_seeking = true` | `couples_welcome = true` | match-limiting when unbalanced |

Each facet returns `{facet, region, country, vertical, supply_n, demand_n, note}` — counts only, per region. Proxy-based rows carry a `note` so nobody mistakes a jsonb sniff for a structured field. When the MA-1 gate fields land, swap the proxies in this one RPC and the dashboard doesn't change.

---

## 3. RPC inventory

New family prefix `admin_metrics_*`, byte-for-byte 039 discipline (gate-first definer, pinned search_path, STABLE where read-only, jsonb out, aggregates only, REVOKE PUBLIC/anon + GRANT authenticated — the posture `tests/admin-analytics-rpcs.test.ts` pins statically [V]; extend that test's RPC list).

| RPC | Signature | Serves | Effort | Notes |
|---|---|---|---|---|
| `admin_metrics_north_star` | `(p_months int DEFAULT 12) RETURNS jsonb` | §2.1 monthly placement series + weekly conversation series | S | needs `founder_activity_log` |
| `admin_log_activity` | `(p_kind text, p_side text, p_region text, p_amount_nzd int, p_lead_id uuid, p_note text) RETURNS jsonb` | §2.1 write path | S | the one write RPC; audit-logs via existing `admin_audit_log` (023) pattern [OPINION] |
| `admin_metrics_liquidity` | `() RETURNS jsonb` | §2.2 per-region counts + ratio + gate progress vs 15/150 | S | gate numbers hard-coded as constants with a comment pointing at NORTH-STAR.md — one place to tune, and it's not this function's callers |
| `admin_metrics_velocity` | `(p_from date DEFAULT NULL, p_to date DEFAULT NULL) RETURNS jsonb` | §2.3 p50/p90 time-to-placement, time-in-stage | S | **blocked on `application_status_history`** (S enabler, same migration) |
| `admin_metrics_quality` | `(p_from date DEFAULT NULL, p_to date DEFAULT NULL) RETURNS jsonb` | §2.4 fill rate + repeat-employer rate | S | match bands stay in 039's `admin_analytics_match_quality` |
| `admin_analytics_balance` | `() RETURNS jsonb` | §2.6 facet supply/demand | M | keeps the audit's AD-2 name; `admin_analytics_` prefix because it is a 039-family aggregate |

Economics (§2.5) is deliberate composition of `admin_analytics_revenue` + `admin_metrics_north_star` + `founder_activity_log` spend rows — no dedicated RPC.

**Migration shape:** one migration (058-style) for the two tables + trigger + write RPC; one for the read RPCs. Studio-apply per house rules; verify via `pg_proc`/`pg_trigger`, not the Studio banner (`.planning/` memory: silent partial paste).

---

## 4. Dashboard — "Marketplace" panel on `/admin/analytics`

Extend `src/pages/admin/AdminAnalytics.tsx` (existing `Panel` wrapper + `Card`/`BarChart` from `src/components/tremor/` [V]) with a **Marketplace** section *above* the existing ops panels — health outranks ops:

1. **North Star card** — big number: verified placements this month; sub-line: conversations/week trend (the proxy headline while the big number is 0). Tremor `AreaChart` for the monthly series. (S)
2. **Liquidity gate widget** — per-region: two progress bars (listings/15, seekers/150), region row goes green when both clear. This is the "do not open N+1" enforcement surface. (S)
3. **Velocity card** — p50/p90 time-to-placement; renders "not yet measurable — history starts <deploy date>" until `application_status_history` has hired rows. (S)
4. **Quality card** — fill rate + repeat-employer rate; link to the existing match-quality panel rather than duplicating its bands. (S)
5. **Economics card** — blended fee, contribution margin formula, spend-based CAC; pre-launch caption while zeros. (S)
6. **Balance table** — facet × region supply/demand counts, proxy rows flagged. (M, ships with `admin_analytics_balance`)

**Refresh cadence [OPINION]:** live on page load, like every existing panel — the RPCs are STABLE count/sum aggregates over tables currently holding tens of rows; caching would be over-engineering today. When row counts make any of these slow (>500 ms), the escape hatch already exists in-schema: `admin_metrics_cache` (023:64 [V], currently unused). Note it; don't wire it.

---

## 5. Effort summary

| Component | Effort |
|---|---|
| `founder_activity_log` + `admin_log_activity` + `admin_metrics_north_star` | S |
| `application_status_history` + trigger (velocity enabler) | S |
| `admin_metrics_liquidity` + gate widget | S |
| `admin_metrics_velocity` + card | S |
| `admin_metrics_quality` + card | S |
| Economics composition + card | S |
| `admin_analytics_balance` + table | M |
| Test extensions (posture tests per RPC, PII-shape, gate-contract — copy `tests/admin-analytics-rpcs.test.ts`) | S |

Everything S is a day-scale piece in the established pattern; the only M is balance because it touches four facets with proxy logic that must be labelled and later swapped.

## 6. What we deliberately don't measure yet

- **True retention curves** — `analytics_events` has zero rows ever [V, PHASE-ANALYTICS-DESIGN §2.2]; instrumenting a client event stream is a write-path project with privacy surface. The 039 cohort proxies are enough until there are cohorts worth curving.
- **LTV** — needs repeat-rate and fee data that don't exist pre-revenue; a modelled LTV on zero placements is fiction. Formula documented (§2.5), computed when inputs are real.
- **Founder-time CAC allocation** — logging hours per side is process overhead the operator won't sustain [OPINION]; spend-based CAC only.
- **DAU/MAU, sessions, page analytics** — vanity at current N; nothing prioritisable hangs off them.
- **NPS / satisfaction surveys** — premature before ~25 employers; the repeat-employer rate is the behavioural version.
- **Marketing attribution** — no paid channels live; revisit at first spend.
- **Seeker-side monetisation metrics** — seekers don't pay (PRD); nothing to measure.

Each of these gets promoted only when its input event stream exists and someone names a decision it would change.
