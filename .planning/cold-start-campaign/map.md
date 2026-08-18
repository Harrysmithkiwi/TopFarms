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
| Staged leads | **113** · 111 pending · **100% `employer`, 0 seeker** — the seeker lane is built (`AdminSeekerStaging` + `PasteCapture`) and **idle**, not missing |
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
**Now has a real subject** (round 2): walk the **Fairlie, Canterbury** post through `/jobs/new`
rather than inventing a farm — full time, *short* term over calving, immediate start until
end Oct/early Nov, 890 cows, 54-point rotary, 2-off-8 roster, double bedroom in a shared house,
"pay depends on experience", must drive a 2-wheeler. If the wizard cannot carry that faithfully,
that is the finding.
Buried inside T-01 but it deserves its own answer, because it changes what the funnel has to
do. If Harry posts, the employer never touches onboarding and consent has to be explicit; the
listing exists but the account does not. If they post, the whole signup → onboarding →
post-a-job path has to convert a cold stranger — and that path was only proven working today.
**How to close: grilling.**
*Blocked by: T-01.*

### ~~T-06 · How does a seeker ever hear about TopFarms?~~ — **WITHDRAWN 2026-08-17, mis-filed**
Not an open decision. The strategy is settled — harvest seeker posts from NZ farming Facebook
groups, DM, sign up; 100–200 before going live; then rural newsletters and agri universities
(Lincoln); **Meta groups are the whole strategy for the first six months**. And the tooling is
already built: `AdminSeekerStaging` + `PasteCapture` exist as a sibling lane to the employer
queue, with a `SeekerDetail` shape already extracting roles, skills, licences, sheds,
availability, household and couple status.

I read "zero seeker rows in `lead_staging`" as "no channel". It means **the lane is built and
idle** — the Facebook "TopFarms People" collection is the queue, un-transferred. Full analysis
of six real posts and the resulting product gaps: [seeker-lane.md](seeker-lane.md).

Replaced by T-06a…d below.

### T-06a · What is the DM → signup step, exactly? — **FRONTIER**
Saved post → DM → landing → signed-up seeker. What the DM says, what link they land on, what
proves it worked. T-01's doctrine conflict applies here but probably resolves *differently*:
a seeker DM has no "mention free" problem and no "who posts it" question, so this is not
blocked on T-01. **How to close: prototype** — three DMs against three of the saved posts.

### T-06b · Which groups, and at what saving cadence? — **FRONTIER**
Six posts saved by three contributors is a proof of concept, not a pipeline aimed at 100–200
in a week. **How to close: grilling.**

### T-06c · Fix any of G-1…G-11 before the first 100 sign up, or after?
The gap register in [seeker-lane.md](seeker-lane.md). The sharp end: **4 of 6 posts want relief
or part-time work and the seeker profile has no hours or employment-type field at all**, and
the role list has no Shepherd. A seeker who cannot describe themselves may fill it in wrong and
never come back — but shipping schema before 100 real profiles is guessing.
**How to close: grilling.** *Blocked by: nothing, but answering it early is what makes it
cheap.*

### ~~T-06e · How do employer posts get forked out of the seeker collection?~~ — **CLOSED 2026-08-18 (`8ded09a`, Phase B2)**
Not a stray row to move: prod holds **zero seeker rows**, so the Fairlie post is in the saved
collection, not the queue. Reading the code closed the question differently — `lead-intake`
already classifies employer vs seeker and `PasteCapture` declares no lane, so **the fork works**.
Two things around it did not. A screenshot item carries no `raw_text`, so every screenshot
capture stored an **empty `raw_excerpt`** — blanking the drawer panel you read to write the DM,
returning NULL from `_lead_body_key` (092), and hiding the row from text search. And the fork was
**invisible**: "Staged 10" on the seeker screen never said one went to employers, while
`coalesce(type,'employer')` sends an unsure model's seeker there too. Both fixed. *Ruled out on
inspection: `classifyLane` is Lane A/B contactability and never overrides `type`.*

### T-06e (original) · How do employer posts get forked out of the seeker collection?
Round 2 of the saved posts contained **a live employer lead** — a Fairlie, Canterbury dairy
assistant role over calving, 890 cows, 54-point rotary, 2-off-8 roster, room in a shared house.
It is sitting in the seeker pile. `lead_staging.type` already distinguishes the two lanes and
`AdminSeekerStaging` is already a sibling route, so the plumbing exists — the human step at
capture time does not. **How to close: task.**

### ~~T-06f · How do we dedupe one person across groups and handles?~~ — **CLOSED 2026-08-18 (`0fff871`, Phase B1)**
Closed as predicted — a body key — plus a **bigger defect found on the way**: the seeker lane had
**no opt-out control at all**. 087 gave promoted `leads` one, but the seeker lane never promotes,
so a reply of "stop" to a DM had nowhere to go. `admin_lead_reject` already accepted `p_suppress`
and simply had no caller on that screen. Migration **092** adds `_lead_body_key()` (md5 of the
normalised body, NULL under 120 chars so a short generic post cannot suppress a stranger), seeker
lane only, and `admin_lead_reject` now writes a second suppression row under it.

### T-06f (original) · How do we dedupe one person across groups and handles?
`ceylon_dairy_boy` and `Deyoun_Dairy_boy` are the same person with **byte-identical post text**,
posted to two different groups under two different display names. `_lead_fingerprint` keys on
`display_name|region|type` and the fuzzy pass also runs on the name, so neither catches it.
Not just tidiness — **an opt-out recorded against one handle leaves the other contactable**,
which is the failure F-21 exists to prevent. The signal that would catch it is the post body.
**How to close: grilling**, then likely a body-hash pass in `_lead_intake`.

### T-06d · Does the seeker 100–200 land before, with, or after the employer batch?
Both sides are cold. Whichever goes first is waiting on the other, and inviting either to an
empty board burns the introduction. Supersedes T-07. **How to close: grilling.**
*Blocked by: T-05.*

### ~~T-07 · How many live listings before seekers get invited?~~ — folded into **T-06d**
Same decision seen from the employer side. One ticket, not two.

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
| **Rural newsletter partnerships** | the first 100 seekers — nothing to show a partner until then |
| **Agri university partnerships (Lincoln, Canterbury)** | same, plus an academic calendar the campaign has not been mapped against |
| **Seeker profile schema changes (G-1…G-11)** | T-06c, and ideally ~100 real profiles to aim at |
| The farm → farm referral loop | first successful placement |
| **Seeker → seeker referral** (this community talks; six posts already have 3 contributors saving them) | first cohort signed up |
| Paid ads, any platform | knowing a conversion rate, which needs batch-one numbers |
| `?ref=` attribution reporting | any lead actually being contacted — the loop is built and has never carried traffic |
| Seeker match-alert email (currently operator-only, manual by design) | T-06d + first listings |
| **Accredited-employer badge** (INZ list API; feasibility already confirmed, immigration parked) | a migrant seeker cohort large enough to justify un-parking it — G-11 is the demand signal |
| Case study / first-farm story | a real placement |

## Frontier

Tickets with nothing blocking them, in the order I would take them:

1. **T-06a** — the seeker DM. Promoted to first because the lane is **already built**, the
   queue already has posts in it, and it does not wait on T-01. It is the shortest path from
   here to a real user.
2. **T-01** — the employer doctrine. Everything on that side is guessing until it lands.
3. **T-02** — compliance, in parallel; it is research, not judgement.
4. **T-08** — ten minutes, removes a live doc lie.
5. **T-06b** — group list and saving cadence.
6. **T-06c** — schema-now-or-later, cheapest to answer before 100 profiles exist.
7. **T-03** — batch-one criteria.

**Two lanes can run at once here** — seeker (T-06a/b) and employer (T-01/02/03) block each
other only at T-06d, which is about sequencing the *invitations*, not the preparation.

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
