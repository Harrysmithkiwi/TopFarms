# TopFarms — Platform Audit: Demand-Signal Study vs Live Codebase (Canonical)

> **Status:** CANONICAL · **Compiled:** 2026-07-08 · **Voice:** internal, plain.
> **Authoritative live source:** `supabase/migrations/` (001–056) + `supabase/functions/` + `src/`. Code wins on any detail; this doc is a map, not a second copy.
> **Input hypothesis (validated against code, NOT treated as ground truth):** [`TopFarms_Master_Report.md`](./TopFarms_Master_Report.md) + [`TopFarms_Combined_Data.md`](./TopFarms_Combined_Data.md) — 35 seeker posts + 12 employer listings, five NZ dairy/farming FB groups, Feb–Jul 2026.
> **Respects:** PRD phase model + non-goals ([`PRD.md`](./PRD.md) §8), v2.1 scoping (`.planning/v2.1-MILESTONE-SCOPING.md`), v2.2 live milestone (`.planning/REQUIREMENTS.md`).
> **Sample caveat (load-bearing):** n ≈ 47, dairy-skewed, five groups. Directional, not representative. Every enum and field proposed below is an **additive, migration-safe** hypothesis to validate on a larger pull — not a schema commitment. Do not hard-code value sets from 47 rows.

This audit proposes; it does not implement. No migrations, Edge Function code, or UI code were written. Every artefact a follow-up would touch is named. Where the study over-reaches given the sample, that is called out inline.

---

## 0. How to read this

**Priority labels** are anchored to the real product state — v1.0/v1.1 and v2.0 shipped and launched; v2.1 Phase 23 shipped, Phases 24–26 gated behind real ag-employer liquidity; v2.2 (leads acquisition + admin ops) is the live milestone (Phase 27 shipped, Phase 28 in progress):

- **Now** — MVP-safe: additive and migration-safe, ships into the launched product without breaking existing flows. Column adds with defaults, gate logic inside the existing scoring function, read-only analytics.
- **v2.1 / v2.2** — fits an active or adjacent milestone. Admin analytics and lead tooling map to v2.2 admin-ops; taxonomy/farm-profile depth maps to the v2.1 lineage.
- **Growth / gated** — needs real liquidity (per the v2.1 gate) or brushes a PRD non-goal; defer deliberately.

**"Artefact"** = the concrete thing a follow-up edits: a migration (schema/RPC), an Edge Function, a React component, or a dashboard RPC+view.

**One structural fact up front:** the schema has **zero native Postgres `ENUM` types**. All controlled vocabulary is either a `CHECK (col IN (…))` on a `text` column or an unconstrained `text[]`. Several fields the UI renders as dropdowns are stored as **free text with no DB constraint** — so "the UI looks structured" and "the value is controlled" are different questions throughout.

---

## 1. As-is inventory — what exists today

### 1.1 Seeker profile fields (`seeker_profiles`; onboarding `src/pages/onboarding/SeekerOnboarding.tsx`)

| Signal | Column | Storage | UI control | Structured? |
|---|---|---|---|---|
| Role sought | `role_type_pref text[]`, `sector_pref text[]` | `001:56-57` | ChipSelector multi | Array, **no DB vocab** |
| Experience | `years_experience int`; `dairynz_level` CHECK; `herd_sizes_worked text[]`; `shed_types_experienced text[]` | `001:58`, `009:15,21-22` | number + dropdown + checkbox lists | Mixed; buckets/sheds unconstrained |
| Shed/system pref | `shed_types_experienced text[]` | `009:21` | checkbox list | Array, no CHECK; **no farm-system field** |
| Region/location | `region text`, `preferred_regions text[]` | `001:54`, `013:79` | ChipSelector (8 regions) | **Free text** + array |
| Mobility | `open_to_relocate bool` | `001:55` | **none** | Structured but **collected on no step** |
| Availability | `availability_date date`, `notice_period int`, `notice_period_text text` | `001:66-67`, `013:80` | date + dropdown | Structured (+ redundant free-text twin) |
| Roster/hours | — | — | — | **Absent** |
| Accommodation need | `accommodation_needed bool`, `housing_type_pref text`, `housing_sub_options text[]` | `001:59-60`, `013:78` | Toggle + ChipSelector | Bool + array; **no bedroom count** |
| Circumstances | `couples_seeking bool`; `family jsonb`; `pets jsonb` | `001:61-63` | Toggle + text | Couple bool; kids/pets **JSON blobs** |
| Visa/residency | `visa_status text` | `001:64` | dropdown (5 vals) | **Free text — no CHECK** despite scoring reading magic values |
| Vehicle/licence | `licence_types text[]`, `certifications text[]` | `013:76-77` | ChipSelector | Arrays, no CHECK |

Editing note: there is **no standalone profile-edit page**. Editing means re-entering onboarding, but `SeekerOnboarding.tsx:70` redirects completed users to the dashboard — so **post-onboarding editing is effectively unavailable**.

### 1.2 Job / employer-profile fields (`jobs` + `employer_profiles`; wizard `src/pages/jobs/PostJob.tsx`, employer onboarding `EmployerOnboarding.tsx`)

| Signal | Column | Storage | UI control | Structured? |
|---|---|---|---|---|
| Role offered | `jobs.role_type text`, `seniority_level text` | `001:111`, `013:57` | dropdowns | **Free text — no CHECK** |
| Herd size | `jobs.herd_size_min/max int`; `employer_profiles.herd_size int` | `001:115-116` | number inputs | Structured (raw ints, not buckets) |
| Shed type + size | `shed_type text[]` | `001:114` | ChipSelector | Array, no CHECK; **no shed-size field** |
| Farm system 1–5 | — | — | — | **Absent** |
| Calving pattern | `jobs.calving_system text` | `013:52` | dropdown (`CALVING_SYSTEM_OPTIONS`) | **Free text stored** — dropdown, no CHECK |
| Farm tech / automation | — | — | — | **Absent** |
| Effective ha | `jobs.farm_area_ha int`; `employer_profiles.property_size_ha int` | `013:53`, `004:29` | number | Structured |
| Region | `jobs.region text` | `001:113` | dropdown (16 regions) | **Free text** |
| Roster (+ calving variant) | `jobs.weekend_roster text`, `hours_min/max int`, `on_call_allowance bool` | `013:62-64` | dropdown + numbers | Roster **free text**; **no calving-period variant** |
| Accommodation offered | `jobs.accommodation jsonb` (keys available/pets/couples/family/utilities); `employer_profiles.accommodation_type text`, `accommodation_extras text[]` | `001:121`, `013:19` | Toggle + dropdown + ChipSelector | JSON/array; **no bedroom count** |
| Pay | `salary_min/max int`, `pay_frequency text`, `benefits jsonb` | `001:117-118`, `013:60` | numbers + dropdown | Structured |
| Experience required | `jobs.min_dairy_experience text` | `013:56` | dropdown | **Free text** |
| Right-to-work / accreditation | `jobs.visa_sponsorship bool`, `visa_requirements text[]` | `001:122`, `013:59` | Toggle + ChipSelector | Bool + array, **no CHECK on the array** |
| References | — (only `seeker_documents.document_type='reference'`, `019:48`) | — | file upload | **Absent as a job field** |
| Dog/pet policy | only `jobs.accommodation->>'pets'` | `001:121` | checkbox | **No structured column** |
| Progression/mentoring | `employer_profiles.career_development text[]` | `013:15` | ChipSelector | Array; **on employer profile, not on the job** |
| Couple/partner work | `jobs.couples_welcome bool`; `employer_profiles.partner_role text` | `001:123`, `013:18` | Toggle + dropdown | Bool + free text |
| Start timing | `jobs.start_date date` | `001:120` | date | Structured |

### 1.3 Skills taxonomy (`skills` / `job_skills` / `seeker_skills`; rebuilt in migration 034)

- **Controlled vocabulary, deliberately broad.** 24 competencies across 6 CHECK-constrained categories (`034:78-86`): livestock (5), cropping_agronomy (4), machinery_equipment (4), farm_operations_infrastructure (4), management_business (4), cross_cutting (3). `sector` CHECK dropped; `discipline` added for future verticals.
- Junctions: `job_skills.requirement_level` CHECK `required|preferred` (`001:152`); `seeker_skills.proficiency` CHECK `basic|intermediate|advanced` (`009:44`).
- One shared UI: `src/components/ui/SkillsPicker.tsx` drives both sides. Free-text skills are not possible.
- **Design intent (respect this):** granular detail "lives in job descriptions, not the taxonomy" (`v2.1-MILESTONE-SCOPING.md`, Phase 23). The taxonomy is intentionally coarse.

### 1.4 Match-score inputs & weights (`compute_match_score`, migration `009:113-334`; precompute `010`)

100% deterministic PL/pgSQL. Claude writes prose only, never the number. Six weighted dimensions (sum 100) + a bonus + a recency multiplier:

| Dimension | Max | Logic | Line |
|---|---|---|---|
| Shed type | 25 | array overlap 25; rotary↔herringbone crossover 10 | `009:167-181` |
| Location | 20 | same region 20; `open_to_relocate` 16; adjacent 12 | `009:190-198` |
| Accommodation | 20 | not-needed 20; needed+available base 10 + pets/couples/family/utilities sub-scores | `009:205-232` |
| Skills | 20 | required-match ratio ×20 + preferred at 60% | `009:238-270` |
| Salary | 10 | job max ≥ seeker min = 10; proportional decay | `009:275-289` |
| Visa | 5 | citizen/PR = 5; needs-sponsorship **and** job sponsors = 5; else 0 | `009:294-300` |
| Couples bonus | +5 | both sides couple-friendly | `009:305-307` |
| Recency | ×1.1 | jobs < 7 days old, capped 100 | `009:317-319` |

Trigger-maintained (`010`), sector-scoped precompute, nightly 03:00 UTC recompute, cleanup on non-active status (`027`). Front-end reads scores and **sorts client-side**; unscored (cross-sector) jobs sink to the bottom but are **never excluded** (`src/pages/jobs/JobSearch.tsx:401-406`). Display: `MatchBreakdown.tsx`, `MatchCircle.tsx`.

**The finding that anchors §3's match work: there are NO hard gates today.** Visa is a soft 5/100; dog policy a +3 accommodation sub-score; sole-charge and experience-threshold are **not in scoring at all**. Region matching is **exact string equality** plus a hardcoded 16-region adjacency CASE (`get_adjacent_regions`, `009:77-105`) — **no `normalise()` / canonicalisation** in the match path (region canon *does* exist, but only inside the leads Edge Functions, duplicated).

### 1.5 Search filters (`src/components/ui/FilterSidebar.tsx` → `JobSearch.tsx`)

Structured facets: role type (checkbox — **value set differs from the job-post role dropdown**), shed type, region, contract type, salary slider, herd-size buckets, accommodation (house/cottage/pet_friendly/couples/family), visa sponsorship (boolean only), DairyNZ level, plus a keyword box. **No experience/seniority facet.** Seeker/candidate search: **none for employers** — admin-only `SeekerList.tsx` with a free-text name/email box. `saved_searches` (024) stores the whole filter set as **one opaque URL string**, not per-filter columns.

### 1.6 Onboarding steps

- **Seeker:** 7 steps (farm type → experience/shed/herd → quals/licence/certs/docs → skills → life-situation → visa → complete).
- **Employer:** job wizard 8 steps (basics → farm details → skills/experience/visa → compensation → description → preview → payment → success) + a separate farm/company onboarding (`EmployerOnboarding.tsx`) carrying progression, partner-role, accommodation extras, vehicle.

### 1.7 Admin / founder dashboard views (`src/main.tsx:281-420`, `AdminSidebar.tsx`)

`/admin` Daily Briefing (KPI cards + 14-day signups + alerts + email + revenue), `/admin/analytics` (funnel, cohorts, match-quality, revenue, leads — all aggregates, RPCs in migration 039), `/admin/skills` supply-vs-demand per competency (`admin_skill_coverage`, 034/035 — **the only supply/demand surface today**), `/admin/employers`, `/admin/seekers`, `/admin/documents` (doc-verification queue, 032/033), `/admin/jobs`, `/admin/placements` (052), and three leads views (`/admin/leads/staging`, `/outreach`, `/leads`).

### 1.8 Leads pipeline stages (migrations 041–056; `lead-intake` + `lead-harvest`)

```
adapter → _lead_intake() [suppression → dedupe → stage] → lead_staging
        → admin_lead_approve (human gate) → leads → conversion-suggest / link-user
```
- **`lead_staging` is thin:** all parsed fields live in one `structured jsonb` blob (`041:57`); typed columns appear only after approval on `leads`.
- **Two parsers:** `lead-intake` (Claude Haiku, messy FB posts, **bi-directional** employer|seeker) extracts role, region+locality (canonicalised), herd, shed, contact, application-method (`lead-intake:403-424`); `lead-harvest` (Firecrawl, boards, **employer-only** by decision) extracts business/role/region/salary/contact.
- **Contact capture:** explicit-only, with an email/phone regex backstop (`lead-intake:78-98`); presence drives Lane A (contactable) vs Lane B (FB outreach).
- **Dedup:** URL + `name|region|type` fingerprint + `pg_trgm ≥ 0.6` fuzzy (`041:117-150`).
- **Lifecycle:** `leads.status` new/contacted/onboarded/dead/follow_up; `category` domestic/overseas; `outreach_status` none→drafted→approved→sent→responded.

---

## 2. Gap analysis

Classification: **✅ Already** / **◐ Partial** (exists but wrong shape) / **✗ Missing** / **⤵ Defer** (real signal, but Growth-phase or PRD non-goal). Evidence column cites the study; the artefact column names what a follow-up changes.

### 2.1 Seeker surface

| Signal | Study evidence | Current platform | Class | Artefact |
|---|---|---|---|---|
| Role sought | Farm Assistant 37%, relief, 2IC, calf rearer | `role_type_pref text[]`, no vocab | ◐ | migration (CHECK/lookup) + onboarding + `domain.ts` |
| Experience (years + level) | most-stated attribute | `years_experience int` + `dairynz_level` | ✅ | — |
| Shed preference | 23% name herringbone/rotary | `shed_types_experienced text[]`, no CHECK | ◐ | migration (CHECK) + shared const |
| Sole-charge willingness | some refuse sole-charge (S05) | **nothing** | ✗ | migration + onboarding step |
| Region (town-level) | towns, not regions | `region` free text + 8-region picker | ◐ | shared region canon + widen picker to 16 |
| Mobility (anywhere/conditional/bound) | 31% anywhere, ~20% bound | `open_to_relocate bool`, **no UI** | ◐ | onboarding step (surface latent field), optionally 3-value enum |
| Roster preference | 20% state roster | **nothing** | ✗ (thin) | migration + onboarding — *low value, see §3* |
| Accommodation need + bedrooms | down to "3-bedroom" (S27) | `accommodation_needed bool` + sub-options; **no bedrooms** | ◐ | migration (`bedrooms_needed`) + onboarding |
| Dog / pets | "comes with stock dog" recurring | `pets jsonb` + `housing_sub_options` working_dogs | ◐ | migration (structured `has_working_dog`) |
| Couple / family | 23% disclose | `couples_seeking bool` + `family jsonb` | ◐ | structure `family` if needed (else keep) |
| Visa / residency | 14% state up front | `visa_status text`, **no CHECK** | ◐ | migration (canonical vocab) |
| Certifications | 31% cite a credential | `certifications text[]` + `dairynz_level` | ✅/◐ | optional CHECK on certs |
| Contact leakage | 26% publish phone/email | n/a (seeker-authored) | ✅ | — |

### 2.2 Employer / job surface

| Signal | Study evidence | Current platform | Class | Artefact |
|---|---|---|---|---|
| Role offered | FA dominant + 2IC/calf/relief | `role_type text`, **no CHECK** | ◐ | migration (CHECK) — align with seeker + search |
| Herd size | 83% state it (200–1250) | `herd_size_min/max int` | ✅ | — |
| Shed type + size | type + bale/aside count | `shed_type text[]`; **no size** | ◐ | migration (`shed_size int`) + CHECK on type |
| Farm system 1–5 | DairyNZ system 4–5 named | **nothing** (only free-text `calving_system`) | ✗ (thin) | migration (`farm_system smallint`) + wizard |
| Calving pattern | spring/autumn/split recur | `calving_system text`, dropdown, **no CHECK** | ◐ | migration (CHECK) — study marked "new"; **it's Partial** |
| Farm tech / automation | 58% name Halter/Protrack/ACR | **nothing** | ✗ | migration (`farm_tech text[]` + vocab) + wizard chips |
| Effective ha | stated (220ha) | `farm_area_ha int` | ✅ | — |
| Region | town-level | `region` free text | ◐ | shared region canon |
| Roster + calving variant | 50%; "6-2 / 6-1 calving" | `weekend_roster text`, **no calving variant** | ◐ | migration (CHECK + `calving_roster`) |
| Accommodation + bedrooms + couple | 83%, to bedroom count | `accommodation jsonb`; **no bedrooms** | ◐ | migration (`bedrooms int`, `accommodation_type` CHECK) |
| Right-to-work / accreditation | 50% visa-gated | `visa_sponsorship bool` + `visa_requirements text[]` no CHECK | ◐ | migration (canonical RTW vocab + `accredited_employer bool`) |
| References required | 25% ask | **nothing on jobs** | ✗ (thin) | migration (`references_required bool`) |
| Dog / pet policy | one hard "NO dogs" | `accommodation->>'pets'` only | ◐→✗ | migration (`dog_policy` enum on jobs) |
| Progression / mentoring | 50% offer | `employer_profiles.career_development text[]` | ◐ | expose on the job (denormalise or join) |
| Couple / partner work | 42% | `couples_welcome bool` + `partner_role text` | ✅/◐ | — |
| Pay band | "depending on experience" | `salary_min/max int` | ✅ | nudge to fill (§3) |
| Start timing | calving-calendar driven | `start_date date` | ✅ | — |
| Non-dairy sub-industries | poultry/egg, sheep/lamb | `sector` CHECK incl. `mixed/other`; taxonomy ag-broad | ✅ | — |

### 2.3 Match engine

| Signal | Study evidence | Current platform | Class | Artefact |
|---|---|---|---|---|
| Right-to-work as **veto** | 14% migrants × 50% visa-gated | soft 5/100, never excludes | ✗ (gate) | `compute_match_score` gate block + `010` |
| Dog policy as **veto** | hard "NO dogs" vs dog-owning seeker | +3 soft sub-score | ✗ (gate) | scoring gate + structured `dog_policy`/`has_working_dog` |
| Sole-charge as **veto** | poultry sole-charge vs refusers | not scored at all | ✗ (gate) | new fields both sides + gate |
| Experience threshold as **veto** | seeker meets/exceeds min | not scored at all | ✗ | **keep as weight, not hard gate** — see §3 caveat |
| Region proximity | town-level, canonicalise | exact string + hardcoded adjacency | ◐ | shared `normalise_region()` used by match path |
| Score is explainable | — | deterministic + Claude prose | ✅ | — |

### 2.4 Admin / founder dashboard

| Signal | Study evidence | Current platform | Class | Artefact |
|---|---|---|---|---|
| Employer-lead queue distinct from seeker queue | two-sided harvest | `leads.type` exists; **one combined list**, no filter | ✗ | `admin_leads_list` type param + route/toggle |
| Supply/demand balance per facet | migrant-seekers vs visa-gated, dog-owners vs no-pet farms | **only skills** (`admin_skill_coverage`) | ✗ | new analytics RPC(s) per facet |
| Farm-profile completeness score | rich profiles convert | only `onboarding_complete bool` | ✗ | RPC computing weighted completeness |
| Demand by role/region, accom rate, RTW rate, tech rate | all supported by data | funnel/revenue only; no facet cuts | ◐ | extend `admin_analytics_*` |
| Doc verification queue | credential badges | shipped (032/033) | ✅ | — |

### 2.5 Lead harvest

| Signal | Study evidence | Current platform | Class | Artefact |
|---|---|---|---|---|
| Structured extraction into staging, both post types | near-symmetric fields | parser is bi-directional; extracts role/region/herd/shed/contact | ✅ (partial fields) | — |
| Extract accommodation / roster / right-to-work / start-timing | volunteered in prose | **absent from parser output** | ✗ | extend `lead-intake` prompt + `structured` keys + `leads` columns |
| Shared parser vocabulary, two routes | employer→list, seeker→profile | parser bi-type, but **routing is employer-only**: Lane-B draft employer-framed, CTA hardcoded `/for-employers`, no `/for-seekers` | ✗ | Edge Fn draft variant + `/for-seekers` + `invite-to-profile`; `preferred_path` already a stub |
| Dedup for seeker reposts AND employer cross-posts | reposts/bumps; Turakina cross-post | name/region/type fingerprint + fuzzy; **no phone key** | ◐ | `contact_phone_norm` dedup key (already designed, unbuilt) |
| Contact capture from in-post leakage | 26%/42% leak | explicit + regex backstop | ✅ | — |

---

## 3. Enhancement roadmap + GAP assessment

Per surface: the change, why the signal justifies it, artefact(s), new vs extension, effort (S/M/L), priority. Privacy/human-approval/compliance for leads is handled and documented separately — not restated here.

### 3.1 Seeker experience

| # | Change | Why (signal) | Artefact(s) | New/Ext | Effort | Priority |
|---|---|---|---|---|---|---|
| SK-1 | Surface the latent `open_to_relocate` on a step; optionally widen to a 3-value mobility enum (anywhere/conditional/region_bound) | 31% anywhere vs ~20% bound — high match value, and location weight already keys off it (`009:194`) | onboarding step + `domain.ts`; migration only if enum | Ext | S | **Now** |
| SK-2 | Add `bedrooms_needed smallint` | seekers specify "3-bedroom" (S27); mirrors employer side for a hard accommodation match | migration + `SeekerStep5` | Ext | S | **Now** |
| SK-3 | Structure dog ownership (`has_working_dog bool`) out of the `pets` JSON | required for the dog veto (§3.3) | migration + onboarding | Ext | S | **Now** |
| SK-4 | Canonical `visa_status` (CHECK) | scoring already reads magic values with no DB guard — a typo silently zeroes the visa dimension | migration + `VISA_OPTIONS` | Ext | S | **Now** |
| SK-5 | Add a sole-charge willingness field | needed for the sole-charge veto; poultry & some dairy are sole-charge by design | migration + onboarding | New | S | **v2.1** |
| SK-6 | Widen region picker 8→16 to match jobs | seeker/job region sets differ, breaking exact-match location scoring | `SeekerStep5` + shared const | Ext | S | **Now** |
| SK-7 | Post-onboarding profile-edit route | editing is effectively unavailable today; every field above is worthless if users can't revise it | new route + reuse wizard | New | M | **Now** (enabler) |
| SK-8 | Seeker roster preference | only 20% state it; sparse | migration + onboarding | New | S | **Growth** — low signal density |

### 3.2 Employer experience

| # | Change | Why | Artefact(s) | New/Ext | Effort | Priority |
|---|---|---|---|---|---|---|
| EM-1 | `role_type` CHECK, aligned across job-post, search filter, and seeker `role_type_pref` | three different value sets today → string-fragile cross-surface matching | migration + `JobStep1` + `FilterSidebar` + `domain.ts` | Ext | M | **Now** |
| EM-2 | `dog_policy` enum on jobs (allowed/not_allowed/negotiable) | one hard "NO dogs" (E10); needed for veto | migration + `JobStep2` | New | S | **Now** |
| EM-3 | Canonical right-to-work: `accredited_employer bool` + CHECK on `visa_requirements` | 50% visa-gated; needed for the RTW veto | migration + `JobStep3` | Ext | S | **Now** |
| EM-4 | `accommodation_type` CHECK + `bedrooms int` on jobs | 83% offer accommodation to bedroom precision; pairs with SK-2 | migration + `JobStep2` | Ext | M | **v2.1** |
| EM-5 | `calving_system` CHECK (the dropdown already exists) | **study marked this "new v2.1" — it's actually Partial**; just constrain storage | migration only | Ext | S | **Now** |
| EM-6 | `farm_system smallint (1–5)` | 58% name system 4–5; thin (n=12) but cheap and additive | migration + `JobStep2` | New | S | **v2.1** |
| EM-7 | `farm_tech text[]` + controlled vocab, as sell-point chips | 58% name Halter/Protrack/ACR; strong employer selling point | migration + `JobStep2` + junction optional | New | M | **v2.1** |
| EM-8 | `shed_size int`; roster CHECK + `calving_roster` variant | shed size + calving-period roster recur | migration + `JobStep2/4` | Ext | M | **v2.1** |
| EM-9 | Expose `career_development` on the job (not just employer profile) | 50% offer progression; seekers actively want it | migration/join + `JobStep` | Ext | M | **v2.1** |
| EM-10 | Pay-band nudge (keep optional) | "depending on experience" hides pay; a nudge, not a requirement | `JobStep4` copy | Ext | S | **Growth** |

### 3.3 Match engine — the gate-vs-weight split

The study's core structural claim is right: right-to-work × dog × sole-charge are **collisions that must veto, not down-weight**, or the engine surfaces impossible matches and erodes trust. Today none of them gate. Recommended split:

- **Hard gates (exclude the pair):** right-to-work (seeker needs sponsorship **and** job is visa-gated/not-accredited/no-sponsorship) and dog policy (seeker `has_working_dog` **and** job `dog_policy = not_allowed`). Both are unambiguous, cheap, and high-trust.
- **Conditional gate:** sole-charge (job sole-charge **and** seeker not willing) — gate only once **both** fields exist; until then, omit rather than guess.
- **NOT a hard gate — keep as a strong weight (study over-reaches here):** experience threshold. Job `min_dairy_experience` is free text and seekers routinely understate ("some", "getting back in"). A hard veto on 47 noisy rows would wrongly exclude trainable candidates the employers themselves invite ("keen to learn ok", E07). Make experience a real scored dimension with a steep penalty below threshold, not an exclusion.

| # | Change | Why | Artefact(s) | New/Ext | Effort | Priority |
|---|---|---|---|---|---|---|
| MA-1 | Add a gate block at the top of `compute_match_score` returning an excluded sentinel (score 0 / null-with-reason) for RTW and dog collisions | trust: never surface impossible matches | migration 009-successor + `010` precompute WHERE + a real filter in `JobSearch.tsx` (which has none today) | Ext | M | **Now** |
| MA-2 | Shared `normalise_region()` used by the match path | match uses exact string + hardcoded adjacency; canon logic already exists but only in leads Edge Fns (duplicated) | migration (function) + call sites | Ext | M | **Now** |
| MA-3 | Turn experience into a scored dimension (steep sub-threshold penalty), reweight | currently unscored; strong signal | migration (scoring) | Ext | M | **v2.1** |
| MA-4 | Sole-charge conditional gate | after SK-5/EM-2-style fields land | migration (scoring) | New | S | **v2.1** |

Reweighting caution: gates change the denominator. When a gate can zero a pair, the remaining weighted dimensions should be documented and the nightly recompute (`010:204`) re-run; keep the 6-dimension display (`MatchBreakdown.tsx`) honest about "excluded" vs "low".

> **Linked correctness gap (tracked): `.planning/DECISIONS-PENDING.md` PEND-02.** Two visa issues sit together and should be decided before `match_scores` repopulates with real seekers: (1) a **NULL `visa_status`** scores `visa=0` even for an actual citizen/PR who left the field blank — fix by requiring `visa_status` when `onboarding_complete = true`, or handling NULL explicitly in scoring; (2) turning the soft 5-pt visa weight into the **hard right-to-work gate** (MA-1 above). The 057 column constraint (`supabase/migrations/057_constrain_visa_status_vocab.sql`) is hygiene only — it prevents off-vocab typos but fixes neither of these.

### 3.4 Admin / founder dashboard

| # | Change | Why | Artefact(s) | New/Ext | Effort | Priority |
|---|---|---|---|---|---|---|
| AD-1 | Employer-lead queue distinct from seeker-lead queue | two-sided harvest; `leads.type` exists but no queue splits on it | `admin_leads_list` type param + route/toggle in `AdminLeads.tsx` | Ext | M | **v2.2** |
| AD-2 | Supply/demand balance analytics per facet (start with migrant-seekers × visa-gated-roles; dog-owners × no-pet-farms) | the key structural mismatch the study surfaces; generalises the existing `/admin/skills` pattern | new `admin_analytics_balance()` RPC + panel in `AdminAnalytics.tsx` | New | M | **v2.2** |
| AD-3 | Farm-profile completeness score | richer profiles convert; nothing measures it (only a bool) | RPC + `EmployerList`/analytics surface | New | S | **v2.2** |
| AD-4 | Demand cuts: role/region, accommodation rate, RTW rate, tech-adoption rate | all computable from data now | extend `admin_analytics_*` (039) | Ext | M | **v2.2** |

These sit squarely in the live v2.2 admin-ops milestone (Phase 28 is already reworking admin UX) — the cheapest place to land them.

### 3.5 Lead harvesting

| # | Change | Why | Artefact(s) | New/Ext | Effort | Priority |
|---|---|---|---|---|---|---|
| LH-1 | **Seeker route: `/for-seekers` + invite-to-profile draft variant** | today a seeker Lane-B lead gets an employer-framed draft pointing at `/for-employers` — a real defect | `lead-intake` draft branch on `type` + new route/page; `preferred_path` stub already present | Ext | M | **v2.2** |
| LH-2 | Extend the parser to emit accommodation / roster / right-to-work / start-timing into `structured` | fields are volunteered in prose but dropped today; feeds pre-fill (LH-4) | `lead-intake` prompt + `structured` keys + `leads` columns | Ext | S–M | **v2.2** |
| LH-3 | `contact_phone_norm` dedup key | catches seeker reposts and employer cross-posts the name/region fingerprint misses; already designed, unbuilt (`INGESTION-ARCHITECTURE.md`) | migration + `_lead_intake` | New | S | **v2.2** |
| LH-4 | Pre-fill onboarding/listing from an approved lead ("confirm, don't type") | both sides already volunteer the structure; turns a scraped post into a profile with minimal typing | onboarding/wizard read from lead + LH-1/LH-2 | New | M | **Growth** |

Non-goal guard: none of this puts scraping inside the public marketplace — it stays in the gated admin track (PRD §5, §8). LH work is admin-facing only.

---

## 4. Shared-vocabulary / enum spec

One controlled vocabulary drives both profile forms, both filter sets, and the match score — the study's central design claim, and the cheapest way to keep the two sides matchable. **All additive and migration-safe** (new CHECK columns default nullable; existing free-text columns get a CHECK only after values are normalised). Treat the value lists as **seed hypotheses from n≈47** — validate on a larger pull before locking.

**Already-controlled (reuse, don't reinvent):** `skills.category` (6), `job_skills.requirement_level`, `seeker_skills.proficiency`, `jobs.contract_type`, `jobs.sector`, `jobs.status`, `seeker_profiles.dairynz_level`, `leads.type|category|status|outreach_status`.

**Propose:**

| Enum | Proposed values | Lands on | Used on each side |
|---|---|---|---|
| `shed_type` | rotary, herringbone, ams (robotic), swing_over, other | `jobs.shed_type[]`, `seeker_profiles.shed_types_experienced[]` (CHECK the array elements) | Seeker: sheds worked. Employer: shed on offer. Match: shed dimension (`009:167`) |
| `farm_system` | smallint 1–5 (DairyNZ System), nullable | `jobs.farm_system`, `employer_profiles.farm_system` | Employer states; seeker optional pref; match weight |
| `roster_pattern` | every_weekend, alternate, one_in_three, occasional, none, other | `jobs.weekend_roster` | Employer states; seeker optional pref; match compat |
| `calving_roster` | standard, calving_variant (+ free note) | `jobs.calving_roster` | Employer only; display + compat |
| `accommodation_type` | house, flat, cottage, unit, room, none | `jobs.accommodation_type`, `employer_profiles.accommodation_type` | Employer offers; seeker need; hard match |
| `bedrooms` | smallint (0–6), nullable | `jobs.bedrooms`, `seeker_profiles.bedrooms_needed` | Both; hard match when seeker needs ≥ N |
| `mobility` | anywhere, conditional, region_bound | `seeker_profiles` (or keep `open_to_relocate bool` + surface it) | Seeker only; drives location weight |
| `right_to_work` (seeker) | nz_citizen, permanent_resident, visa_holder, needs_sponsorship | `seeker_profiles.visa_status` | Seeker states; **gate input** |
| `rtw_requirement` (job) | open, nz_citizen_or_pr, accredited_only, no_sponsorship + `accredited_employer bool` | `jobs.visa_requirements[]`, `jobs.accredited_employer` | Employer states; **gate input** |
| `dog_policy` | allowed, not_allowed, negotiable | `jobs.dog_policy` (+ `seeker_profiles.has_working_dog bool`) | **Gate input** |
| `experience_level` | entry, assistant, experienced, senior, manager | `jobs.min_experience`, derived seeker level from `years_experience`+role | Threshold weight (not hard gate) |
| `farm_tech` | halter, protrack, acr, auto_draft, auto_teatspray, in_shed_feeding, pivot_irrigation, feed_pad | `jobs.farm_tech[]` (or a `farm_tech` lookup + junction) | Employer sell-point; seeker optional pref; weight |
| `role_type` | farm_assistant, relief_milker, calf_rearer, 2ic, herd_manager, farm_manager, other | `jobs.role_type`, `seeker_profiles.role_type_pref[]`, search filter | **Unify all three surfaces**; category match |

Junction vs array: `farm_tech` and `role_type` are the two where a lookup table earns its keep (they'll grow and want display metadata); the rest are fine as CHECK'd `text`/`text[]` to match the schema's existing style (no native enums anywhere).

---

## 5. How the dataset sits in the project

`TopFarms_Combined_Data` (Seekers 35×20, Employers 12×24, Match_Fields, Supply_Demand) should live **in-repo**, versioned, in two roles:

1. **Seed / round-trip reference for the enums** — `research/demand-signal-2026-07/`. Before any enum in §4 is locked, assert the proposed schema **round-trips every row without loss**: each of the 47 records must encode into the proposed columns/enums and read back to the same meaning. Rows that don't round-trip (e.g. a mobility phrase that isn't anywhere/conditional/region_bound) are the signal that the value set is wrong — fix the enum, not the data. This is the cheapest guard against over-fitting a 47-row sample.
2. **Match-engine test fixture** — `fixtures/match/`. The Match_Fields tab already flags the hard-gate pairs; turn a handful of real seeker×employer rows with **known gate collisions** (e.g. S06 Peak-Seasonal migrant × E02 "NZ citizens only"; S12/S19/S21 dog-owner × E10 "NO dogs") into fixtures asserting `compute_match_score` **vetoes** them once §3.3 lands — and that non-colliding pairs still score. This is the regression net for the gate work; without it, a future reweight silently un-gates.

**Ongoing coding template:** the dataset's columns are the human-side mirror of `lead_staging.structured` — same fields (role, region, herd, shed, contact, accommodation, roster, RTW, timing). Keep one column-mapping note so future harvested batches code against the same vocabulary the parser emits (§3.5 LH-2 closes today's gap where the parser drops accommodation/roster/RTW). Version by dated folder (`demand-signal-2026-07/`, next pull `…-2026-10/`) so sample growth is visible and the n is always legible. It stays a **reference/fixture set, not a production table** — it never feeds the live marketplace, only the schema/enum/match work that targets it.

---

## 6. Build next + open questions

### Prioritised build-next (MVP-safe and migration-safe first)

1. **Canonical vocab for the fields scoring already depends on** — `visa_status` (SK-4), `role_type` unified across three surfaces (EM-1), `calving_system` CHECK (EM-5), shed-type CHECK. Pure additive; removes silent scoring failures. *(Now, S–M)*
2. **Shared `normalise_region()` in the match path** (MA-2) + widen seeker regions to 16 (SK-6). Fixes exact-string location scoring. *(Now, M)*
3. **The two clean vetoes** — right-to-work and dog policy — with their supporting structured fields (SK-3, EM-2, EM-3) and the gate block (MA-1), plus the fixture set (§5.2) landing in the same change. *(Now, M)*
4. **Bedrooms both sides** (SK-2/EM-4) and **post-onboarding profile edit** (SK-7, the enabler). *(Now)*
5. **Seeker lead route** (LH-1) + parser field extension (LH-2) + phone dedup (LH-3) — fixes the employer-only routing defect in the live v2.2 milestone. *(v2.2)*
6. **Admin supply/demand facet analytics + employer/seeker queue split + completeness score** (AD-1–4) — into the Phase 28 admin-UX rework. *(v2.2)*
7. **Farm depth** — system 1–5, farm tech, roster variant, progression-on-job (EM-6–9) + experience-as-weight (MA-3). *(v2.1, gated on liquidity)*

### Open questions / risks

- **Small sample (n≈47, dairy-skewed, five groups).** Everything here is directional. The enum **value sets** are the most exposed to this — validate via the round-trip test (§5.1) on a larger, less dairy-heavy pull before locking any CHECK. The **field shapes** (bedrooms exist, RTW gates matter) are safer bets than the specific value lists.
- **Study over-reach, corrected:** calving pattern is Partial not "new" (EM-5); experience is a weight not a hard gate (MA-3 caveat). Farm-system-1-5 and farm-tech are real but thin (n=12 employers) — additive fields, not match gates.
- **Gates change matching math.** A veto that zeroes a pair must be reflected in the nightly recompute (`010:204`), the client-side sort/filter (`JobSearch.tsx`, which has no threshold filter today), and the breakdown display — or "excluded" reads as "low score" and the trust win is lost.
- **Vocabulary drift is the standing risk.** Three role-type value sets already disagree across job-post, search, and seeker pref; `saved_searches` stores an opaque URL string that can drift from the filter keys. Unifying vocab (§4) only holds if there's one source of truth (`domain.ts` + DB CHECK), not per-surface literals.
- **Phase discipline:** the farm-depth and analytics work is real but v2.1-gated behind "real ag employers posting" — building rich farm-profile fields against an empty marketplace is the exact speculation the v2.1 scoping decision warned against. Sequence behind liquidity.
- **Not designed here (handled separately):** privacy, human-approval, and compliance for the leads pipeline — see `Data_Architecture.md` and the leads-triage planning docs.
