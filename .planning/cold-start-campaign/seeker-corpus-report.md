# What 23 real seeker posts say — roles, skills, conditions, visas, and where the money is

Corpus: **23 posts** saved from seven Facebook groups (NZ Dairy Jobs, Canterbury Farm Jobs,
Dairy & Drystock Farm Jobs Canterbury NZ, NZ Farming Jobs, NZ Backpacker JOBS, Australian
Farming Jobs, plus the round-1 sources), 2026-06-22 → 2026-08-18. One is an employer post; one
is Australian. Analysed against the live schema.

This report answers four questions the operator asked: what roles/skills/experience these people
have and want, what conditions they need, what the visa picture is, and where TopFarms can add
value it can charge for.

---

## 1. Roles — the demand is bimodal, and the middle is thin

| Role sought | Count | In `ROLE_TYPES`? |
|---|---|---|
| Farm Assistant / Dairy Assistant | 7 | ✅ Farm Hand / General |
| Calf Rearer | 5 | ✅ **added 2026-08-17** |
| Relief Milker (sole or as fallback) | 5 | ✅ |
| Herd Manager / 2IC | 4 | ✅ |
| Manager / solo manager | 3 | ✅ |
| Stock work / drystock | 3 | ✅ **Stock Manager, added 2026-08-17** |
| Couples position | 2 | ✅ `couples_seeking` |
| Shepherd | 1 | ✅ **added 2026-08-17** |
| "Anything / any general farm duties" | 3 | ⚠️ only "Other" |

**All three roles added on 2026-08-17 are load-bearing in this corpus** — Calf Rearer is the
*second most requested role in the entire sample*, behind only farm assistant. That addition
would have been needed within a week regardless.

### Experience is bimodal — 9 experienced, 8 entry-level, and almost nobody between

**Experienced (3–10+ years):** 10 yrs herd manager/2IC · 7 yrs 2IC/manager · 5+ yrs commercial
dairy · 4 yrs dairy · 4 yrs pig farming · 3.5 yrs dairy · 3 seasons · managed 1,300-head dairy
goats with staff · ran 600 acres of fattening beef solo.

**Entry / green:** *"I'm green in the industry"* · *"some experience working around sheep/cows"*
· 12-week course + 8 weeks hands-on · one full season calf rearing · a backpacker with adjacent
outdoor work · an Argentinian with none.

This matters more than it looks. **The product implicitly assumes the experienced end.**
`years_experience` is an integer, `min_dairy_experience` gates jobs, and `dairynz_level` is a
ladder. Nothing models the entry-level seeker as anything but a deficit — yet they are **35% of
this sample**, and for calf rearing and relief work keen-and-green is often exactly what a farm
wants (see §3, G-19).

### The skills people actually list

Clustering all 23, in frequency order: **milking** (rotary / herringbone, named by shed size —
"40-aside", "54-point", "80-bail", "68-bail") · **vehicles** (2- and 4-wheelers, quads, tractors,
manual, motorbikes, HT licence in progress) · **break fencing** · **calf rearing** (colostrum,
feeding, scours/pneumonia) · **animal health** (mastitis, lameness, hoof/tail trimming, drenching,
vaccinating) · **feeding out / feed pad / TMR / plate meter** · **effluent** · **vat and plant
wash** · **teat spraying** · **weed spraying** · **AI (artificial insemination)** · **calving
assistance** · **pasture management** · **MINDA / herd software / record-keeping** · **fencing**
· mowing, raking, baling · **yard work / mustering**.

Against the 24-competency taxonomy this is **far more granular than the schema can hold** — the
taxonomy is right for matching breadth and cannot express depth, which is precisely what a
specialist sells (G-21). "Animal health & husbandry" swallows AI, hoof trimming, metabolic
disorder prevention and colostrum protocols alike.

### The most interesting single post

One seeker lists what he **cannot** do, unprompted:

> *"I haven't had much to do with pasture management but am wanting to learn more about this…
> I haven't done fertilising spreading but am keen to learn. I have done mowing, raking but not
> baling."*

A structured **have / want-to-learn** split, volunteered. Three others say some version of
"eager to learn". Nothing in the schema captures learning intent — and it is arguably the most
valuable field for an employer deciding whether a green candidate is worth training. It is also
the natural bridge to v2.1's training phases (24–26), which are gated on liquidity.

---

## 2. Conditions — what they need, ranked by frequency

| Condition | Count | Schema |
|---|---|---|
| **Accommodation** (needed, or traded for) | 8 | ✅ but see below |
| **Part-time / relief / weekends / short-term** | 9 | ✅ **shipped 2026-08-17** (090) |
| **Tight geographic constraint** (named town/radius) | 7 | ⚠️ `region` + `preferred_regions` only |
| **Family / sole parent / couple** | 5 | ✅ `family`, `couples_seeking` |
| **Immediate start** | 7 | ✅ `availability_date` |
| **Own vehicle / drive-in** | 4 | ⚠️ G-18 |
| **Roster / early starts** | 3 | ⚠️ G-15 |
| **Will relocate anywhere** | 4 | ✅ `open_to_relocate` |

Three things the schema cannot carry:

**Geography is finer than regions.** *"Pleasant Point / Cave areas"*, *"North Canterbury"*,
*"one hour around Auckland"*, *"close to Wellington"*, *"around Rotorua"*, *"Benneydale / Te
Kuiti"*. Seven of 23 name a town or a radius. `region` is a 16-item list; Canterbury alone spans
400km. A seeker in Pleasant Point matching a Canterbury job in Kaikōura is a bad match that both
sides will blame the product for.

**Accommodation is a negotiation, not a boolean.** *"in return for cheap out of town long term
accommodation"*, *"will travel depending Accommodation/Distance"*, *"with either accommodation or
shared accommodation"*. It trades against wage, distance and roster. We model
`accommodation_needed` (bool) and `min_salary` (int) as independent.

**The acceptance ladder.** *"Would look at even starting off doing weekends / or ideally a
permanent part time or even better full time."* That is a ranked preference, not a set. `090`'s
multi-select captures the set; it cannot express the ordering.

---

## 3. Visa — 7 of 23, and three distinct pathways

**30% of this corpus is visa-touched**, and three name a specific visa product:

| Seeker | Pathway | Detail |
|---|---|---|
| Calf rearer, Canterbury | **Peak Seasonal Visa** | *"LOOKING FOR A PEAK SEASONAL VISA SPONSOR"* — one full season calf rearing, **documentation ready**, open to anywhere in NZ |
| Veterinarian | **AEWV** | Returning from parental leave **Spring–Summer 2027**, lining up an **accredited employer in advance** |
| Dairy assistant (NC II Ruminants + BSc) | **AEWV** | *"willing to support the visa process (such as the Accredited Employer Work Visa)"* |
| Herd manager, Sri Lankan | AEWV (implied) | Publicly asked in comments: *"right to work in NZ or seeking an accredited employer?"* |
| French backpacker | **Working Holiday** | Beekeeping, forestry, landscaping, factory |
| Filipino assistant | resident/other | NZ trade course + volunteering to build NZ experience |
| Argentinian, Sydney | **AU 417/462** | §5 |

**The Peak Seasonal Visa is new evidence.** `docs/immigration/01-visa-landscape.md` covers AEWV
in depth; a seeker actively hunting a Peak Seasonal sponsor for **calf rearing** — the exact
seasonal peak — is demand for a pathway the knowledge base has not scoped. Worth adding.

**What the schema offers today:** `visa_status` (`nz_citizen` / `permanent_resident` /
`working_holiday` / `student` / `needs_sponsorship`) and `jobs.visa_sponsorship` (boolean).

**Why the boolean fails.** These people are not asking "will you sponsor". They are asking
**"are you accredited"** — a specific INZ status a farm either holds or does not, without which
a migrant cannot apply at all. A boolean cannot answer it, and no seeker can filter on it. This
is **G-13**, and at 3+ of 23 it is the highest-frequency gap that is not already shipped.

### The founder's exemption changes the answer

`docs/immigration/00-strategy-overview.md` says *"TopFarms is not a licensed party… we do not
advise"*. **`02-legal-line.md` supersedes it**: Harry holds a current **NZ practising
certificate**, and under **IALA s 11 lawyers are exempt from licensing**. The advice layer can be
in-house.

⚠️ **Doc drift worth fixing** — `00` still frames the whole strategy around a constraint `02`
removes. Anyone reading the overview first will design the wrong product.

---

## 4. Where the money is — and it is not the seekers

### Do not charge the seekers

Three reasons, in order of weight:

1. **They are the scarce side.** Prod has 0 seekers. Charging the side you are trying to
   recruit, to solve a cold start, is backwards.
2. **These are low-income workers**, several of them migrants, one a single mother, one
   sole father of two. Charging a migrant for access to work is the exact shape of the
   exploitation pattern that destroys trust in this market — and the goodwill of the Facebook
   groups is the entire distribution channel.
3. **Legal exposure around premiums for employment.** Charging a worker a fee to obtain work is
   restricted in NZ. **Harry's call, not mine** — flagging it, not ruling on it.

**But legal fees are not a placement fee.** Harry, as a lawyer, can charge professional fees for
visa work. That is a clean, defensible revenue line on the seeker side that is not "pay to
access jobs": the job board stays free, the legal engagement is separate, disclosed, and
delivered under a practising certificate with its own engagement letter and PI cover.

### The employer side is where the willingness to pay is

Ranked by (pain × frequency × defensibility):

**① Accreditation-as-a-service — the strongest.** A farm **cannot hire any migrant** without INZ
accreditation. Std ~$775 in fees plus the work, first grant ~12 months then renewable 24. Three
seekers in this corpus are actively hunting accredited employers and cannot find them; that is
demand on both sides of the same missing thing. Harry can do this work as a lawyer. Recurring at
renewal.

**② The Job Check advertising requirement — and this is the strategic one.**

Step (b) of AEWV requires, for most roles, that the employer **advertise the role for ≥3 weeks
and run a labour market test**. TopFarms *is a job board*. The compliance artefact INZ wants —
"this role was advertised publicly from X to Y, it received N applicants, M of whom were
NZ residents" — **is a natural by-product of a listing you already host.**

That reframes the product. TopFarms stops being a nice-to-have job board and becomes
**compliance infrastructure a farm needs in order to hire the migrant it has already found.**
And note what it does to the cold start: it gives a farm a *reason it cannot refuse* to post a
listing, which is exactly the M3 blocker. **The visa play and the inventory problem have the
same solution.**

I would want the ≥3-week and labour-market-test detail verified against current INZ material
before building — `01-visa-landscape.md` flags these as "verify live" and they move.

**③ Ongoing accredited-employer compliance.** Accreditation carries continuing obligations
(employment agreements, wage records, settlement support). Annual, recurring, and unglamorous —
which is why farms will pay someone else to hold it.

**④ The accredited-employer badge.** Already feasibility-confirmed (INZ list API → NZBN +
expiry). Cheap, and it is the thing three seekers in this corpus are searching for by hand.

---

## 5. Australia's 88 days — real, large, and deliberately not now

One post: a 25-year-old Argentinian in Sydney, *"looking to complete my 88 days of regional farm
work to extend my visa"*, open to fruit picking, packing, animal care or general duties.

**The opportunity is genuinely large.** Working Holiday (417/462) holders must complete 88 days
of specified regional work to unlock a second-year visa. It is a well-known market with a
well-known trust problem: unpaid trial days, farms that will not sign forms, and outright fake
day-signing. A platform where days are **logged against a verified ABN employer and the record is
the artefact** is a real product in a market with a trust crisis.

**And the legal moat already exists.** `02-legal-line.md` records that Harry also holds a
**current NSW practising certificate**, and Migration Act 1958 s 276–277 lets an Australian legal
practitioner give immigration assistance without OMARA registration. That is not a small thing —
it is the same unfair advantage as the NZ side, in a market roughly an order of magnitude bigger.

**Now the honest part.** It is a **different country, different visa regime, different sectors**
(horticulture dominates specified work, not dairy), different employers, different groups, and a
different compliance artefact. TopFarms currently has **0 jobs, 0 applications and 0 real users
in New Zealand.** Building a second marketplace before placing one worker in the first is the
classic way to lose both.

**Recommendation: record it as a validated adjacency with the moat already in place, and revisit
after NZ liquidity.** The evidence is one post and the reasoning is sound — but one post is one
post, and the cheapest next step is not to build anything. It is to save 20 Australian posts the
way these 23 were saved and see whether the pattern holds. If it does, the case will still be
there in three months, and it will be a case built on evidence rather than on a good idea.

---

## What I would do next, in order

1. **G-13 / the accredited-employer field.** Highest-frequency unshipped gap, both sides want it,
   feasibility already confirmed, and it is the entry point to ①–④ above.
2. **Verify the Job Check advertising requirement** against live INZ material. If it holds, it is
   the strongest strategic finding in this report and it solves M3 as a side effect.
3. **Fix the doc drift** — `00-strategy-overview.md` still says TopFarms cannot advise.
4. **Add the Peak Seasonal Visa** to `01-visa-landscape.md`; there is live demand for it.
5. **Nothing on Australia yet.** Save 20 posts first.

Unshipped gaps from earlier rounds stand unchanged: G-12 (sector list cannot hold beekeeping,
forestry, pigs, poultry, dairy goats, horses), G-14 (a qualified vet must record themselves as
having no qualifications), G-15…G-21.

**New this round:** **G-22 — geography is finer than region** (7 of 23 name a town or radius).
**G-23 — the acceptance ladder** is ordered, not a set. **G-24 — learning intent** ("keen to
learn X") has no home and is the bridge to the gated training phases. **G-25 — contractor
status**: one seeker is *"GST registered"*, i.e. self-employed contract labour, not an employee
— an engagement type `contract_type` does not distinguish.
