# Brief: unblocked engineering, then the seeker-first pivot

Written 2026-08-11. Supersedes the previous `NEXT-SESSION.md` (M1 merge train — complete).

You are design and architecture lead for TopFarms. Work through Part A in order, then read
Part B before touching anything in it — Part B changes what "launch" means and the operator
has not ruled on it yet.

## Standing rules

- `CLAUDE.md` is binding, in particular §3 (diagnose before fix), §4 (atomic commits, no
  history rewriting without an explicit instruction in chat), §9 (verification discipline),
  §10 (two design canons; `impeccable` is the frontend design skill).
- **Verify before claiming.** A finding carries `file:line` or command output, or it is
  marked unverified. `tsc -b` is the typecheck gate, never `tsc --noEmit`.
- `main` auto-deploys to production. Nothing merges without deciding it can be live that
  minute. After any deploy, **poll a content signal, never `vercel ls` status**.
- Supabase project ref is `inlagtgpynemhipnqvty`; the project MCP is `--read-only`. DB writes
  go through the claude.ai Supabase connector `apply_migration`, and the SQL is also saved to
  `supabase/migrations/`.
- Directive §1.15: **production is never seeded.** There is no local Supabase stack on this
  machine (no container runtime), so prefer checks that need no database.
- Operator-owned, flag and never attempt: Stripe live keys, the Supabase dashboard toggles,
  legal review, naming accounts to purge, sending any outreach email.

## Measured starting state, 2026-08-11 (live prod, read-only MCP)

```
jobs 0 · applications 0 · match_scores 0 · training_demand 0 · seeker_skills 0
employers 2 (one is +ci-employer) · seekers 3 · auth users 10
newest signup 2026-08-07 — nothing has moved since the merge train
lead_staging 77 (harvest cron healthy, newest 2026-08-10)
  → NZ + direct employer + emailable: 15   ← the real Lane A push list
  → NZ + recruiter + emailable: 12
  → no usable contact: 37
main = ff65c7f, tree clean, prod 200 on / /jobs /pricing /for-employers /login
```

---

# Part A — the four unblocked items

Do them in this order. 2, 3 and 4 are independent; 1 wants a clean tree, so land the others
first or run 1 on its own branch.

## A1 — `compute_match_score` REVOKE (smallest, do first)

`compute_match_score(uuid,uuid)` and `compute_match_scores_batch` are `SECURITY DEFINER`,
accept an arbitrary `seeker_id`, and carry `GRANT EXECUTE … TO authenticated` with no
`auth.uid()` check. Any signed-in user with a `seeker_profiles.id` can recompute that seeker's
full per-dimension breakdown — the exact data directive §1.4 keeps from workers — routing
around `employer_may_view_seeker`. Origin: migration `037_definer_function_hardening.sql:105-106`
re-granted them in a blanket list, not as a considered decision.

**Before revoking**, confirm no caller depends on the grant. `grep -rn '\.rpc(' src/` returned
nothing for either function; you must **also** check `supabase/functions/` — that read was
never done and it is the one thing that could make this unsafe.

```sql
REVOKE EXECUTE ON FUNCTION public.compute_match_score(uuid,uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_match_scores_batch(uuid) FROM authenticated;
```

Verify the exact signatures from `pg_catalog` first (§9.4) — do not trust the ones above.
The trigger and precompute paths call these inside owner-context definer functions, so they
are unaffected; **prove that** by re-running match precompute after the revoke rather than
asserting it.

**Done when:** `pg_proc`/`information_schema.role_routine_grants` shows no `authenticated`
grant, and a match precompute still produces a `match_scores` row.

## A2 — `ChipSelector` / `Select` accessibility pass

Three findings from `M1-EMPLOYER-ONBOARDING-GAP-ANALYSIS.md`, all in shared form primitives,
all closed by one pass:

- `ChipSelector` carries zero aria attributes on required fields (`farm_types`, `shed_type`).
- `Select` renders errors with no `aria-invalid` / `aria-describedby`.
- "Farm name \*" reports `required: false` to assistive tech.

**Fix at the primitive, not the call sites** (§ponytail: one guard in the shared component is
a smaller diff than a guard in every caller, and patching only the named field leaves every
sibling broken). Follow the `Toggle` precedent from `b110f2f`: where a prop is genuinely
required for accessibility, make the **type** enforce it so `tsc` rejects an unnamed instance —
that is what guarantees no unnamed control ships, not a sweep.

Check whether the same defect exists on the seeker wizard and the job-posting wizard before
declaring it closed. The `Toggle` fix surfaced **ten** nameless switches where axe had found
five, because axe only sees rendered controls.

**Done when:** `tsc -b` clean, the a11y sweep passes on `/onboarding/employer` **and**
`/onboarding/seeker`, and the three findings are struck from the gap analysis with evidence.
Note the standing caveat: the sweep only scans the step the wizard *resumes* at.

## A3 — Re-run the launch readiness audit against live prod

Run `docs/LAUNCH-READINESS-PROMPT.md` against `www.topfarms.co.nz`. It has been blocked on M1
the whole time and is now genuinely runnable — prod finally *is* everything built. Standing
score is 91/100; hold or raise it.

This wants a dedicated session at high effort. Give it the measured state above so it does not
re-derive it. Expect the score to be dragged by things that are **true and known**: 0 jobs,
0 applications, Stripe still in test mode. Score them honestly rather than explaining them
away — an audit that excuses the empty board is worthless.

**Done when:** the audit output is written to `LAUNCH.md` with a dated score, and every item
that moved is traceable to a commit or a prod measurement.

## A4 — Lead contact enrichment (scoped down — read this before starting)

**I was wrong about this being cheap, and checked before writing it up.** The hypothesis was
that contacts were already sitting in `raw_excerpt` and merely unparsed, which would have made
this a free re-parse. Measured on the 37 contactless rows:

```
emails in raw_excerpt: 0     phones in raw_excerpt: 0     company_profile_url present: 3
```

So the data is genuinely not in the database and enrichment means going back to source over
the network. That is a scrape job, not a parse job, and it costs Firecrawl credits.

Given that, **do the cheap half only, and stop:**

1. Re-scrape the 3 rows with a `company_profile_url`. Trivial, bounded.
2. For the rest, the source listing page (`source_ref`) is the only lead. **Sample 5 by hand
   first** and measure the hit rate before building anything. If fewer than 2 of 5 yield a
   contact, the remaining 34 are not worth automating — report that and stop.
3. Do **not** build a general enrichment pipeline on a 34-row problem.

Reuse the existing commercial Firecrawl lane; do not add a dependency. `normalise()` logic is
mirrored in the cleanup SQL — keep them consistent if you touch either.

**Never send outreach.** Enrichment fills fields; the operator sends mail.

**Done when:** the hit rate is measured and reported, `lead_staging` reflects whatever was
recovered, and the emailable NZ direct-employer count is restated.

---

# Part B — the seeker-first pivot (read, do not build unasked)

The operator's stated intent, 2026-08-11:

> Build a waitlist of **1000 job seekers in 2 weeks**, sourced from Facebook groups and
> similar, *before* going after employers. Capture CVs, skills, and skills gaps, so that
> (a) training can be plugged in later and (b) the aggregate skills-gap data becomes the
> evidence base for a government funding application for skills training.

This is a coherent strategy and it **dissolves the launch dilemma** in the current map. That
map treats an empty job board on 2026-08-14 as a failure to be avoided. Under seeker-first it
is simply the plan: you are not launching a marketplace to employers, you are opening seeker
registration. **Go-live ticket 01 should be re-asked in those terms** rather than answered as
written — the counter gate already hides the stats band below 10, so a thin board degrades
honestly.

## What already exists (verified, not assumed)

- `seeker_profiles` captures a great deal: `dairynz_level`, `shed_types_experienced`,
  `herd_sizes_worked`, `licence_types`, `certifications`, `document_urls`, `years_experience`,
  visa, availability, regions.
- `seeker_documents` exists — CV capture is built.
- `skills` holds the **24-competency taxonomy**; `seeker_skills` is the join.
  `SeekerStep4Skills.tsx` writes to it correctly (read the file, it deletes then re-inserts).
- **`training_demand` shipped to prod as migration 079** — `audience`, `skill_ids[]`,
  `other_text`, `context`.

## The three findings that matter

**1. PR #87 is the funding instrument, and it is unmerged.** `feat/training-demand-form`
(898 insertions) puts `TrainingDemandCard` on both dashboards against that live table. The
roadmap files it as "S1, separable, cannot block launch". Under seeker-first that is backwards:
it is the **only** thing that captures skills *wanted*, which is precisely the gap evidence a
funding case is built from. `seeker_skills` gives you skills *held*; `training_demand` gives
you skills *wanted*; the delta across 1000 seekers **is** the application. Merging it after
1000 people have onboarded means emailing all of them again. **Re-rank it to first.**

**2. Seven wizard steps is the wrong front door for a cold Facebook click.** Onboarding is
`SeekerStep1FarmType` → `…7Complete`. That is right for someone who arrived intending to find
work; it will shed most of a cold social audience before you have any way to contact them. The
lazy fix is not to rebuild onboarding — it is to **capture email first and let the wizard be
the second visit**. Whatever the entry point, get a contactable address into the database on
screen one, then invite them back to complete a profile. Design this before driving traffic,
not after.

**3. One unverified risk worth ten minutes.** `SeekerStep4Skills.tsx:57` has a silent-skip
path — *"No seeker profile ID yet — skip skills save, just advance"*. If `seekerId` is ever
unset at step 4, the user's skills are silently dropped and they advance as though saved.
All three existing seekers show `onboarding_complete = true` with **zero** `seeker_skills`
rows, which is consistent with that path firing — **but those profiles date from April/May and
may predate the step entirely, so this is a hypothesis, not a finding.** Reproduce it before
fixing it. If it is real it is severe under this plan: 1000 seekers through a wizard that
silently drops skills yields no gap data and no funding case.

## Before any traffic is driven

Answer these — they are cheap now and expensive after 1000 signups:

- **What is the minimum viable capture on screen one?** Email alone, or email + region + role?
- **Does a waitlist entry need an auth user?** A `waitlist` table with no account is far lower
  friction than signup + confirm + 7 steps, but it forks the data model. Decide deliberately.
- **What does the funding case actually need?** Sample size, regional spread, and the specific
  gap framing shape what you ask. Work backwards from the application, not forwards from the
  form. The operator is a lawyer — this is their strongest ground and they should specify it.
- **Privacy.** 1000 CVs is a real obligation. The privacy policy and the retention story need
  to cover bulk CV collection before collection starts, not after. Operator + legal.

## Sequencing recommendation

1. Merge PR #87 (needs ticket 05 placement sign-off).
2. Reproduce or clear the step-4 skills risk.
3. Design the low-friction front door; decide waitlist-vs-account.
4. Only then drive Facebook traffic.

**Do not build any of Part B until the operator rules on the front-door question.** Driving
traffic into the current 7-step wizard is the one move that is hard to undo — you cannot
re-collect an audience that bounced.
