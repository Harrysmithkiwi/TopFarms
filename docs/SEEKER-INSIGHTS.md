# Job seeker insights — what 23 real posts told us to build

**Product-facing digest.** Evidence, not intuition: 23 job-seeker posts saved from seven NZ
farming Facebook groups, 2026-06-22 → 2026-08-18, read literally and mapped against the live
schema.

Campaign-side analysis lives in `.planning/cold-start-campaign/` (`seeker-lane.md` post-by-post,
`seeker-corpus-report.md` for the full report incl. visas, monetisation and Australia). **This
file is the product view: who these people are, and the gap register with build status.**

**Method that worked, and should be repeated:** map each post's *literal words* against the live
schema, then **rank gaps by frequency across the corpus**. That ranking is what proved the two
gaps shipped on 2026-08-17 were the right two. Do not rank by how interesting a gap is.

---

## Who is actually posting

**Experience is bimodal — and the product assumes the wrong end.**

- **Experienced (~9):** 10 yrs herd manager/2IC · 7 yrs 2IC/manager · 5+ yrs commercial dairy ·
  4 yrs dairy · 4 yrs pig farming · 3.5 yrs dairy · managed 1,300-head dairy goats with staff ·
  ran 600 acres of fattening beef solo · a qualified **veterinarian**.
- **Entry / green (~8):** *"I'm green in the industry"* · 12-week course + 8 weeks hands-on ·
  one season calf rearing · a backpacker with adjacent outdoor work · someone with none.
- **Almost nobody in between.**

`years_experience`, `min_dairy_experience` and `dairynz_level` all model a green seeker purely as
a **deficit**, yet they are ~35% of the sample — and for calf rearing and relief work,
keen-and-green is often exactly what a farm wants.

**Roles sought:** Farm Assistant (7) · **Calf Rearer (5)** · Relief Milker (5) · Herd Manager /
2IC (4) · Manager (3) · Stock work (3) · Couples (2) · Shepherd (1) · "anything" (3).

**Conditions, by frequency:** part-time/relief/short-term (9) · accommodation (8) · immediate
start (7) · a **named town or radius** (7) · family / sole parent / couple (5) · will relocate
anywhere (4) · own vehicle / drive-in (4) · roster and early starts (3).

**Three things they volunteer that we never ask for:** drug- and smoke-free / *"I can pass all
pre-employment checks"* · English proficiency · and explicit **learn-gaps** — one post lists what
he *cannot* do (*"haven't done fertilising spreading but am keen to learn"*), which is arguably
the most useful field an employer could have when judging a green candidate, and the natural
bridge to the gated v2.1 training phases.

---

## Gap register

**Shipped**

| | Gap | Evidence | Shipped |
|---|---|---|---|
| **G-1** | Seekers could state a role but never the **terms** — no employment-type field at all | 9/23 want relief / part-time / short-term | `090` `contract_type_pref` |
| **G-2** | Role list was dairy-shaped on a site claiming five sectors | Shepherd, calf rearing, stock work | `ROLE_TYPES` += Shepherd, Stock Manager, Calf Rearer |
| **G-13** | *"Are you accredited?"* was unanswerable; `jobs.visa_sponsorship` answers *"will you sponsor"* | 3+/23 hunting accredited employers | `091` `inz_accredited` + expiry + derived flag |

**Open, ranked by frequency**

| | Gap | Evidence |
|---|---|---|
| **G-14** | Professional/tertiary quals have nowhere to go — **a qualified vet must record themselves as having no qualifications**. `certifications` = ATV/Tractor/4WD/First Aid/Growsafe/Chainsaw; `dairynz_level` caps at 4 | 6/23 carry one: DVM, BSc, NC II (Ruminants), NZQA L4 + L6, overseas trade certs |
| **G-12** | Sector list cannot hold beekeeping, forestry/logging, landscaping, pigs, poultry, **dairy goats**, horses, farm sitting | 3/23 |
| **G-22** | **Geography is finer than region.** 16 regions; Canterbury alone spans 400km | 7/23 name a town or radius |
| **G-20** | Pre-employment checks / drug- and smoke-free, volunteered unprompted | 2/23 |
| **G-15** | Roster. Employers state *"2 off 8 on"*; seekers have no roster preference and nothing matches on it | 3/23 |
| **G-24** | **Learning intent** — "keen to learn X" has no home; bridges to v2.1 training | 4/23 |
| **G-9** | Accommodation is a **negotiation**, traded against wage/distance/roster — we model `accommodation_needed` (bool) and `min_salary` (int) as independent | 3/23 |
| **G-21** | Skill taxonomy is coarser than seekers are — colostrum, TMR, growth scoring, ration analysis all collapse to "Animal health & husbandry" | specialists |
| **G-23** | The **acceptance ladder** is ordered, not a set: *"weekends, or ideally permanent part time, or even better full time"* | 1/23 |
| **G-25** | Contractor status — *"I'm GST registered"*, self-employed, not an employee | 1/23 |
| **G-16** | Availability far in the future (one seeker is lining up **2027**); jobs expire, so matching is noise both ways | 1/23 |
| **G-17** | English proficiency, volunteered by migrants because they know it is screened on | 2/23 |
| **G-18** | **Drive-in vs live-in** — `accommodation_needed=false` is the inverse, but drive-in is a positive statement | 4/23 |
| **G-19** | Entry-level as a **positive** signal (trainability, honest self-assessment) | ~8/23 |

---

## The finding that is not a field

**`compute_match_score` reads neither `role_type` nor `contract_type`.** Verified against the
live function body. So a seeker who says "relief only" is still ranked against permanent jobs,
and the role they want does not influence their matches at all.

Everything shipped above sharpens the **profile, the filters and the extractor** — none of it
changes **ranking**. Making role and terms scoring dimensions is a separate decision with its own
weight budget, and it is probably the highest-leverage matching work available.

---

## Guardrails learned from this corpus

- **Never reference private circumstances** a post volunteers — a broken leg, a pregnancy, a
  death, hardship, a farm that mistreated stock. Several of these posts do. Already encoded in
  `lead_outreach_config`; keep it.
- **Do not charge seekers.** They are the scarce side, several are low-income migrants and single
  parents, and the Facebook groups' goodwill is the entire distribution channel.
- **A self-declared trust claim is not a verified one** (F-11). `inz_accredited` sits outside
  `employer_verifications` on purpose.
