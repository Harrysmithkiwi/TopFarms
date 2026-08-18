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
| **G-13** | *"Are you accredited?"* was unanswerable; `jobs.visa_sponsorship` answers *"will you sponsor"* | 3+/23 hunting accredited employers | `091` `inz_accredited` + expiry + derived flag; `101` an admin checks it against the INZ register |

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

## What verifying accreditation taught us (D4, 2026-08-18/19)

The corpus said seekers hunt for accredited employers; `091` let farms say so; D4 asked whether
we could check it. Four findings worth keeping, because each one generalises past this feature.

**Feasible and permitted are different questions, and we asked them in the wrong order.**
The knowledge base had recorded the INZ register as *"feasibility CONFIRMED"* since July, on the
strength of a JSON endpoint that answers a bare `curl`. That was true and it was not the
question. The terms of use forbid *"scraping… automation, or any similar data gathering,
extraction or monitoring method"* and require access *"via standard web browsers only"*. Reading
them took three minutes and closed a phase we had costed as an Edge Function plus a cron plus a
mismatch queue. **Read the terms in the same sitting as the spike.** A permissive `robots.txt` is
not a permission — it governs crawlers, and the terms govern us.

**The scale argument beat the design.** 29,000 accredited employers, zero employer profiles in
prod. The manual version — a link and two buttons on a screen an admin is already looking at —
works at five employers and at five hundred, and it took one migration. The automated version was
never buildable anyway, but we would have found that out *after* designing around it.

**Absence of evidence is the state that needed the most care.** INZ's own page says some
employers opt out of being published, and a mistyped digit in a 13-digit NZBN returns the
identical HTTP 400 as a genuine miss. So *"the register does not confirm this"* has at least five
causes and only one of them is dishonesty. That ruled the whole response: clear the claim (the
claim is the harm), leave the listing alone, and word the UI so an admin reading it later does
not mistake a privacy setting for a lie.

**A "not found" has no natural home in a schema, and that is where the bug hides.** A
confirmation had a column waiting for it since `091`. A refusal did not — clearing
`inz_accredited` leaves the row byte-identical to an employer who never claimed anything, so the
admin loses the fact that they looked. `admin_audit_log` already held it. **When an outcome has
nowhere to be recorded, check whether the log already records it before adding a column.**

## Guardrails learned from this corpus

- **Never reference private circumstances** a post volunteers — a broken leg, a pregnancy, a
  death, hardship, a farm that mistreated stock. Several of these posts do. Already encoded in
  `lead_outreach_config`; keep it.
- **Do not charge seekers.** They are the scarce side, several are low-income migrants and single
  parents, and the Facebook groups' goodwill is the entire distribution channel.
- **A self-declared trust claim is not a verified one** (F-11). `inz_accredited` sits outside
  `employer_verifications` on purpose — and it stayed outside when the check became real (`101`).
  The ladder answers *"is this a real farm run by real people"*; accreditation answers *"has INZ
  licensed them to hire migrants"*. Folding the second into the first makes every unaccredited
  farm — most NZ dairy farms — look less trustworthy than it is, and makes an accredited one look
  like **we** vouched for it. "An admin reviewed it" is not the criterion for the ladder; "it is
  the same kind of claim" is.
- **Do not charge for a trust signal.** Verifying accreditation sits on the
  accreditation-as-a-service line and was worth asking about. The answer is no: if checking is a
  paid upgrade, the free default is a board of unchecked claims advertised to the people who lose
  money when one is false. A badge everyone eligible gets is readable by its absence; a badge only
  buyers hold says nothing. The paid work is helping a farm *get* accredited, not looking them up.
- **Show which claim a seeker is reading, or show neither.** "They say so" and "we checked" are
  different claims. Until both can be displayed honestly, the `/jobs` copy says what is actually
  true and no more.
