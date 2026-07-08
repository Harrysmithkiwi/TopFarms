# TopFarms — Team & Automation Plan (bootstrap-funded)

> **Created:** 2026-07-08 (Stage-2). Constraint stack: solo founder + AI (build only what
> that can deliver), **bootstrap ≥12 months** (LOCKED #4 — hires are funded by placement
> cash flow, so every hire trigger below is a CASH trigger, not a calendar one), and the
> EXPANSION-MODEL rule that everything marked "automate" must be automated BEFORE the
> AU hire. Anything a solo founder + AI cannot deliver is explicitly marked **requires
> hire N**. All revenue thresholds [MODELLED].

## Stage 1 — now → ~$1M ARR: founder + AI + fractional. **Zero hires.**

**Automate (the founder must exit these loops — each is spec'd or built):**
| Loop | Automation | Status |
|---|---|---|
| Outreach follow-up cadence | scheduler off `leads.outreach_status` + next-action dates | spec in metrics dashboard; S |
| Weekly funnel report | RPC → Tuesday-email section | S, exists in parts (050/051) |
| Lead coding/parsing | Haiku parser (built) + field extension (PARSER-EXTENSION-SPEC) | built / M |
| Seasonal re-engagement | retention-playbook triggers + Resend | M |
| Doc-queue first pass | checklist-assist prompt on the existing admin queue | S |
| Match explanations / summaries | built (Claude, cached) | built |
| Index monthly cut | INDEX-SPEC cron RPC | M |

**Fractional / outsourced (cash-cheap, no hires):** bookkeeper + GST from first live
revenue; NZ privacy/commercial lawyer for the FA-02/FA-11 pack (one-off); VA (2–5
hrs/wk) for verification-queue first pass **only after** its SOP is written — the SOP is
the deliverable, the VA is the executor. **Advisors (free/equity-cheap):** one marketplace
operator, one respected rural-industry name. Both compound credibility; source via the
Founding-25 network.

**What the founder alone must keep doing at this stage (deliberately un-automated):**
pricing-lab conversations, farm visits/demos, group presence, final lead approval (the
human gate is a privacy control, not a bottleneck to automate away), the Tuesday email's
voice.

## Stage 2 — ~$1M → $3M ARR. **Hires 1–2 + fractional CFO.**

- **Hire 1 — AU in-market operator** (triggered by EXPANSION-MODEL §3 gates, not revenue
  alone): owns AU liquidity build, AU group/community presence, AU target list. The NZ
  machine must already run on Stage-1 automation or this hire gets consumed by NZ ops.
- **Hire 2 — Marketplace Ops / Community** (NZ): verification, support, seeker success,
  group ops — removes the founder from all daily NZ loops. Trigger: support+ops >15
  hrs/wk of founder time for 8+ weeks (measure via the weekly time-log habit).
- **Fractional CFO** at ~$1M: pricing/cash discipline across two currencies.
- Engineering: **still founder + AI.** The repo's agentic discipline (CI, tests, canon,
  house rules) is what makes this credible; protect it.

## Stage 3 — ~$3M → $10M ARR. **Total ~8–12 FTE. The margin ceiling.**

| Function | FTE | Notes |
|---|---|---|
| Engineering | 2–3 | first eng hire ~$3M; founder moves to product direction |
| Marketplace ops/support | 2–3 | NZ + AU + UK coverage (time zones) |
| Sales/partnerships | 2 | Segment B + Index licensing (hire 3 = UK per EXPANSION-MODEL) |
| Data (Index product) | 1 | when Index revenue >$300k |
| Finance/ops | 1 | CFO converts full-time ~$5M |

**Hard rule: >12 FTE at $10M = margin architecture failing — stop hiring, find the
labour leak** (it will be Segment-B service creep or support; both have automation
answers first). Contribution-margin per placement is reviewed before every hire req.

## The boundary in one line

AI/software does anything repeatable (parsing, drafting, scheduling, reporting,
matching, aggregating); fractional humans do anything credentialed (books, law);
hires exist only where trust must be built **in person, in market** (AU/UK) or where
volume physically exceeds one person (ops at scale). Nothing else.
