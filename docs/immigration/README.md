# Immigration & overseas-worker support — knowledge base

Industry context and product knowledge for TopFarms' immigration phase: helping NZ farm
**employers** hire overseas workers and helping migrant **job-seekers** find genuine work,
through the visa/admin process. Compiled 2026-07-29 from current official/reputable sources
(INZ, MBIE, IAA, DairyNZ, HRC) + tooling research. Fast-moving figures are flagged "verify live".

## The one non-negotiable principle

> **Build the rails, refer the advice.**

NZ's **Immigration Advisers Licensing Act 2007** makes giving *immigration advice* without a
licence a criminal offence — **up to $100,000 / 7 years, even for free.** TopFarms is not
licensed. Everything we build must live in the statute's safe zone — **publicly-available
information, clerical work (form-filling with the client's own answers), settlement services,
translation, referral, and marketplace matching** — and every judgment call ("which visa / do
you qualify / how to present your case") is handed to a **partner Licensed Immigration Adviser
(LIA) or lawyer.** See [`02-legal-line.md`](02-legal-line.md).

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
