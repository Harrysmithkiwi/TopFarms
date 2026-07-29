# Gap analysis — tools & services for overseas-worker hiring, and what TopFarms can bake in

The question: for **overseas job-seekers** and **employers who want overseas workers**, what tools/services
exist today, where are the gaps, and can SaaS be baked into TopFarms for the visa/admin process?
Legend: **BUILD** (TopFarms builds) · **INTEGRATE** (bake in a SaaS) · **PARTNER** (LIA/agency/gov).
**Safe** = non-advice (per [`02-legal-line.md`](02-legal-line.md)) · **⚠ Advice** = needs a licensed adviser.

---

## 0. Feasibility gate — is the "verified accredited employer" badge buildable?

**Yes — via on-demand live lookup, not a maintained mirror.** The flagship anti-scam feature is viable.

- INZ exposes only a **searchable public web form** (input: 13-digit **NZBN** or trading name ≥3 chars → "currently accredited or not"), **updated daily**. **No official CSV/Excel/API.** A 2023 open-data request was declined; MBIE points to the website or a formal OIA request.
- Employers can **opt out of publication** → you can **prove accreditation, but NOT prove non-accreditation.** Absence = **"unverified", never "unaccredited".**
- It's queryable programmatically — third parties already run scraped copies (Applywave 24,823+, Hired.co.nz). **Build pattern:** query the form **on-demand keyed by NZBN** at onboarding/job-post + re-check periodically (accreditations get suspended/revoked — 145 revoked + 53 suspended as of Feb 2024). Badge reads **"Checked against INZ's public list on [date]"** — informational, not a guarantee.
- Pair with the **free NZBN API** (`api.business.govt.nz`) to resolve an employer to a canonical NZBN (legal name, entity type, status — *not* accreditation), then feed that NZBN to the INZ lookup.
- **First task of the build:** inspect the live form's request mechanism (JSON endpoint vs JS-rendered) + its ToS posture; keep an OIA periodic snapshot as a compliance fallback. **Classification: BUILD.**

**Slice-0 spike result (2026-07-29 — confirmed by live inspection):** the form calls a **JSON endpoint**, `POST https://www.immigration.govt.nz/list-api/getAPIResults/`, `multipart/form-data` body `query=<name or NZBN>` + `collection=2` (accredited list) + `page=1`. It returns clean JSON — per employer: **`employerName`, `tradingName`, `nzbn`, and `expiryDateOfAccreditation`** (+ `totalResults`, `totalPages`). So we get the **NZBN and the accreditation expiry date**, not just yes/no — we can show "accredited until [date]" and re-check near expiry. A server-to-server call (edge function) works; **one risk to handle: the site is behind Imperva/Incapsula bot protection** — server-side calls may be challenged, so mitigations (correct headers, low volume, or a periodic OIA snapshot fallback) belong in Slice 2. Opt-out employers still return no result → treat absence as "unverified", never "unaccredited".

Sources: [INZ accredited-employer list](https://immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list) · [data.govt.nz request 856](https://data.govt.nz/datasetrequest/show/856) · [NZBN API](https://portal.api.business.govt.nz/api/nzbn)

---

## 1. Pain points (what we're relieving)

**Employer:** accreditation evidence (genuine/sustainable business, compliance history — INZ does audits/site visits); the **job-check labour-market test** (advertising duration/wording, MSD engagement); proving **market rate** (a moving target); **document consistency** across all three steps (mismatched title/hours/pay = decline); ongoing compliance modules + renewals.

**Migrant seeker:** the #1 problem — **finding a genuinely accredited employer with a real job** — is also the biggest exploitation vector. Documented **$30–50k fake-job scams**; the **Human Rights Commission's 2024 review** found the AEWV scheme "may be enabling human trafficking, systemic exploitation and modern slavery." Migrants are visa-tied to the employer and afraid to report. A public register exists but migrants can't easily verify a specific offer.

Sources: [HRC AEWV Human Rights Review 2024](https://tikatangata.org.nz/cms/assets/Documents/Reports-and-Inquiry/Employment/Accredited-Employer-Work-Visa-review-report-2024/The-Accredited-Employer-Work-Visa-Scheme-_A-Human-Rights-Review-FINAL.pdf) · [INZ meeting AEWV requirements](https://www.immigration.govt.nz/work/for-employers/getting-accreditation-or-approval-to-hire/employer-accreditation-for-the-aewv/meeting-your-aewv-accredited-employer-requirements/)

---

## 2. Embeddable SaaS building blocks (admin/document side — all clerical/info, non-advice)

| Block | API? | Providers | Verdict | Note |
|---|---|---|---|---|
| **Identity / KYC** | Yes | **APLYiD** (NZ-native, AML-tuned), Onfido, Sumsub, Stripe Identity | **INTEGRATE** | Verify migrant ID + employer director → anti-scam gate. RealMe = govt digital-ID alt. |
| **Document checklist + secure upload** | — | (already have Supabase Storage + RLS + FileDropzone) | **BUILD** | Clerical, fully safe; cheapest as build on existing infra |
| **E-signature** (employment agreements) | Yes | DocuSign, Dropbox Sign, PandaDoc | **INTEGRATE** | Legally valid in NZ (Contract & Commercial Law Act 2017 s228) |
| **Employment-agreement generation** | No public API | MBIE Employment Agreement Builder (web tool) | **BUILD or deep-link** | Generate from MBIE's clause library, or link the official tool. Don't editorialise clauses. |
| **Payments** | Yes (Stripe in stack) | Stripe / Connect | **INTEGRATE** | For platform payments only |
| **Fee-escrow for jobs** | — | — | **DO NOT BUILD** | Charging migrants for NZ jobs is **unlawful**; escrow would legitimise the scam. Fight scams with the badge + KYC + no-fee transparency instead. |
| **Translation / interpreting** | Limited | DIA Translation, Interpreting NZ (certified); DeepL/Google (informational only) | **PARTNER** | INZ needs *certified* translations for official docs — machine-translate UI copy only |

**Case-management / adviser SaaS** (Ezymigrate NZ, Migration Manager AU, Boundless/Envoy/Alma) are **closed
adviser tools with no marketplace-facing APIs.** There is **no open "visa API" for NZ AEWV workflows.** So the
advice layer is a **human LIA partner**; TopFarms provides the clerical/matching software around them.

---

## 3. Journey gap analysis

### (a) Employer wanting overseas workers
| Step | Tools today | TopFarms move | Safe? |
|---|---|---|---|
| Learn the pathway | INZ website | **BUILD** public-info content | Safe |
| Become / hold accreditation | INZ online; LIAs | **PARTNER** LIA (application); **BUILD** eligibility info | ⚠ / Safe |
| Verify they're accredited | INZ web form | **BUILD** badge lookup (§0) | Safe |
| Meet job check / advertise | INZ; job boards | **BUILD** — TopFarms' core product already | Safe |
| Issue employment agreement | MBIE EAB + e-sign | **BUILD/PARTNER** generator + **INTEGRATE** e-sign | Safe |
| Support the worker's AEWV app | LIAs; INZ online | **PARTNER** LIA; **BUILD** clerical form help | ⚠ / Safe |
| Onboarding & settlement | Relocation firms | **BUILD/PARTNER** settlement | Safe |

### (b) Overseas job-seeker
| Step | Tools today | TopFarms move | Safe? |
|---|---|---|---|
| Find an *accredited* job | Job boards | **BUILD** matching + employer badge (§0) | Safe |
| Check own eligibility | INZ; LIAs | **BUILD** generic info/tools; **PARTNER** LIA (personal) | ⚠ / Safe |
| Gather docs (passport, quals, police, medical) | Manual | **BUILD/INTEGRATE** checklist + secure upload | Safe |
| Prove identity / avoid scams | KYC vendors | **INTEGRATE** APLYiD/Onfido/Sumsub | Safe |
| Translate documents | DIA / Interpreting NZ | **PARTNER** (certified) | Safe |
| Submit AEWV | INZ; LIAs | **PARTNER** LIA or self-serve; **BUILD** clerical help | ⚠ / Safe |
| Relocate & settle | Relocation firms | **BUILD/PARTNER** settlement | Safe |

**The biggest, safest, defensible gaps TopFarms can own:** (1) the **accredited-employer badge**; (2) **trusted
matching between verified migrants and verified accredited farm employers**; (3) the **clerical document/checklist
+ e-sign spine**; (4) **settlement services**. The advice layer stays a **partner LIA** — the one hard boundary.

---

## 4. Comparable products (and their legal model)

- **Deel / Deel Mobility, Remote People** — EOR that sponsors visas through *their own* entities; great case-tracker + eligibility pre-screen UX. **Not transferable:** the EOR model (the farm stays the employer, so TopFarms can't absorb advice in-house without becoming licensed). **Transferable:** the case-tracker + checklist UX.
- **Boundless / Envoy Global / Alma / BAL** — tech-enabled immigration **law firms**: licensed attorneys + a workflow portal. **This is the closest template for TopFarms' partner model** — TopFarms builds the software, an LIA network supplies the advice.

**The consistent lesson:** every player either **becomes/employs the licensed provider**, or **stays purely
clerical + matching and refers advice out.** TopFarms must be firmly the latter. No strong NZ-**agriculture**
comparable combining job-matching + visa workflow was found — **the niche is open.**

Sources: [Deel mobility](https://www.deel.com/hr-services/employee-immigration/) · [Alma vs Boundless vs Envoy](https://www.tryalma.com/learn/alma-vs-boundless-vs-envoy-global) · [APLYiD API](https://docs.aplyid.com/v2/biometric-verifications.html) · [DocuSign NZ legality](https://www.docusign.com/products/electronic-signature/legality/new-zealand)

---

## 5. Classification summary
- **BUILD (safe, differentiating):** accredited-employer badge lookup, verified matching, document checklist + secure upload, public-info content, agreement generator (MBIE clause library), settlement services.
- **INTEGRATE (safe):** KYC (APLYiD/Onfido/Sumsub), e-signature (DocuSign/Dropbox Sign), Stripe payments, machine translation *for informational content only*.
- **PARTNER (the advice boundary):** LIA/lawyer for any tailored eligibility/visa advice; DIA/Interpreting NZ for certified translation; relocation firms.
- **DO NOT build:** fee-escrow for jobs.
