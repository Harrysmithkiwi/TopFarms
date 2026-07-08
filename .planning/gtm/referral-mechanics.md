# TopFarms GTM — Referral Mechanics

*2026-07-08 · Stage-2 remediation, referral workstream. Replaces the assumed number with a mechanism. Labels: [V]/[A]/[MODELLED]/[OPINION].*

> **The gap this closes:** the seeker funnel maths books **~0.3 referred seekers per signup (~40–60 of the 90-day 300)** as a channel (`funnel-design.md` seeker table, ⟨recon⟩-flagged [V]) — but there is no mechanism anywhere: no referral link, no attribution column, no incentive, nothing in the schema (grep across `supabase/migrations/` finds no `referred_by`/referral artefact [V]). 0.3 is currently a wish. This doc makes it a measured number.

## 1. Why seeker-side is primary

Workers already bring mates — the study shows seekers lean on **peer vouching in comments** and self-verify by posting certificate photos [V — `docs/_canonical/TopFarms_Master_Report.md` Part A behavioural signals]. Couples/households compound it: 23% of seekers disclose a couple/kids situation and 42% of employers actively offer partner work [V — Parts A/B], so one signup regularly sits one text message away from a second worker. Ag is a small trust-dense community; the referral motion already exists socially. The product's only job is to catch the attribution and say thanks properly. Employers refer too, but slower and fewer — secondary (§4).

## 2. Minimal product surface (S effort)

**The whole build:**

1. **Column:** `referred_by uuid REFERENCES seeker_profiles(user_id)` (nullable) + `referral_token text UNIQUE` on the seeker profile. One migration, two columns.
2. **Token:** short URL-safe token per seeker (6–8 chars derived at profile creation — not the raw UUID; nobody shares a UUID over txt).
3. **Link:** `topfarms.co.nz/signup?ref=<token>`. Signup page reads the param, stashes it (localStorage survives the email-confirm round-trip), writes `referred_by` on profile creation.
4. **Share surface:** one "Know someone looking? Share your link" block on the seeker profile page + the same link dropped into the placed-seeker alumni check-in (retention loop S1, `retention-playbook.md`) — that's the warmest moment to ask.

**Attribution rules (keep them boring):** token captured at signup only, first-touch wins, no retroactive claims ("my mate joined last month" → nice, not counted), attribution is silent — no leaderboard, no public counts. [OPINION: leaderboards turn vouching into farming.]

**Explicitly not building:** referral dashboards, multi-level anything, unique-per-campaign codes, reward-fulfilment automation. At 300 seekers the founder can settle rewards from one SQL query a month.

## 3. Incentives — ranked for a workers-never-pay brand

Constraint first: **workers never pay — and workers never get paid per head either.** Cash-per-referral converts a mate vouching for a mate into a transaction, invites gaming, and reads like every recruiter scheme the brand exists to not be. **NO cash-per-head.** [OPINION, held strongly — it cheapens the exact trust the study shows the community runs on.]

Ranked [OPINION]:

| Rank | Incentive | Why this rank | Guard |
|---|---|---|---|
| 1 | **Recognition badge** on profile ("Brought a mate to TopFarms" class) + a personal thank-you from Harry | Mirrors the vouching behaviour that already exists; costs nothing; visible to employers as a soft trust signal (people who bring workers are usually good workers [A]) | Badge only after the referred mate *completes a profile* (not mere signup) |
| 2 | **Merch / small vouchers** (TopFarms cap/tee, or a modest Farmlands/Prezzy voucher) at milestones — e.g. first referred mate placed | Physical merch in rural NZ is walking word-of-mouth; a voucher at *placement* rewards real outcomes, not signups | Milestone = placement, so it can't be farmed with throwaway signups |
| 3 | **Priority matching visibility** (referred-in or referring profiles surfaced earlier among equally-matched candidates) | Genuinely valuable — but it touches match integrity. Only ever as a tiebreaker between equal match scores, never a score input, or the "matched, not sorted" promise quietly breaks | Tiebreaker-only; revisit-or-kill if any employer ever asks "why was this person on top?" |

Start with rank 1 alone. Add 2 when the first referred placement happens. Treat 3 as a maybe-never. [OPINION]

## 4. Employer-side secondary — Founding-25 referring neighbours

- **Mechanism is a sentence, not a feature:** the Day-30 post-placement call and the pre-season call-back (retention loops E1/E2) each end with *"who else round your way is hiring this season?"* A neighbour's name from a farmer who's placed through us is saleyard-credible — worth more than any funnel stage. Log referrer on the Asana lead card (one field), so referred employer leads are countable.
- **Tie to the Founding-25 identity:** the programme already trades on badge/community/founder-access perks (`funnel-design.md`; re-cut in `PRICING-MODEL.md` §9 — no lifetime discounts [V]). Referral sits inside that identity: founding members are the people who *built the network out here*, said in those words at the quarterly dinner. No coupon codes — a farmer introducing a neighbour to Harry personally IS the mechanism. If a tangible thank-you is ever warranted, a listing credit fits the pricing model; cash does not. [OPINION]
- **Attribution:** manual (Asana lead-source field = "referred by [name]"). Do not build employer referral product surface. [V — funnel already tracks employers as Asana cards, not rows]

## 5. Measurement — replacing 0.3 with a real number

- **Metric:** **referred-signup share** = signups with `referred_by IS NOT NULL` ÷ total seeker signups, monthly, on the metrics dashboard. Secondary: referred-seeker placement rate vs organic (the study predicts vouched-in workers convert better [A — verify with own data]).
- **The assumption being tested:** funnel maths says referral ≈ 0.3/signup ≈ 15–20% of total seeker volume [MODELLED from the funnel table]. 
- **Kill/scale rule [OPINION thresholds, set now so the decision isn't vibes later]:**
  - After 90 days with link + rank-1 incentive live: **<10% referred share** → stop spending any effort on incentives; keep the link (it's free); re-book the funnel maths at the observed rate.
  - **10–20%** → assumption roughly holds; carry on, add rank-2 merch at first referred placement.
  - **>30%** → referral is outperforming the model; make the share block more prominent (post-application, post-placement email) before spending anything on other seeker channels.
- Whatever the number is at day 90, **update the seeker table in `funnel-design.md` with the observed rate and cite this doc** — that's the ⟨recon⟩ reconciliation the funnel doc asks for.

## 6. Anti-gaming (honest notes, sized to actual risk)

Actual risk at current scale is low — rewards are a badge and a cap — but the guards are cheap:

- **Self-referral:** reject `referred_by = own user_id` (CHECK constraint); same-email/same-phone dedup already implied by auth uniqueness.
- **Throwaway signups:** nothing counts until the referred profile is *completed* (skills + region set); merch milestone requires a *placement*. Placement-gated rewards are near-ungameable — you can't fake a confirmed hire with an invoice behind it [V — placement verification per NORTH-STAR.md].
- **Volume cap:** rewards recognised for max ~5 referred completions per seeker per season; beyond that it's a thank-you call from Harry, not more merch. [OPINION]
- **Founder eyeball:** at <1,000 seekers, the monthly settlement query IS the fraud review. Revisit when that stops being true.
- **Never penalise organic vouching:** someone who brings three mates with no link still gets the badge if they tell us. The mechanism serves attribution; attribution never gates gratitude. [OPINION]
