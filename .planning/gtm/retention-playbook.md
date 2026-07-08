# TopFarms GTM — Retention & Re-engagement Playbook

*2026-07-08 · Stage-2 remediation, retention workstream. Status: PLAYBOOK (loops specced; automation status marked per loop). Labels: [V] verified in repo/report · [A] assumed, verify · [MODELLED] arithmetic · [OPINION] judgement call.*

> **The gap this closes:** the funnel spine ends at `retained` ("2nd listing / placement made" for employers, "ongoing engagement / placed" for seekers — `funnel-design.md`), but nothing in the GTM docs said *how* anyone gets there or comes back. In a business where ag hiring is cyclical — every spring re-creates demand [V — Master Report: 26% of seekers season-dated to "Calving 2026"; both sides anchor to the calving calendar] — retention is mostly *seasonal re-engagement*, not app stickiness. Nobody needs a farm-jobs site 52 weeks a year. They need it to remember them when their season comes back.

## 0. Ground rules (apply to every loop)

- **Voice:** house frame throughout — matching, never sorting/triage; warm to workers, relief for employers; NZ plain, first-person Harry, understate, no em dashes in sent copy (per `outreach-templates.md` global rules).
- **No spam.** Every *automated* email carries a working unsubscribe link and honours it. **Current state [V]:** the Resend wrapper (`supabase/functions/send-followup-emails/index.ts`) has NO unsubscribe link — footer only says "you received this because you are using TopFarms". That is defensible for the existing Day-7/14 placement follow-ups (transactional: tied to an in-flight placement) but NOT for retention/marketing sends under the NZ Unsolicited Electronic Messages Act 2007. **Prerequisite eng item (S): `email_preferences` on profiles + tokenised unsubscribe link in the shared footer.** Until that ships, every retention email below runs **manual-for-now** (founder-sent from hello@, reply "no thanks" honoured same day and logged). Add to `eng-issues-to-create.md`.
- **Frequency caps:** max **1 automated retention email per user per week**, max **2 seasonal nudges per user per season**, and a loop never fires twice for the same trigger row (sent-flag pattern, exactly as migration 011 does with `followup_7d_sent`). Founder calls are exempt from caps but logged on the Asana card.
- **Volumes are tiny for the next two quarters** (25 employers / 300 seekers 90-day target). Manual-first is not a compromise, it is correct: don't build crons for lists of eight names. Build the cron when the manual list takes >30 min/week. [OPINION]

## 1. Employer loops

| # | Loop | Trigger (table/event) | Channel | Cadence | Automation | Effort |
|---|---|---|---|---|---|---|
| E1 | Day-30 "how's it going" + testimonial ask | `placement_fees.confirmed_at` + 30d | email, or founder call for Founding-25 | once per placement | **cron-ready** (extend 011 pattern) · manual-for-now | S |
| E2 | **Pre-season call-back** (the killer loop) | placements by sector×month → next-season contact list (see spec below) | **founder call** (phone is the ag trust channel) | once per employer per season, ~8–12 wks pre-peak | needs Seasonal Insights build (058) · manual via SQL now | M |
| E3 | Dormant-employer winback | no `jobs.status='active'` and no new listing in 90d, employer has ≥1 prior listing | email touch → call if reply | once per 90d dormancy, max 2 cycles then stop | cron needed · manual-for-now | S |
| E4 | Filled-job → "list your next role" | `jobs.status → 'filled'` (`mark_job_filled_rpc`, 026; `notify-job-filled` Edge Fn exists [V]) | one line added to the existing filled-confirmation email | at fill event | **mostly exists** — copy addition to live email | S |

### E1 — Post-placement Day-30 (feeds the testimonial pipeline)

- **Trigger:** `placement_fees.confirmed_at IS NOT NULL AND confirmed_at <= now() - interval '30 days'` and no `followup_30d_sent`. Same flag mechanics as migration 011 (add `followup_30d_due/sent` columns when automating — the pg_cron job and Resend consumer already exist as a pattern [V]).
- **Why day 30:** the hire has survived a roster cycle; the employer knows if it stuck. This is the moment the fill guarantee either proved itself or didn't — either answer is worth having early.
- **Testimonial + consent:** named testimonials require documented per-name consent (`funnel-design.md` compliance section [V]). The ask is inside this touch, and consent is logged (Asana card comment + a dated line in a consent log) before any name is ever used.
- **Copy skeleton (email):**
  > Subject: how's [first name] settling in?
  >
  > Hi [name], it's been about a month since [seeker first name] started with you. How's it going? If anything's off, tell me straight and I'll help sort it. And if it's going well, would you be OK with me quoting a line from you, with your name on it? Only with your yes on record. Cheers, Harry
- **Feeds:** testimonial pipeline, `placement_fees.rating` (column exists, 011 [V]), and the E2 next-season list (a good Day-30 answer marks the account "call back pre-season").

### E2 — Pre-season call-back (the killer loop)

An employer who hired for calving 2026 is warm again for calving 2027 — the demand literally regrows. This is the single highest-retention-per-hour loop in the business. [OPINION]

- **Trigger data spec — "next-season contact list":**
  1. **Source rows:** `placement_fees` (confirmed) joined to `jobs` for region + role, and to the employer. That gives *placements by sector×month* — coarse sector via the same keyword heuristic the Seasonal spec uses for leads correlation (`SEASONAL-INSIGHTS-SPEC.md` §4.3) until the role canon lands.
  2. **Season mapping:** match each placement's sector×region to `seasonal_events` (migration 058, spec'd not built [V]) and take the sector's **`hiring_window`** row — e.g. a Jul-calving hire maps to dairy pre-season hiring Feb–May [A — row 5 of the seed table is itself [A]-verified]. Contact month = `hiring_window.start_month` of the *next* cycle.
  3. **Output:** admin list (one RPC or, manual-for-now, one SQL in Studio): employer, last role hired, last placement date, region, suggested contact month, Day-30 outcome note. Surface via the Seasonal `next_up`/`sell_now` output once `/admin/seasonal` exists — this list is exactly "sell_now, filtered to people who already bought".
- **Cadence:** one call per employer per season, placed in the Mon-AM call block (`weekly-operating-rhythm.md`). Never mid-milking.
- **Call skeleton (not a script):**
  > Hi [name], Harry from TopFarms. [Seeker] worked out well last calving from memory. Coming up on that time again — are you sorted for this season or is there a gap I can put in front of the right people early?
- **Automation status:** blocked-on-058 for the automated list; **manual now** — at current volume the "list" is every confirmed placement, and the founder knows the season by looking out the window. Do not wait for the build to run the loop.
- **Effort:** M (the RPC + list view; the loop itself is founder time already budgeted).

### E3 — Dormant-employer winback

- **Trigger:** employer with ≥1 historical listing, zero `active` jobs, no listing created in 90 days. Manual query now; fold into the E2 list view later (same surface, "dormant" flag column).
- **Copy skeleton (email, then phone if any reply):**
  > Hi [name], Harry here. You put a role up a while back and things have moved on since — there are more [region] people on TopFarms now than when you tried it. If a vacancy comes up this season, your next listing's on me. Either way, hope the season's treating you well.
  - The "on me" line uses the existing first-listing-free / listing-credit lever (`PRICING-MODEL.md` — only pull if listings, not employers, are the bottleneck [V]). Optional; drop it if listing volume is healthy.
- **Stop rule:** two winback cycles with no response → leave them alone. They know where we are (breakup-touch logic, same as the outreach cadence).

### E4 — Filled job → "list your next role"

- **Trigger:** the fill moment. `notify-job-filled` already sends at `jobs.status='filled'` [V]. Add one line + CTA to that email: the next-role prompt and, seasonally, the E2 hook.
- **Copy line to add:**
  > Got another role coming up, or one you know is coming at calving? You can put it up now and we'll start matching early: [link]
- **Automation:** exists minus the copy. Smallest change in the whole playbook — do it first.

## 2. Seeker loops

| # | Loop | Trigger | Channel | Cadence | Automation | Effort |
|---|---|---|---|---|---|---|
| S1 | Placed-seeker alumni check-in | `applications.status='hired'` + placement confirmed + 30d | personal email/txt from Harry | Day 30, then once pre-season | manual (keep it personal) | S |
| S2 | Unplaced-seeker fresh-matches digest | `saved_searches` (024 [V]) × new `active` jobs | email (Resend) | weekly, **only when ≥1 new match** | **cron + Edge Fn needed** — table exists, no alert infra [V] | M |
| S3 | Profile-refresh nudge pre-peak | `open_to_work=true` (001 [V]) + profile stale >90d, timed to hiring windows | email; group post as the ambient version | 2×/yr max (≈Feb pre-Moving-Day, ≈Jun pre-calving) | cron needed · manual export now | S |

### S1 — Placed-seeker alumni check-in

- **Why it matters twice:** placed seekers are (a) the referral engine's warmest source — the study shows peer vouching in comments is how workers already vouch for each other [V — Master Report Part A] — and (b) the **next-season relief pool**: someone placed full-time may still do relief milking, and someone whose season ends is supply for the next wave. Couples widen this — partner work is offered in 42% of listings and actively sought [V], so one placed seeker often knows a second worker in the same house.
- **Copy skeleton (txt or short email, personal, never automated [OPINION]):**
  > Hey [name], Harry from TopFarms. About a month in at [farm/region] — how's it going? Glad it worked out. If any of your mates are looking, send them my way or share your TopFarms link (see `referral-mechanics.md`). And if you ever want relief work on your days off, flick open-to-work back on.
- **Cadence:** Day 30, then one pre-season touch per year. That's it. Alumni goodwill is the asset; don't tax it.

### S2 — Unplaced-seeker fresh-matches digest

- **What exists [V]:** `saved_searches` stores per-seeker filter snapshots (URLSearchParams text). Nothing runs them.
- **Build (M):** pg_cron weekly → Edge Fn: for each saved search, re-run params against jobs created since last digest; if ≥1 new match, send one email listing up to 5, best match first. Sent-flag/watermark per search (011 pattern). **No-match weeks send nothing** — an empty digest teaches people to delete us.
- **Frequency cap:** one digest email/week/seeker regardless of how many saved searches they hold.
- **Copy skeleton:**
  > Subject: [n] new [region] roles that fit what you're after
  >
  > Hi [name], a few new roles this week match your saved search. [job lines: role, region, accommodation yes/no, start timing.] Have a look and apply if one fits: [link]. Not looking any more? [unsubscribe/turn off this search — one click.]
- **Why this is the seeker retention workhorse:** 34% of seekers need to start ASAP [V] — they churn to whatever surfaces work fastest. A digest that shows up with real matches is the only automated loop that competes with the FB groups' immediacy.

### S3 — Profile-refresh nudge before peak seasons

- **Trigger:** `open_to_work = true` and profile/skills untouched >90 days, sent in the ~6 weeks before a peak hiring window (Feb–May pre-Moving-Day run-up; Jun pre-calving) — timed off the same `seasonal_events` calendar as E2.
- **Why:** employers filter on availability and freshness; a stale `availability_date` makes a real seeker invisible. The FB behaviour this replaces is the "Bump / redoing my post" repost — 9% of seekers visibly re-post because listings decay [V]. This loop is the platform doing the bump for them.
- **Copy skeleton:**
  > Hi [name], calving hiring is starting to move. Farms see profiles with current availability first — takes a minute to check yours still says what you want it to: [link]. If you've found work, flick open-to-work off and we'll stop matching you (congrats, by the way).
- **Ambient version (zero build):** the same message as a group post in the owned FB group, in the pinned-post refresh cycle already in the weekly rhythm. Do this regardless.

## 3. What to measure (folds into `metrics-dashboard.md`)

- **Repeat-employer rate** — already a North Star supporting metric [V — NORTH-STAR.md]; E2/E3/E4 exist to move it. Also the Segment-B trigger input (§6b, PRICING-MODEL: repeat-placement ≥30%/12mo).
- **Pre-season call-back conversion:** called → listed again. This is the loop's kill/scale number; expect it to be the best conversion rate in the funnel or the loop is being run at the wrong time. [MODELLED expectation, no benchmark]
- **Digest → application rate** (S2) and **profile-refresh completion** (S3). No open rates — dropped per `metrics-dashboard.md` [V].
- **Unsubscribe rate** per loop; any loop >2% unsubscribes gets rewritten or killed. [OPINION threshold]

## 4. Build order (all founder+AI, no hires needed)

1. **E4 copy line** in `notify-job-filled` — S, days.
2. **Unsubscribe/email-preferences plumbing** — S, prerequisite for automating anything else.
3. **E1 Day-30** — S, extends the live 011 cron + follow-up function.
4. **S2 digest** — M, first genuinely new automation; do when seeker count makes manual matching untenable.
5. **E2 next-season list** — lands with the Seasonal Insights build (058); run manually from day one regardless.
6. **S3 / E3 crons** — last; manual SQL exports cover them until then.
