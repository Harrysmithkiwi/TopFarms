# AEWV Job Check advertising — verified against live INZ, 2026-08-18

**Gate D1 of the Phase D work order.** `01-visa-landscape.md` flags these rules as fast-moving,
and the campaign map recorded them from memory as "~3 weeks with a labour market test". Verified
directly against Immigration New Zealand before any build.

**Verdict: the premise holds. The shape is different, and better for us than assumed.**

---

## 1. How long the job must be advertised

| ANZSCO skill level | Minimum advertising period | Extra requirement |
|---|---|---|
| 1–3, or a NOL occupation | **14 days** | — |
| **4–5** | **21 days** | **must also engage in good faith with Work and Income** about the vacancy |

**Most TopFarms roles sit in band 4–5** — farm assistant, farm hand, dairy assistant, calf
rearer are ANZSCO skill level 4/5 work. Herd manager and farm manager may reach level 2–3.

So "~3 weeks" was right for the roles we actually list, and wrong as a general rule. **Do not
state a single number in product copy** — it depends on the occupation, and getting it wrong
costs a farm its Job Check.

The Job Check must be applied for **within 90 days of the advertisement closing**.

## 2. What INZ actually asks for — and this is the finding

The employer must report:

- the number of **candidates that applied**
- the number of **New Zealand citizens or residents that applied**
- the number **assessed as suitable**
- the number **hired**
- for skill level 4–5: **why any New Zealanders who applied were not suitable or available**

**It is a set of counts about the applicant pipeline, not a screenshot of a listing.**

That is the opposite of what the campaign note assumed, and it is much better news:
**TopFarms already holds every one of those numbers.** `applications` joined to
`seeker_profiles.visa_status` gives applicants, which of them were citizens or residents, and
`VALID_TRANSITIONS` past `applied` gives "assessed"; `hired` gives hired. The compliance
artefact is a **report generated from the applicant pipeline** — a by-product of a board that
is already doing its job.

INZ does not publish a required format for supporting evidence (screenshots, URLs) on this page.
Treat the counts as the deliverable and the listing as the provenance.

## 3. What the advertisement itself must contain

> a job description with details of the key tasks, duties and responsibilities; the minimum and
> maximum rate of pay or salary, or estimated actual earnings if actual earnings are not
> guaranteed; type of work and minimum guaranteed hours of work; the minimum skills, experience
> and qualifications for the job.

Mapped onto `jobs`:

| INZ requirement | Column | Status |
|---|---|---|
| key tasks, duties, responsibilities | `description_daytoday` | nullable |
| minimum **and maximum** pay | `salary_min`, `salary_max` | both nullable |
| type of work | `contract_type` | NOT NULL ✓ |
| **minimum guaranteed hours** | `hours_min` | nullable |
| minimum skills / experience / qualifications | `min_dairy_experience`, `qualifications`, `seniority_level` | all nullable |

**A complete TopFarms listing satisfies the content rule. A typical one does not** — only
`contract_type` is required, so a farm can publish a listing that cannot support a Job Check and
nothing anywhere says so. That is the concrete, buildable gap: a **compliance-readiness check on
a listing**, naming the missing fields.

## 4. Exemptions — no advertising evidence needed if the job

- is on the **Green List** and meets its requirements, or
- pays at least **NZD $70.00 an hour**, or
- is on the **Global Workforce Seasonal Visa** list.

Farm wages are nowhere near $70/hr, so the exemption that matters for us is Green List, and
whether any pastoral role is Green-listed is still flagged "verify live" in `01`.

## 5. What this changes

- **The wedge is real**, and it is a pipeline report rather than an advertising screenshot.
- **It is not a filter or a badge** — it is a document a farm needs in order to hire the migrant
  they have already chosen, which is why they cannot refuse to post.
- **Do not put a single advertising duration in the UI.** Band it by occupation or say nothing.
- The **Work and Income good-faith step for skill level 4–5 is outside TopFarms** and must not
  be implied as covered.

## Sources

Fetched 2026-08-18:

- [Advertising the job before your job check](https://www.immigration.govt.nz/work/for-employers/getting-accreditation-or-approval-to-hire/employer-accreditation-for-the-aewv/applying-for-a-job-check-process-steps/advertising-the-job-before-your-job-check/)
- [Applying for a job check: process steps](https://www.immigration.govt.nz/work/for-employers/getting-accreditation-or-approval-to-hire/employer-accreditation-for-the-aewv/applying-for-a-job-check-process-steps/)
- [Overview of AEWV employer accreditation and job check](https://www.immigration.govt.nz/work/for-employers/getting-accreditation-or-approval-to-hire/employer-accreditation-for-the-aewv/aewv-employer-accreditation-and-job-check-process/)

**Re-verify before shipping anything user-facing.** These rules changed twice in 2025.

---

## D4 — INZ register verification: **superseded by `06`, same day**

This section said the register's shape "was not established here — it needs the page inspected
in a browser", and called D4 "a phase, not a ticket". Both were inspected and answered on
2026-08-18: see **`06-inz-register-verification.md`**.

Short version, so nobody re-derives it from this page: the register **is** keyed on NZBN and
**does** publish an accreditation expiry, through a JSON endpoint — and INZ's terms of use
forbid reaching that endpoint by any means other than a standard web browser. So the lookup is
a one-line admin task rather than a fuzzy-matching phase, and the automation is closed rather
than deferred. The re-verification schedule this section worried about was already solved by
`091`: `accredited_employer` is recomputed per read against the expiry date, so a lapsed claim
stops advertising itself with nobody switching it off.

`accredited_employer` still stays outside `employer_verifications` — per F-11, a self-declared
trust claim is not a verified one, and an admin confirming it against a register does not make
it an earned identity rung.
