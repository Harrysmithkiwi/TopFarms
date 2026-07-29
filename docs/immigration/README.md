# Immigration & overseas-worker support — knowledge base

Industry context and product knowledge for TopFarms' immigration phase: helping NZ farm
**employers** hire overseas workers and helping migrant **job-seekers** find genuine work,
through the visa/admin process. Compiled 2026-07-29 from current official/reputable sources
(INZ, MBIE, IAA, DairyNZ, HRC) + tooling research. Fast-moving figures are flagged "verify live".

> **STATUS: PARKED until post-launch (decided 2026-07-29).** Knowledge gathered; build deferred so
> launch + cold-start come first. The phase plan ([`04-phase-plan.md`](04-phase-plan.md)) is ready to
> pick up when it's time.

## The principle — and the moat

> **The software builds the rails; the advice is delivered by the founder as a lawyer.**

NZ's **Immigration Advisers Licensing Act 2007** makes giving *immigration advice* without a licence a
criminal offence ($100k / 7yr, even free) — **but NZ lawyers holding a current practising certificate
are EXEMPT (s 11).** The founder (Harry) is a qualified lawyer with a current **NZ** practising certificate
(and a **NSW** one for Australia), so **the advice layer can be in-house, not a partner LIA** — a genuine
moat almost no marketplace competitor can match.

Design implications:
- The **software** still stays in the safe zone — publicly-available information, clerical work (form-filling
  with the client's own answers), settlement services, translation, referral, and matching. It does not
  autonomously "advise."
- **Individualised advice** ("which visa / do you qualify / how to present your case") is delivered **by Harry
  as a lawyer**, within a properly structured legal practice (PI cover, conduct rules, engagement letters,
  complaints handling) — his own regulatory domain, not the platform's.
- **Automating advice at scale** (an eligibility engine / chatbot that personalises) is *possible* under a
  lawyer but still needs to sit under his supervision + ownership + PI cover — a design question for build
  time, not a hard block. See [`02-legal-line.md`](02-legal-line.md).

## Contents

| File | What's in it |
|---|---|
| [`00-strategy-overview.md`](00-strategy-overview.md) | The strategic case + where TopFarms fits + operator direction questions |
| [`01-visa-landscape.md`](01-visa-landscape.md) | AEWV 3-step, RSE (hort-only), Green List dairy residence, WHV, seasonal, median wage, role→visa map |
| [`02-legal-line.md`](02-legal-line.md) | IALA: advice vs information, offences, exemptions, SAFE-vs-RISKY feature table |
| [`03-gap-analysis.md`](03-gap-analysis.md) | Journey gap analysis (employer + seeker), BUILD/INTEGRATE/PARTNER, SaaS building blocks, register feasibility, comparables |
| [`04-phase-plan.md`](04-phase-plan.md) | The proposed phase: sequenced slices, what's buildable now, what's lawyer-gated |

## Two hard truths to design around

1. **RSE is horticulture/viticulture only — never dairy/pastoral.** Don't surface it to farm employers. The dairy seasonal route is the new Peak Seasonal Visa (AEWV), from Dec 2025.
2. **Charging migrants a fee/premium for a NZ job is unlawful.** The $30–50k job scams are exactly this. Do NOT build fee-escrow — it would legitimise the scam. The anti-scam levers are the **accredited-employer badge + identity verification + no-fee transparency.**

## Before quoting anything to users
Verify live: all INZ fees; the exact Green List dairy time-in-role & pay threshold; whether any sheep-and-beef role is Green-listed; official median-wage multiples. Get a NZ lawyer/LIA sign-off on any eligibility-verdict or personalising-chatbot feature before it ships.
