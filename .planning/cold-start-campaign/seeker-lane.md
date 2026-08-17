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

---
---

# Round 2 — seven more posts, 2026-08-18

Sample is now **13 posts across five groups** (NZ Dairy Jobs, Dairy & Drystock Farm Jobs
Canterbury NZ, NZ Backpacker JOBS, plus the two from round 1). Three findings change priorities
before any of the schema gaps do.

## Three things that are not schema

### R2-1 · One of the seven is an EMPLOYER post, and it is the best test case we have

**Glesni Angharad Morgan, Dairy & Drystock Farm Jobs Canterbury NZ** — *"Dairy Farm Assistant.
WANTED. Full time. SHORT term. Help over calving."* Fairlie, Canterbury. Now until end of
October / early November, possibly longer. **890 cows, 54-point rotary, 2-off-8 roster.** Double
bedroom in a shared house on farm. Immediate start. Must be able to drive a 2-wheeler.

Two things follow:

1. **It is a live employer lead sitting in a seeker batch.** The saved collection is mixing
   lanes. Whatever the capture workflow is, it needs a fork at the top — `lead_staging` already
   carries `type` (`employer` | `seeker`) and `AdminSeekerStaging` is a sibling route, so the
   plumbing exists; the *human* step does not.
2. **It is the sharpest employer test case in the whole sample** — seasonal, short-term,
   accommodation included, precise shed spec, and a roster. If the job wizard can carry this
   post faithfully, it can carry most of what Canterbury posts. Worth walking it through
   `/jobs/new` as the T-05 prototype rather than inventing a fictional farm.

### R2-2 · The same person appears twice under different names, and dedupe will not catch it

`ceylon_dairy_boy` in **NZ Dairy Jobs** is `Deyoun_Dairy_boy` from round 1 — **identical body
text**, different group, different display name. `_lead_fingerprint` keys on
`display_name|region|type`, and `_lead_suppression_key` (087) on `name|type`. Neither matches
across a changed handle.

At 100–200 seekers harvested from five overlapping groups this is not an edge case. It also has
a compliance edge: someone who opts out under one handle stays contactable under the other,
which is the exact failure F-21 was meant to close.

The 0.6-similarity fuzzy pass in `_lead_intake` runs on `display_name`, so it will not help
either. The signal that *would* catch it is the post body, which is byte-identical here.

### R2-3 · Yesterday's role additions are already validated

Added 2026-08-17, and this batch would have needed them:

| Role | Evidence in this batch |
|---|---|
| **Calf Rearer** | *"SEEKING HERD MANAGER / CALF & YOUNGSTOCK SPECIALIST"*; *"calf rearing in and around Rotorua"* |
| **Stock Manager** | *"relief milking and/or stock work"*; solo-running fattening beef, drystock |
| Shepherd | no direct hit this round; drystock/beef adjacent |

And **G-1's terms field**: *"open to any job opportunity, short or long term"* (Louison),
*"drive in relief milking"* (Rotorua). Relief-or-part-time is now **6 of 13**.

---

## New gaps

### G-12 · The sector list cannot hold what these people actually do — **strongest new gap**
`FARM_TYPE_OPTIONS` = dairy, sheep_beef, cropping, deer, mixed, other. This batch contains:

- **beekeeping**, **forestry and logging**, **landscaping**, **factory operator** (Louison, a
  French backpacker — an entire channel segment, since NZ Backpacker JOBS is one of the groups)
- a **dairy goat** farm, 1300 head, running staff (Te Kuiti) — Dairy Goat Co-op country, a real
  NZ sector
- **breaking in horses** and **farm sitting** (same post)
- **fattening beef / drystock** run solo over 600 acres

"Other" absorbs all of it and tells an employer nothing. Forestry in particular is a major NZ
rural employer sitting entirely outside the taxonomy.

### G-13 · AEWV / accredited employer is a hard requirement, not a nice-to-have — **escalates G-11**
**Three of thirteen** posts now turn on it:

> *"looking to secure a long-term position with an **accredited employer** in advance"* (vet)
> *"willing to support the visa process (such as the **Accredited Employer Work Visa**)"* (Geraldine)
> *"Do you have right to work in NZ or seeking an accredited employer?"* (comment, round 1)

`jobs.visa_sponsorship` is a boolean — "will you sponsor". **AEWV accreditation is a specific
INZ status a farm either holds or does not**, and a migrant cannot apply without it. A boolean
cannot answer the question being asked. Feasibility was already confirmed (INZ list API → NZBN
+ expiry) and the immigration phase is parked; this is the demand evidence for un-parking it.

### G-14 · Professional and tertiary qualifications have nowhere to go — **escalates G-3/G-4**
This batch alone: **Veterinarian (DVM)**, **BSc Computer Science**, **National Certificate II
in Animal Production (Ruminants)**, NZQA L4, NZQA L6 (HND), West German Tractor Training
(Sri Lanka). Seeker-side we offer `certifications` — ATV, Tractor, 4WD, First Aid, Growsafe,
Chainsaw — and `dairynz_level`, which caps at 4. **A qualified vet has to record themselves as
having no qualifications.**

### G-15 · Roster is the thing seekers ask about and cannot state
The employer post says **"2 off 8 on"**. A seeker says *"early mornings don't worry me, team
work or alone"*. `jobs.weekend_roster` is free text so a listing can carry it, but there is no
seeker-side roster preference and nothing filters or matches on it. In NZ dairy the roster is
often the deciding factor.

### G-16 · Availability far in the future has no model
The vet is returning from parental leave in **Spring–Summer 2027** and is looking *now* to line
up 2027 in advance. `availability_date` is a date so it stores fine — but jobs expire, and
matching someone available in 14 months against listings that close in 6 weeks is noise in both
directions. There is no "planning ahead / future season" concept on either side.

### G-17 · English proficiency
*"Upper-Intermediate English"*, *"fluent in English and confident in communicating effectively
with farm owners, managers and team members"*. Volunteered by migrants because they know it is
screened on. Nothing captures it.

### G-18 · Drive-in versus live-in
*"looking for **drive in** relief milking"*, *"own reliable vehicle"*. `accommodation_needed =
false` is the inverse but drive-in is the NZ term and it is a positive statement — I have my
own place and will travel — not the absence of a need.

### G-19 · Entry-level as a positive signal
*"I'm green in the industry but I make up for that with my eagerness to get stuck in"*, and
disarmingly, *"reversing with it is a skill still under improvement"*. `years_experience = 0`
reads purely as a deficit. Nothing carries trainability, attitude, or an honest self-assessment
— and for calf rearing and relief work, keen-and-green is often exactly what a farm wants.

### G-20 · Pre-employment checks — **escalates G-10**
*"I can pass all pre employment checks"*, *"drugs and smoke free"*. Now 2 of 13, volunteered
unprompted both times.

### G-21 · The skill taxonomy is coarser than the seekers are
The vet lists **colostrum management, growth scoring, scours and pneumonia treatment, heat
detection, TMR management, ration analysis, metabolic disorder prevention**. All 24 competencies
absorb this into *"Animal health & husbandry"* and *"Dairy cattle management"*. The taxonomy is
right for matching breadth; it cannot express depth, and depth is what a specialist is selling.

---

## Revised gap ranking

Frequency across all 13 posts, which is the only honest way to rank these:

| Rank | Gap | Hits | Status |
|---|---|---|---|
| 1 | **G-1** terms — relief / part-time / short-term | **6/13** | **shipped 2026-08-17** (090) |
| 2 | **G-13** AEWV / accredited employer | 3/13 | parked — strongest case to un-park |
| 3 | **G-14** professional & tertiary quals | 6/13 carry one | open |
| 4 | **G-12** sector list too narrow | 3/13 | open |
| 5 | **G-20** pre-employment checks | 2/13 | open |
| 6 | **G-2** role vocabulary | 2/13 | **shipped 2026-08-17** |
| — | G-15…G-19, G-21 | 1–2 each | open |

**The two shipped yesterday were the right two.** G-1 was and remains the most frequent thing
these people say, and this batch adds four more instances of it.

**The next one is not a schema change.** G-13 is an integration and a parked phase, and G-14 is
a modelling decision (a free-text qualifications list is cheap; a structured NZQA/overseas
ladder is not). Both are bigger than a column, so they belong on the map as decisions rather
than in the next commit.

## What this adds to the map

- **T-06e — how do we fork employer posts out of the seeker collection?** R2-1. The plumbing
  exists; the human step does not, and one live Canterbury employer lead is already sitting in
  the wrong pile.
- **T-06f — how do we dedupe the same person across groups and handles?** R2-2. Compliance
  edge, not just tidiness: an opt-out under one handle does not suppress the other.
- **T-05 gets a real subject.** Walk the Fairlie post through `/jobs/new` instead of inventing
  a farm — seasonal, short-term, 54-point rotary, 2-off-8, room in a shared house. If the
  wizard cannot carry that faithfully, that is the finding.
