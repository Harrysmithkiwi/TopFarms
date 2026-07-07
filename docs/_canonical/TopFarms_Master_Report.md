# TopFarms — Employer & Job-Seeker Insights (Master Report)

> **Draft v1 · 2026-07-07 · Internal**
> A combined demand-signal review of the NZ farm labour market as it plays out on Facebook. Merges three TopFarms analyses into one: the job-seeker (supply) study, the employer (demand) study, and the two-sided synthesis that maps both to TopFarms front-end, back-end, admin-dashboard and lead-harvest architecture.
> **Source:** 35 job-seeker posts + 12 employer listings across five NZ dairy/farming Facebook groups, Feb–Jul 2026.
> **Companion data:** `TopFarms_Combined_Data.md` / `.xlsx` (Seekers · Employers · Match_Fields · Supply_Demand)

## Contents
- Part A — Job-Seeker Insights (supply side)
- Part B — Employer Insights & Architecture Map (demand side)
- Part C — Two-Sided Synthesis (matching supply to demand)

---

# Part A · Job-Seeker Insights (supply side)

| 35 | 37% | 34% | 31% |
|---|---|---|---|
| seeker posts | want Farm Assistant | need to start ASAP | willing to relocate |

### Who's posting & what they want
- **Farm Assistants dominate** — 37% seek Farm Assistant / Dairy Assistant roles. Relief/casual milking (17%) and Herd Manager / 2IC / senior (17%) follow, with dedicated Calf Rearers (11%) a distinct seasonal group.
- **Sector:** Nearly all dairy; a minority bring drystock/sheep-beef crossover or adjacent animal backgrounds (pig, poultry, dairy goats). One career-changer (ex-builder) and one multi-sector.
- **Experience:** From 17-year-olds offering free labour for a reference, through the 2–5 year "assistant" middle, up to 10-year veterans chasing management. Experience is the most-stated attribute.

### Skills & credentials they lead with
- **Core skills:** Consistent vocabulary — milking (rotary & herringbone), mastitis/lameness detection, teat spraying, plant & vat wash, calf rearing, feeding out, fencing & break fences, tractor/ATV/2-&-4-wheeler, effluent, shed hygiene.
- **Shed/system:** 23% name a shed preference (herringbone vs rotary), some specify herd-size comfort (120–1000 cows) or OAD/TAD. One refuses sole-charge; others sell it as a strength.
- **Certifications:** 31% cite a named credential — Milk Quality L3, Primary ITO L3, National Trade Academy course, DHI hoof, ATV/quad safety, AgriHealth tutorials. Verifiable → maps to a verified badge.

### Where they are & willingness to relocate
- **Geography:** Waikato is the centre of gravity, with Canterbury/Selwyn, Taranaki, Northland, Manawatu clusters. Regions stated as specific towns, not areas.
- **Mobility:** 31% will go "anywhere in NZ"; others are conditionally mobile ("will travel depending on accommodation/distance"); ~20% tightly geo-bound, almost always for family.
- **Migrant / pre-arrival:** 14% state visa/residency up front — AEWV (with expiry), Peak Seasonal Visa, NZ Resident/Citizen. At least one is offshore (South Africa) relocating to NZ mid-2026 with a fixed available-from date.

### Timing, roster & practical needs
- **Urgency:** 34% need to start ASAP; 26% are season-dated to 1 June / "next season" / "Calving 2026". The calving calendar drives timing.
- **Roster & needs:** 20% specify roster/hours ("six-on-two-off", "every 2nd weekend off", OAD/TAD). 17% state an accommodation need (nice-to-have → hard "own accommodation, 3-bedroom"). 23% disclose a couple/kids/sole-parent/dog situation.

### Behavioural signals
- **Decay, leakage, social proof:** 9% visibly re-post ("Redoing my post", "Bump") — listings decay, demand goes unmet. 26% publish phone/email in-post. Seekers self-verify by posting certificate photos and lean on peer vouching in comments.

---

# Part B · Employer Insights & Architecture Map (demand side)

| 12 | 83% | 50% | 58% |
|---|---|---|---|
| listings | provide accommodation | restrict on right-to-work | name farm tech |

### What employers are asking for
- **Roles & sub-industries:** Farm Assistant (junior → experienced) dominates, alongside 2IC / herd manager, calf rearers, relief milkers, and a "milk-for-rent" herd-owning arrangement. Two non-dairy sub-industries appear — poultry/egg (sole-charge) and sheep/lamb rearing.
- **Farm profile:** Employers volunteer a rich profile — herd size (200–1,250 cows, 83%), shed type & size, DairyNZ system (4–5, high input, grass-based), calving pattern, and in 58% automation as a selling point (Halter, Protrack, ACRs, auto-draft, auto-teatspray, in-shed feeding, pivot irrigation).
- **On offer:** Accommodation offered in 83%, specified to bedroom count and couple/single. Roster stated in 50% (8/3, 5-2/6-2-calving, 7/2-7/2-7/3). Pay almost always "competitive / depending on experience" not a number. Progression/mentoring offered in 50%; couple/partner work in 42%.
- **Gates:** 50% impose a right-to-work restriction — "NZ citizens only", "not accredited employer", "must have legal right to work". References (25%), full licence, drug-free, English fluency recur. One hard "NO dogs or cats — non-negotiable".

### Front-end feature & functionality map

| Employer signal | Front-end feature / functionality | Field | Priority |
|---|---|---|---|
| Herd size / shed type & size | Structured job-post fields + seeker filters | New | MVP |
| Farm system (1–5) + calving pattern | Enum dropdowns on listing; filter facet | New | v2.1 |
| Farm tech (Halter/Protrack/ACR…) | Multi-select "farm features" chips; sell-point badges | New | v2.1 |
| Accommodation (type + bedrooms + couple/single) | Structured field both sides → hard-match filter | Extend | MVP |
| Roster (incl. calving-period variant) | Structured roster field; compatibility match | New | v2.1 |
| Right-to-work / accreditation | Required listing flag → visa-eligibility gating | New | MVP |
| Progression / mentoring offered | Listing toggle + badge; "wants to progress" match | New | v2.1 |
| Dog/pet policy | Listing enum; hard-match vs seeker dog | New | v2.1 |
| Pay ("depending on experience") | Optional band field; nudge to state range | New | Growth |

### Back-end job-listing schema map
- **Farm profile:** Add farm-profile columns to `jobs` / `employer_profiles` — `herd_size`, `shed_type` (enum), `shed_size`, `farm_system` (enum 1–5), `calving_pattern` (enum), `effective_ha`, `farm_tech` (array/junction). Extend the live jobs migration.
- **Match inputs & gates:** Structured accommodation (type + bedrooms + couple_ok) and roster (on/off + calving variant) become first-class columns — highest-value match inputs, present on both sides. `right_to_work_required` + `accredited_employer` + `dog_policy` become gate inputs to `match_scores`. Town locations need `normalise()`/region canonicalisation.

### Founder/admin dashboard & lead-harvest map
- **Harvest → staging:** Harvested listings land in `lead_staging` with parsed fields (role, herd size, shed, region→canonical, accommodation, roster, right-to-work, contact, start timing). 42% leak email/phone → structured contact. Cross-posting (the Turakina calf+lamb role ran in two groups same day) needs a dedup key.
- **Dashboard & analytics:** Admin needs an employer-lead queue distinct from the seeker queue: an approved employer lead becomes an outreach target (invite to list), not an auto-published job. Analytics the data supports now: demand by role & region, accommodation-offered rate, right-to-work-restriction rate, tech-adoption rate, roster patterns — feeding the founder pipeline / TopFarms Index view.

---

# Part C · Two-Sided Synthesis (matching supply to demand)

### The core finding: near-perfect field symmetry
The two sides describe themselves in almost the same vocabulary. Seekers state shed preference, roster, accommodation need, visa status, experience, region and household; employers state shed type, roster (incl. calving variant), accommodation offered, right-to-work requirement, experience needed, region and couple-friendliness. That **~1:1 symmetry is the whole basis for matching** — one controlled vocabulary drives both profiles, both filters, and the match score.

### Where supply and demand align
- **Timing:** Both anchored to the calving calendar — seekers "start 1 June / Calving 2026", employers "start 20 July / this season".
- **Accommodation:** A two-way market — 83% of farms offer it, and seekers who need it specify to bedroom-count precision. Where seekers don't need it, that widens the pool.
- **Role & couples:** Farm Assistant is the thickest layer on both sides; calf rearing spikes seasonally on both. Couple/partner arrangements are actively offered (42%) and actively sought.

### Where supply and demand collide (the gates)

| Collision | Supply side | Demand side |
|---|---|---|
| **Visa / right-to-work** | 14% of seekers are migrants (AEWV, Peak Seasonal) or offshore relocating to NZ | 50% of farms are visa-gated ("NZ citizens only", "not accredited", "no sponsorship") |
| **Dogs / pets** | Seekers who "come with a stock dog" — recurring | At least one hard "NO dogs or cats — non-negotiable" |
| **Sole charge** | Some seekers explicitly refuse sole-charge work | Poultry & some dairy roles are sole-charge by design |

> These are **veto fields** — the match engine should treat them as hard filters, not soft weights, or it will surface impossible matches and erode trust on both sides.

### What this means across the platform
- **Front-end:** One shared field vocabulary powers both profile forms, both sets of filters, and the match score. Build the enums once (shed type, system 1–5, roster, accommodation, mobility, right-to-work, dog policy) and reuse on both sides.
- **Back-end:** Extend `jobs` and `seeker_profiles` with mirrored structured columns; make the four veto fields (right-to-work, dog policy, sole-charge, experience threshold) first-class inputs to `match_scores` — gates as filters, the rest as weights.
- **Lead harvest & dashboard:** Harvest both post types into `lead_staging` with the same parser vocabulary but route to two queues — employer leads → "invite to list", seeker leads → "invite to profile". Dedup handles reposts (seekers) and cross-posts (employers). The founder dashboard shows a live supply/demand balance per facet — e.g. migrant seekers vs visa-gated roles.
- **Onboarding:** Because both sides already volunteer this structure in prose, onboarding can pre-fill from an approved lead and ask the user to confirm — turning a scraped FB post into a structured profile or listing with minimal typing.

### Companion dataset
`TopFarms_Combined_Data` holds the row-level evidence in four tabs: **Seekers** (35×20), **Employers** (12×24), **Match_Fields** (how columns pair, with hard-gate fields flagged), and **Supply_Demand** (a formula-driven live snapshot). It is the structured backbone this report narrates, and the staging ground for the schema/enum work.

> **Sample caveat:** n = 35 seekers + 12 employers, dairy-skewed, five groups. Directional, not statistically representative — validate on a larger pull before hard-coding enums into the schema.
