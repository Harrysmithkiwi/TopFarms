# Map: Break the cold start

Label: `wayfinder:map` · Charted 2026-08-17

## Goal

**Farms we contacted have posted real jobs on TopFarms, and the first seeker application
has landed.**

Both halves, deliberately. A marketplace cold start is not done when one side shows up — a
board with ten jobs and no applicants fails the employer just as surely as an empty board
fails the seeker. The first application is the honest signal that the loop closed.

Offer, channel, creative and volume are **not** in the goal line. Each is a ticket below.

## Where this sits

One campaign, one map. This is the marketing half of go-live **M3**, which
`.planning/NOW.md` now records as the only remaining launch gate. It does not absorb M3's
engineering carryforwards, and it does not become the company strategy map — those go stale.

| Surface | Owns |
|---|---|
| `.planning/NOW.md` | cross-stream index: what's live, blocked, next |
| `.planning/go-live/map.md` | the launch roadmap M1–M6 |
| **this map** | open **decisions** about the cold-start campaign |
| `.planning/leads-triage/` | the leads pipeline's own execution state |

Tickets live inline below until one is picked up, at which point it gets
`issues/NN-<slug>.md` in the usual `Type:` / `Status:` / `Blocked by:` shape. Writing eight
stub files before any of them is worked is scaffolding, not planning.

## Measured baseline — prod, 2026-08-17

Not estimates. Read from the database while charting this.

| | |
|---|---|
| Staged leads | **113** · 111 pending · **100% `employer`, 0 seeker** |
| With an email address | **70** of 113 — the other 43 are DM-or-nothing |
| Region null | 9 (matters for suppression, fixed in 087) |
| Promoted to `leads` | 2 · **contacted 0** · suppressed 0 |
| Real users | **0** — all 4 auth rows are the operator's or CI's |
| Jobs · applications · match_scores | **0 · 0 · 0** |

**Nothing has been sent.** The funnel is not underperforming; it has not started. M3 has not
moved in 10 days.

## The decision that is actually blocking

Two outreach doctrines exist in the repo and they contradict each other on three axes.
Neither is marked as superseding the other, so every send is currently a coin-flip on voice:

| | `docs/OUTREACH-EMAIL.md` | `lead_outreach_config` (live, drives the AI draft) |
|---|---|---|
| mention "free" | **yes** — "It's free to list" | **never** — "Never mention money, price, or 'free'" |
| who posts the job | **Harry does** — "Five minutes of my time, nothing from you" | **they do** — "get the employer to click through and post their job" |
| reply or click | reply-based — "Worth a go?" | "one direct message, one link, no back-and-forth required… **not** a conversation opener that waits for a reply" |
| UEMA sender + unsubscribe | present, and marked non-optional | **absent from all three worked examples** |

They agree on the important thing — the "matched, not sorted" voice, relief not triage, one
human not a brand — so this is a reconciliation, not a rewrite.

---

## Tickets

One open decision each. Answer goes on the ticket when it closes.

### T-01 · Which outreach doctrine governs the first batch? — **FRONTIER**
The three-way conflict above. Until this is answered nothing can be sent, because "free /
not free" and "I post it / you post it" are different products, not different wordings.
**How to close: prototype.** Three real drafts against three real staged farms, one per
doctrine, decided by reading them. Three rough drafts beat a long abstract debate.
*Blocks: T-03, T-04, T-05, and all of fog.*

### T-02 · Does a Facebook DM need the UEMA sender + unsubscribe lines? — **FRONTIER**
`OUTREACH-EMAIL.md` states there is no B2B and no low-volume exemption, and puts penalties
at $200k. The DM config's worked examples carry neither a contact address nor an opt-out.
UEMA 2007 covers instant messaging, not just email — so on the face of it the DM path is
non-compliant, and 43 of 113 leads are DM-only. **How to close: research**, and the founder
is a lawyer, so this is cheap to settle properly rather than guess.
*Independent — nothing blocks it. Blocks T-04 if the answer is yes.*

### T-03 · What makes a farm batch-one material? — **FRONTIER**
113 staged, 111 pending, and the guidance is batches of ~5 so replies can be handled like a
human. Criteria can be set now even though the final five wait on channel. Candidate axes:
has an email, region density, role seniority, how recently they advertised, corporate vs
family. **How to close: grilling.**
*Final list blocked by T-04. Criteria are not.*

### T-04 · Email first, or DM first?
70 leads are emailable, 43 are not. Different compliance surface (T-02), different voice
(T-01), different reply behaviour. **How to close: grilling**, once T-01 and T-02 land.
*Blocked by: T-01, T-02.*

### T-05 · Does Harry post the job for them, or do they post it?
Buried inside T-01 but it deserves its own answer, because it changes what the funnel has to
do. If Harry posts, the employer never touches onboarding and consent has to be explicit; the
listing exists but the account does not. If they post, the whole signup → onboarding →
post-a-job path has to convert a cold stranger — and that path was only proven working today.
**How to close: grilling.**
*Blocked by: T-01.*

### T-06 · How does a seeker ever hear about TopFarms?
The pipeline harvests **only employers**. Zero seeker leads, no waitlist table, no capture
beyond signup itself. The goal needs an application, and right now nothing would produce one.
This is the largest unexamined hole on the map. **How to close: grilling**, then likely
research on where NZ farm workers actually look.
*Independent of T-01. Could start now if you want two threads running.*

### T-07 · How many live listings before seekers get invited?
Inviting workers to a board with two jobs burns the introduction, and they are the harder
side to re-engage. **How to close: grilling.**
*Blocked by: T-05 (which determines how fast listings can appear).*

### T-08 · `OUTREACH-EMAIL.md:52` documents the wrong opt-out procedure — **FRONTIER**
It says to record an opt-out by rejecting the lead with suppression in `/admin/leads`. That
is the *staging* path. Since 087 shipped today, a promoted lead uses the new **Record
opt-out** control, and reject-with-suppression is not reachable for it at all. A compliance
doc that describes a control the operator cannot find is the same failure F-21 was.
**How to close: task.** Small, and it is on the frontier because it blocks nothing and takes
minutes.

---

## Fog of war

Known to be coming. Not written as tickets because a blocker is still open — writing them now
would bake in assumptions the frontier is about to invalidate.

| Fog | Cleared by |
|---|---|
| Follow-up #2 and the sequence after first contact | T-01 (voice) + real reply data from batch one |
| Seeker-side creative and channel spend | T-06 |
| The farm → farm referral loop | first successful placement |
| Paid ads, any platform | knowing a conversion rate, which needs batch-one numbers |
| `?ref=` attribution reporting | any lead actually being contacted — the loop is built and has never carried traffic |
| Seeker match-alert email (currently operator-only, manual by design) | T-07 + first listings |
| Case study / first-farm story | a real placement |

## Frontier

Tickets with nothing blocking them, in the order I would take them:

1. **T-01** — the doctrine. Everything downstream is guessing until this lands.
2. **T-02** — compliance, and it can run in parallel because it is research, not judgement.
3. **T-08** — ten minutes, removes a live doc lie.
4. **T-03** — criteria only.
5. **T-06** — the other half of the marketplace, and it has had no attention at all.

Work the frontier one ticket at a time. Write the answer on the ticket, add a line to the
decision list, promote any cleared fog. Stop when quality drops — five tickets forced into one
sitting is how a map starts lying.

## Decisions so far

<!-- one line per closed ticket; this list becomes the campaign brief -->

*(none yet — T-01 first)*

## Already settled, do not re-litigate

These are locked and tickets that reopen them are mis-scoped:

- **Voice: "matched, not sorted."** Surface the right people; never sorting, triage, or
  burying. Warm to workers, relief for employers. Credit the engine.
- **Never bulk-blast.** Batches of ~5 so replies get a human.
- **Founder, not brand.** Signed Harry, one human, never "The TopFarms Team".
- **No AI as a selling point** to a stranger.
- **Honest numbers only** — no invented stats, same standard as the site.
- **Never reference private circumstances** stated in a post (illness, death, hardship).
  Respond to the job, never the reason behind the vacancy.
- **UK/NZ spelling. No em dashes. No startup thesaurus.**
