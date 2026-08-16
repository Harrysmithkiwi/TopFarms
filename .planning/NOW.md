# NOW — where the work actually is

One screen. Written 2026-08-06 because state had spread across `STATE.md` (5 weeks stale),
four off-roadmap stream directories, session memory, and 66 git branches.

**Read this first, then the authority for whichever stream you're in.** If this file and a
stream doc disagree, the stream doc wins and this file is out of date — fix it.

---

## ▶ Next session, start here — updated 2026-08-17

**A full read-only DSA audit ran 2026-08-17 across 19 subsystems. Read
`.planning/DSA-AUDIT-2026-08-17.md` BEFORE picking anything up.** 27 verified defects, each
re-checked against the live database rather than taken from the reviewing agent. It changes the
priority order below: several things believed working are not.

**The four that block onboarding or outreach** — detail and fix shape in the audit doc:

1. **F-21** — an opt-out cannot be recorded for anyone you email. `lead_suppression` is writable
   only from a *staging* row; once a lead is promoted there is no control at all. The documented
   procedure in `docs/OUTREACH-EMAIL.md:52` is not executable. **Compliance, not code quality.**
2. **F-11** — no employer can complete verification. 073 revoked `status`/`verified_at`; four of
   five client writers still send them. `PhoneVerification` says "verified" while the write is denied.
3. **F-22** — every role filter on `/jobs` returns zero results (two vocabularies, no mapping).
4. **F-12** — a newly verified employer can land on "Access Denied" (`?? 'seeker'` on a discarded error).

**Best single first slice: F-01** — add `AND is_active` to `get_user_role`. One predicate, one
function body, no policy DDL, and suspension starts working across ~30 policies and 51 RPCs at
once. Nothing else in the register has that ratio.

**Three sequencing constraints that will bite if ignored:**
- F-15 and F-20 both rewrite the same four trigger functions in 072 — **one migration or the
  second silently reverts the first.**
- F-04 depends on F-03's trigger existing.
- F-05 before F-06 — idempotency is what makes the retry F-06's constraint assumes safe.

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

- **16px is not on the DESIGN.md ramp but 18 gated-portal components use it** (modal titles,
  stat values, banner titles, sidebar headings), almost all `font-semibold`. The doc is wrong,
  not the code. Either add 16px/600 to the ramp (zero visual change, recommended) or normalise
  all 18 to the existing 17px step (18 files of visual churn for 1px). Not launch-blocking —
  M5 polish. No impeccable waiver has been run.
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
