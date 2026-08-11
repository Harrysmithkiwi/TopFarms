# Phase brief: close the seeker funnel's leak, then the tidy-ups

Written 2026-08-11. Supersedes the previous `NEXT-SESSION.md` (four unblocked items — A1, A2
and A3 done; A4 carried forward here as item 3).

Work the items in order. Nothing here depends on Stripe, and nothing depends on go-live
ticket 01. Item 6 is blocked on an operator ruling and is listed so it is not forgotten.

## Standing rules

- `CLAUDE.md` is binding: §3 diagnose before fix · §4 atomic commits, no history rewriting ·
  §9 verification discipline · §10 two design canons, `impeccable` is the frontend skill.
- **Verify before claiming.** A finding carries `file:line` or command output, or it is marked
  unverified. `tsc -b`, never `tsc --noEmit`. **Never read an exit code through a pipe** —
  `cmd > /tmp/x.log 2>&1; echo $?`, because `| head` reports head's status, not the command's.
- `main` auto-deploys to production. After a deploy, poll a **content signal from a chunk the
  change actually touches** — twice this week a poll watched a code-split chunk the commit
  never reached and read like a failed deploy.
- Supabase project ref `inlagtgpynemhipnqvty`; project MCP is `--read-only`, writes go through
  the claude.ai connector. Directive §1.15: **production is never seeded.**
- Operator-owned, flag and never attempt: Stripe keys, dashboard toggles, legal review,
  sending outreach.

## Measured state, 2026-08-11

```
jobs 0 · applications 0 · match_scores 0 · placement_fees 0 · placements 0
lead_staging 95  (94 employer · 1 seeker — Shaye Boyd, stale, see item 1)
seeker_profiles 3 · employer_profiles 2
main = 55ab87c · prod healthy · tree clean
```

**Closed today, do not re-litigate:** ticket 02 (redirect allowlist — Site URL is now `www`,
`redirect_to` verified honoured), R3 (match engine works; the earlier zero was a probe
artefact), A1 (`compute_match_score` REVOKE), A2 (form-primitive a11y), A3 (readiness rerun).

---

## 1. Shaye's stale row — 1 minute, do first

The one seeker row predates the canonical vocabulary: it holds `roles_sought: ["Farm
Assistant"]` and `skills: ["hard working","reliable"]`. The operator tried re-pasting and it
was **refused as an exact duplicate** — `_lead_intake`'s fingerprint check (name + region +
type) blocks a re-capture, which is correct behaviour but also blocks refreshing a row.

Delete `lead_staging` id `277a1ff5-8cb5-417e-bf57-cec2ae0cf353` so the operator's re-paste
lands. **Confirm with them before deleting** — it is their data, even if it is one test row.

**Done when:** the row is gone and the operator's re-paste yields `Farm Hand` /
`Dairy cattle management`.

---

## 2. Waitlist landing + split onboarding — the big one, ~half a day

**The leak.** A seeker who signs up today lands on a job board with **zero jobs**. That is the
first impression of the product for every person the outreach converts, and they do not come
back. Meanwhile onboarding is seven steps, which sheds most of a cold Facebook click before any
profile exists.

### 2a. The waitlist state

When the board has no live jobs, the seeker's post-signup surface must not be an empty list.
It should:

- **Say where they stand honestly** — position in the queue is motivating and it is true.
- **Make profile completion the single call to action.** This is the thing the business
  actually wants; it converts a waiting user into a complete record.
- **Promise a specific trigger** — "we'll email you when a job matching you goes live" — and
  nothing vaguer. The match engine exists and works (R3), so this is a promise that can be kept.

Condition it on live job count, not on a feature flag: the same screen must stop appearing by
itself the day M3 inventory lands, with no second deploy.

### 2b. Split onboarding

- **Core (≤ 2 min, at signup): region · sector · role.**
- **Everything else deferred** to the waitlist screen's completion CTA.

> **`sector` is mandatory and this is not negotiable.** `trigger_recompute_job_scores` filters
> `WHERE NEW.sector = ANY(sp.sector_pref)`. A profile with no `sector_pref` matches **nothing** —
> it is invisible to every job ever posted. Verified 2026-08-11; see `LAUNCH.md` R3.

Region and role are what make a match meaningful; sector is what makes it happen at all.

### 2c. Carry the attribution through

`?ref=` currently reaches `auth.users.raw_user_meta_data` at signup (email path) and via
`SelectRole` (OAuth path). Confirm it still survives the new onboarding — a split that drops it
silently un-measures the whole funnel, and nothing will fail loudly if it does.

**Done when:** a seeker signing up on prod reaches a waitlist screen naming their position and
offering profile completion; a profile created through the core carries a non-empty
`sector_pref`; `?ref=` still lands in user metadata; `tsc -b` / vitest / lint / build all clean.

---

## 3. A4 — lead contact enrichment, scoped to a measurement (~1 hour)

37 staged employer leads have no usable contact. Measured earlier: **0 emails and 0 phones are
hiding in `raw_excerpt`**, so this is a network scrape, not a re-parse — it costs Firecrawl
credits, which is why it is scoped down rather than built out.

1. Re-scrape the 3 rows carrying a `company_profile_url`. Bounded, trivial.
2. **Hand-sample 5 of the rest** via their `source_ref` listing page and measure the hit rate.
3. **If fewer than 2 of 5 yield a contact, stop and report.** Do not build a general pipeline
   for a 34-row problem.

**Never send outreach.** Enrichment fills fields; the operator sends mail.

**Done when:** the hit rate is measured and reported, and the emailable NZ direct-employer count
is restated (it was 15).

---

## 4. S1 — the soft 404

`/definitely-not-a-page` returns **HTTP 200**. The branded page renders correctly, which is all
`LAUNCH.md` B3 ever asserted — the **status code** was never checked. Search engines will index
nonexistent URLs as valid pages.

The catch-all falls through to the SPA shell, which Vercel serves 200; the fix belongs with the
hybrid SSR route config, not the component. **Not launch-blocking.**

**Done when:** the route returns 404 with the branded page still rendering, and a test asserts
the **status code**, not merely the copy — the copy assertion is what let this hide.

---

## 5. S2 and the a11y leftovers — small, tidy

- **S2:** `seeker_documents: employers select applicant visible documents` is `TO public` where
  the hardening regime says `TO authenticated`. **Not exploitable** — `get_user_role(auth.uid())
  = 'employer'` is false for anon — but inconsistent. One policy rewrite.
- **`color-contrast` serious on employer wizard step 8.** The a11y sweep cannot reach it: it
  only scans the step the wizard *resumes* at. Drive to step 8 to reproduce.
- **`landmark-unique` moderate** on the employer wizard.

**Done when:** the policy is `TO authenticated` and still permits the legitimate read; contrast
meets `docs/DESIGN.md` §5; the a11y sweep stays green at both widths.

---

## 6. PR #87 — training-demand form · BLOCKED

`feat/training-demand-form`, 898 insertions. The table (migration 079) is already live in prod;
only the UI is stranded. **Blocked on go-live ticket 05** (placement sign-off), not on code.

Worth raising with the operator when the moment fits: under the seeker-first plan this is the
instrument that captures skills *wanted*. `seeker_skills` gives skills *held*; the delta across
1000 seekers **is** the government-funding application. Merging it after those seekers onboard
means emailing all of them again.

---

## Not in this phase

- Anything needing Stripe — PEND-01 and the R4 `stripe_customer_id` reset are operator-owned,
  and R5 (prod uses a different Stripe account than the connected one) needs ruling first.
- **The triage stream.** Deliberately deferred until the operator has DM'd 10–15 seekers by
  hand — the right shape follows from friction they have not felt yet, and building it now
  would be guessing.
- M3 inventory and go-live ticket 01. Operator's call, still open.
