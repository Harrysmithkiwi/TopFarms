# TopFarms — Combined Seeker + Employer Dataset

> **Source:** coded NZ dairy/farming Facebook posts, Feb–Jul 2026 (5 groups).
> **Companion to:** `TopFarms_Master_Report.md`

**Contents**
- Seekers — 35 job-seeker posts, one row each (20 fields)
- Employers — 12 job listings, one row each (24 fields; adds farm-profile columns)
- Match Fields — how seeker & employer columns pair for matching (incl. hard-gate fields)
- Supply vs Demand — snapshot comparing supply vs demand per facet

**Design notes**
- Lean by intent — one row per record; low-cardinality facets are filterable; prose kept in Skills/Notes.
- Employer fields mirror seeker fields ~1:1 (herd size / shed / system / roster / accommodation / visa / dog), which is what makes the two sides matchable over a shared vocabulary.

> **Sample caveat:** small n (35 + 12), dairy-skewed, five groups. Directional, not statistically representative.

---

## 1. Seekers (n=35)

| ID | Source_Group | Date | Role_Sought | Sector | Experience_Years | Shed_System | Skills | Region | Relocation | Availability_Timing | Roster_Hours | Accommodation_Need | Personal_Circumstances | Visa_Residency | Vehicle_Licence | Certifications | Contact_In_Post | Repost_Signal | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | NZ Dairy Jobs | 19h (recent) | Relief milking | Dairy | Experienced (unspec) |  | Relief milking | Taupo / Tokoroa / Taumarunui | Within region | ASAP |  | No |  |  |  |  | PM/comment | No | Employers responded in comments (demand present) |
| S02 | NZ Dairy Jobs | 13h (recent) | Farm assistant / long-term | Dairy | 10+ yrs (6 self-employed) | No rotary (keen to learn) | General dairy | Matamata / Morrinsville / Te Aroha | Tightly geo-bound (near daughters) | Long-term for security |  |  | Father – wants to be near daughters |  |  |  | No (has CV & refs) | No | Family-driven location constraint |
| S03 | NZ Dairy Jobs | 1d | Farm assistant | Dairy | Some |  | Feed mixing, vat wash, tractors, motorbikes, general | Rotorua (open) | Willing (with partner) | ASAP |  |  | Couple |  |  |  | Phone + email | No | Couple seeking team role |
| S04 | Canterbury Farm Jobs | 2d | Dairy farm worker | Dairy | 4 yrs |  | General dairy | North Canterbury | Within region | ASAP |  |  |  |  |  |  | No (CV & refs on request) | No | Boilerplate self-presentation |
| S05 | NZ Dairy Jobs | 2d | Weekend relief milking / calving | Dairy | 3 seasons relief, 1 calving, 1 sheep-milk/lamb | Herringbone (pref); NOT sole charge | Relief milking, calving, lamb rearing | Cambridge | Within region | Weekends only | Weekend |  |  |  |  |  | PM | No | Explicit shed pref + refuses sole charge |
| S06 | Canterbury Farm Jobs | 3d | Calf rearer / farm assistant | Dairy | 1 full season calf rearing |  | Calf rearing, feeding, health monitoring, tractors, ATV/quad | Anywhere NZ | Fully mobile | ASAP |  |  |  | Peak Seasonal Visa (docs ready) | Manual + ATV |  | Phone + email | No | Migrant; visa-ready; checkmark-list style |
| S07 | NZ Dairy Jobs | 6d | Full-time | Dairy | Farming background | Herringbone + rotary | Milking, tractors, feeding out; keen to learn pasture/fert | Near Wellington (currently Rotorua) | Willing | Immediate |  | Accommodation or shared accom |  |  | 2 & 4 wheelers |  |  | No | Wants to upskill pasture mgmt |
| S08 | Dairy & Drystock Canterbury | 28 Jun | Calf rearer / farm assistant | Dairy + pig/poultry | 4 yrs pig, poultry exp |  | Teat spray, effluent, lameness/mastitis, shed hygiene, animal care | Willing to relocate | Fully mobile | ASAP |  |  |  |  |  |  | Phone + email | No | Cross-species animal background |
| S09 | Dairy & Drystock Canterbury | 28 Jun | Assistant dairy farmer | Dairy | 12-wk course + 8 wks hands-on | 40-aside herringbone | Milking, fencing, teat spray, effluent, lameness/mastitis | Anywhere NZ | Fully mobile / relocate immediately | Immediate |  |  |  |  |  | National Trade Academy 12-wk Ag course |  | No | New entrant via training course |
| S10 | NZ Dairy Jobs | 26 Jun | Herd manager / 2IC | Dairy | 10 yrs |  | Herd management | Palmerston North |  | Full-time |  |  | Sole father of 2 girls (has support) |  |  |  | Phone | No | Sole parent; senior role |
| S11 | NZ Dairy Jobs | 27 Jun | Part/full-time; contractor | Dairy | 3 seasons FT (270–400 cow) |  | Plate meter, calf rear, relief milking, weed spray, tractor, fencing | Opotiki |  | Part or full-time |  |  |  | GST registered (contractor) |  |  | Phone | No | GST-registered contractor angle |
| S12 | Canterbury Farm Jobs | 27 Jun | Permanent / full-time | Dairy | 8 yrs |  | General dairy | Canterbury (closer to Chch pref, flexible) | Flexible radius | New season |  |  | Comes with partner + outside stock dog |  |  | No (CV & refs ready) | No | Partner + dog; posted farm photos |
| S13 | NZ Dairy Jobs | 28 Jun | Dairy farm assistant / anything | Dairy | 8 yrs |  | General dairy | Hawera / New Plymouth | Within region | ASAP ('foot back in door') |  | Accommodation |  |  |  | CV & refs | No | Getting back into industry |
| S14 | NZ Dairy Jobs | 28 Jun | Dairy farm assistant | Dairy | Experienced (unspec) |  | Milking, tractor, fencing, calf rearing, general | Waikato |  | Long-term |  |  |  |  |  |  | PM | No | Clean skills list |
| S15 | Canterbury Farm Jobs | 22 Jun | Calf rearing | Dairy | Previous dairy/ag |  | Calves, moving stock, weeding, general | Lincoln (will travel dep. accom/distance) | Conditional on accom/distance | Immediate; upcoming season |  | Accommodation factor |  |  | Own car + full licence |  |  | No | Animal-welfare framing |
| S16 | NZ Dairy Jobs | 10 Jun | Herd manager / 2IC assistant mgr | Dairy | 2+ yrs |  | Herd mgmt | Anywhere NZ | Fully mobile |  |  |  |  | AEWV (expires 2028) |  |  |  | No | Migrant; visa expiry stated |
| S17 | NZ Dairy Jobs | 9 Jun | Farming job | Dairy | 4 yrs |  | Tractor, feeding out, fencing, breaks, 2&4 wheelers | Hamilton |  | ASAP |  | House ('with a house will be amazing') |  |  | 2 & 4 wheelers | CV & refs | No | Young worker (26); wants house |
| S18 | NZ Dairy Jobs | 8 Jun | Drive-in relief milking | Dairy | Years (44 y/o) | Rotary or herringbone | Relief milking, break-in heifers, mastitis/lame detect, washes | Te Aroha | Drive-in | 1 weekend/month (currently FT employed) | Weekend |  | Drug-free (stated) |  |  |  | PM/comment | Yes (Redoing post + 2x Bump) | Repost + bump = decay signal |
| S19 | NZ Farming Jobs | 15 May | Casual / potentially FT | Sheep+beef+dairy | 5 yrs |  | Mustering, drafting, lambing/tailing, animal health, cattle, wool shed | Otago / Central Otago (will travel) | Willing | Casual now, open to FT |  |  | Works team of 6 dogs (3 heading, 3 huntaway) |  |  |  | FB message | No | Drystock crossover; dog team |
| S20 | NZ Dairy Jobs | 15 May | Farm assistant / 2IC | Dairy | 6 yrs (3 FT + 3 PT) |  | General | Palmerston North / Manawatu |  | Next season |  |  |  |  |  |  | PM | No | Many 'pm me' employer comments |
| S21 | NZ Dairy Jobs | 28 Feb | Long-term (ex-builder) | Dairy | Some farming + 8 yrs building |  | Milking, all fencing styles, concrete, building; flexible hours/roster | North Island (Whakatane–Warkworth ideal) | Willing across NI | Long-term | Flexible roster/OAD-TAD | Own accommodation required (shared not ideal) | 2 dogs (1 stock-proof in training, 1 stays home) |  |  |  | No (comment for contact) | No | Transferable trade skills; 500-1000 cow OK |
| S22 | NZ Dairy Jobs | 2 Mar | Farm assistant | Dairy | 2–2.5 yrs (milking since 14) |  | Milking, animal health, feeding, shed hygiene, general | South Island (E or W coast) | Relocating SI from north | ASAP |  |  |  |  |  | Milk Quality Level 3 | Phone + PM | No | Ex-600-cow Greymouth; wants to return SI |
| S23 | NZ Farming Jobs | 27 Feb | Farm assistant | Dairy | 4th yr (partner 2 seasons relief) |  | Lame/mastitis, break fences, shed hygiene, plant/vat wash, fencing, irrigation, some tractor | Central North Island | With partner | Upcoming season |  |  | Couple |  | Restricted licence |  | Phone + PM | No | Couple; restricted licence noted |
| S24 | NZ Dairy Jobs | 27 Feb | Relief milking | Dairy | 5 yrs | Herringbone (mostly); can sole charge | Sole charge, vat/plant wash, mastitis, tractors, feeding out | Hikurangi, Northland | Within region |  |  |  | Vet nurse student |  | ATV/quad safety cert | PM (CV on request) | No | Studying vet nursing alongside |
| S25 | NZ Dairy Jobs | 25 Feb | Dairy / senior farm assistant | Dairy | 5 yrs (1.5 FA + 3.5 herd mgr) | Rotary + herringbone (350–850 cow) | Milking, manual/quad/2-wheel/side-by-side/tractors, maize feeder | Waikato |  |  |  |  | Single, no pets, NZ Resident | NZ Resident | Manual, quad, 2-wheeler, side-by-side, tractor | Almost Primary ITO L3, DHI hoof workshop, ATV/quad safety cert | Phone + email | No | Posted anonymously; detailed machinery list |
| S26 | NZ Dairy Jobs | 25 Feb | Full-time winter work | Dairy | 9 yrs |  | Feeding out, shifting stock, milking, calf rearing | South Waikato (Lichfield) |  | May–end Aug (winter); 30–40 hrs/wk | 30–40 hrs/wk |  | Currently employed (LIC downtime) |  |  |  | PM | No | Seasonal gap-fill; strong engagement |
| S27 | NZ Dairy Jobs | 23 Feb | Full-time | Dairy | (unspec) |  | General | Selwyn district |  | Next season | Every 2nd weekend off (has kids) | 3-bedroom house (min) | Kids every 2nd weekend |  |  |  | No | Yes (you saved to TopFarms Employers) | Explicit roster + house-size need |
| S28 | NZ Dairy Jobs | 23 Feb | Farm assistant | Dairy + dairy goats | Experienced | Rotary + herringbone | Milking, tractor, fencing, calves, break fences, irrigation, goats | Waikato (Te Awamutu / Cambridge) |  | Now till 1 June |  |  | Single, no pets |  | ATV skills & safety course | Email CV on request | No | Dairy goat + Fonterra effluent irrigation exp |
| S29 | NZ Farming Jobs | 23 Feb | Herd manager / 2IC | Dairy | (2IC currently, 750 cow) |  | Herd mgmt | Waikato |  | Start 1 June |  |  | NZ citizen | NZ citizen |  | Phone + DM | No | Currently 2IC on 750-cow |
| S30 | NZ Dairy Jobs | 22 Feb | Afternoon relief milking | Dairy | Contract milking 120 OAD |  | Relief milking | Cambridge |  | Spare time — extra work | Afternoons |  |  |  |  | Phone + PM | No | Already contract milking; topping up |
| S31 | NZ Dairy Jobs | 23 Feb | Managing / senior position | Dairy | 10 yrs |  | Management | Northland (very open to relocate) | Very willing | Next opportunity (owner selling up) |  |  |  |  |  | Email + PM | No | Displaced by owner sale |
| S32 | NZ Dairy Jobs | 21 Feb | Work experience (unpaid) / entry | Dairy | Minimal (17 y/o) |  | Feeding calves, fencing, moving cattle, helped milk once | Hamilton |  | ASAP |  |  | Youth (17); wants reference only |  |  |  | No | No | Entry-level; offering free labour for reference |
| S33 | NZ Dairy Jobs | 17 Feb | New farm | Dairy | (35 y/o, 600 cow) |  | Milking, mastitis, plant setup/wash, motorbikes, tractors, silage wagon, bail buggy, calvings, calf feeding | Temuka (1.5h from Chch) |  |  | Six-on-two-off currently |  | Partner lives/works in Christchurch |  | Motorbikes, tractors |  | Comment thread | No | Boss finishing up; roster stated |
| S34 | NZ Dairy Jobs | 16 Feb | Calf rearer | Dairy | 3rd season |  | 1x/2x/ad-lib feeding, calfeteria/milk bar, scours/infection treat, stomach tube, ear tags, trailer | Matapu (Taranaki) |  | Calving 2026 |  |  |  |  | Trailer |  |  | No | Detailed calf-rearing specialism |
| S35 | NZ Dairy Jobs | 16 Feb | FT / contract / temp (relocating) | Ag / general | Extensive (multi-industry) |  | Farm ops, admin, automotive, construction, team leadership | Manawatu (from June 2026) | RELOCATING to NZ from South Africa | From June 2026 onward |  |  | Wife studying at UCOL Palmerston North; couple | Overseas — relocating (SA) |  |  | Phone + email | No | Currently OUTSIDE NZ; couple; multi-sector |

---

## 2. Employers (n=12)

| ID | Source_Group | Date | Role_Offered | Sector | Herd_Size | Shed_System | Farm_System | Calving_Pattern | Farm_Tech | Region | Roster_Offered | Accommodation_Offered | Pay_Info | Experience_Required | Visa_RightToWork | Other_Requirements | Couple_Family | Dog_Pet_Policy | Progression | Start_Timing | Contact_In_Post | Cross_Post | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E01 | NZ Dairy Jobs | 5h | Experienced farm assistant → senior | Dairy | 550 peak | 2 HB sheds side-by-side | System 4-5 (feed pad) | Autumn | Feed pad | Te Kauwhata | 8/3 all year round | 3-bed house w/ fireplace |  | Experienced (progressing) |  | Stockmanship, tractors, feed-out/mixer wagon, initiative |  |  | Yes — step up to senior | ASAP | No (comments) | No | 3 on-farm staff + relief milker |
| E02 | Canterbury Farm Jobs | 5h | Relief milker + farm assistant | Dairy | 1250 | 54-bale Protrack |  |  | Protrack, halter, acrs | Dunsandle, Canterbury | 5-2 (6-2 through calving) | 2-bed house |  | 2 yrs farming | NZ citizens only | Willing to continue farming journey | Couple or two singles |  |  |  | No (comments) | No | NZ-citizens-only gate |
| E03 | NZ Dairy Jobs | 24 Feb | Experienced FA / 2IC | Dairy | 320 |  |  | Autumn |  | Awanui / Kaitaia (Northland) |  | Couple or single accommodation |  | Existing dairy experience |  | 2 references with application (emailed) | Couple or single |  | Work with farm manager | ASAP | Email | No | Schools within 15 min (family-friendly) |
| E04 | NZ Dairy Jobs | 8h | Farm assistant / herd manager | Dairy | 730 | 54-bale rotary fully automated | System 5 high input | Spring | Halter, modern machinery | Matamata (4km) |  | Single/couple accommodation | Well paid — experience essential | Experienced (essential) | Must work without a visa | Good stockmanship | Single or couple |  | Yes — step up from FA | Immediate | No (comments) | No | Halter + high input; visa-free required |
| E05 | NZ dairy farmers | 1d | Junior farm assistant | Dairy |  |  | Grass-based (milk quality/animal health) |  |  | Rakaia | 6-2 (6-1 calving) | 3-bed house w/ garage | Salary (junior rate) | None needed — mentored/trained | Legally work in NZ; prefers NZ'er / good English | Full licence (not suspended), good w/ stock, 2-wheeler, drug-free, 2 referees |  |  | Yes — mentored under asst mgr | Now | Email + phone | No | Not accredited employer; English emphasis |
| E06 | NZ Dairy Jobs / NZ Farming Jobs | 2d | Calf & lamb rearer | Dairy + sheep | up to ~400 calves + lambs |  |  |  |  | Turakina |  |  |  | Previous calf rearing preferred |  | Reliable, eye for animal health, calm, independent |  |  |  | This season (replacement) | No (message) | YES — same author both groups | Cross-posted; calf+lamb crossover |
| E07 | Dairy & Drystock Canterbury NZ | 2d | Farm assistant | Dairy | 800 | 50-a-side herringbone w/ ACRs |  |  | ACRs | Charing Cross, Canterbury | 7/2, 7/2, 7/3 | Single man's quarters |  | Keen to learn (entry ok) | Not accredited — must have right to work | Reliable, honest, team player |  |  | Yes — learn and grow |  | No | No | 220ha effective; 800 cows |
| E08 | NZ Farming Jobs | 4d | Milk-for-rent (herd-owning) | Dairy | 200 | 16-aside herringbone |  | Split (all year milking) |  | Waitoki / Dairy Flat |  | 1-bed self-contained cottage |  |  |  |  |  |  |  |  | No (PM) | No | 'Milk for rent' — sharemilk-adjacent model |
| E09 | NZ Dairy Jobs | 3d | Farm assistant | Dairy | 650 | 60-bail rotary |  |  | acr, auto-draft, auto-teatspray, in-shed feeding, feed pad, TAD | Central Hawke's Bay |  | 1-bed farm house |  | Experience preferable | Not accredited employers | Relief milking work for partner | Partner relief work available |  |  | ASAP | No (DM) | No | Partner relief work as incentive |
| E10 | Canterbury Farm Jobs | 29 Jun | Farm worker (+ partner relief) | Dairy | 750 | 54-bale rotary (brand new) |  |  | Pivot irrigation | Darfield (3 min) |  | 2-bed house (double-glazed, can furnish) |  | A couple of seasons NZ dairy preferred | Not accredited; English fluency a must | Calf rearing + relief milking for partner | Partner work available | NO dogs or cats — non-negotiable |  | This season | Email | No | Hard no-pets gate (dogs already on farm) |
| E11 | Canterbury Farm Jobs | 5d | Poultry farm (sole charge) | Poultry / egg |  | (sheds/flocks) |  |  | Packhouse | Irwell (Dickies Rd) | 4-5 hrs Mon-Fri, fixed start 7-9am |  | Wage depends on candidate | None — full training provided |  | Physically fit, lift egg crates, reliable, eye for detail, communication; public holidays worked |  |  | Yes — climb the ladder | TBC w/ candidate | Email | No | Non-dairy sub-industry; sole-charge per shed/flock |
| E12 | NZ Dairy Jobs | 4d | Experienced calf rearer (drive-in) | Dairy | 385 calving (minimal bobbies) |  |  |  |  | Makomako / Pahiatua | 7 days/week (seasonal) | Drive-in (no accom) | Competitive, based on experience | Proven calf-rearing experience |  | Independent, work ethic, references required |  |  |  | 20 Jul – end Aug (extendable) | Phone | No | Fixed-term calving-season contract w/ dates |

---

## 3. Match Fields — how the two sides pair

| Match Field | Seeker Column | Employer Column | Match Type | Notes |
|---|---|---|---|---|
| Role | Role_Sought | Role_Offered | Category | Farm assistant / 2IC / herd mgr / calf rearer / relief |
| Sector | Sector | Sector | Category | Dairy dominant; poultry & sheep sub-industries present |
| Region (canonical) | Region | Region | Proximity | Town-level → canonicalise to region for distance scoring |
| Experience level | Experience_Years | Experience_Required | Threshold | Seeker meets/exceeds employer minimum |
| Shed / system | Shed_System | Shed_System / Farm_System | Preference | Herringbone vs rotary; DairyNZ system 1-5 |
| Roster / hours | Roster_Hours | Roster_Offered | Compatibility | Incl. separate calving-period roster |
| Accommodation | Accommodation_Need | Accommodation_Offered | Hard match | Type + bedroom count + couple/single |
| Couple / partner | Personal_Circumstances | Couple_Family | Compatibility | Partner-work availability is an incentive |
| Visa / right-to-work | Visa_Residency | Visa_RightToWork | GATE (veto) | 50% of employers visa-gated; biggest mismatch axis |
| Dog / pet | Personal_Circumstances | Dog_Pet_Policy | GATE (veto) | Seeker-with-dog vs no-pet farm = match breaker |
| Start timing | Availability_Timing | Start_Timing | Compatibility | Both calving-calendar driven (1 June / 20 Jul) |
| Certifications | Certifications | (Other_Requirements) | Bonus / verify | Feeds verified-badge; employers ask for refs |
| Vehicle / licence | Vehicle_Licence | Other_Requirements | Threshold | Full licence often required by employer |

---

## 4. Supply vs Demand snapshot

| Metric | Seekers | Employers | Notes |
|---|---|---|---|
| Total records coded | 35 | 12 | Base counts |
| Accommodation (need vs offered) | 6 | 10 | Seekers needing vs employers offering |
| Visa/migrant vs visa-gated | 6 | 6 | Migrant seekers vs right-to-work-restricted farms — key mismatch |
| Couple / partner | 5 | 5 | Couples seeking vs couple-friendly roles |
| Calf-rearer focus | 4 | 2 | Seasonal calving demand both sides |

*Read: accommodation is supply-heavy (10 farms offer vs 6 seekers who need it); the visa axis is balanced in count (6 vs 6) but structurally opposed — migrants seeking work vs farms that won't sponsor. That opposition is the key structural mismatch to design around.*
