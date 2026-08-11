# Seeker funnel — recommended architecture

Written 2026-08-11 as design/product/architecture recommendation. Companion to
`SEEKER-LANE-MAP.md` (which answers "does seeker staging exist" — it does not, but the schema
already permits `type: 'seeker'`).

---

## Three things in the brief that need challenging first

### 1. The DM funnel cannot produce 1000 signups in two weeks

The described loop is: spot a post → comment → they DM → send the signup link. That is a good
loop. It is not a volume loop.

```
1000 signups ÷ 14 days            = 71 signups/day
÷ ~30% DM→signup (optimistic)     = ~240 DMs/day
× ~2 min each                     = ~8 hours/day, every day, for 14 days
```

And Meta rate-limits and flags bulk DMs from a single account, especially to non-friends. The
honest ceiling on this channel is **50–150 seekers**, and they will be *excellent* seekers,
because a human conversation preceded the signup.

**Treat DM as the quality lane. It cannot be the volume lane.** The volume lane is missing from
the plan entirely — see Lane C below.

### 2. 1000 is the wrong target — regional depth is the real one

Measured from the current employer pipeline (71 pending NZ leads):

| Region | Employer leads | Emailable |
|---|---|---|
| Waikato | 14 | 6 |
| Canterbury | 12 | 9 |
| Hawke's Bay | 9 | 4 |
| Southland | 9 | 5 |
| *(everything else, 8 regions)* | 27 | 15 |

**Four regions hold 62% of the pipeline.** A farm in Cambridge does not care that you have 1000
seekers nationally — it cares whether you have ten who will work in Waikato. A thousand seekers
spread across twelve regions is a thinner product for every single employer than three hundred
concentrated in four.

**Recommendation: target ~60–80 active seekers in each of Waikato, Canterbury, Hawke's Bay and
Southland** (~250–320 total) before widening. That is a *better* launch position than 1000
scattered, and it is achievable in the time available.

For scale: NZ has roughly 35,000 dairy farm workers. 1000 is ~3% of the entire national
workforce, recruited in a fortnight, by one person. 300 concentrated is ambitious. 1000 is a
vanity metric that will read as failure when it is missed.

### 3. Seeker harvest is not primarily a signup funnel — and that is what makes it worth building

This is the reframe that matters. A harvested seeker post has value **even if that person never
signs up**:

1. **Employer sales ammunition.** "We can see 47 people actively seeking dairy work in Waikato
   right now" is the single strongest thing you can say to a cold employer. It attacks the
   chicken-and-egg problem directly — you sell demonstrable supply before that supply has
   registered.
2. **Skills-gap evidence for the funding case.** People state gaps voluntarily in these posts
   ("my partner doesn't have much experience but wants to be able to milk by herself"). At
   scale that is the evidence base, gathered without anyone filling in a form.
3. **Market intelligence.** Which regions have surplus labour, which roles are oversupplied,
   what the going rate expectation is.
4. **A signup funnel** — the smallest of the four uses.

**So build the harvest for reasons 1–3, and treat signups as a bonus.** That also resolves the
tension with the deadline: the harvest is not on the critical path to signups, so it does not
compete with Lane C.

---

## Privacy — the constraint that shapes the architecture

Employer staging holds **business** contact details. A seeker lane holds **personal information
about identifiable individuals**: names, family composition, children's schooling, visa status,
phone numbers — collected from posts written for a different audience.

Privacy Act 2020, the two that bite:

- **IPP2** — collect personal information *directly from the individual concerned* where
  reasonably practicable. Scraping a public post is indirect collection.
- **IPP3** — when you collect, tell them: what you hold, why, who holds it, and their access and
  correction rights.

The founder is a lawyer and will make the call. But the architecture should make the safe path
the default one, and that is genuinely cheap to do:

> **Split the store by identifiability.**
>
> - **`seeker_signal`** — anonymous. Region, roles sought, shed types, skills, licences,
>   experience band, stated training gaps, source group, date. **No name, no contact, no free
>   text.** Powers employer sales, funding evidence and market intelligence. Retains
>   indefinitely; nothing in it identifies anyone.
> - **`lead_staging` (`type: 'seeker'`)** — identified. Name and contact, created **only** when
>   the operator intends to contact that person, and auto-purged if there is no reply within N
>   days (the existing `lead-dead-anonymise` cron already does exactly this shape for employer
>   leads).

Three-quarters of the value sits in the anonymous half. That is a much easier conversation with
a regulator, and it costs nothing extra to build this way if it is decided up front.

---

## The four lanes

```
A. HARVEST      automated    → market intel + employer ammo + funding evidence
B. DM           manual       → 50-150 excellent seekers          ← the brief's lane
C. BROADCAST    manual       → the volume lane                   ← MISSING
D. REFERRAL     automated    → compounding                       ← MISSING
```

### Lane C — broadcast, and why it is the one that actually hits the number

Instead of DMing 240 individuals, post **once** in each group. NZ Dairy Jobs and its peers have
thousands of members and many hundreds of daily active readers.

- One post reaches more people than a week of DMs.
- It is how these groups are already used, so it does not read as spam.
- Group admins can be approached directly — a pinned post or an admin endorsement is worth more
  than any amount of outreach.
- The harvest tells you **which groups produce the most seeker posts**, so you know where to
  post. That is Lane A feeding Lane C, and it is the strongest argument for building the harvest
  early.

Each lane, each group, and each post gets its own `?ref=` so you can see what converts.

### Lane D — referral

Farm workers know farm workers, and dairy is a tight community with high seasonal churn. One
line on the post-signup screen — "know someone else looking? send them this" with a ref-tagged
link — costs almost nothing and compounds. Skip a formal rewards programme; that is a Month One
problem, not a launch-week one.

---

## Attribution is the spine — build this first

`SignUp.tsx:85-103` reads `?role=` and nothing else. **No `ref`, no `utm_*`, no lead id.** So
today a signup cannot be traced to the outreach that caused it.

Without it you cannot answer: which group converts? Is the DM lane worth the eight hours? Did
the pinned post work? You would be running a two-week acquisition sprint blind.

This is one query param, one column and one insert. **It is the highest
value-per-line-of-code change in the entire plan**, and everything else depends on it for
measurement.

---

## The landing experience — do not send them to an empty board

A seeker who signs up this week finds **zero jobs**. If the post-signup screen is a job board,
the product's first impression is emptiness, and they never return.

The waitlist state should:

- **Say where they stand honestly** — "you're #47; we're talking to farms in Waikato now."
  Position is motivating and it is true.
- **Make profile completion the single call to action.** This is the thing you actually want,
  and it converts a waiting user into a complete record.
- **Promise a specific trigger** — "we'll email you the moment a job matching you goes live."
  Then honour it; the match engine already exists.

**The waitlist is not a holding pen. It is the profile-completion funnel wearing a friendlier
hat.**

## Onboarding — split it in two

Seven steps is right for someone who arrived intending to find work. It is wrong for a cold
click from Facebook, and it is the biggest leak in the funnel.

- **Step 1 (≤ 2 min, at signup): enough to be matched.** Region · roles sought · availability.
  Nothing else is load-bearing for a match.
- **Step 2 (later, incentivised by the waitlist screen): the rest.** Skills, quals, shed types,
  life situation, visa.

For seekers who arrived via a DM link, **pre-fill step 2 from the captured post** — "we read
your post, is this right?" That is honest (they know you read it; you replied to it) and it turns
seven steps into a confirmation. It must be gated on the `ref` token: pre-filling for a visitor
who arrives on a generic link would mean showing someone data you scraped about them before any
contact, which is precisely the IPP3 problem.

> **Open dependency:** the probe found that an active job plus an open-to-work seeker produced
> **0 match_scores** (`LAUNCH.md` R3, cause unestablished — possibly `profile_complete_pct`
> gating). If a thin two-minute profile cannot be scored, the whole split-onboarding design
> fails. **Resolve R3 before building this.**

---

## Sequencing

**Week 1 — the conversion path. Nothing else.**

1. `?ref=` attribution end to end (param → signup → stored on profile).
2. Waitlist landing screen with profile completion as the CTA.
3. Split onboarding into the 2-minute core and the rest.
4. Resolve R3 (match scoring on thin profiles).
5. Start Lane C manually — no code needed to post in a group.

**Week 2 — the harvest, built for intelligence.**

6. `seeker_signal` (anonymous) + `type: 'seeker'` in the existing paste/capture flow.
7. Extend `lead-harvest` to seeker-side sources.
8. Employer-facing supply counts ("47 seekers in Waikato") for outreach.

**Rationale for that order:** every seeker driven before step 1 exists is unmeasured, and every
one driven before step 2 lands on an empty board. Building the harvest first would produce a
beautiful pipeline feeding a funnel that leaks at both ends.

---

## What I would not build

- **A formal referral rewards programme.** One shareable link is 95% of the value at this scale.
- **Automated DM sending.** Against Meta's terms, risks the account you depend on, and destroys
  the reason the DM lane converts.
- **A seeker CRM with stages and pipelines.** The existing `outreach_status` columns cover it.
- **Anything that requires 1000 to be the number.** See above.

---

## Decisions needed from the operator

1. **Target:** regional depth (~250–320 across four regions) or the 1000 national number?
2. **Privacy:** approve the anonymous-by-default split, and the retention window for identified
   seeker leads.
3. **Lane C:** are you willing to post in groups as TopFarms, and approach admins? That is the
   volume decision.
4. **Pre-fill:** comfortable with "we read your post" for DM-referred seekers?
