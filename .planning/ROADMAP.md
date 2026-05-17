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
- [x] **Phase 16: Privacy Bypass Empirical Test** — completed 2026-05-04 (see `.planning/phases/16-privacy-bypass-test/16-PRIV02-EVIDENCE.md` PASS verdict — primary expected response observed: HTTP 403 `{"error":"Identity documents are not accessible to employers"}`; 5-layer privacy gate held under direct API attack from legitimate-employer JWT. PRIV-02 was the last public-launch privacy blocker.)
- [x] **Phase 17: Saved Search** — Seeker can save, load, and delete filter combinations (reordered from Phase 15) — completed 2026-05-07 (impl shipped 2026-05-05 across 4 waves: 17-01 foundation + 17-02 save-flow + 17-03 list-page + 17-04 quick-load; verifier PASS at code+test+DB layers, 47/47 phase-17 tests GREEN, JOBS-01 regression statically guarded, migration 024 applied + RLS verified via pg_class/pg_policies/pg_indexes; UAT 8/8 PASS 2026-05-07 incl. RLS isolation seeker A↔B + anonymous CRITICAL per CLAUDE §1 — see `17-UAT-EVIDENCE.md`)
- ⊘ **Phase 18: Tech Debt Cleanup** — SPLIT 2026-05-07 into 18.1 (Pre-Launch Hardening) + 18.2 (Code Quality & UX Polish); 3 items deferred (see v2.0-MILESTONE-AUDIT.md "Carryforward: Phase 18 deferred items"). Original 21-item scope preserved in §"Phase 18" details below for traceability.
- [ ] **Phase 18.1: Pre-Launch Hardening** — 6 safety/correctness items from original Phase 18 scope: EMPLOYER_VISIBLE_DOCUMENT_TYPES canonical source (#1, privacy drift), Stripe live-mode posture verification (#13, gates first real charge), X-Webhook-Secret header validation in 2 Edge fns (#15, defence-in-depth), MarkFilledModal atomic UPDATE wrap (#17, prior orphan-hired prod incident), match_scores cleanup trigger on jobs.status transitions (#19, data integrity), unindexed_foreign_keys advisor lints (#10a, 14 indexes — split from #10's broader scope; RLS initplan rewrites moved to 18.2). Goal: ship items that mitigate launch-time risk before any real user traffic. — partially closed 2026-05-10 (see 18.1-VERIFICATION.md PARTIAL verdict; SC-1/3/4/5/6 all PASS with empirical evidence; SC-2 Stripe live-mode swap pending PEND-01 pre-launch operator action; carryforward in v2.0-MILESTONE-AUDIT.md). **Final closure via Phase 21 plan 21-09** (PEND-01 swap + SC-2 PARTIAL→PASS flip)
- [x] **Phase 18.2: Code Quality & UX Polish** — 13 lower-risk items from original Phase 18 scope: stale getUser comment (#2), seeker nav My Documents link (#3), dead first_name semantics (#4), migration 020 disk/registry mismatch (#5), SUMMARY frontmatter backfill (#6), VALIDATION.md nyquist finalisation (#7), AUTH-FIX-02 root cause investigation (#8 — fix landed or deferred with rationale), jobs.benefits text[]/jsonb intent doc (#11), couples_welcome semantics doc (#12), MarkFilledModal applicant picker UX (#18), UX-01 salary preset chips (#20), SelectRole OAuth bypass log-as-known-behaviour (#21), auth_rls_initplan advisor lints (#10b, 33 RLS rewrites — split from #10's broader scope). Goal: clean up audit residue + UX polish post-launch. (completed 2026-05-10)
- [x] **Phase 19: Design System Cleanup (Tier 1 surfaces)** — completed 2026-05-04 (merge `50dd5b8` from `feat/v2-brand-migration`; 6-sub-phase migration: Phase 0 alias scaffolding → Phase 1 primitives → Phase 2 brand-critical → Phase 3 Tier 1 composed + seeker → Phase 4 page shells + auth + dashboards → Phase 5 landing + marketing → Phase 6 alias removal + hay→warn rename + PaymentForm v2 hex). v2 tokens canonical in `src/index.css` (`--color-brand: #16a34a`, etc.); Inter retired Fraunces + DM Sans; Brand Spec v2.0 hex palette in production. 4 straggler `-moss` class references (focus-rings + form `accent-moss`) cleaned up 2026-05-05; see `.planning/v2-migration/PHASE-19-KNOWN-STATE.md` for 2 deferred polish items now logged as todos.
- [x] **Phase 19b: Design System Cleanup (Tier 2 — deeper dashboards)** — completed 2026-05-04 (merged in same `50dd5b8`; commit `23ad965` covered ApplicantPanel, ApplicantDashboard, DocumentUploader, FileDropzone, LivePreviewSidebar, TierCard, EmployerOnboarding/SeekerOnboarding wizard internals + all SeekerStep* + EmployerStep* surfaces).
- [x] **Phase 20: Super Admin Dashboard** — Internal-only `/admin/*` panel for daily briefing, employer/seeker lists, placement-fee pipeline, platform health (completed 2026-05-05; see 20-VERIFICATION.md PASS verdict — 22/22 test IDs PASS, 12/12 must-haves PASS; carryforwards to Phase 20.1 documented)
- [x] **Phase 20.1: Standalone Admin Login Gateway + Account Bootstrap** — completed 2026-05-05 (see 20.1-VERIFICATION.md PASS verdict — 7/7 CF-IDs PASS; CF-AUTH-2 carries documented runtime AccessDenied caveat — recommend fresh-session post-deploy re-verify)
- [ ] **Phase 21: v2.0 Close + Post-Launch Ops** — v2.0 milestone closeout (PEND-01 Stripe live-mode swap, visual smoke tests for 18.2/20.1 human-verification gates) + first post-launch ops features: `is_active` login-blocking (suspended users see a clear "account suspended" gate rather than a broken dashboard), and a doc verification queue in the admin panel (admin can approve/reject employer and seeker uploaded documents, triggering trust-tier updates). After Phase 21 ships: `/gsd:complete-milestone v2.0`.

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
**Plans:** 5/5 plans complete
Plans:
- [x] 17-00-test-scaffold-PLAN.md — Wave 0 test scaffolding: 6 vitest stubs + 1 UAT markdown for VALIDATION.md test IDs
- [x] 17-01-foundation-PLAN.md — Migration 024_saved_searches.sql via Studio + SavedSearch type + snapshotFilters/deriveAutoName pure functions (turns saved-search-snapshot.test.ts GREEN)
- [x] 17-02-save-flow-PLAN.md — SaveSearchModal (RHF+Zod, inline role=alert) + ReplaceOldestModal (10-cap) + JobSearch Save button wiring (turns modal + cap tests GREEN)
- [x] 17-03-list-page-PLAN.md — SavedSearches.tsx dashboard route (list + load + delete-with-undo + inline rename) + Sidebar nav + main.tsx route registration (turns list test GREEN)
- [x] 17-04-quick-load-PLAN.md — SavedSearchesDropdown (top 5 + View all) integrated in JobSearch ResultsArea + JOBS-01 regression guard (turns quick-load + load-integration tests GREEN)
**Success Criteria** (what must be TRUE):
  1. A logged-in seeker with active filters can click "Save search", enter a name, and have the current filter combination persisted to the database
  2. A seeker can view their list of saved searches and click one to restore all filter state — the URL updates and results refresh to match
  3. A seeker can delete a saved search from their list — it is removed from the database and no longer appears
  4. Saved searches persist across sessions — a seeker who logs out and back in can still access their saved searches

### Phase 18: Tech Debt Cleanup
> **⊘ SPLIT 2026-05-07** — original 21-item scope was unwieldy (~3 days of execution; mixed safety + polish items). Split into Phase 18.1 (Pre-Launch Hardening — 6 items, ships before launch) + Phase 18.2 (Code Quality & UX Polish — 13 items, post-launch). Items #9 (phantom-applied root cause — blocked on Supabase support), #14 (Cloudflare MCP install — session tooling, not code), and #16 (JWT HS256→ES256 migration — wide blast radius, deserves own phase) deferred with carryforward note in `v2.0-MILESTONE-AUDIT.md`. Original 21-item list retained below for traceability; each item tagged with its destination.

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
  14. Cloudflare MCP installed for Claude Code — install per `cloudflare/mcp-server-cloudflare` repo + `developers.cloudflare.com/agent-setup/claude-code/`. Enables future DNS / SSL / firewall management directly from Claude sessions (added 2026-05-03 evening after Phase 15-02 was found blocked on DNS records that should have been added in Cloudflare). Not blocking — manual dashboard works for one-off records — but eliminates context-switching cost on subsequent DNS ops and enables programmatic DNS verification in future pre-flight checks.
  15. `X-Webhook-Secret` header validation inside `notify-job-filled` and `send-followup-emails` Edge Functions to restore defence-in-depth lost by `verify_jwt=false` (Phase 15-02 Bug 3 fix). Generate a shared secret, store in vault, include as custom header in 017's `handle_job_filled` trigger payload + 011's `send-followup-emails` cron payload, validate inside each function before processing. Without this, anyone with the function URL can call them directly. Surfaced 2026-05-03 evening during Phase 15-02 closeout.
  16. JWT signing key migration — investigate Supabase Project Settings → JWT Signing Keys to migrate from legacy HS256 to asymmetric ES256/JWKS, restoring service_role JWT acceptance for `verify_jwt:true` functions. Would let us flip `notify-job-filled` and `send-followup-emails` back to `verify_jwt=true` and remove the workaround in #15. Wider blast radius than #15 (affects all service_role usage in the project) so should be planned carefully. Surfaced 2026-05-03 evening during Phase 15-02 Bug 3 diagnosis.
  17. `MarkFilledModal.handleConfirm()` non-atomic UPDATE sequence — current code performs `applications.update({ status: 'hired' })` then `jobs.update({ status: 'filled' })` as separate non-transactional PostgREST calls. If the second UPDATE fails (e.g. trigger error), the first has already committed, leaving an orphan-hired application. Fix: wrap both UPDATEs in a server-side RPC so they're atomic, OR add explicit compensation rollback on `UPDATE jobs` failure. Surfaced 2026-05-03 evening during Phase 15-02 Bug 4 diagnosis (left orphan-hired application 2a91e3db; required manual restore SQL).
  18. `MarkFilledModal` applicant picker UX — modal currently shows applicants as `Applicant #<8-char-uuid>` only (no name, status, role context). Employer cannot reliably identify who they're picking; caused mis-click during Phase 15-02 Path A iteration 1. Fix: render seeker name (or email) + current application status + match score alongside the UUID fragment in the radio-button list at `MarkFilledModal.tsx:222`. Surfaced 2026-05-03 evening during Phase 15-02 Bug 4 diagnosis.
  19. Stale `match_scores` rows referencing non-active jobs — when a job's status transitions to `filled` / `expired` / `archived`, the corresponding `match_scores` rows persist. RLS on `jobs` (`status='active'` filter) hides them from PostgREST embedded joins, returning the parent row with `jobs=null`. The `!inner` workaround in `SeekerStep7Complete.tsx` (commit `7401116`) drops these rows at query time but doesn't clean them up. Fix: add a trigger on `jobs.status` UPDATE that deletes associated `match_scores` rows when status transitions to non-active, OR a periodic cleanup job. Surfaced 2026-05-04 morning during UAT-04 seeker dashboard review (Bug 1 null crash on Edit Profile click).
  20. UX-01: Salary input → preset band chips. Replace the free-text salary input in `SeekerStep5LifeSituation.tsx` (`min_salary` field) with selectable preset bands: $50–60k, $60–70k, $70–80k, $80–90k, $90–100k, $100–110k, $110–120k, $120k+. Improves mobile UX (no number-pad fumbling) and normalises salary data for the matching engine. Surfaced 2026-05-04 morning during UAT-04 new-user round-trip with harry.properprivacy.
  21. SelectRole UI bypass for OAuth signups (known behaviour, no code change required). `handle_new_user` trigger defaults role to `'seeker'` via `COALESCE(raw_user_meta_data->>'role', 'seeker')` for all new auth.users INSERTs. Google OAuth signups don't pass `role` in metadata, so they auto-default to seeker. `SelectRole.tsx:29` `if (role) <Navigate>` then redirects past the role-picker UI before it can render. Current behaviour is intentional (seeker is the correct default for the marketing funnel — most signups are seekers). Logged as known behaviour for future audit; if employer OAuth signup volume becomes meaningful, revisit by either nulling out role for OAuth or surfacing a "Were you signing up as an employer?" prompt in onboarding. Surfaced 2026-05-04 during UAT-04 new-user round-trip recon.

**Item assignment (post-2026-05-07 split):**
- → **Phase 18.1** (Pre-Launch Hardening): items 1, 13, 15, 17, 19, 10a (unindexed_foreign_keys subset of #10)
- → **Phase 18.2** (Code Quality & UX Polish): items 2, 3, 4, 5, 6, 7, 8, 11, 12, 18, 20, 21, 10b (auth_rls_initplan subset of #10)
- **Deferred** (carryforward in v2.0-MILESTONE-AUDIT.md): item 9 (blocked on Supabase support), item 14 (session tooling, not code), item 16 (JWT migration — own phase)

### Phase 18.1: Pre-Launch Hardening
**Goal**: Ship the 6 safety/correctness items from the original Phase 18 scope that mitigate launch-time risk. Privacy drift, revenue gating, defence-in-depth, data integrity, perf-from-FK indexes.
**Depends on**: Nothing (independent of Phase 18.2)
**Requirements**: None directly satisfied; risk mitigation only
**Source**: subset of original Phase 18 success criteria — items 1, 10a, 13, 15, 17, 19
**Success Criteria** (what must be TRUE):
  1. `EMPLOYER_VISIBLE_DOCUMENT_TYPES` has a single canonical declaration (TS) with RLS migration + Edge Function deriving from it (or an automated cross-layer consistency check) — 3-way drift risk eliminated [orig #1]
  2. Stripe production-mode posture verified before first real placement charge — `STRIPE_SECRET_KEY` confirmed `sk_live_*` in prod secrets, webhook endpoint registered in live Stripe dashboard, `.env.example` documents Stripe env vars [orig #13]
  3. `X-Webhook-Secret` header validation inside `notify-job-filled` and `send-followup-emails` Edge Functions to restore defence-in-depth lost by `verify_jwt=false` (Phase 15-02 Bug 3 fix). Generate a shared secret, store in vault, include as custom header in 017's `handle_job_filled` trigger payload + 011's `send-followup-emails` cron payload, validate inside each function before processing [orig #15]
  4. `MarkFilledModal.handleConfirm()` UPDATE sequence is atomic — wrap both UPDATEs in a server-side RPC OR add explicit compensation rollback on `UPDATE jobs` failure. Closes the orphan-hired-application class of incident (precedent: 2a91e3db required manual restore SQL during Phase 15-02 Bug 4) [orig #17]
  5. `match_scores` cleanup trigger on `jobs.status` UPDATE — deletes associated `match_scores` rows when status transitions to non-active (filled / expired / archived). Eliminates the stale-row class that the `!inner` workaround in `SeekerStep7Complete.tsx` (commit `7401116`) papers over at query time but doesn't clean up [orig #19]
  6. 15× `unindexed_foreign_keys` advisor lints addressed (live count 2026-05-07 — 1 extra index vs original ROADMAP estimate of 14×) — index added per advisor recommendation. (RLS initplan rewrites — original #10's other half — moved to Phase 18.2 as polish; FK indexes have material query-time impact and ship pre-launch) [orig #10a]

**Plans:** 6/7 plans executed
Plans:
- [x] 18.1-00-test-scaffold-PLAN.md — Wave 0: 5 vitest RED stubs + 1 Stripe UAT markdown (SC-1..SC-6 test targets) — completed 2026-05-08 (commit 6d6dfa3; full suite 221 passed | 145 todo, +32 todos vs baseline, zero new failures)
- [x] 18.1-01-fk-indexes-PLAN.md — Wave 1: migration 025 (15× CREATE INDEX IF NOT EXISTS) + GREEN drift test — completed 2026-05-10 (code-side closure; commit 91f7197; scoped vitest 16/16 GREEN; Studio apply + MCP pg_indexes verify batched into Wave 3 plan 18.1-06) [SC-6]
- [x] 18.1-02-mark-job-filled-rpc-PLAN.md — Wave 1: migration 026 (SECURITY DEFINER RPC) + MarkFilledModal swap (2× .update → 1× .rpc) + GREEN test — completed 2026-05-08 (code-side closure; commit 5c164c2 bundled in sibling 18.1-03 docs commit per CLAUDE §4/§8 documented deviation; work preserved verbatim; scoped vitest 3/3 GREEN; Studio apply + pre-flight MCP gate + post-apply MCP verification batched into Wave 3 plan 18.1-06) [SC-4]
- [x] 18.1-03-match-scores-cleanup-trigger-PLAN.md — Wave 1: migration 027 (AFTER UPDATE trigger + backfill) + GREEN test — completed 2026-05-08 (code-side closure; commit 1d68769; scoped vitest 5/5 GREEN; Studio apply + post-apply MCP verification batched into Wave 3 plan 18.1-06) [SC-5]
- [x] 18.1-04-webhook-secret-PLAN.md — Wave 2: WEBHOOK_SECRET validation in 2 Edge fns + migration 028 (handle_job_filled header injection; send-followup-emails branch decision via empirical cron.job query) + GREEN test [SC-3 code-side] — completed 2026-05-10 (commit 35e1cef)
- [x] 18.1-05-doc-types-drift-PLAN.md — Wave 2: vitest static-source guard across 3 layers (TS / Edge fn / SQL RLS) [SC-1] — completed 2026-05-10 (commit 4d5eda7)
- [x] 18.1-06-operator-uat-and-deploy-PLAN.md — Wave 3: operator-action — secret deploy (Vault deviation) + Stripe 6/6 checks (test mode, PEND-01) + synthetic curl × 6 + mark-filled empirical + match_scores empirical + FK indexes empirical → VERIFICATION.md + SUMMARY.md + ROADMAP/STATE/MILESTONE-AUDIT atomic docs commit [SC-2 PARTIAL + SC-3/4/5/6 runtime closure PASS] — completed 2026-05-10 (partial-close; SC-2 carryforward PEND-01)

### Phase 18.2: Code Quality & UX Polish
**Goal**: Clean up audit residue + UX polish post-launch. 13 items: doc fixes, dead-code removal, frontmatter backfill, applicant picker UX, salary preset chips, RLS perf rewrites.
**Depends on**: Nothing (independent of Phase 18.1)
**Requirements**: None directly satisfied
**Source**: subset of original Phase 18 success criteria — items 2, 3, 4, 5, 6, 7, 8, 10b, 11, 12, 18, 20, 21
**Success Criteria** (what must be TRUE):
  1. Stale `getUser` comment in `supabase/functions/get-applicant-document-url/index.ts:8` updated to reflect the BFIX-05 gateway-trust pattern [orig #2]
  2. Seeker nav (`Nav.tsx` + `Sidebar.tsx`) gains a `My Documents` link to `/dashboard/seeker/documents` (BFIX-03 discoverability) [orig #3]
  3. `ApplicantDashboard.tsx` dead `first_name` semantics (lines 24, 435) removed [orig #4]
  4. Migration 020 disk filename / live registry version mismatch resolved (rename or document per `supabase/migrations/NAMING.md`) [orig #5]
  5. BFIX-01/03 SUMMARY.md frontmatter `requirements_completed` field backfilled (or `tags:[bfix-XX]` convention codified as house standard) [orig #6]
  6. Phase 12/13 VALIDATION.md `nyquist_compliant` status finalised (true/false with rationale; no lingering `draft` state) [orig #7]
  7. AUTH-FIX-02 root cause investigated — diagnostic captured (loadRole > 3s under normal nav after AuthProvider centralisation), fix landed or deliberately deferred with rationale [orig #8]
  8. `jobs.benefits` declared/actual mismatch documented — 013 declared `text[]`, live schema has `jsonb`. Functionally equivalent at JS layer; intent-vs-reality mismatch captured in migration comment or NAMING.md [orig #11]
  9. `couples_welcome` (boolean) vs `accommodation_extras['Couples welcome']` (text[] member) — semantic distinction confirmed and source-of-truth documented (boolean preference vs accommodation feature) [orig #12]
  10. `MarkFilledModal` applicant picker UX — render seeker name (or email) + current application status + match score alongside the UUID fragment in the radio-button list at `MarkFilledModal.tsx:222` [orig #18]
  11. UX-01: Salary input → preset band chips. Replace the free-text salary input in `SeekerStep5LifeSituation.tsx` (`min_salary` field) with selectable preset bands: $50–60k, $60–70k, $70–80k, $80–90k, $90–100k, $100–110k, $110–120k, $120k+ [orig #20]
  12. SelectRole UI bypass for OAuth signups documented as known behaviour (no code change required); revisit threshold logged for future audit if employer OAuth signup volume becomes meaningful [orig #21]
  13. 33× `auth_rls_initplan` performance advisor lints addressed — RLS policies use `(select auth.uid())` pattern instead of bare `auth.uid()` per advisor recommendation. (Mechanical sweep across all RLS-bearing tables) [orig #10b]

**Plans:** 3/3 plans complete
Plans:
- [ ] 18.2-01-mechanical-fixes-PLAN.md — Mechanical doc + code fixes (SC-1/2/3/4/5/6/8/9/12)
- [ ] 18.2-02-ui-components-PLAN.md — MarkFilledModal picker UX + salary preset chips (SC-10/11)
- [ ] 18.2-03-rls-migration-and-diagnostic-PLAN.md — RLS initplan migration + AUTH-FIX-02 diagnostic (SC-7/13)

### Phase 19: Design System Cleanup (Tier 1 surfaces)
**Goal**: Migrate the v1 brand system (soil/moss/meadow earth-tones + Fraunces/DM Sans) to v2.0 (single-green modern SaaS palette + Inter throughout) on Tier 1 surfaces — landing page, top nav, page shells, primitive components, brand-critical components, seeker job search/detail. Visual-only: no DB / API / route changes.
**Depends on**: Nothing (independent of all open phases)
**Requirements**: None directly satisfied — design-system migration tracked outside REQUIREMENTS.md
**References**: `.planning/v2-migration/TopFarms_Brand_Spec_v2.md` (authoritative spec), `.planning/v2-migration/TopFarms_Migration_Audit.md` (token map + Phase 0–6 order), `SENSE_CHECK_AUDIT_2026-05-01.md` (V1_CLEAN empirical baseline)
**Tooling**: Impeccable design skill installed project-local (`pbakaus/impeccable`); used as audit/critique/polish only — does NOT redesign components. PRODUCT.md + DESIGN.md stored in `.planning/v2-migration/` via `IMPECCABLE_CONTEXT_DIR`.
**Branch**: `feat/v2-brand-migration` long-lived; one commit per migration phase (0–6); merge to main only after Phase 6 cleanup
**Plans:** 0/? (Phase 0 = `@theme` token swap with v1 aliases; Phases 1–6 follow Migration Audit §7)
**Success Criteria** (what must be TRUE):
  1. `src/index.css` `@theme` block declares v2 tokens canonically (`--color-bg`, `--color-brand`, `--color-brand-hover`, `--color-brand-900`, `--color-brand-50`, `--color-warn*`, `--color-text*`, `--color-surface*`, `--color-border*`) per Brand Spec §3 with `--color-` prefix (Tailwind v4 requirement)
  2. v1 token names retained as legacy aliases during Phases 1–5 to enable incremental migration; aliases removed in Phase 6
  3. Inter (with JetBrains Mono fallback) replaces Fraunces + DM Sans; both `--font-display` and `--font-body` point at Inter (per Migration Audit Decision 2)
  4. Tier 1 surfaces — landing page (12 components), top nav, Sidebar, DashboardLayout, JobSearchLayout, AuthLayout (token swap only per Decision 3), primitives (Button, Card, Input, etc.), brand-critical (MatchCircle, MatchBreakdown, StatusBanner, VerificationBadge), seeker job search + job detail — all render in v2 brand on Vercel preview after their respective phase commits
  5. PaymentForm.tsx Stripe Elements appearance variables migrated from v1 hex (4 occurrences: lines 83, 84, 93, 97) to v2 hex (`colorPrimary: #16A34A`, `colorBackground: #FFFFFF`, `borderColor: #E5E8E2`)
  6. Each Phase 0–6 sub-phase ships as its own commit on `feat/v2-brand-migration`, deploys to Vercel preview, manually verified before next phase begins
  7. PRODUCT.md + DESIGN.md generated by `/impeccable teach` and stored in `.planning/v2-migration/`; register pinned to `product`; Inter + hex tokens explicitly noted as deliberate, not anti-pattern
  8. Vitest suite passes after each phase; full suite passes before merge to main
  9. Final grep sweep `grep -rn "soil\|moss\|fern\|meadow\|hay\|cream\|fog\|mist" src/` returns zero matches across Tier 1 surfaces
  10. Phase 19b carryforward entry created in `v2.0-MILESTONE-AUDIT.md` listing Tier 2 surfaces deferred for follow-up execution

### Phase 19b: Design System Cleanup (Tier 2 — deeper dashboards)
**Goal**: Complete the v2 brand migration on Tier 2 surfaces deferred from Phase 19. Same token map, same Phase-0-style alias trick, same Pattern A + Pattern B migration approach.
**Depends on**: Phase 19 (Tier 1 ships first; Phase 19's `@theme` aliases keep Tier 2 rendering correctly until 19b migrates them)
**Requirements**: None directly
**Tier 2 surfaces**: ApplicantPanel.tsx (60 v1 refs — own focused sub-task), ApplicantDashboard, MyApplicationsSidebar, JobDetailSidebar, LivePreviewSidebar, TierCard, DocumentUploader, EmployerVerification, employer onboarding step internals (Step1–Step8), seeker onboarding step internals (Step1–Step8)
**Status**: Defined in Phase 19 closure; not planned this session

### Phase 20: Super Admin Dashboard
**Goal**: Internal-only admin panel at `/admin/*` for Harry to monitor and operate the TopFarms marketplace — daily briefing, employer/seeker lists, placement-fee pipeline, platform health (Edge Function errors, cron timestamps, pg_net log)
**Depends on**: Phase 19 (built on top of clean v2 design system)
**Requirements**: None directly (internal tooling; no public-facing REQ-IDs). Validation derives from CONTEXT.md MVP must-haves and 20-VALIDATION.md test IDs (22 IDs).
**Status**: Complete — see 20-VERIFICATION.md PASS verdict (22/22 test IDs PASS, 12/12 must-haves PASS); Phase 20.1 carryforward authored
**Plans:** 8/8 plans executed
Plans:
- [x] 20-01-PLAN.md — Wave 0 test scaffolding: 14 vitest stubs + 1 UAT markdown for all VALIDATION.md test IDs
- [x] 20-02-PLAN.md — Migration 023_admin_rpcs.sql via Supabase Studio (admin_audit_log + admin_notes + admin_metrics_cache + user_roles.is_active + 10 SECURITY DEFINER RPCs); pre-migration RLS baseline capture
- [x] 20-03-PLAN.md — Edge Function get-resend-stats source + supabase/config.toml verify_jwt=false block (cached-metric pattern)
- [x] 20-04-PLAN.md — ProtectedRoute requiredRole 'admin' extension + AdminLayout + AdminSidebar + 5 /admin/* routes registered
- [x] 20-05-PLAN.md — AdminTable + ProfileDrawer + AdminNotesField reusable components + 4 test files filled (drawer, suspend, notes, audit)
- [x] 20-06-PLAN.md — DailyBriefing + EmployerList + SeekerList pages; 4 test files filled (daily, employer, seeker, resend-cache)
- [x] 20-07-PLAN.md — JobsManagement + PlacementPipeline pages; 2 test files filled (jobs, placements)
- [x] 20-08-PLAN.md — Edge Function deploy + pg_cron schedule + bootstrap UAT + post-migration RLS proof + phase 20-VERIFICATION.md + ROADMAP flip to [x]
**Notes**:
- Role-gated to existing `admin` role (CHECK constraint already includes 'admin' per 001_initial_schema.sql:13 — no constraint migration needed)
- Protected route tree at `/admin/*` inside existing React app (same Vercel deployment, same Supabase project)
- Own `AdminLayout` component (separate from DashboardLayout) — single sidebar, no top Nav per UI-SPEC
- SECURITY DEFINER RPC layer for admin queries — RLS not-widened proof captured in plan 20-02 + 20-08 (ADMIN-RLS-NEG-1/2)
- Same Tailwind design system + component library (no new design primitives) — relies on Phase 19 v2 brand
- First-time setup: one-shot Supabase Studio SQL to assign Harry's `auth.users.id` the admin role (NOT auto-assigned by signup trigger; bootstrap UAT in plan 20-08)
- MVP must-haves: daily briefing view, employer list, seeker list, jobs management, placement-fee pipeline, profile drawer (light), suspend/reactivate mutation, admin notes (additive only), Resend delivery-rate indicator
- Post-launch (NOT MVP, deferred to Phase 21): broadcast comms, doc verification queue, moderation queue, advanced analytics, login-blocking on is_active=false

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 27/27 | Complete | 2026-03-17 |
| 7-11 | v1.1 | 19/19 | Complete | 2026-03-23 |
| 12. OAuth Authentication | 2/2 | Complete    | 2026-04-02 | — |
| 13. Email & Notifications | 2/2 | Complete   | 2026-04-03 | — |
| 14. Bug Fixes | v2.0 | 3/3 | Complete (PRIV-02 deferred to Phase 16) | 2026-04-29 |
| 15. Email Pipeline Deploy & Verify | v2.0 | 3/4 | Complete (15-02 deferred; MAIL-01/02 partial-close) | 2026-05-01 |
| 16. Privacy Bypass Empirical Test | v2.0 | – | Complete (PRIV-02 PASS via empirical test 2026-05-04; evidence-only closure — no plan/summary on disk) | 2026-05-04 |
| 17. Saved Search | v2.0 | 5/5 | Complete (UAT 8/8 PASS 2026-05-07) | 2026-05-07 |
| 18. Tech Debt Cleanup | v2.0 | – | ⊘ Split 2026-05-07 → 18.1 + 18.2 (3 items deferred) | — |
| 18.1. Pre-Launch Hardening | v2.0 | 7/7 | Partial-close 2026-05-10 (SC-1/3/4/5/6 PASS; SC-2 Stripe live-mode PEND-01 pending — closes via Phase 21 plan 21-09) | — |
| 18.2. Code Quality & UX Polish | 3/3 | Complete    | 2026-05-10 | — |
| 19. Design System Cleanup (Tier 1) | v2.0 | 7/7 | Complete (Phases 0-6 merged via `50dd5b8`; 4 straggler refs cleaned up 2026-05-05) | 2026-05-04 |
| 19b. Design System Cleanup (Tier 2) | v2.0 | 1/1 | Complete (commit `23ad965` Tier 2 sweep merged in `50dd5b8`) | 2026-05-04 |
| 20. Super Admin Dashboard | v2.0 | 8/8 | Complete | 2026-05-05 |
| 20.1. Standalone Admin Login Gateway + Account Bootstrap | v2.0 | 5/5 | Complete | 2026-05-05 |
| 21. v2.0 Close + Post-Launch Ops | 1/10 | In Progress|  | — |

### Phase 20.1: Standalone Admin Login Gateway + Account Bootstrap (INSERTED)

**Goal:** Close Phase 20 carryforwards by separating admin authentication from the consumer login flow. Four tasks:

1. **Bootstrap dedicated `admin@topfarms.co.nz` account** and transfer admin role from `harry.symmans.smith@gmail.com` (which was the Phase 20 test admin)
2. **Standalone AdminLoginPage at `/admin`** — renders for unauthenticated or non-admin visitors. Email + password only (no Google OAuth, no Facebook). Composes Phase 19 v2 Input + Button primitives. On successful auth: `role === 'admin'` → AdminLayout; else "Access denied"
3. **Refactor role-based redirect logic** into shared `dashboardPathFor(role)` helper. Replaces 5 duplicate inline ternaries (Login.tsx, VerifyEmail.tsx, ProtectedRoute.tsx, SelectRole.tsx, Nav.tsx) introduced in Phase 20-08 commits `0e91ff2` + `6b769b4`
4. **Sign Out button in dashboard sidebar footer** (`Sidebar.tsx`) — currently no logout affordance visible on `/dashboard/employer` or `/dashboard/seeker` (Nav-bearing routes only). Mirror AdminSidebar's footer slot pattern. (See `.planning/todos/pending/2026-05-05-add-sign-out-button-to-dashboard-sidebar-footer.md`)

**Routing change:** `/admin` no longer wrapped in existing ProtectedRoute. The `/admin` route renders AdminLoginPage when unauthenticated/non-admin, AdminLayout when `role === 'admin'`. `/login` keeps existing flow but admin-role JWT post-login redirects to `/admin` via `dashboardPathFor`.

**Constraints (from Phase 20.1 brief):**
- AdminLoginPage email + password only — NO OAuth providers
- Use Phase 19 v2 design system; no new primitives; compose Input + Button
- Minimal and functional — not a marketing surface
- After 20.1 ships, admin role on `harry.symmans.smith@gmail.com` is REMOVED (operator action via Studio SQL)

**Requirements**: None directly (internal tooling continuation; no public REQ-IDs). Validation derives from Phase 20-VERIFICATION.md "Carryforward to Phase 20.1" section + the Sign Out todo.

**Depends on:** Phase 20

**Notes:**
- Open questions for Discuss to evaluate: (a) hybrid `/admin` route soundness re session timing/race/FoUC; (b) AdminLoginPage loading state on hard refresh; (c) "Access denied" UX (inline vs redirect); (d) regression risk to employer/seeker flows from `dashboardPathFor` refactor; (e) is bundling all 4 tasks one phase right, or does the routing change warrant its own phase?
- Source artefacts: `.planning/phases/20-super-admin-dashboard/20-VERIFICATION.md` (Phase 20.1 Carryforward section), `.planning/v2.0-MILESTONE-AUDIT.md` (carryforward row)

**Plans:** 6/5 plans complete

**Status:** Complete — see 20.1-VERIFICATION.md PASS verdict (7/7 CF-IDs PASS; CF-AUTH-2 carries documented runtime caveat — recommend fresh-session post-deploy re-verify, no-blocker)

Plans:
- [x] 20.1-01-dashboard-path-helper-PLAN.md — TDD: dashboardPathFor helper + 3 unit tests (employer/seeker/admin) — completed 2026-05-05 (commit b987eb7; 3/3 green; tsc clean)
- [x] 20.1-02-swap-callsites-PLAN.md — Refactor 5 inline `role === 'admin'` ternaries to use dashboardPathFor (Login, VerifyEmail, ProtectedRoute, SelectRole, Nav) — completed 2026-05-05 (atomic commit 7f61a74; 169 vitest passed unchanged; tsc clean; CF-CODE-1 closed at app layer)
- [x] 20.1-03-admin-login-page-PLAN.md — AdminLoginPage + AdminGate hybrid `/admin` route + 4 component tests — completed 2026-05-05 (atomic commit 0dcda8a; 173 vitest passed | 113 todo | 0 failed; tsc clean; CF-AUTH-1 + CF-AUTH-2 closed at app layer)
- [x] 20.1-04-sidebar-sign-out-PLAN.md — Sign Out button in dashboard Sidebar footer (mt-auto + LogOut icon) + 1 click test — completed 2026-05-05 (atomic commit b4c6b4c; 174 vitest passed | 113 todo | 0 failed; tsc clean; CF-CODE-2 closed at app layer)
- [x] 20.1-05-bootstrap-uat-and-ship-PLAN.md — Operator: Studio Auth admin@topfarms.co.nz + Studio SQL role assign + UAT + old-role removal + 20.1-VERIFICATION.md + ROADMAP flip — completed 2026-05-05 (this commit)

### Phase 21: v2.0 Close + Post-Launch Ops

**Goal:** Close the v2.0 milestone and ship the first two post-launch ops features. Two concurrent tracks delivered in one phase:

**Track A — v2.0 milestone closeout (operator + visual UAT, no new product code):**
1. **PEND-01 Stripe live-mode key swap** — follow the 9-item checklist in `.planning/DECISIONS-PENDING.md` §PEND-01 verbatim
2. **Five visual smoke tests** (browser UAT) for Phase 18.2 / 20.1 human-verification gates:
   - (a) My Documents link visible in seeker nav/sidebar
   - (b) MarkFilledModal shows applicant names + status + points, not UUIDs
   - (c) Salary preset chips render in seeker onboarding step 5 (not number input)
   - (d) AUTH-FIX-02 console.time output appears in DevTools when loading dashboard
   - (e) Phase 20.1 admin fresh-session login: sign out → clear cache → sign in → `/admin` → no AccessDenied
3. **Flip 18.1 SC-2 PARTIAL → PASS** in `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` after PEND-01 ships
4. **Run `/gsd:complete-milestone v2.0`** after both Track A and Track B are empirically green

**Track B — first post-launch ops features (new product code):**
1. **`is_active` login-blocking gate** — `ProtectedRoute` enforces; suspended users redirected to new `/suspended` page instead of dashboard. `AuthContext.loadRole` extended to fetch `is_active` alongside `role` from `user_roles`. Full gate (no partial views). Re-activation = admin flips toggle in existing ProfileDrawer (no self-service path).
2. **Doc verification queue** at `/admin/documents` — admin reviews seeker-uploaded documents. Three actions per document: Approve / Reject (with reason) / Request More Info. Approve triggers email to seeker + sets "Documents Verified" badge on profile (visible to employers on applicant cards). Migration adds `status: 'pending' | 'approved' | 'rejected'` and `rejection_reason: text` columns to `seeker_documents`. Admin signed-URL access via Edge Function bypass path or new admin RPC. Only seeker documents queued — employer docs continue to auto-verify on upload (deferred).

**Constraints:**
- Use Phase 19 v2 design system primitives (Input, Button, Tag, AdminTable, ProfileDrawer); no new primitives
- `/suspended` page: simple, consistent with `/login` auth-page shell
- Admin RPCs follow `SECURITY DEFINER` pattern established in `supabase/migrations/023_admin_rpcs.sql`
- Newest pending documents first in admin queue
- Email notifications via existing Resend infrastructure (`send-followup-emails` Edge Function pattern)

**Requirements:** None directly (post-launch ops continuation; no public REQ-IDs). Validation derives from Phase 18.1 SC-2 closeout, Phase 18.2/20.1 human-verification gates, `.planning/DECISIONS-PENDING.md` §PEND-01, and the in-scope feature list in `.planning/v2.0-MILESTONE-AUDIT.md`.

**Depends on:** Phase 20.1 (admin auth + AdminLayout), Phase 19 (v2 design system), Phase 18.1 (SC-2 carryforward), Phase 15 (email pipeline)

**Out of scope (deferred):**
- Employer document review queue (employer docs auto-verify; flagged for future phase if fraud materialises)
- Broadcast comms, moderation queue, advanced analytics (deferred from MVP)
- JWT HS256→ES256 migration (recommend Phase 22 — own phase)

**Plans:** 1/10 plans executed

Plan-level resolutions of open implementation choices (per planner's authority):
- (a) Admin doc-URL path → **Edge Function bypass branch** in get-applicant-document-url (RESEARCH §Pattern 3 — PL/pgSQL can't call Supabase Storage)
- (b) "Request More Info" → **new `needs_resubmission` status** (RESEARCH §Pattern 7 — distinct status, blue Tag in queue)
- (c) `loadRole` return-type → **extend existing `LoadRoleOutcome`** type to carry `isActive: boolean` (RESEARCH §Pattern 1)
- (d) "Documents Verified" badge → **new `DocumentsVerifiedBadge` component**, NOT VerificationBadge reuse (RESEARCH §Pattern 6 — different data domain)
- (e) Queue pagination/sort → AdminTable default (page=25); ORDER BY pending-first then uploaded_at DESC server-side
- (f) X-Webhook-Secret on send-document-status-email → **removed** (mid-flight Rule 1 from plan 21-07 — secret cannot live in admin browser; verify_jwt:true + admin role check suffice)

Plans:
- [ ] 21-00-test-scaffold-PLAN.md — Wave 0: 5 vitest stubs (loadRole / ProtectedRoute / Suspended / admin-doc-queue / DocumentsVerifiedBadge) — IS-ACTIVE-01/02/03 + DOC-QUEUE-01/02/04
- [ ] 21-01-migration-032-doc-status-PLAN.md — Wave 1: migration 032 (status + rejection_reason + composite index) + SeekerDocument TS extension; Studio apply via CLAUDE §2
- [ ] 21-02-admin-doc-rpcs-PLAN.md — Wave 2: migration 033 — 4 SECURITY DEFINER admin doc RPCs (list_queue / approve / reject / request_more_info) + shape-contract tests GREEN
- [ ] 21-03-edge-fn-admin-bypass-PLAN.md — Wave 2: get-applicant-document-url admin role bypass branch + static-source regression guard preserving BFIX-05 gateway-trust
- [ ] 21-04-auth-context-is-active-PLAN.md — Wave 3: AuthContext.loadRole single round-trip extension + ProtectedRoute /suspended redirect at correct guard position + IS-ACTIVE-* tests GREEN
- [ ] 21-05-suspended-page-PLAN.md — Wave 3: SuspendedPage component + /suspended route (outside ProtectedRoute) + RTL tests
- [ ] 21-06-email-edge-fn-PLAN.md — Wave 4: send-document-status-email Deno Edge Function (3 templates) + supabase/config.toml verify_jwt entry + static-source guard test
- [ ] 21-07-admin-documents-queue-PLAN.md — Wave 5: AdminDocumentsQueue page + main.tsx route + AdminSidebar "Documents" nav + email-side-effect RTL test; sibling X-Webhook-Secret removal in send-document-status-email
- [ ] 21-08-documents-verified-badge-PLAN.md — Wave 5: DocumentsVerifiedBadge component + ApplicantPanel employer-visible integration + 5 RTL tests GREEN
- [ ] 21-09-track-a-milestone-close-PLAN.md — Wave 6: operator script — Edge Function deploys + PEND-01 9-item checklist + 5 visual smoke tests + 5 Track B UATs + 21-VERIFICATION.md + 18.1 SC-2 flip + ROADMAP/STATE/MILESTONE-AUDIT atomic docs commit + /gsd:complete-milestone v2.0

**Notes:**
- Source artefacts: `.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md`, `.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md`, `.planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md`, `.planning/DECISIONS-PENDING.md` §PEND-01, `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` (SC-2 PARTIAL), `.planning/v2.0-MILESTONE-AUDIT.md`
- Track A is operator+UAT work (plans 21-09 only); Track B is product code (plans 21-00..21-08). Both must land before milestone close.
- Wave structure: W0 = scaffold (plan 21-00); W1 = DB foundation (21-01); W2 = admin RPCs + Edge fn bypass parallel (21-02, 21-03); W3 = is_active client gate + /suspended parallel (21-04, 21-05); W4 = email Edge fn (21-06); W5 = admin UI page + badge parallel (21-07, 21-08); W6 = Track A operator + milestone close (21-09).
