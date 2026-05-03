# Roadmap: TopFarms

## Milestones

<details>
<summary>v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-15
- [x] Phase 2: Employer Supply Side (6/6 plans) — completed 2026-03-15
- [x] Phase 3: Seeker Demand Side (7/7 plans) — completed 2026-03-16
- [x] Phase 4: Match Scoring Engine (4/4 plans) — completed 2026-03-16
- [x] Phase 5: Revenue Protection (4/4 plans) — completed 2026-03-17
- [x] Phase 6: Landing Page and Launch (2/2 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 SPEC Compliance (Phases 7-11) — SHIPPED 2026-03-23</summary>

- [x] Phase 7: UI Primitives (3/3 plans) — completed 2026-03-22
- [x] Phase 8: Wizard Field Extensions (5/5 plans) — completed 2026-03-21
- [x] Phase 9: Page-Level Integrations (6/6 plans) — completed 2026-03-22
- [x] Phase 10: Landing Page (3/3 plans) — completed 2026-03-22
- [x] Phase 11: Backend-Dependent Features (2/2 plans) — completed 2026-03-22

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v2.0 Launch Readiness (In Progress)

**Milestone Goal:** Close 6 launch-critical gaps so TopFarms can go live — OAuth signup, production email, bug fixes, and saved search.

- [x] **Phase 12: OAuth Authentication** — Add Google and Facebook OAuth with role selection for new OAuth users (completed 2026-04-02)
- [x] **Phase 13: Email & Notifications** — Production email deliverability and auto-ghosting prevention (completed 2026-04-03 — VERIFICATION.md backfill scheduled in Phase 15)
- [x] **Phase 14: Bug Fixes** — hasApplied badge and document viewing via signed URLs (completed 2026-04-29 with PRIV-02 deferral to Phase 16)
- [x] **Phase 15: Email Pipeline Deploy & Verify** — Gap closure: deploy `notify-job-filled` + 3 disk-only Edge Functions, add Supabase CI deploy step, backfill Phase 13 VERIFICATION.md (completed 2026-05-01; MAIL-01/02 partial-close — RESEND_API_KEY unset, plan 15-02 deferred; see carryforward in v2.0-MILESTONE-AUDIT.md)
- [ ] **Phase 16: Privacy Bypass Empirical Test** — Gap closure: execute PRIV-02 B.9 from authenticated employer JWT against deployed function; flip BFIX-02 sub-phase 14-03 PARTIAL → PASS
- [ ] **Phase 17: Saved Search** — Seeker can save, load, and delete filter combinations (reordered from Phase 15)
- [ ] **Phase 18: Tech Debt Cleanup** — Gap closure: `EMPLOYER_VISIBLE_DOCUMENT_TYPES` canonical source, dead-semantics removal, AUTH-FIX-02 root-cause investigation, VALIDATION/SUMMARY frontmatter backfill

## Phase Details

### Phase 12: OAuth Authentication
**Goal**: A user can sign up and log in with Google or Facebook, select their role on first OAuth login, and be routed to the correct onboarding — matching the existing email/password flow
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-06, AUTH-07, AUTH-08
**Plans:** 2/2 plans complete
Plans:
- [ ] 12-01-PLAN.md — OAuth buttons on Login/SignUp, useAuth extensions, Wave 0 test scaffolds
- [ ] 12-02-PLAN.md — SelectRole page, ProtectedRoute role-null redirect, route wiring
**Success Criteria** (what must be TRUE):
  1. A new user can click "Sign in with Google" on the login/signup page, complete the Google OAuth flow, and land on the role selection screen
  2. A new user can click "Sign in with Facebook" on the login/signup page, complete the Facebook OAuth flow, and land on the role selection screen
  3. An OAuth user who has not yet selected a role is prompted to choose Employer or Seeker before proceeding — selecting a role creates the user_roles record and routes to the correct onboarding wizard
  4. A returning OAuth user who already has a role is logged in and routed directly to their dashboard without re-selecting a role

### Phase 13: Email & Notifications
**Goal**: Transactional emails reliably reach inboxes (not spam) and applicants are automatically notified when a job they applied to is marked as filled
**Depends on**: Nothing (independent of Phase 12)
**Requirements**: MAIL-01, MAIL-02
**Plans:** 2/2 plans complete
Plans:
- [ ] 13-01-PLAN.md — MarkFilledModal race condition fix, notify-job-filled Edge Function, database webhook migration
- [ ] 13-02-PLAN.md — SPF/DKIM DNS configuration and verification (human-action checkpoint)
**Success Criteria** (what must be TRUE):
  1. SPF and DKIM DNS records are configured for the Resend sending domain and pass verification — confirmed via Resend dashboard showing "Verified" status
  2. A test email sent via Resend from the configured domain arrives in Gmail/Outlook inbox (not spam folder)
  3. When an employer marks a job as "filled", every applicant with status applied, reviewed, interview, or shortlisted receives an email notifying them the position has been filled
  4. Applicants who already have a terminal status (hired, declined, withdrawn) do NOT receive the filled notification

### Phase 14: Bug Fixes
**Goal**: Three v1.1 tech debt items are resolved — seekers see which jobs they've applied to, employers can view applicant documents via signed URLs, and seeker documents are categorized so identity documents are never exposed to employers.
**Depends on**: Nothing (independent)
**Requirements**: BFIX-01, BFIX-02, BFIX-03
**Success Criteria** (what must be TRUE):
  1. A logged-in seeker viewing job search results sees an "Applied" badge on every job card they have already submitted an application to. The badge is visible for any application status; copy distinguishes terminal states (e.g. "Applied · Declined"). The Apply tab is re-enabled when the seeker's most recent application is in a terminal status, allowing re-apply.
  2. The applied status is fetched efficiently (single batch query for all visible job IDs, not per-card)
  3. An employer viewing an applicant's panel in the applicant dashboard can click to view the seeker's uploaded CV, certificates, and references — documents open via Supabase Storage signed URLs minted by an Edge Function (service role) that validates the employer→job→application→seeker relationship server-side
  4. Signed URLs are per-click ephemeral with 15-minute expiry; URLs are not pre-generated, cached, or persisted
  5. Seeker documents are categorized by type at upload (CV / certificate / reference / identity / other). Existing untagged documents are migrated as 'other' and re-classifiable from the seeker UI
  6. Identity documents are NEVER exposed to employers. The document-access Edge Function filters out `document_type='identity'` server-side before minting any signed URL — enforcement at the data-access layer, not just hidden in the UI. Employer view is sectioned by non-identity category (CV / Certificates / References)

### Phase 15: Email Pipeline Deploy & Verify
**Goal**: Production email pipeline (MAIL-02 trigger → notification email) is empirically wired and verified, all in-repo Edge Functions are deployed live, and Vercel CI gains a migration + function deploy step so this drift cannot recur. Phase 13 VERIFICATION.md is backfilled against working code.
**Depends on**: Phase 13 (which shipped the trigger + function source); blocks Phase 16 (PRIV-02 test runs against deployed function)
**Requirements**: MAIL-02 (unsatisfied → satisfied), MAIL-01 (partial → satisfied), DEPLOY-01 (closed)
**Gap Closure**: Closes audit gaps MAIL-02 unsatisfied, MAIL-01 partial verification, Phase 13 missing VERIFICATION.md, broken flow "Job filled → email", DEPLOY-01 cross-cutting CI gap
**Plans:** 3/4 plans executed
Plans:
- [x] 15-01-PLAN.md — Manual deploy of 4 Edge Functions + BFIX-05 audit + Resend domain evidence (Wave 1)
- [ ] 15-02-PLAN.md — End-to-end MAIL-02 trigger fire + per-applicant inbox observation (Wave 2) — DEFERRED; awaiting RESEND_API_KEY
- [x] 15-03-PLAN.md — GitHub Actions supabase-deploy.yml + supabase/config.toml (Wave 2; gated decision checkpoint)
- [x] 15-04-PLAN.md — Backfill 13-VERIFICATION.md + partial-close MAIL-01/MAIL-02 in REQUIREMENTS.md/ROADMAP.md (Wave 3)
**Success Criteria** (what must be TRUE):
  1. `notify-job-filled` Edge Function deployed live; `on_job_filled` trigger fire produces a 2xx response and a notification email arrives in a test inbox (not 404 silent failure)
  2. The 3 other disk-only Edge Functions (`acknowledge-placement-fee`, `create-placement-invoice`, `send-followup-emails`) are deployed live; cross-reference of `supabase.functions.invoke` callsites in `src/` against `list_edge_functions` shows zero undeployed callees
  3. Vercel CI pipeline gains a migration-apply + function-deploy step gated behind a dry-run check. **This task is a gated sub-decision** — pause within Phase 15 to confirm before implementation: (a) what triggers it (push to main / tag / manual), (b) what it deploys (migrations / functions / both), (c) what permissions it needs (service role key in CI env), (d) failure mode (block merge / notify-only / rollback)
  4. Resend dashboard shows `Verified` status for SPF/DKIM; screenshot or curl evidence captured in 13-VERIFICATION.md
  5. 13-VERIFICATION.md exists; verdicts MAIL-01 + MAIL-02 satisfied with empirical proof; goal-backward verification ran against deployed code

### Phase 16: Privacy Bypass Empirical Test
**Goal**: PRIV-02 B.9 empirical test executed from an authenticated employer JWT against the deployed `get-applicant-document-url` Edge Function, confirming identity-doc requests return 403 (or acceptable 4xx without `signed_url`). 14-VERIFICATION.md sub-phase 14-03 verdict flips PARTIAL → PASS.
**Depends on**: Phase 15 (function must be deployed before empirical test can run against production)
**Requirements**: BFIX-02 (partial → satisfied via PRIV-02 closure)
**Gap Closure**: Closes audit gaps BFIX-02 partial, broken flow "BFIX-02 employer document view (B.9 empirical identity-bypass)", PRIV-02 public-launch blocker
**Success Criteria** (what must be TRUE):
  1. REQUIREMENTS.md:76-89 test snippet executed from an authenticated employer browser console at `top-farms.vercel.app`; HTTP status + body captured. Expected: `403 {"error":"Identity documents are not accessible to employers"}`. Acceptable: `404` (if PRIV-01 unification applied) or any 4xx without `signed_url`/`url` field. Hard fail: `200` with signed URL
  2. Test artefact (response body, timestamp, employer JWT subject, target application_id + document_id) recorded under `.planning/phases/16-privacy-bypass-test/`
  3. 14-VERIFICATION.md sub-phase 14-03 refreshed: PARTIAL → PASS
  4. PRIV-02 marked closed in REQUIREMENTS.md Deferred Validations
  5. (Optional, decide at plan time) PRIV-01 status-code unification (404 → 403) bundled if scope permits

### Phase 17: Saved Search
**Goal**: A seeker can save their current filter state as a named search, reload it later, and delete searches they no longer need
**Depends on**: Nothing (independent feature work; reordered after gap closure phases)
**Requirements**: SRCH-13, SRCH-14, SRCH-15
**Note**: Reordered from former Phase 15. Gap closure phases (15, 16) execute first because MAIL-02 is silently broken in production now and PRIV-02 is a public-launch blocker. **Plan this phase right before execution** — not now — to avoid burning context on stale planning and to absorb any architectural learnings from the email pipeline work (notification patterns may inform saved-search alert delivery).
**Success Criteria** (what must be TRUE):
  1. A logged-in seeker with active filters can click "Save search", enter a name, and have the current filter combination persisted to the database
  2. A seeker can view their list of saved searches and click one to restore all filter state — the URL updates and results refresh to match
  3. A seeker can delete a saved search from their list — it is removed from the database and no longer appears
  4. Saved searches persist across sessions — a seeker who logs out and back in can still access their saved searches

### Phase 18: Tech Debt Cleanup
**Goal**: Eliminate sync-drift risks, dead semantics, and process-residue items the v2.0 audit surfaced before launch. AUTH-FIX-02 root cause investigated.
**Depends on**: Phases 15 + 16 (executes last — not time-pressured); independent of Phase 17
**Requirements**: None directly satisfied (no REQ-IDs); reduces compound debt risk for post-launch
**Gap Closure**: Closes audit integration findings (stale comment, nav discoverability, EMPLOYER_VISIBLE_DOCUMENT_TYPES drift) and tech-debt items (BFIX-01/03 SUMMARY frontmatter, ApplicantDashboard `first_name` dead semantics, migration 020 disk/registry mismatch, Phase 12/13 VALIDATION.md nyquist finalisation)
**Success Criteria** (what must be TRUE):
  1. `EMPLOYER_VISIBLE_DOCUMENT_TYPES` has a single canonical declaration (TS) with RLS migration + Edge Function deriving from it (or an automated cross-layer consistency check) — 3-way drift risk eliminated
  2. Stale `getUser` comment in `supabase/functions/get-applicant-document-url/index.ts:8` updated to reflect the BFIX-05 gateway-trust pattern
  3. Seeker nav (`Nav.tsx` + `Sidebar.tsx`) gains a `My Documents` link to `/dashboard/seeker/documents` (BFIX-03 discoverability)
  4. `ApplicantDashboard.tsx` dead `first_name` semantics (lines 24, 435) removed
  5. Migration 020 disk filename / live registry version mismatch resolved (rename or document per `supabase/migrations/NAMING.md`)
  6. BFIX-01/03 SUMMARY.md frontmatter `requirements_completed` field backfilled (or `tags:[bfix-XX]` convention codified as house standard)
  7. Phase 12/13 VALIDATION.md `nyquist_compliant` status finalised (true/false with rationale; no lingering `draft` state)
  8. AUTH-FIX-02 root cause investigated — diagnostic captured (loadRole > 3s under normal nav after AuthProvider centralisation), fix landed or deliberately deferred with rationale
  9. 011/012/013/014 phantom-applied root cause investigated — confirmed cause from Supabase support response captured in `.planning/DRIFT-AUDIT-2026-05-03.md` (or successor doc), with prevention measures identified if applicable
  10. Performance advisor lints addressed — 33 `auth_rls_initplan` instances (RLS policies use `(select auth.uid())` pattern instead of bare `auth.uid()`) and 14 `unindexed_foreign_keys` (index added per advisor recommendation)
  11. `jobs.benefits` declared/actual mismatch documented — 013 declared `text[]`, live schema has `jsonb`. Functionally equivalent at JS layer; intent-vs-reality mismatch captured in migration comment or NAMING.md
  12. `couples_welcome` (boolean) vs `accommodation_extras['Couples welcome']` (text[] member) — semantic distinction confirmed and source-of-truth documented (boolean preference vs accommodation feature)
  13. Stripe production-mode posture verified before first real placement charge — `STRIPE_SECRET_KEY` confirmed `sk_live_*` in prod secrets, webhook endpoint registered in live Stripe dashboard, `.env.example` documents Stripe env vars

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 27/27 | Complete | 2026-03-17 |
| 7-11 | v1.1 | 19/19 | Complete | 2026-03-23 |
| 12. OAuth Authentication | 2/2 | Complete    | 2026-04-02 | — |
| 13. Email & Notifications | 2/2 | Complete   | 2026-04-03 | — |
| 14. Bug Fixes | v2.0 | 3/3 | Complete (PRIV-02 deferred to Phase 16) | 2026-04-29 |
| 15. Email Pipeline Deploy & Verify | v2.0 | 3/4 | Complete (15-02 deferred; MAIL-01/02 partial-close) | 2026-05-01 |
| 16. Privacy Bypass Empirical Test | v2.0 | 0/? | Pending (gap closure) | — |
| 17. Saved Search | v2.0 | 0/? | Pending | — |
| 18. Tech Debt Cleanup | v2.0 | 0/? | Pending (gap closure) | — |
