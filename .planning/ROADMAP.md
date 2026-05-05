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
- [ ] **Phase 19: Design System Cleanup (Tier 1 surfaces)** — v1→v2 brand migration on landing, nav, page shells, primitives, brand-critical components, seeker-facing job search/detail. Token rename (soil/moss/meadow → brand/brand-900), Inter throughout, hex palette per Brand Spec v2.0
- [ ] **Phase 19b: Design System Cleanup (Tier 2 — deeper dashboards)** — ApplicantPanel, ApplicantDashboard, employer-side composed components, full onboarding wizard internals; deferred from Phase 19 to keep scope shippable
- [x] **Phase 20: Super Admin Dashboard** — Internal-only `/admin/*` panel for daily briefing, employer/seeker lists, placement-fee pipeline, platform health (completed 2026-05-05; see 20-VERIFICATION.md PASS verdict — 22/22 test IDs PASS, 12/12 must-haves PASS; carryforwards to Phase 20.1 documented)

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
  14. Cloudflare MCP installed for Claude Code — install per `cloudflare/mcp-server-cloudflare` repo + `developers.cloudflare.com/agent-setup/claude-code/`. Enables future DNS / SSL / firewall management directly from Claude sessions (added 2026-05-03 evening after Phase 15-02 was found blocked on DNS records that should have been added in Cloudflare). Not blocking — manual dashboard works for one-off records — but eliminates context-switching cost on subsequent DNS ops and enables programmatic DNS verification in future pre-flight checks.
  15. `X-Webhook-Secret` header validation inside `notify-job-filled` and `send-followup-emails` Edge Functions to restore defence-in-depth lost by `verify_jwt=false` (Phase 15-02 Bug 3 fix). Generate a shared secret, store in vault, include as custom header in 017's `handle_job_filled` trigger payload + 011's `send-followup-emails` cron payload, validate inside each function before processing. Without this, anyone with the function URL can call them directly. Surfaced 2026-05-03 evening during Phase 15-02 closeout.
  16. JWT signing key migration — investigate Supabase Project Settings → JWT Signing Keys to migrate from legacy HS256 to asymmetric ES256/JWKS, restoring service_role JWT acceptance for `verify_jwt:true` functions. Would let us flip `notify-job-filled` and `send-followup-emails` back to `verify_jwt=true` and remove the workaround in #15. Wider blast radius than #15 (affects all service_role usage in the project) so should be planned carefully. Surfaced 2026-05-03 evening during Phase 15-02 Bug 3 diagnosis.
  17. `MarkFilledModal.handleConfirm()` non-atomic UPDATE sequence — current code performs `applications.update({ status: 'hired' })` then `jobs.update({ status: 'filled' })` as separate non-transactional PostgREST calls. If the second UPDATE fails (e.g. trigger error), the first has already committed, leaving an orphan-hired application. Fix: wrap both UPDATEs in a server-side RPC so they're atomic, OR add explicit compensation rollback on `UPDATE jobs` failure. Surfaced 2026-05-03 evening during Phase 15-02 Bug 4 diagnosis (left orphan-hired application 2a91e3db; required manual restore SQL).
  18. `MarkFilledModal` applicant picker UX — modal currently shows applicants as `Applicant #<8-char-uuid>` only (no name, status, role context). Employer cannot reliably identify who they're picking; caused mis-click during Phase 15-02 Path A iteration 1. Fix: render seeker name (or email) + current application status + match score alongside the UUID fragment in the radio-button list at `MarkFilledModal.tsx:222`. Surfaced 2026-05-03 evening during Phase 15-02 Bug 4 diagnosis.
  19. Stale `match_scores` rows referencing non-active jobs — when a job's status transitions to `filled` / `expired` / `archived`, the corresponding `match_scores` rows persist. RLS on `jobs` (`status='active'` filter) hides them from PostgREST embedded joins, returning the parent row with `jobs=null`. The `!inner` workaround in `SeekerStep7Complete.tsx` (commit `7401116`) drops these rows at query time but doesn't clean them up. Fix: add a trigger on `jobs.status` UPDATE that deletes associated `match_scores` rows when status transitions to non-active, OR a periodic cleanup job. Surfaced 2026-05-04 morning during UAT-04 seeker dashboard review (Bug 1 null crash on Edit Profile click).
  20. UX-01: Salary input → preset band chips. Replace the free-text salary input in `SeekerStep5LifeSituation.tsx` (`min_salary` field) with selectable preset bands: $50–60k, $60–70k, $70–80k, $80–90k, $90–100k, $100–110k, $110–120k, $120k+. Improves mobile UX (no number-pad fumbling) and normalises salary data for the matching engine. Surfaced 2026-05-04 morning during UAT-04 new-user round-trip with harry.properprivacy.
  21. SelectRole UI bypass for OAuth signups (known behaviour, no code change required). `handle_new_user` trigger defaults role to `'seeker'` via `COALESCE(raw_user_meta_data->>'role', 'seeker')` for all new auth.users INSERTs. Google OAuth signups don't pass `role` in metadata, so they auto-default to seeker. `SelectRole.tsx:29` `if (role) <Navigate>` then redirects past the role-picker UI before it can render. Current behaviour is intentional (seeker is the correct default for the marketing funnel — most signups are seekers). Logged as known behaviour for future audit; if employer OAuth signup volume becomes meaningful, revisit by either nulling out role for OAuth or surfacing a "Were you signing up as an employer?" prompt in onboarding. Surfaced 2026-05-04 during UAT-04 new-user round-trip recon.

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
| 16. Privacy Bypass Empirical Test | v2.0 | 0/? | Pending (gap closure) | — |
| 17. Saved Search | v2.0 | 0/? | Pending | — |
| 18. Tech Debt Cleanup | v2.0 | 0/? | Pending (gap closure) | — |
| 19. Design System Cleanup (Tier 1) | v2.0 | 0/? | In flight (this session) | — |
| 19b. Design System Cleanup (Tier 2) | v2.0 | 0/? | Pending (post-19) | — |
| 20. Super Admin Dashboard | v2.0 | 8/8 | Complete | 2026-05-05 |

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

**Plans:** 4/5 plans executed

Plans:
- [x] 20.1-01-dashboard-path-helper-PLAN.md — TDD: dashboardPathFor helper + 3 unit tests (employer/seeker/admin) — completed 2026-05-05 (commit b987eb7; 3/3 green; tsc clean)
- [x] 20.1-02-swap-callsites-PLAN.md — Refactor 5 inline `role === 'admin'` ternaries to use dashboardPathFor (Login, VerifyEmail, ProtectedRoute, SelectRole, Nav) — completed 2026-05-05 (atomic commit 7f61a74; 169 vitest passed unchanged; tsc clean; CF-CODE-1 closed at app layer)
- [ ] 20.1-03-admin-login-page-PLAN.md — AdminLoginPage + AdminGate hybrid `/admin` route + 4 component tests (loading/unauth/access-denied/admin)
- [ ] 20.1-04-sidebar-sign-out-PLAN.md — Sign Out button in dashboard Sidebar footer (mt-auto + LogOut icon) + 1 click test
- [ ] 20.1-05-bootstrap-uat-and-ship-PLAN.md — Operator: Studio Auth admin@topfarms.co.nz + Studio SQL role assign + UAT + role removal + 20.1-VERIFICATION.md + ROADMAP flip
