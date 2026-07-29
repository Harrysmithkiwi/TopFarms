# Pre-Launch Audit — end-to-end: what must be enhanced & optimised before we launch

**Mission.** Run a **project-wide, end-to-end audit** of TopFarms and surface everything that should be
fixed, hardened, enhanced, or optimised **before public launch**. Then fix the launch-blockers, verify
live, and re-score. **Plan → execute → verify. Do not report done until the P0 list is empirically closed
and evidenced.** Audit from the *user's* end-to-end point of view, not by reading code in isolation.

Read first: `CLAUDE.md` (house rules), `LAUNCH.md` (readiness source of truth), the memory index, and
`docs/immigration/` only to confirm that phase stays parked. Verify the Supabase project ref
(`inlagtgpynemhipnqvty`) before the first MCP call.

## Where things stand (don't re-discover this)
- Live at https://www.topfarms.co.nz (Vercel auto-deploys `main`; edge fns deploy via `supabase-deploy.yml` on merge).
- Launch readiness last scored **93/100**; the human-owned gate is closed (legal accepted, UAT purged, DB clean 6 users/0 jobs cold-start). Cold-start = **Option A** (quiet launch → hand-recruit real listings via the leads pipeline → then market).
- Admin portal was just taken **74 → ~95** (mobile nav, design system, skeletons, focus-trap, bulk actions, Lane-A outreach, worklist, funnel). Admin is in good shape — **spend the audit on the PUBLIC + APP surfaces (seeker & employer), not admin.**
- **O5 leaked-password protection deferred** (Supabase Pro-gated; app enforces min-10 + letter + number) — a conscious accepted risk, not a blocker to re-raise.
- Known constraints: pooler auth blocked (apply migrations via the claude.ai Supabase connector, not `db push`); **3 pre-existing red tests** on `main` (landing-page hero label, search-preview ai-bg, a stale staging drift-guard reading migration 054) — triage, don't assume they're mine; a Vite **681 kB main chunk** warning (code-split candidate).
- Schema gotchas that have bitten before: `seeker_contacts` keys on `user_id` and has **no name columns**; `match_scores` has **no application_id** (join on job_id+seeker_id); `applications.seeker_id` is a `seeker_profiles.id`.

## Method — how to audit (this is the "deep end-to-end" part)
1. **Walk every real journey as the user, live.** Seed throwaway accounts (temp-admin recipe in memory `project-verify-with-temp-admin`; seed a throwaway seeker + employer the same way), drive them through the actual UI with chrome-devtools at **1200px and 375px**, and hit the real DB/RPCs/edge functions. Delete all test data + temp accounts after.
2. **Probe the unhappy paths**, not just the golden path: empty states, error states, network failure, expired session, concurrent edits, chunk-load failure, permission boundaries (does a seeker see employer data? does anon reach anything?).
3. **Evidence every finding** — a repro, a screenshot, a read-only SELECT, a REST round-trip, or a Lighthouse/console capture. No claim without proof.
4. **Gate:** `tsc -b` (never `--noEmit`); run the full `vitest` suite; run `npm run build`; Lighthouse on key routes.

## The journeys to walk end-to-end (the spine)
- **Seeker:** land → signup → onboarding (all steps) → profile/skills → browse/search jobs → match scores → job detail → apply → applied status → withdraw + re-apply → shortlisted/hired → emails/notifications.
- **Employer:** land → signup → onboarding → verification tier → post-job wizard (past-date guard) → duplicate job → live listing → receive applicants → applicant dashboard + AI summary → shortlist → placement → Stripe invoice → pay → mark filled → notifications/emails.
- **Cross-cutting:** auth (login/logout/password reset/session expiry/role routing), and the leads pipeline → approving a real lead → the account it becomes.

## Audit dimensions — be exhaustive; score each finding
1. **Journey completeness** — dead-ends, broken steps, missing back-paths, orphaned states.
2. **Conversion / activation** — CRO on landing, pricing, signup, onboarding; drop-off points; empty states that should convert, not dead-end.
3. **Matching correctness & trust** — match scores compute correctly; applicant/status data accurate; **no fabricated stats anywhere (truth-pass)**; copy frames "matched, not sorted" (warm to workers, relief for employers).
4. **Security & data integrity** — RLS deny-by-default; **no `select('*')` leaks** (esp. `employer_profiles`/`stripe_customer_id`); SECURITY DEFINER helpers for cross-table predicates (42P17 recursion risk); admin gating; anon reachability; PII handling + NZ Privacy Act; auth edge cases.
5. **Payments / revenue** — Stripe placement-invoice flow; webhook idempotency + signature; refunds; failure/edge cases; no card data mishandling.
6. **Performance** — the 681 kB chunk (route-level code-split); Lighthouse perf; Core Web Vitals; DB indexes + N+1s on hot queries; image/font optimisation; lazy-chunk retry already in place.
7. **Reliability & observability** — error handling on every mutation + edge function; email deliverability (Resend — is `RESEND_API_KEY` set in prod? MAIL flows actually send?); crons (lead-harvest, staging-purge, harvest-watchdog) healthy; monitoring/alerting; rollback story.
8. **Accessibility** — WCAG AA: keyboard paths, focus management, contrast, labels, form errors, reduced-motion; run axe/Lighthouse a11y on public + app.
9. **SEO / discoverability** — per-route meta/OG; sitemap; robots; **JobPosting structured data** on listings (big for a jobs site); `llms.txt`/AI-SEO; canonical URLs.
10. **Mobile / responsive** — every public + app surface at 375px (admin was just fixed; the app/public need the same scrutiny).
11. **Content / copy / legal** — brand voice; microcopy; `/privacy` + `/terms` current + accurate; job-listing employment-law compliance; contact = hello@topfarms.co.nz sitewide.
12. **Email / notification lifecycle** — transactional + applicant/employer notifications fire correctly; deliverability; unsubscribe/preferences.
13. **Error / empty / edge states** — network failure, empty datasets, expired session, concurrent edits, chunk-load failure.
14. **Design-system consistency (the app)** — apply the admin-uplift bar to the public/app: loading skeletons (not "Loading…"), tokenised styles, shared components, single error signal, no emoji-as-UI.
15. **Test coverage** — the 3 pre-existing red tests (fix or justify); coverage of the money + auth + RLS paths; add the missing runnable checks.
16. **Launch ops** — cold-start tooling ready; leads pipeline healthy; any remaining `LAUNCH.md` human-gate items; the immigration phase confirmed parked.

## Severity rubric (prioritise every finding)
- **P0 — launch-blocker:** data loss, RLS/security leak, payment failure, a broken core journey, legal exposure, or any fabricated data.
- **P1 — launch-critical:** conversion killer, broken edge case in a core flow, major perf/a11y/SEO gap.
- **P2 — post-launch-soon:** polish, minor perf/a11y, inconsistency.
- **P3 — backlog:** nice-to-have.
Tag each finding **severity + effort (S/M/L)**. Rank the report P0→P3.

## House rules (non-negotiable — CLAUDE.md + memory)
`tsc -b` gate. DB writes via the **claude.ai Supabase connector** (records `schema_migrations`); always save SQL to
`supabase/migrations/` + verify via `pg_catalog`/read-only SELECT; new `get_user_role`-touching policies **TO
authenticated**; cross-table predicates via **definer helpers**; no `select('*')` on `employer_profiles`. Edge fns
deploy on merge (or connector). **Atomic commits, one workstream per PR; no history-rewriting** (`git reset --hard`
etc.) without explicit operator instruction. **Diagnose before fix** — show the SQL/code/diff first. Verify
admin/employer/seeker-gated surfaces with **throwaway accounts** (seed → REST/UI test → **delete**); clean up all
test data. **No fabricated stats.** Immigration/visa work stays **parked**.

## Deliverable
1. **`docs/PRE-LAUNCH-AUDIT.md`** — the findings report: grouped by dimension, each finding with **severity + effort +
   evidence + fix recommendation**, then a **launch-readiness re-score** and an explicit **P0/P1 must-fix list**.
2. **Fix the P0s + agreed P1s** in atomic PRs; verify live (throwaway accounts, 1200/375, `tsc -b`, tests, build,
   Lighthouse); re-score after.
3. Update `LAUNCH.md` + a `docs/SESSION-HANDOFF-*.md` + memory (`project_launch_readiness`) with what shipped and
   any carryforward (P1/P2 with estimates).

## Definition of done
Every **P0 closed and evidenced**; P1s triaged (fixed or carryforward with an estimate); clean `tsc -b` + build;
re-scored launch readiness; handoff + memory updated. **Come back with the scorecard, not a promise.**
