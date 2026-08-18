# Match score v3 — proposed weighting

**Status: DRAFT for operator decision (Phase C2).** Nothing implemented.
Current live model is `algorithm_version 2`, read from `pg_proc` 2026-08-18.

---

## What is wrong with v2, beyond the missing fields

**1. The biggest weight is on the least important dimension.**
`shed_type` is 25 — the largest single block — while `role_type` is worth **zero**. A
herringbone-vs-rotary difference is one sector's equipment detail that a competent farm hand
crosses in a week. The role *is the job*. v2 ranks the equipment above the work.

**2. Percentages are not comparable across jobs, but three surfaces sort by them.**
`v_max` is per-pair: 55 base, +25 if the job lists sheds, +20 if it has skills, +5 if the
seeker is couples-seeking. So a sparse listing is scored out of 55 and a thorough one out of
100. A seeker who fits on location, accommodation, salary and visa scores **100% on the empty
listing** and can only reach ~80% on the detailed one. Seeker search, the applicant list and
the match-alert email all `ORDER BY total_score DESC`. **The emptier listing wins** — and we
are about to ask employers to fill in *more*.

**3. Everything is additive, so nothing can be a dealbreaker.**
A migrant needing sponsorship, applied to a job that will not sponsor, loses **5 points out of
~100**. That is not a gradient, it is a legal fact. Same for a seeker who needs housing on a
job with none. v2 cannot say "impossible", only "slightly worse".

**4. Entry-level is modelled as pure deficit.**
~35% of the 23-post corpus is green. `min_dairy_experience` and `dairynz_level` only ever
subtract. Nothing expresses that an over-qualified herd manager is *also* a poor fit for an
entry role — they leave in three months.

---

## v3 — gates × points

### Layer 1: GATES (multiplicative, not points)

Applied to the final score. Multiplicative because the failure is **categorical**: someone who
cannot legally work the job is not "80% as good", and additive weighting can only express that
with a number so large it distorts every other dimension. Gates also compose correctly — two
dealbreakers are worse than one.

| Gate | Fires when | Multiplier |
|---|---|---|
| **Visa** | seeker needs sponsorship AND `visa_sponsorship = false` | **×0.15** |
| **Terms** | seeker stated `contract_type_pref` AND no overlap with `contract_type` | **×0.40** |
| **Accommodation** | `accommodation_needed = true` AND job offers none | **×0.25** |

Not a hard filter, and not zero. Hiding jobs is fatal at zero inventory, and seekers do
negotiate. A heavy multiplier sinks the pair without vanishing it.

In the UI these surface as **blockers**, not lost points — "this farm will not sponsor a visa"
is more useful to read than "−40".

### Layer 2: POINTS (fixed denominator of 100)

| Block | Dimension | Pts | v2 | Note |
|---|---|--:|--:|---|
| **Role & work type — 30** | `role_type_pref` ∩ `role_type` | 18 | **0** | exact 18 · adjacent 10 (Farm Hand↔General, 2IC↔Herd Manager, Assistant Manager↔2IC) |
| | `contract_type_pref` ∩ `contract_type` | 12 | **0** | the most common ask in the corpus, 9 of 23 |
| **Capability — 25** | skills (required / preferred) | 15 | 20 | keep v2's required-vs-preferred maths |
| | experience vs requirement | 10 | **0** | **two-sided** — see below |
| **Practical fit — 25** | location | 15 | 20 | same region 15 · relocating 11 · adjacent 9 |
| | accommodation quality | 10 | 20 | pets / family / couples / utilities; the binary moved to a gate |
| **Sector & context — 12** | `sector_pref` ∩ `sector` | 6 | **0** | five-sector site, never scored |
| | herd size familiarity | 3 | 0 | |
| | shed type | 3 | **25** | demoted |
| **Timing — 8** | `availability_date` + `notice_period` vs `start_date` | 8 | **0** | cheapest unscored signal we hold |

Couples and visa leave the points table entirely: couples folds into accommodation quality,
visa becomes a gate.

**Two-sided experience.** Score peaks at "meets the requirement" and decays in *both*
directions. Under-qualified loses points as it does today; over-qualified also loses them,
because a 10-year herd manager in an entry Farm Assistant role is a three-month hire. This is
the fix for the corpus's loudest structural complaint (G-19): keen-and-green is a positive
signal for calf rearing and relief work, not a deficit.

### Layer 3: THE UNSTATED RULE

A dimension neither side states pays **60% of its weight**, to both sides.

- The job leaves a field blank → every seeker gets 60% of it. A vague listing lands mid-pack.
  It cannot beat a listing that genuinely fits, and **it cannot be gamed by leaving fields
  empty**, which is the v2 defect.
- The seeker leaves it blank → 60% too. We do not punish a half-finished profile, and we do
  not reward it either.

The denominator stays fixed at 100, so scores are comparable across every job. The honest
`MatchBreakdown` line *"Not applicable to this role — excluded from the score"* becomes false
and must change to *"Not specified"*.

---

## Behaviour against real corpus posts

| Seeker (from the 23) | Job | v3 | Verdict |
|---|---|--:|---|
| "relief milking only", Waikato, 5 yrs | permanent Waikato farm manager | **≈22** | terms gate ×0.4 + zero role block. Correctly buried — **v2 ranks this pair mid-70s** |
| same seeker | Waikato relief milking role | **≈89** | |
| green backpacker, no terms stated, will relocate, needs a room | seasonal calf rearing, room on farm | **≈75** | two-sided experience pays for entry-level instead of penalising it |
| qualified vet, needs sponsorship | non-sponsoring dairy job | **≈12** | visa gate. v2 costs this 5 points out of 100 |

---

## Open questions for the operator

1. **Is 3 points too brutal for shed type?** It is the loudest change. Argument for: it is
   dairy-only equipment trivia on a five-sector site, learnable in a week, and it currently
   outranks the role. Argument against: NZ dairy employers ask about it constantly, and it may
   be a proxy for "has actually worked in a shed".
2. **Gate multipliers** — 0.15 / 0.40 / 0.25 are judgement, not evidence. With zero real users
   there is nothing to calibrate against yet.
3. **The 60% neutral** is the same shape.
4. **One score or two?** A seeker ranking jobs and an employer ranking applicants want
   different things. v3 stays one score deliberately — simpler, and there is no data yet to
   justify splitting. Revisit after the first 50 applications.
