# NOW — where the work actually is

One screen. Written 2026-08-06 because state had spread across `STATE.md` (5 weeks stale),
four off-roadmap stream directories, session memory, and 66 git branches.

**Read this first, then the authority for whichever stream you're in.** If this file and a
stream doc disagree, the stream doc wins and this file is out of date — fix it.

---

## ▶ Next session, start here — READ `.planning/NEXT-SESSION-PROMPT.md`

**That file is the paste-ready restart prompt: measured prod state, the next five steps in
order, and the wider phases before launch.** It supersedes `NEXT-BATCH-PROMPT.md` and
`D4-AND-SEARCHHERO-PROMPT.md`, both complete.

**One-line summary of where this stands: the binding constraint is not code — nobody has been
contacted.** 0 employers, 0 jobs, 1 seeker, 125 staged leads, 0 contacted. Step 1 is triaging a
**29.7% Resend bounce rate** (11 of 37), which gates whether the first batch can be sent at all.

Also closed 2026-08-19, after the D4 entry below: audit **F-19** (migration `102`,
`notification_sends` + claim-by-insert — `notify-job-filled` re-emailed every unresolved
applicant on each fill→reopen→fill), and **two dead Anthropic model IDs** —
`claude-sonnet-4-20250514` returns 404 and backed `generate-candidate-summary` and
`generate-match-explanation`, both swallowing it into a null. Now `claude-sonnet-5`, with
`tests/anthropic-model-ids-live.test.ts` pinning every model ID to a live-verified allowlist.

---

## ▶ D4 + SearchHero entry — 2026-08-19

**D4 (INZ register verification) is DONE at Stage 1, and Stages 2–3 are CLOSED, not deferred.**
Stage 0 opened the register in a browser: it **is** keyed on NZBN and **does** publish an expiry,
and **INZ's terms of use forbid scripted access** — "standard web browsers only, unless we agree
otherwise". Evidence: `docs/immigration/06-inz-register-verification.md`. So there is no Edge
Function and there never will be without an agreement with MBIE (or an OIA request for the list
as a dataset — recorded in `06` §6 with its staleness cost). Migration `101` ships the manual
version: an admin sees the claim beside the NZBN on `/admin/documents`, opens the register
themselves, and presses one of two buttons.

**Three operator decisions were taken and are now load-bearing** — do not quietly reverse them:

1. **A refusal clears the claim and nothing else.** Jobs are untouched, the stated expiry
   survives. Four of the five reasons a check fails are innocent (opted-out publication, a
   mistyped digit in 13, a trading-name mismatch, a lapsed date).
2. **Accreditation stays an attribute, never a trust-ladder rung** (F-11), and **the
   seeker-facing badge is deliberately NOT built yet** — nothing renders `accredited_employer`
   to a seeker today, so a "verified" flag would be a column with no reader. It lands in the
   same commit as the badge, and the `/jobs` filter copy changes once more then.
3. **Not chargeable.** The paid work is helping a farm *get* accredited (`02-legal-line.md`), not
   looking one up.

**Also shipped:** `<SearchHero />` on `/jobs` was mounted with **no props at all** — search box,
region dropdown and all five pills inert (F-17 family), plus a fifth region vocabulary that
matched nothing in the database. Wired, region rebuilt from `NZ_REGIONS`, pills rebuilt from
`ROLE_TYPES`.

**Still open from the D4 lane:** the automated email to an employer whose claim was cleared is
deliberately not built — the admin screen shows the cleared claim with its date; write the email
by hand until that is tedious. And the seeker-facing badge above.

**Audit F-19 is CLOSED (migration `102`, deployed 2026-08-19).** There was no delivery record
anywhere, so every sender decided from derived state. The one that mattered was
**`notify-job-filled`**, not the match alert: `handle_job_filled` fires whenever a job's status
*becomes* `filled` and the function emails **every unresolved applicant**, so fill → reopen →
fill emailed all of them twice. `notification_sends` + claim-by-insert; the unique index is
PARTIAL on `failed_at IS NULL` so a failure can be retried without deleting the evidence.
`send-followup-emails` and `send-document-status-email` were left alone — both already hold a
record, and re-sending the second is the documented operator retry path.

**⚠ The `.env` Anthropic key is still dead** (probed 2026-08-19: 400, credit too low), so
`scripts/seeker-extraction-check.ts` cannot run. **But the EDGE secret is a separate question and
was working**: 24 rows staged 2026-08-17 21:12 UTC at avg confidence 0.86, and across all 127
`lead_staging` rows there are **zero** at confidence 0 and zero with a Claude failure. The
`lead-harvest` cron runs 02:00 UTC daily and re-answers it for free.

**⚠ New, and it changes what B4 is:** **no seeker row has ever been staged.** All 127
`lead_staging` rows are `type='employer'` (81 nzfarmingjobs, 24 trademe, 20 fb_manual_capture,
2 manual_paste). The seeker fork is coded and tested but has **never run in production** — so
pasting one post is a first run, not a regression check. Budget for it failing on something
other than credit.

---

## ▶ Previous entry — updated 2026-08-17 (evening)

**2026-08-18: the next batch is written up as a paste-ready work order —
`.planning/NEXT-BATCH-PROMPT.md` (Phases B→C→D→E). Phase A, sending the first outreach batch, is
DEFERRED by operator decision; M3 is not the goal of that batch.**

**⚠ BLOCKED, and it blocks B4: the Anthropic API key in `.env` returns 400 "Your credit balance
is too low".** So the B3 behaviour gate could not run — `scripts/seeker-extraction-check.ts`
replays the real prompt and schema against Haiku and needs credit. **Whether the Edge secret
`ANTHROPIC_API_KEY` is the same exhausted key is unknown.** It matters: `lead-intake` degrades
*honestly* but silently to `confidence 0` / `missing_fields ['all — unstructured (claude 400)']`,
so bulk-loading 100–200 seeker posts against a dead key stages 100–200 unusable rows that each
look staged. Last evidence of working structuring is **2026-08-11** (rows at confidence
0.88–0.95). **Before B4: top up credit, then paste ONE post and check the drawer shows Terms and
a confidence above 0.** Two minutes, and it decides whether the whole batch is worth pasting.

**A full read-only DSA audit ran 2026-08-17 across 19 subsystems. Read
`.planning/DSA-AUDIT-2026-08-17.md` BEFORE picking anything up.** 27 verified defects, each
re-checked against the live database rather than taken from the reviewing agent.

**Then read `.planning/EMPLOYER-WALK-2026-08-17.md`.** The employer flow was driven end to end
on live prod that evening — fresh signup, email confirmation, all 8 onboarding steps, the whole
verification ladder. It corrects the audit in two places and found two defects the audit missed.
Where the two documents disagree, **the walk wins** — it is empirical.

### Closed on 2026-08-17 — do not pick these up again

- **F-11 identity rungs — `163cc29`, migration 086 (applied, verified in `pg_proc`).** The audit
  and 085 both had the cause wrong. The payload was never the problem: the **upsert form** was.
  PostgREST puts the conflict keys in `ON CONFLICT … DO UPDATE SET` and Postgres checks UPDATE
  privilege at *plan* time, while `authenticated` holds INSERT-only on `employer_id`/`method` —
  so `nzbn` AND `document` returned 42501 on the **first** submit, not just a resubmit. Proven on
  prod: identical payload, plain INSERT 201 vs upsert 42501. 085's claim that `DocumentUpload`
  "already worked" was false. Now on `employer_submit_verification()`, `status` hard-coded to
  `'pending'` so the queue still rules. Also fixes a stale verdict — a *rejected* employer
  resubmitting used to keep `status='rejected'` on brand-new evidence.
- **F-12 + F-12b — `e65a5a1`.** F-12b was the real blocker and is **not** in the audit: a
  confirmed employer was signed in and stranded on "Check your inbox", because supabase-js
  consumes the URL hash at module init and fires `SIGNED_IN` before `VerifyEmail` mounts. The
  handler never ran, so F-12's `?? 'seeker'` was never even reached — which is why the audit's
  predicted "Access Denied" is not what actually happens. Reproduced twice, once on wiped storage.

### F-11 IS NOW FULLY CLOSED — proven on prod, 2026-08-17

**An employer reached `Fully Verified` on live prod.** First time in the project's history; the
ladder had never been climbable past its first rung. Every rung is now earnable:

  email       `employer_sync_self_verifications` mirrors `auth.users.email_confirmed_at`
  identity    `employer_submit_verification` (086) — nzbn OR document, admin-reviewed
  farm photo  `employer_record_farm_photo` — self-verifying by operator decision

**Phone was dropped from the ladder rather than enabling Twilio** (`9b4256f`, operator decision).
It was unearnable — phone auth is disabled project-wide and `updateUser({ phone })` returns
500 `"Unable to get SMS provider"` — and it was the wrong signal: an NZBN is a government
registry number, a confirmed mobile proves someone held a phone for thirty seconds. The ladder
is now `basic` = email, `verified` = email + identity, `fully_verified` = + farm photo. The
Phone card is removed too; `PhoneVerification` and the RPC's phone branch are kept, so restoring
it is a revert once Twilio exists. **Do not re-add phone to the ladder without that decision
being reversed** — `tests/trust-ladder.test.ts` will fail 4 if you do.

Also closed: the **Facebook button is deleted** from `/signup` and `/login` (`aa2f2d5`) — the
provider was never enabled (`authorize?provider=facebook` → 400) so it had never worked, and
`signInWithOAuth` is now typed to the single literal `'google'` to stop it returning. And a
**rejected verification now shows an "Action needed" badge** — before, all three chip branches
were false for `rejected`, so the card looked untouched while silently needing the employer to act.

### Also closed 2026-08-17 — the pre-outreach security + compliance pass

Four findings, sequenced deliberately around the fact that **prod still holds zero real
users and zero jobs**, which is the cheapest possible moment for all of them.

- **F-21 — `9c03d3f`, migration 087.** The opt-out control. Applied at **0 leads contacted**,
  so the compliance gap cost nothing; from the first send it would have. Also fixed the half
  an RPC alone would not: suppression keyed on `name|region|type` while `region` is null ~1 row
  in 11, so an opt-out silently stopped holding on re-harvest. Separate
  `_lead_suppression_key(name, type)`; dedupe keeps its region-bearing fingerprint.
- **F-01 — `c69eb52`, migration 088.** Suspension now gates. **Read the commit before touching
  this:** the one-line fix the audit describes would have been a *security regression*.
  `get_user_role` returning NULL is fine for all 22 policies (they use `=`, fail closed) but
  `_admin_gate` used `!= 'admin'`, and `NULL != 'admin'` is NULL, which does not fire an `IF`.
  Shipping the predicate alone would have opened the admin gate to **any authenticated user
  with no `user_roles` row**. Both functions must stay in one migration.
- **F-02 — `8badbfa`, migration 089.** 38 employer columns were readable by any seeker. The
  audit's prescribed fix would have taken the marketplace dark — the view is
  `security_invoker=true`, so dropping the base policy returns zero rows to anon and every
  logged-in seeker. The view now stands on its own `WHERE` at owner rights instead.
- **F-22 — `08fcc6f`.** Role filters. The forked list also invented four roles that do not
  exist and omitted four that do, so a case-mapping layer would still have been wrong.

**Two of the four audit fix-shapes were wrong in ways that would have caused an incident.**
Treat the audit's "Fix" column as a hypothesis, not a spec — verify against live catalogs first.

**Prod is now clean:** the three `+e2e-emp-0817*` test accounts and the Kowhai Downs profile
with its fabricated NZBN are deleted. 4 users remain — `admin@`, `+ci-seeker`, `+ci-employer`,
`+uat16aug`. **Both CI accounts survive**, so `E2E_REQUIRED_ROLES` stays green. 0 employer
profiles, 0 verifications, 0 jobs. The first real employer will genuinely be the first row.

### Still blocking

1. **M3 — one real listing.** Unchanged since 2026-08-07 and now the *only* thing gating
   launch. **Outreach has not actually been sent**: 104 staged, 2 promoted, **0 contacted**.
   Everything downstream waits on this single event — the payment path (never run in prod),
   the match alert (never fired), M4's cold-start check, §4 payment verification, S2's positive
   read, and v2.1 Phases 24–26 (explicitly gated on "real ag-employer liquidity").
2. **PEND-01** — Stripe test→live swap, needs a real $0.50 charge and refund. Blocks
   `/gsd:complete-milestone v2.0`. Also downstream of a listing.

**Best single code slice: F-01** — add `AND is_active` to `get_user_role`. One predicate, one
function body, no policy DDL, and suspension starts working across ~30 policies and 51 RPCs at
once. Nothing else in the register has that ratio.

**Three sequencing constraints that will bite if ignored:**
- F-15 and F-20 both rewrite the same four trigger functions in 072 — **one migration or the
  second silently reverts the first.**
- F-04 depends on F-03's trigger existing.
- F-05 before F-06 — idempotency is what makes the retry F-06's constraint assumes safe.

**Test data left in prod, yours to purge:** two employer accounts
(`admin.topfarms+e2e-emp-0817@gmail.com` and `…-0817b@gmail.com`), one complete
`employer_profiles` row (Kowhai Downs Station), and its `employer_verifications` rows carrying a
fabricated NZBN and `https://example.test/…` URLs. Nothing was deleted.

**Both write connectors are back.** The claude.ai Supabase connector applied 086 and recorded
`20260816223150`; `vercel whoami`/`ls` work and never needed `vercel login`. The 2026-08-17
morning note claiming both had lapsed is stale.

---

## Previous entry — 2026-08-16

`main` = `b93a9c5`, tree clean, CI green on all of today's commits.

**OUTREACH TO REAL JOB SEEKERS AND EMPLOYERS BEGINS 2026-08-17.** From that point the signup
flow has real strangers in it and must be trusted, not assumed. The seeker signup + profile flow
was driven end to end on live prod 2026-08-16 and verified field-by-field against the database.
**The employer signup → onboarding → post-a-job flow has NOT been re-driven since today's
changes** — that is the largest untested path going into outreach, and employers are half the
audience being contacted.

**Sentry is LIVE** (project `topfarms-web`, EU region, errors only). One gap remains and it is
not code: **post one real job listing.** It unblocks the payment path (never run in prod), the
employer experience, and it is the live test of the match alert. Guide:
`.planning/go-live/OPERATOR-GUIDES.md`.

**Deploy-trust caveat, 2026-08-16.** A push to `main` (`b93a9c5`) passed CI and produced NO
git-sourced Vercel deployment — verified via the API: every other push that day has
`source='git'` within a minute, that one has only my later `source='cli'` deploy. The Git link
itself is intact and correct (`github`, `Harrysmithkiwi/TopFarms`, `productionBranch: main`,
credential present, no `commandForIgnoringBuildStep`), and other projects were sitting `Queued`
in the same window, so this reads as a dropped or delayed platform event rather than a broken
connection. **Do not treat "pushed to main" as "live" — verify the deploy.** Cheapest check:
`curl` the API deployments list and confirm a `source='git'` entry exists for your SHA.

Engineering work that is unblocked, in order:

1. **Nothing is blocking launch that is mine to fix.** The one remaining gap is an operator act —
   post a listing. Step-by-step guide in `.planning/go-live/OPERATOR-GUIDES.md`.
2. **When the first listing exists, verify the match alert end to end.** The path has never
   fired: prod has zero jobs and is never seeded. Confirm the email lands at
   `admin.topfarms@gmail.com`, then confirm `match_scores` rows match what it listed.
3. **Also unblocked by that first listing:** M4's cold-start check, §4 payment verification,
   and S2's positive read (the `seeker_documents` employer policy returns 200 but has never
   returned an actual row — recheck at the first real application).
4. **Both of these are now DONE — do not pick them up again.** The `ChipSelector` / `Select`
   a11y pass shipped on 2026-08-11 (`dac7e06`, findings 4 + 5 closed at the primitives), and
   the shed-type wart shipped 2026-08-14 (below). What remains from that gap analysis is §6
   polish only: the `406` on a brand-new employer's first load, `color-contrast` serious on
   step 8, `landmark-unique` moderate on every step, and the step-8 `h2` scale drift.

**Shipped 2026-08-16:**

- **Seekers could not edit their profile at all.** `/onboarding/seeker` hard-redirects once
  `onboarding_complete` is true, and three "Edit Profile" affordances — the persistent sidebar
  item, the dashboard link, the completion screen — all pointed at it, so every one was a no-op.
  The redirect's own comment anticipated a `/profile` route that was never built. Now
  `/dashboard/seeker/profile`: section list, Edit per section, form expands in place. It reuses
  the six onboarding step components (new `submitLabel` prop) rather than reimplementing their
  forms, so the Phase 5.6 prefill guards are not duplicated. Employers were never affected —
  `EmployerOnboarding` has no `navigate()` at all. `36d1d2e`.
- **Contact details are their own section.** Name and phone were already editable — inside step
  1, under the heading "Farm type & region", where nobody would look. Split into a "Your
  details" section, first, summarised with the name and phone themselves. State + prefill guard
  extracted to `useSeekerContact`, inputs to `SeekerContactFields`. **No confirmation step on
  name/phone, deliberately** — 2FA guards logging in; once a session exists a second factor on a
  field edit adds friction without stopping the attack. Email (the login identity) is still not
  editable; when it lands it must use Supabase's confirm flow with Secure email change ON.
  `38d696e`.
- **Sentry was leaking the PII it claimed to scrub.** Found by firing a probe error at PROD and
  reading the envelope off the wire. `beforeSend` scrubbed `extra` and `contexts` only — the
  same email and phone travelled raw in the exception message (the issue *headline*), the console
  breadcrumb, and its nested arguments. ~59 `console.error` calls feed that path. Also raised the
  recursion cap 6 → 10: the old limit returned the remainder **unscrubbed**, failing open exactly
  at `breadcrumbs → data → arguments → object → string`. Re-probed after deploy: 0 raw email, 0
  raw phone, 12 redaction markers. `b93a9c5`.
- Also fixed: `nz_citizen` rendered as "Nz Citizen" in three places including `ApplicantPanel`,
  the employer-facing surface behind a paid placement (label maps existed and were bypassed); and
  `role_type_pref` was missing from the onboarding prefill while step 1 read it as a default, so
  leaving mid-onboarding cleared the seeker's chosen roles and the next upsert wrote that over
  the real value.
- Gate on each: `tsc -b` 0, lint 0 errors at the 54 pin, build 0, 696 tests. All three
  mutation-checked.

**Shipped 2026-08-14 (launch morning):**

- **Shed type is dairy-only.** It was required on every sector, so a Sheep & Beef, cropping or
  deer employer could not submit — and the same rule existed **twice**, in the job wizard AND
  in employer onboarding step 2. The onboarding one was the worse of the pair: it blocked
  profile completion at the front of the funnel, not just one listing. Both now gate on farm
  type; required only for dairy; hidden fields cleared on submit so a dairy prefill cannot ride
  onto a non-dairy job. The dairy path is byte-identical — this is a no-op for dairy employers.
  `compute_match_score` already handled it (`v_shed_applicable` false on an empty `shed_type`,
  dimension drops out of the denominator), so no DB change was needed.
- **`PostJob` live preview showed the farm *type* where the farm *name* belongs** — it read
  `employer_profiles.farm_type`, and `farm_name` was never fetched. Every employer posting a
  job saw "dairy" as their farm name.
- Gate: `tsc -b` 0, 673 tests, lint 0 errors at the 54 pin, build 0. `tests/shed-type-sector-gating.test.tsx`
  covers both forms and was mutation-checked in both directions.

**Shipped 2026-08-13, do not re-litigate:**

- **Operator match alert** — `cf3ebcd`, migration 084 (ledger `20260813120337`). Job goes
  `active` → `on_job_activated_notify_matches` → pg_net → `notify-job-matches` Edge Fn →
  emails the operator the ranked matched-seeker list. Seeker-facing sends stay MANUAL by
  design. Verified: trigger in `pg_catalog`, deploy green, no-secret probe → 403.
- **DMARC now collects** — `v=DMARC1; p=none; rua=mailto:dmarc@topfarms.co.nz` plus a
  Cloudflare Email Routing rule for `dmarc@`. `p=none` deliberately kept until reports are
  read. The trap that would have wasted weeks: `rua=` at a non-matching domain needs that
  domain's authorization record and Gmail publishes none, so `rua=mailto:…@gmail.com` is
  silently discarded by reporters.
- **Site URL confirmed www** (probe 303s to `www.topfarms.co.nz`) — the apex sighting
  predated ticket 02's fix. Closed, stop re-checking it.
- **Cloudflare MCP authorized and working**, zone `35ef14676d0f1808b817d06358d98afa`.

---

## Shipped and live

`main` = `8351acf`, auto-deploys to prod at **www.topfarms.co.nz** (apex 308s to www; DNS at
Cloudflare, proxy OFF on the Vercel CNAMEs or SSL breaks).

Through GSD Phase 28 + 28b: the marketplace, admin portal, lead triage, and the
nzfarmingjobs harvest cron with its watchdog.

## ✅ M1 merge train COMPLETE — 2026-08-07/08. There are no in-flight branches.

All three merged in the mandated order, each gated and verified live before the next:
① `design/admin-gate` `888b175` → ③ `pricing/model-v3` `96eee62` →
④ `v13-stage3b-framework-mode` `f054b67` → docs `c2fdbcf`. **Prod now IS everything built.**

Framework mode confirmed live by the honest signal: `/jobs` serves **60KB of server-rendered
HTML**, not the old 1.4KB SPA shell. Pricing v3 correct in both audience lenses.

Then shipped on 2026-08-08 (`4db1cb9`, `f8ff9b4`, `b110f2f`, `8351acf`):
the §3 employer-onboarding gap analysis, the No-Subtitle Rule across all three portals, and
the three onboarding fixes that gated outreach.

Only `feat/training-demand-form` (PR #87, S1) remains unmerged — separable, cannot block
launch, needs go-live ticket 05 placement sign-off.

`main` auto-deploys, so **nothing merges without deciding it can be in prod that minute.**

### Two habits this week earned the hard way

1. **Poll a CONTENT signal after a deploy, never `vercel ls` status.** A status-based wait
   returned early and produced a false "pricing is broken on prod" alarm that was purely a
   stale deploy mid-propagation. Use something only the new build serves.
2. **A fresh-context verifier briefed to REFUTE pays for itself.** One found the same nested
   `<main>` defect on `/jobs/:id` that the `/jobs` fix had missed, plus two holes in a guard
   I had just written. It also disproved two of my own findings.

## Blocked on a human, not on code — **launch 2026-08-14, 6 days out**

**These two gate M3, and M3 is now the long pole.** Outreach → signups → listings takes days
that cannot be compressed, and nothing downstream starts without them:

1. **Go-live ticket 01 — the inventory ruling.** How many listings by launch day, and which of
   the 62 staged leads to push. **Outreach cannot start without this.** Highest-leverage
   decision on the board.
2. **Go-live ticket 02 — the Supabase redirect allowlist.** A dashboard toggle, ~5 minutes.
   Until it flips, the first real employer who fumbles a password hits a dead reset link.

Then:

3. **PEND-01 — Stripe test→live swap.** 9-item checklist in `DECISIONS-PENDING.md`. Blocks
   `/gsd:complete-milestone v2.0`. Needs a real $0.50 charge and refund.
4. **Legal review**, and **ticket 04** UAT-account purge — the `+ci-seeker`/`+ci-employer`
   accounts must SURVIVE or CI goes red (`E2E_REQUIRED_ROLES` fails rather than skips).
5. **The 16px ramp decision** (below, under Open rulings).

**Resolved, do not reopen:** the match-score display argument. §1.4 is implemented and now
covered by `tests/match-breakdown-ui.test.tsx` — `MatchBreakdown`'s `audience` prop defaults
to `'worker'` so a forgetful call site gets the safe one, and workers see a band **word**, never
a numeral. Mutation-checked. The fabricated blurred `78` teaser is gone.

## Open rulings

- **Two sizes ship in the gated portals that are not on the `DESIGN.md` ramp — 14px AND 16px.**
  The ramp is `48 / 36 / 24 / 20 / 17 / 15 / 13 / 12 / 11`; neither value appears on it.
  Measured 2026-08-17, marketing surfaces excluded (`Home`, `ForEmployers`, `Pricing`,
  `legal/`, `components/landing/` are settled and out of scope, §10):

  | size | gated-portal usage | where |
  |---|---|---|
  | **14px** | **47 uses across 26 files** | card titles, modal headings, admin table headers — almost all `font-semibold` |
  | **16px** | **20 uses across 14 files** | modal titles, stat values, banner titles, sidebar headings |

  **14px was recorded as 16px's ruling by mistake and is the bigger of the two.** It surfaced
  again 2026-08-17 as an impeccable hook finding on `EmployerVerification.tsx:74/335/387`,
  where it was waved off as "the open 16px ruling" three times before anyone checked the ramp.
  It is not the same value. Both lines blame to `2574fe9`, a `prettier --write` format-only
  commit from 2026-06-10 — this is old, shipped, systemic drift, not a recent slip.

  **One decision covers both, ~67 usages.** Either add 14/600 and 16/600 to the ramp (zero
  visual change, recommended — the doc is wrong, not the code) or normalise to the existing
  15px and 17px steps (40 files of churn for 1–2px). Not launch-blocking — M5 polish.

  **No impeccable waiver has been run and none should be** without the operator saying so: a
  waiver is a change to the gate's shape (`CLAUDE.md` §10). Expect the hook to keep flagging
  these on any file you touch in the portals; that is the gate working, not a false positive.
- **`ProtectedRoute`** — one guard, 24 routes, all three portals. Decides where admin-gate
  Phase B starts. Detail in `.planning/admin-design-gate/STATE.md` § Open rulings.
- **Employer-onboarding leftovers**, from `M1-EMPLOYER-ONBOARDING-GAP-ANALYSIS.md`: a `406`
  fires on every brand-new employer's first screen; `color-contrast` serious on wizard step 8.
  Filed, neither launch-blocking. **The a11y half of this bullet is CLOSED** — `ChipSelector`
  and `Select` both carry `aria-required` / `aria-invalid` / `aria-describedby` as of `dac7e06`
  (2026-08-11). The stale wording here is what aimed a whole session at finished work on launch
  morning; the gap-analysis doc had it right and this file did not.
- **`compute_match_score` grant** — `SECURITY DEFINER`, takes an arbitrary `seeker_id`, granted
  to `authenticated`, no `auth.uid()` check, and nothing in `src/` calls it. One-line `REVOKE`.
  Deliberately not applied mid-merge-train; safe to do now. Detail in go-live map § M4.

## Streams and their authorities

| Stream | Authority | State |
|---|---|---|
| GSD roadmap | `.planning/ROADMAP.md` | v2.2 current; Phase 28 closed; 24–26 sales-gated |
| **Go-live (launch 2026-08-14)** | `.planning/go-live/map.md` (wayfinder) | **THE current map** — M1 ✅ done; M3 inventory is the long pole |
| Design gate — decisions | `.planning/design-gate/map.md` (wayfinder) | 11 tickets, all closed — feeds go-live M5 |
| Design gate — admin **execution** | `.planning/admin-design-gate/STATE.md` + `docs/ADMIN-DESIGN-PROMPT.md` | Gate A + B met for `AdminTable`; C–D open |
| Gated-portal design canon | `docs/DESIGN.md` (+ `docs/PRODUCT.md`) | `src/index.css` wins on any hex. **`impeccable` is THE frontend design skill** (CLAUDE.md §10) |
| Public marketing canon | `docs/design/v11-DIRECTIVE.md` | **Settled. Out of scope. Do not audit.** |
| Pricing v3 | directive 1.19 | **Live in prod**, verified both audience lenses |
| Leads | `.planning/leads-triage/` | Phase 1 + Leads v2 in prod; A4 draft step pending operator config |
| Immigration | `docs/immigration/` | **Parked until post-launch** |

Two design systems ship here on purpose (`CLAUDE.md` §10). Applying one to the other's surface
is the failure mode that rule exists to prevent.

## Milestones

- **v1.0 MVP** ✅ 2026-03-17 · **v1.1 SPEC compliance** ✅ 2026-03-23
- **v2.0 Launch Readiness** — all phase work done; close blocked on PEND-01 only
- **v2.1 Match + Train + Retain** — Phase 23 done; 24–26 gated on first sales
- **v2.2 Lead Acquisition & Admin Ops** — current; Phase 28 closed
- **Off-roadmap, operator-directed:** leads triage, lead harvest, v13 design port, pricing v3,
  admin design gate. Deliberately outside GSD, same as `.planning/leads-triage/` always was.

## Branch hygiene — 66 branches, 55 are dead

`git branch -vv` shows 55 branches at **0 ahead of `main`** and 100–540 behind. All merged or
abandoned; they are pure noise when finding the live ones.

Eight more are ahead but far behind and probably abandoned — `remediation/stage-2` (11 ahead /
173 behind), `docs/gtm-funnel-spec` (5/173), `feat/landing-refresh` (3/278),
`design/landing-refresh` (2/171), `hotfix/truth-pass` (1/173), `hotfix/truth-pass-2` (1/172),
`feat/design-system-screens` (1/277), `docs/phase-5-handoff` (1/10). **Check each before
deleting** — an "ahead" count means commits that exist nowhere else.

Not deleted. `git branch -D` needs explicit operator instruction in chat (`CLAUDE.md` §4, and
§8 records what happened the last time a reset ran unasked).

## Retracted

**"Email confirmation is broken in prod" (raised and withdrawn 2026-08-07).** Replaying the
real confirmation tokens read straight from `auth.users` confirmed both accounts first try and
issued valid sessions. **Signup confirmation works.** The failure was entirely in how the
Gmail connector rendered the link: quoted-printable was double-decoded, so `=54` became `T` and
`=89` became a replacement character, eating the first two hex digits of a 56-character token.
Recorded here rather than deleted, because "we thought signup was broken" is worth being able
to trace.

Still true and still unfixed, though smaller than it looked: `/auth/v1/verify` ignores
`redirect_to` and falls back to the apex Site URL while prod serves `www`
([[project_supabase_redirect_www]]). Open redirects are correctly refused.
