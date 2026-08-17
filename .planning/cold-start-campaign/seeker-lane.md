# The seeker lane — strategy, and what the posts ask for that we do not offer

Charted 2026-08-17 from six real posts the operator saved to the Facebook collection
**"TopFarms People"** (3 contributors), plus the Meta group strategy.

## Correction to the map

`map.md` T-06 asked "how does a seeker ever hear about TopFarms?" as an open decision. **It is
not open, and I was wrong to file it.** The strategy is settled:

> Harvest job-seeker posts from NZ / regional farming Facebook groups → DM them → sign them up.
> Build **100–200 seekers**, go live a week later with a base already there. Keep harvesting
> from Facebook and social. Later: rural newsletters and agri universities (Lincoln,
> Canterbury). **Meta groups are the whole strategy for the first six months.**

Worse than wrong — **the tooling is already built and idle.** `AdminSeekerStaging` exists as a
sibling route to the employer queue, with `PasteCapture` and a `SeekerDetail` extraction shape
that already pulls `roles_sought`, `skills`, `licences`, `sheds_experienced`, `availability`,
`accommodation_needed`, `household`, `couple_seeking`, `location_constraint`,
`training_wanted`. Its own header comment says *"the seeker lane is the one aiming at four
figures."*

`lead_staging` holds 113 rows, **all `employer`, zero `seeker`** — not because the lane is
missing but because nothing has been pasted into it. The Facebook saved collection **is** the
queue; it just has not been transferred.

So the real question is not strategy and not build. It is throughput: what turns a saved post
into a signed-up seeker, and how many can be worked in a sitting.

---

## What the six posts actually are

| Who | Wants | Notable |
|---|---|---|
| OrangeWolf5592 | 2IC / Manager, Central Plateau, will relocate | 7 yrs, 980 + 1200 cow, 4-platform. **Partner is a dietician working from home, available for relief.** Currently relief milking |
| Alex Vogt, 21 | **Part-time** farm assistant, BOP / Waikato | Single mum, 3yo. Wants relief milking + odd jobs **in return for cheap long-term accommodation**. Has CV, licence, own transport |
| Matthew & Rebecca Wright | **Couples** role, West Coast SI, will relocate in SI | **3 school-aged children.** Phone posted publicly |
| TalentedShark3283 | Solo manager, smaller herd, Waikato | Currently 560 cows. **MINDA**, effluent, **ITO levels 2/3/4**, **System 2 → System 5** |
| Deyoun_Dairy_boy, 33 | Herd Manager, Northland | Migrant. **NZQA L4 + HND NZQA L6 + Sri Lankan tractor training. Artificial insemination.** "Drug and smoke free". A stranger commented asking **"right to work in NZ or seeking an accredited employer?"** |
| Lilly Ward | **Shepherd**, Waikato | Sheep & beef, not dairy |
| Rose Jono | **Relief milking**, Selwyn | |

**The dominant pattern: 4 of 6 want relief or part-time work**, not a permanent full-time job.
That is the shape of this labour market and it is not the shape the product assumes.

---

## What the platform already captures well

Credit where it is due — the seeker profile was clearly designed from posts like these:

| They wrote | We capture |
|---|---|
| "would make the move away for the right opportunity" | `open_to_relocate`, `preferred_regions` |
| "Seeking a Couples opportunity" | `couples_seeking`, `HOUSING_SUB_OPTIONS: couple_working / couple (one working)` |
| "3 school aged children", "my son being 3" | `family` jsonb |
| working dogs, pets | `pets` jsonb, `housing_sub_options: working_dogs` |
| "cheap long term accommodation" | `accommodation_needed`, `housing_type_pref`, `housing_sub_options` |
| "980 and 1200 cow system", "560 cows" | `herd_sizes_worked` |
| "80 bail rotary", "68 bail rotary" | `shed_types_experienced` (type only — see gap 6) |
| "I have a cv" | `document_urls` |
| "own transport", "drive 2 and 4 wheels" | `licence_types` |
| "ready to go back to work", "finished last season" | `availability_date`, `notice_period_text` |
| migrant status | `visa_status` incl. `needs_sponsorship` |

Also already right: `lead_outreach_config` **forbids referencing private circumstances** stated
in a post — a broken leg, a pregnancy, hardship. Three of these six posts volunteer exactly
that. That rule was written from this data and it holds.

---

## Gaps — what they ask for that we cannot represent

Ranked by how often it appears across the six.

### G-1 · Part-time and hours — **4 of 6**
`jobs` carries `hours_min`, `hours_max`, `weekend_roster`, `pay_frequency`. The seeker side has
**no hours field and no employment-type preference at all**. Alex says "part time" and "not
full time"; there is nowhere to put it, and `contract_type` (`permanent` / `contract` /
`casual`) is a job-side attribute a seeker cannot express a preference against.
`ROLE_TYPES` does include **Relief Milker**, so relief is expressible *as a role* — but not as
"I'd take a permanent job **or** relief", which is what three of them actually say.
**Asymmetric: jobs can state hours, seekers cannot state desired hours.**

### G-2 · The role vocabulary is dairy-shaped — Lilly Ward has no role to pick
`ROLE_TYPES` = Farm Manager, Assistant Manager, Farm Hand, General, Herd Manager, 2IC, Relief
Milker, Other. **No Shepherd, no Stock Manager, no Calf Rearer, no Machinery/Tractor
Operator** — and calf rearing is one of the biggest seasonal intakes in the country. TopFarms
claims five sectors; the role list serves one. (This is the same vocabulary that F-22 just
unforked, so it is the moment to extend it.)

### G-3 · Certifications miss what seekers actually list
`CERTIFICATION_OPTIONS` = ATV, Tractor, 4WD, First Aid, Growsafe, Chainsaw. Absent and
volunteered unprompted: **artificial insemination** (certificated, seasonal, employers hire
specifically for it), **MINDA** (the NZ dairy record system), **NZQA levels**, **ITO levels**.

### G-4 · The qualification ladder is DairyNZ-only and caps at 4
`dairynz_level` stops at Level 4. Seekers cite **NZQA Level 4**, **NZQA Level 6 (HND)** and
**ITO levels 2/3/4**. A migrant with a Level 6 diploma has to record it as "none".

### G-5 · Overseas qualifications have no home
Deyoun's Sri Lankan tractor training, and his two-season NZ record versus five years total.
Nothing expresses provenance, so an experienced migrant reads as a beginner.

### G-6 · Shed scale is missing
"80 bail rotary", "68 bail rotary", "4 platform". `SHED_TYPES` carries the type but not the
size, and a 20-bail herringbone and an 80-bail rotary are different jobs.

### G-7 · NZ dairy System 1–5
"Worked System 2 to System 5 farms." A standard NZ classification of farm intensity that
employers use as shorthand for how a farm runs. Absent entirely.

### G-8 · The partner is a labour unit we cannot describe
`housing_sub_options` covers "Couple (one working)", which is housing. It does not say
**"partner available for relief work"** — OrangeWolf's actual offer, and a real second
half-unit of labour that changes which jobs fit.

### G-9 · Accommodation as consideration, not just a need
Alex offers work **in return for** cheap accommodation. We model `accommodation_needed` (bool)
and `min_salary` (int) as separate things and cannot express the trade between them.

### G-10 · "Drug and smoke free"
Volunteered unprompted, because seekers know employers screen on it. Not captured. Needs care
if added — self-declared only, never inferred.

### G-11 · Accredited-employer visibility — the migrant unlock
A stranger publicly asked Deyoun *"Do you have right to work in NZ or seeking an accredited
employer?"* That is the blocking question for a whole seeker segment, and it is asked of the
**employer**, not the seeker. Feasibility is already confirmed (INZ list API → NZBN + expiry)
and the immigration phase is parked post-launch. Worth knowing this is the demand signal for
un-parking it.

---

## What this changes on the map

T-06 is withdrawn and replaced. The seeker lane's open decisions are throughput and sequencing,
not strategy:

- **T-06a — What is the DM→signup step, exactly?** Where does the saved post go, what does the
  DM say, what link do they land on, what proves it worked. The employer lane's doctrine
  conflict (T-01) applies here too and probably resolves differently: a seeker DM has no UEMA
  "free" problem and no "who posts it" question.
- **T-06b — Which Facebook groups, and what is the saving cadence?** Six posts saved by three
  contributors is a proof of concept, not a pipeline aimed at 100–200.
- **T-06c — Do we fix any of G-1 … G-11 before the first 100 sign up, or after?** A seeker who
  cannot say "part-time" (G-1) or "shepherd" (G-2) may fill the profile in wrong and never come
  back. But shipping schema before 100 real profiles is guessing. This is a genuine call.
- **T-06d — Does the 100–200 target come before, with, or after the employer batch?** Both
  sides are cold; whichever goes first waits on the other.
