# Phase discovery — Immigrant workers: helping farm employers & migrant seekers through the visa/admin maze

Status: **research / discovery** (2026-07-29). Not scoped for build yet — this frames the opportunity, the hard legal constraint, and a proposed phase shape for operator direction. Sources are current NZ official/reputable material (INZ, MBIE, IAA, DairyNZ, HRC); fast-moving figures are flagged "verify live."

---

## 1. Why this fits TopFarms

TopFarms already connects NZ farm employers and job-seekers and frames itself as *"matched, not sorted."* Migrant labour is a structural part of the pastoral/dairy workforce, and the path to hire one is a bureaucratic gauntlet that no existing farm job-board touches. The same marketplace we've built is the natural home for a **trust + workflow layer** over that gauntlet. It also dovetails with the cold-start: **accredited employers are a high-value lead segment.**

The catch — and the single most important finding — is a legal line we must design around from day one.

---

## 2. The hard constraint: we cannot give immigration advice (design around this)

**NZ Immigration Advisers Licensing Act 2007 (IALA).** Providing "immigration advice" without a licence is a **criminal offence — up to $100,000 fine and/or 7 years — even if given for free** (s 63/67).

> ⚠️ **CORRECTED 2026-08-18. `02-legal-line.md` is the authority and it supersedes what this
> section originally said** — that "TopFarms is not a licensed party. So we do **not** advise;
> we build rails and refer the advice."
>
> **That is wrong, and reading it first makes you design the wrong product.** The founder holds
> a **current NZ practising certificate**, and under **IALA s 11 NZ lawyers with a current
> practising certificate are exempt from the licensing requirement**. No IAA licence and no
> partner LIA are needed. The advice layer can be **in-house**, which is the moat — see
> `02-legal-line.md`. (An IAA licence and a practising certificate cannot be held at the same
> time; the regimes are alternatives.)
>
> The rest of this file still assumes the referral-only posture. Read `02-legal-line.md` before
> acting on any of it.

**What "advice" is (s 7):** using immigration knowledge to *advise, direct, assist or represent* a person on a NZ immigration matter. The moment generic public info is **tailored/applied/interpreted for an individual** ("based on your situation, apply for X / you qualify"), it's regulated advice.

**What s 7 explicitly EXCLUDES (our safe zone):**
- **Publicly-available information** (incl. INZ's own material).
- **Clerical work** — recording/organising info, and *filling in a form with information the client supplies* (pure transcription, not deciding what goes in it).
- **Settlement services** — housing, schools, English classes (nothing about the visa itself).
- **Referral** — directing someone to INZ or **to a list of licensed immigration advisers** (explicitly named as not-advice).

**Design principle: build information + clerical + settlement + referral rails; hand every judgment call to a licensed adviser/lawyer.** Two features must be lawyer/LIA-reviewed before any build because they most likely cross the line: an **eligibility "you qualify" verdict**, and an **AI chatbot that personalises**. (Statute: legislation.govt.nz IALA s 7 & s 11; IAA "what is immigration advice" factsheet.)

---

## 3. The visa landscape (what farm hiring actually runs on)

- **AEWV (Accredited Employer Work Visa)** is the primary pathway — a **3-step, employer-led gauntlet**: (a) **employer accreditation** (~$775 standard, ~10 working days), (b) **job check** per role (~$735; usually requires 3-weeks advertising + a labour-market test), (c) the **migrant's visa** (~$1,500+ in fees/levies; 4–6 wks). *(Fees flagged verify-live — sources disagreed.)*
- **RSE is horticulture/viticulture ONLY — NOT dairy/pastoral.** A common employer misconception; we should never surface RSE to a dairy employer. The dairy "seasonal" equivalent is the **new Peak Seasonal Visa** (from 8 Dec 2025), which for the first time covers **calf rearers / relief milkers** (7-month peak-season visa).
- **Median wage removed from AEWV (10 Mar 2025)** → employers now pay the **NZ market rate** (min-wage floor only). There is **no dairy-specific wage exemption** (that scheme ended and never included dairy). Median wage (**$35.00/hr from 9 Mar 2026**) still governs the *5-year-stay* (1.5×) and *skip-advertising* (2×) triggers and residence checks.
- **Residence pathway for dairy exists and matters for retention:** **herd manager and above** (ANZSCO **121313 Dairy Cattle Farmer**) are on the **Green List, Tier 2 (Work-to-Residence)**. Farm assistants are **not** on the Green List. *(Exact dairy time-in-role/pay threshold flagged verify-live.)*
- **Working Holiday Visas** are the realistic channel for **casual/relief/seasonal** labour — no accreditation needed; holders can take any job.

**Role → visa map (dairy):** calf rearer/relief milker → Peak Seasonal; farm assistant → AEWV (max stay now 3 yrs); herd manager / farm manager → AEWV **+ Green List residence pathway**.

---

## 4. Where it hurts (the pain we'd relieve)

**Employer:** accreditation evidence (genuine/sustainable business, compliance history), the **job-check labour-market test** (advertising duration/wording, MSD engagement), proving **market rate**, and **document consistency** across all three steps (mismatched title/hours/pay = decline). Ongoing compliance modules + renewals.

**Migrant seeker:** the biggest problem is **finding a genuinely accredited employer with a real job** — and it's the biggest exploitation vector. Documented scams of **$30k–$50k for jobs that didn't exist**; the Human Rights Commission's 2024 review found the AEWV scheme "may be enabling human trafficking, systemic exploitation and modern slavery." Migrants are visa-tied to the employer and afraid to report. There's a public accredited-employer register, but migrants can't easily verify a specific offer.

**Existing services & the white space:** LIAs/law firms (expensive, 1:1, don't solve sourcing/matching), ag recruiters (recruitment ≠ compliance; some are the scam vector), RSE agents (hort/viti only), INZ self-serve (free but fragmented, not workflow-shaped), general job boards (zero compliance layer). **Nobody owns a trusted, accredited-verified matching marketplace with a safe workflow layer for dairy/pastoral.**

---

## 5. Proposed phase shape — all on the safe side of §2

**MVP candidates (zero/low IALA risk — information, clerical, settlement, referral, matching):**

1. **Verified Accredited Employer marketplace** *(highest leverage, lowest risk).* Cross-check employers against INZ's **public accredited-employer register**; show a "Verified accredited" badge; let seekers filter "employers who can sponsor." Directly attacks the migrant scam/trust problem. Pure matching + public info.
2. **Visa-aware matching.** Seekers state visa status (WHV / needs AEWV / residence / on Green List pathway); employers state accreditation + which visa a role supports. Match on it. Pure marketplace data.
3. **Employer workflow helper (info + clerical).** Guided, generic checklist for accreditation + job check (linked to INZ), document collection (clerical), a **market-rate / median-wage reference** shown as a *public-data lookup* (never "you qualify"), and a compliant **employment-agreement template** (point to MBIE's official builder). Surfaces the rules; never states the conclusion.
4. **"Find a licensed adviser" directory + hand-off** *(explicitly safe under s 7; the monetisation bridge).* Mirror/link the IAA register; optional partnered/in-house LIA for the advice layer.
5. **Settlement resources** (housing, schools, banking) — safe carve-out, genuinely valuable.

**Deliberately deferred until a lawyer/LIA signs off (do NOT build blind):**
- Any **eligibility "you qualify" output.**
- Any **AI chatbot that personalises** visa questions (constrain to cited public-info retrieval with hard refusals if built at all).

---

## 6. Open questions for the operator (direction needed before scoping)

1. **Which half first?** Seeker-side *verified-accredited marketplace + visa matching* (my recommendation — highest leverage, lowest risk, ties to cold-start), or employer-side *accreditation/job-check workflow helper*?
2. **The advice bridge:** directory-only referral, a formal **LIA partnership**, or an in-house licensed adviser? This is the natural revenue line and the safe way to actually help with the judgment calls.
3. **How deep on employer tooling** — surface-the-rules info/checklists only, or clerical form-assist too?
4. **Do you have (or want) a NZ immigration lawyer / LIA** to review the borderline features and the wage-calculator framing before we build anything near the line?
5. **Which segments** — dairy first (clearest visa map + Green List residence hook), or pastoral/sheep-&-beef too (AEWV-only, no confirmed Green List)?

---

*Verify-live before quoting to users:* all INZ fees; the exact Green List dairy time-in-role & pay threshold; whether any sheep-and-beef role is Green-listed; the official median-wage multiples ($52.50 / $70). Get a lawyer/LIA sign-off on the eligibility/calculator/chatbot line.
