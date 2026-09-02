# TopFarms GTM — Metrics Dashboard

*2026-07-02 · Leading indicators per stage, the funnel maths, and the weekly numbers to check. Framed as matching outcomes (surface the right people), never triage. Tied to the Playbook's 90-day targets: 25 employers / 300 seekers.*

## What we do NOT track (and why)

- **Open rates — dropped from all reasoning.** Since Apple Mail Privacy Protection (2021), open-rate is polluted (pre-fetched opens) and not a reliable signal. The video's "43% open" claim is an unverified practitioner number on top of that. Do not use open-rate to judge anything.

## Employer funnel — the Playbook maths (verified)

```
200 target list → ~60 conversations (30% reach) → ~30 demos/visits (50%) → 25 verified employers (80% meeting→signup) → 120+ first-year placements
```

Leading indicators, stage by stage:

| Stage transition | Leading indicator | Playbook / target |
|---|---|---|
| raw-target → contacted | touches sent / week | ~10/week |
| contacted → replied | **reply rate** | see ladder below |
| replied → qualified | qualified rate (fit + intent) | track, no Playbook number ⟨recon⟩ |
| qualified → onboarded | meeting→signup | ~80% (Playbook) |
| onboarded → activated | first job posted | Stripe listing event |
| activated → retained | 2nd listing / placement | Stripe placement invoice |

## The reply-rate ladder (labelled — read the label)

> **Unverified, email-calibrated, directional.** Sourced from a practitioner video (one source is a course-seller), not a benchmark. Use it as a rough triage compass for **email / Seek / Trade Me only**. **It is NOT the FB-DM triage number** (see below).

| Reply rate | Likely problem to fix |
|---|---|
| **< 2%** | lead list or deliverability (wrong targets / spam / bounces) |
| **2–5%** | copy / offer is weak |
| **5–10%** | golden zone |
| **> 10%** | exceptional |

## FB-DM baseline — build from YOUR own data, not the video

FB DMs to non-connections land in **Message Requests** with different visibility mechanics than email, so the email ladder does not apply. **Baseline the real numbers from your own first two weeks** and set your own thresholds:

Week-1–2 capture (per day): DMs sent · replies · positive replies · profile signups attributable. After two weeks you will have a real reply-rate and signup-rate for FB DM. Set the "is my copy or my targeting off?" thresholds from *that*, not from any video.

### Week-1 tripwire (catch a broken approach by ~day 3, not day 14)

You won't have a two-week baseline yet, so run this crude circuit-breaker in the meantime. It exists so a dead approach gets caught early.

- **FB DM tripwire:** once you've sent **~30–45 cold DMs** (combined employer + seeker, which is ~day 3 at the ramped rate) and have **0–1 replies**, **stop and check before sending more**, in this order:
  1. **Landing?** Are they going to Message Requests / marked as spam vs actually delivered? (visibility problem)
  2. **List?** Are you actually hitting in-region farm employers / genuine "looking for work" seekers? (targeting problem)
  3. **Voice?** Re-read the sends against `TopFarms_Outreach_Reply_Config.md` — reads as a person, or as a pitch? (copy problem)
- **Email / Seek tripwire:** if the first **~20 emails** by day 3–4 get **0 replies**, check deliverability (spam placement, bounces) and list fit *before* sending the next batch — do not grind the full 4-touch sequence on a broken list.
- **Rule:** a tripwire trip means *diagnose then adjust*, not *quit*. Cold outreach is a numbers game with real rejection; the tripwire only fires on **near-zero**, which signals a broken mechanism, not normal no's.

## Seeker funnel — pull engine (reshaped, ⟨recon⟩ until real data)

Cold DM is a supplement, not the engine. Track by channel:

| Channel | Metric to watch | ~90-day contribution |
|---|---|---|
| Owned-group posts + pinned CTA | signups attributable to group / week | ~150–200 |
| Application-pull | seekers who arrive to apply | ~50–80 |
| Referral | referred signups per signup | ~40–60 |
| Cold-DM supplement | DM→signup rate (from own data) | ~25–50 |
| **Aggregate** | **total free profiles created** | **~300 via pull** |

Seekers tracked as **aggregate Supabase signups** (count, region, farm-type interest, source channel), not per-person Asana cards. Only supplement-DM seekers get light per-target tracking.

## The Friday review numbers (the weekly check)

Pull these every Friday (Claude Code via Supabase + Asana + Stripe MCP):

1. **Employer:** touches sent, replies, reply rate, meetings booked, signups, cumulative verified employers (toward 25).
2. **Seeker:** new free profiles this week (by channel), cumulative (toward 300), applications submitted.
3. **Revenue signals (Stripe):** listings paid, placements invoiced (activation/retention proof).
4. **Copy/list triage:** apply the email ladder to email/Seek reply rate; apply your own FB baseline to DM reply rate. Fix the one thing the number points at.
5. **Double down on who replies:** log every positive employer reply (region, farm type, role) and shape next week's target list to look like them (this is the 14-field schema doing double duty as ICP data).

## Data discipline

Data is a compass, not a scoreboard. Positive replies = keep going this direction; uninterested replies = the opposite direction, still useful. Track the whole funnel (reply → positive → meeting → signup → activation), never just "emails → clients". Iterate weekly on the one metric that is furthest from target.
