# Do seekers see a personal match score?

Type: grilling
Status: resolved

## Question

Two committed documents disagree, and nothing arbitrates them.

- `docs/design/v11-DIRECTIVE.md` §1.4: workers **never** see a personal number.
- `JobDetail.tsx`: shows a signed-in seeker a **numeric total plus per-dimension scores**, and
  shows a visitor a fabricated blurred `VISITOR_TEASER_SCORE` of **78**.

`docs/DESIGN.md:301-308` separately calls the Match Score circle "the single most identifying
component in the product".

This is a **product decision, not a gate condition** — but it must be ruled before the seeker
leg, or the audit will reopen the argument every time someone looks at the component. It is
also the one ticket here whose answer may require a redesign rather than a repair.

Sub-questions the ruling has to cover:
- Does a signed-in seeker see a number at all? If not, what replaces it — a band, a
  qualitative label, nothing?
- Does the per-dimension breakdown survive?
- What does a **visitor** see? The fabricated 78 is invented data shown to a real person;
  whatever the ruling, a made-up number presented as a real one needs to go or be
  unmistakably labelled.
- Does `v11-DIRECTIVE.md` §1.4 get amended, or does `JobDetail.tsx`?

Flagged in the brief §5 as "surface it; do not resolve it unilaterally."

## Answer

Resolved 2026-08-07, after [10](10-dual-canon-public-routes.md).

**The premise was wrong.** This ticket, the brief (§5) and `STATE.md` all said "nothing
arbitrates it". `v11-DIRECTIVE` §1.4 arbitrates it explicitly and has since v11:

> **Employers see numeric match scores.** The worker-facing profile panel shows a word,
> **"Strong"**, against a named job. **It never shows the worker a score for themselves.**

With its reasoning stated: a number attached to a person invites them to read it as a rating of
their worth, and the worker side includes migrant workers who are structurally vulnerable and
fee sensitive. §1.3 adds that the mechanic is deliberately underplayed in marketing and
**prominent in the portal** — so the fix is not to hide matching from workers, only the number.

So this was never an open product question. It was **code violating a standing decision**, and
the open parts were narrower: what replaces the number, and what a visitor sees.

### Blast radius — six worker-facing surfaces, not one

`JobDetail` was the reported symptom. A personal number was also rendered by `JobSearch` (via
`SearchJobCard` and `ExpandableCardTabs`), `SeekerDashboard` and `MyApplications` (via
`ApplicationCard`), `JobDetailSidebar`, and `SeekerStep7Complete` — across marketing routes,
the seeker portal and seeker onboarding.

`MatchCircle` and `MatchBreakdown` are shared with the **employer** side, where §1.4 permits
the number. So the fix could not be "change MatchCircle".

### Ruling and implementation

- **`MatchBand`** (new) is the worker-facing indicator: a word in a contrast-verified `Tag`,
  never a number. Six worker call sites moved to it. `MatchCircle` survives unchanged as the
  employer component — the difference between them is the point, so they must not be unified.
- **Ladder is positive-only**: ≥80 "Strong" (canon's word), ≥60 "Good", else "Possible".
  Thresholds are the ones `MatchCircle` already used, so both audiences agree where the lines
  fall. **No negative word.** "Weak" would reintroduce exactly the ranking sting §1.4 removes,
  and arguably worse than a number, which is at least specific. *This ladder is the one
  genuinely new copy decision here — it is three strings in one file if you want it changed.*
- **`MatchBreakdown` takes `audience`, defaulting to `'worker'`** so a call site that forgets
  gets the safe rendering; the number has to be asked for. Worker view drops the total, the
  per-dimension `X/max`, and the `= N% match` line. It **keeps** the dimension labels, the
  bars and the "Why this match" explanation — §1.3 wants the mechanic prominent in the portal;
  it is the score-as-verdict that is forbidden, not the reasoning.
- **`ApplicantPanel` opts in** with `audience="employer"` — the only place a number is shown
  about a person.
- **`VISITOR_TEASER_SCORE` deleted.** A fabricated 78% "match" was blurred behind a signup
  overlay and shipped to every signed-out visitor. Two faults: it was invented data presented
  as a preview of the reader's own fit when nobody had been scored, and blur is not
  concealment — the numbers were in the DOM and the bundle. Replaced by `MatchTeaser`, which
  makes the same offer without pretending to know something about a stranger. The now-dead
  `blurred` variant of `MatchBreakdown` was deleted with it.

### Verified, and the part that is not

`tsc -b` 0, lint 0 errors / 54 warnings (pin held), **vitest 640 passed**.

The three existing `MatchBreakdown` tests failed on this change, correctly — they were written
against the employer view. They now declare `audience="employer"`, and a new block asserts the
worker view leaks no total, no fraction, no percentage and no negative word, and that the
default audience stays `'worker'`.

**Not browser-verified, and it cannot be here.** Prod has **0 jobs visible to anon and 0
`match_scores` rows** for the seeker account, so `/jobs`, `/jobs/:id` and the seeker dashboard
render no match component at all. An earlier probe reported "no numbers found" on all three —
that was vacuous, and is recorded as such rather than counted. **Before this merges, it needs
one pass against an environment with a scored job.**

### Found while verifying

`/jobs` renders **two `<main>` landmarks** — `JobSearch.tsx:600` sits inside a layout that
already provides one. In scope now per `10`; not fixed here, as it belongs to the `/jobs` a11y
pass rather than the match ruling.
