# TopFarms GTM — Funnel Design

*2026-07-02 · Two audiences (seekers, employers) × sources (FB / Seek / Trade Me). One 7-stage spine, per-audience criteria. Dairy-first, ag-broad-aware.*

> **Playbook note:** the Executive Playbook references a "6-stage funnel" and "14-field target list" in a Phase 5 detail doc that **does not exist** (only the summary does). The 7-stage spine below and the 14-field schema are **reconstructed** from the Playbook summary + the live Supabase pipeline. Cells/claims beyond the documented Playbook are marked ⟨recon⟩ for later reconciliation.

## The 7-stage spine

`raw-target → contacted → replied → qualified → onboarded → activated → retained`

The `contacted → replied` portion maps onto the **existing Supabase Outreach statuses** (`drafted → approved → sent → responded`). `qualified → retained` is the human layer: **Asana cards for employers; aggregate Supabase signups for seekers.**

| Stage | Employer exit criterion | Seeker exit criterion |
|---|---|---|
| **raw-target** | passes fit filter (matchable role, region, active hirer) → contact | passes fit (real experience, region, contactable) → contact/observe |
| **contacted** | first message sent + logged → reply or cadence-end | first message sent (supplement DMs) / saw group post → reply or signup |
| **replied** | any response → qualify or disqualify | any response → qualify |
| **qualified** | fits ICP + intent → they act | genuine intent + fit → they act |
| **onboarded** | signed up | free profile + skills created |
| **activated** | first job posted | first application submitted |
| **retained** | 2nd listing / placement made | ongoing engagement / placed |

## Employer funnel — push (founder-led), the Playbook maths

Verified from the Playbook Phase 5 summary:

```
200 target list → ~60 conversations (30% reach) → ~30 demos/visits (50%) → 25 verified employers (80% meeting→signup)
```

≈ **10 outbound touches/week** over the quarter. First-year placements target **120+**. This is the primary use of founder time.

- **Sources:** FB (Lane B posts with no contact = draft first message; Lane A = has contact), Seek, Trade Me. Seek/Trade Me outreach is longer/more formal and ToS-careful (see compliance).
- **Founding Employer programme** (first 25): RE-CUT 2026-07-08 — the 50%-off-for-life clause is DEAD (Stage-2 LOCKED #6). Current offer = full-price Segment-A placement fee + fill guarantee + badge/founder-mobile/WhatsApp/dinner perks + case-study consent. **Authoritative: `founding-25-offer.md`** — pitch from that, not this line.

## Seeker funnel — PULL is the engine, DM is a supplement (reshaped maths)

Cold DM alone **cannot** safely hit 300 seekers in 90 days (Message-Requests visibility + account ban-risk). The engine is pull:

1. **Owned FB group** (NZ Dairy Jobs, TopFarms admins it) — pinned "free profile, workers never pay" + 2 value posts/week. **Biggest lever, zero ban-risk, thousands of seekers.**
2. **Content-calendar inbound** (Phase 1 seeding → seekers come to you).
3. **Seeker referral mechanics** — one worker brings mates.
4. **Application-pull** — as employers post jobs, seekers arrive to apply. Supply pulls demand.
5. **Cold DM (~30/day supplement)** — targeted at "looking for work" posters. Not the engine.

**Reshaped 90-day seeker maths (⟨recon⟩ — replace with real data once week 1–2 lands):**

| Channel | Assumption | ~90-day seekers |
|---|---|---|
| Owned-group posts + pinned CTA | main driver | ~150–200 |
| Application-pull (from 25 employers posting) | supply pulls demand | ~50–80 |
| Referral | ~0.3 referred per signup | ~40–60 |
| Cold-DM supplement (~30/day, low convert) | supplement only | ~25–50 |
| **Total** | | **~265–390 → 300 realistic via pull, not DM** |

Seekers are tracked as **aggregate Supabase signups** (region, farm-type interest, source), not Asana cards. Only supplement-DM seekers get light per-target tracking.

## Qualification / disqualification

**Employer good-fit (score up):** matchable role we can serve, region with seeker density, active or repeat hirer, sound farm reputation, dairy (primary) or clear ag role.
**Employer time-sink (score down / drop):** out-of-scope sector (hort/vit/etc — future verticals), one-off micro-hire with no repeat potential, tyre-kicker with no real vacancy, bad-rep operation.
**Seeker fit:** real experience signal in their post, NZ region, contactable or willing to make a profile, genuine intent (not just venting).

Fit tier A/B/C on the employer card drives call order (Tier A first, per Playbook).

## Cadence & rules

- **Employer FB (Lane B/A):** day 0 cold → +3 follow-up 1 → +7 follow-up 2 → +14 breakup. Plain text, no link in the cold first FB DM.
- **Employer email / Seek / Trade Me:** Playbook 4-touch over 14 days — Day 1 (personal, <120 words) / Day 4 (bump) / Day 9 (pure value: regional wage data, no ask) / Day 14 (breakup, highest reply). Video-CTA allowed here.
- **Seeker cold DM:** day 0 → +4 follow-up → (optional) breakup. ~30/day, non-milking windows — and this sits *inside* the combined ~20–40/day account ceiling shared with employer FB DMs (see compliance), not on top of it.
- **Move-to-phone trigger:** any warm/qualified employer reply → offer a call (phone is the ag trust channel). Never mid-milking.
- **Variation is mandatory** (config variation kit) — identical templates at volume get flagged in a small community.

## Compliance / reality (flagged, not hand-waved)

- **FB account is precious** (it admins the group). Volume DMing risks the same rate-limit → checkpoint → ban that killed the scraping track. Mitigation: manual send (config already mandates), ~20–40/day cap **combined across employer + seeker DMs on the one account** (not per-audience — the ~30/day seeker supplement counts toward this same ceiling), genuine message variation, milking-window respect, plain-text (no link) cold first DM. Baseline the real ceiling from your own first two weeks, not any video's number.
- **Seek / Trade Me:** contacting advertisers off-platform can breach their ToS (they monetise candidate contact / advertiser relationships). Prefer publicly-stated contact only, keep outreach light, **do not harvest their contact data**. Treat as a distinct, careful channel.
- **Named testimonials need documented per-name consent** (small community, real privacy implications — same spirit as the config's never-echo-a-private-reason rule). Until you have consenting names, use the unnamed honest line ("a few Waikato dairy farms are on it now"). See `outreach-templates.md`.
