---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Launch Readiness
status: executing
stopped_at: "Phase 20-05 complete — 3 reusable admin components (AdminTable, ProfileDrawer, AdminNotesField) + 11 shape-contract tests green; next: plan 20-06 (employer + seeker list pages)"
last_updated: "2026-05-04T22:01:44.854Z"
last_activity: 2026-05-04 — 20-05 complete; 3 reusable admin components shipped (AdminTable 194 lines, ProfileDrawer 494 lines, AdminNotesField 103 lines); 4 shape-contract test files filled (11 tests green replacing it.todo stubs from plan 20-01); tsc clean. Wave 4 collapses 8+ would-be-tasks into 3 reusable artefacts that waves 5-6 list-view pages drop into via composition.
progress:
  total_phases: 10
  completed_phases: 4
  total_plans: 19
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides
**Current focus:** Super Admin Dashboard (Phase 20) — internal-only `/admin/*` panel; Wave 0/1/2 backend foundations in place (test scaffold + RPC migration + Resend Edge Function source)

## Current Position

Phase: 20 of 20+ — Super Admin Dashboard
Plan: 20-05 complete — moving to 20-06 (next plan)
Status: In progress (plan 20-06 next)
Last activity: 2026-05-04 — 20-05 complete; 3 reusable admin components shipped (AdminTable, ProfileDrawer, AdminNotesField) + 11 shape-contract tests green. Wave 5 (employer + seeker list pages) is pure composition from these primitives — no architectural decisions remain.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
- [Phase 12-oauth-authentication]: OAuth redirectTo set to /auth/select-role so both new and returning OAuth users can set/verify role
- [Phase 12-oauth-authentication]: Facebook OAuth requires scopes: 'email' explicitly; Google has email/profile by default via OpenID
- [Phase 12-oauth-authentication]: /auth/select-role is a public route — SelectRole self-guards so session+null-role users can access it without being rejected by ProtectedRoute
- [Phase 12-oauth-authentication]: ProtectedRoute null-role guard inserted after !session and before requiredRole to catch authenticated OAuth users with no role yet
- [Phase 13]: notify-job-filled: hired applicant updated before job status change to prevent race condition with webhook trigger
- [Phase 13]: notify-job-filled: NOTIFY_STATUSES matches domain.ts ACTIVE_STATUSES exactly (applied/review/interview/shortlisted/offered)
- [Phase 13]: notify-job-filled: CTA links to /jobs to encourage new searches rather than viewing stale applications
- [Phase 15]: BFIX-05 audit PASS: send-followup-emails uses auth.admin.getUserById(userId) for email lookup (data fetch, not JWT re-validation) — all 4 disk-only functions safe to deploy
- [Phase 15]: Migration registry: Option B chosen (trust idempotency). Dry-run reveals timestamp-vs-sequence-prefix mismatch for 018-020 — plan 15-03 must run supabase migration repair before enabling db push in CI
- [Phase 15-03]: CI decision tuple accepted (all defaults): push-to-main path-filtered + workflow_dispatch; migrations+functions sequential jobs; BLOCK on migration failure; NOTIFY-ONLY on function failure; service-role key NOT in CI
- [Phase 15-03]: Migration registry repair: Studio SQL INSERT into supabase_migrations.schema_migrations is the correct approach — CLI supabase migration repair fails on timestamp-vs-sequence-prefix drift; NAMING.md update deferred to 15-04
- [Phase 15-03]: First workflow smoke test deferred — 12 local commits not yet pushed to origin/main; user must push before first run
- [Phase 15-04]: MAIL-01/02 kept [ ] (not [x]) — truthful partial-close pending RESEND_API_KEY + plan 15-02 E2E verification
- [Phase 15-04]: 13-VERIFICATION.md backfilled with PARTIAL/DEFERRED verdicts for all 4 Phase 13 ROADMAP criteria — no hand-wave verdicts
- [Phase 15-04]: NAMING.md migration registry repair section: Studio SQL INSERT is canonical approach; CLI supabase migration repair incompatible with sequence-prefix disk convention
- [Phase 20-01]: Wave 0 scaffold pattern: every VALIDATION.md test ID gets a stub in vitest file (or UAT markdown) before any implementation. 22 IDs across 14 vitest files + 1 UAT markdown. Bodies fill in subsequent waves.
- [Phase 20-01]: it.todo() for unimplemented assertions across the entire admin suite — vitest reports todos rather than skips/fails, providing a visible scaffolding signal in CI output.
- [Phase 20-03]: deno.lock gitignored — local typecheck artefact, Supabase CLI handles dependency resolution at deploy time; no prior deno.lock in repo history. Installed Deno 2.7.14 via Homebrew (Rule 3 deviation; required for `deno check` acceptance criterion).
- [Phase 20-03]: get-resend-stats RESEND_API_KEY-unset path writes {unavailable: true} cache marker rather than erroring — preserves daily-briefing render path during MAIL-02-style outages, matching 20-UI-SPEC.md "Delivery data unavailable" copy.
- [Phase 20-03]: delivered = delivered + opened + clicked when aggregating Resend last_event — Resend events progress monotonically (opened/clicked imply delivered), so summing all three captures the true delivery total without double-counting.
- [Phase 20-02]: Phase 20-02 Task 1 complete — pre-migration RLS baselines captured (jobs_active=1, match_scores=3, applications=2, jobs=2, employers=1, seekers=2). These are the empirical reference for ADMIN-RLS-NEG-1/2 post-migration drift check (Task 3).
- [Phase 20-02]: Phase 20-02 complete — migration 023 applied via Studio SQL Editor for project inlagtgpynemhipnqvty (3 tables: admin_audit_log/admin_notes/admin_metrics_cache, user_roles.is_active column, 10 admin_* SECURITY DEFINER RPCs + _admin_gate helper); RLS not widened (post-baselines [1,3,2,2,1,2] match pre exactly — empirical ADMIN-RLS-NEG-1/2 ground truth).
- [Phase 20-04]: ProtectedRoute requiredRole union widened to 'employer' | 'seeker' | 'admin' (one-line type-only change at line 7); existing line-62 redirect logic handles all 4 cases by structure
- [Phase 20-04]: AdminLayout omits top <Nav /> per UI-SPEC anti-chrome rule — single-sidebar Stripe/Linear pattern (vs DashboardLayout's Nav+Sidebar combo); 240px AdminSidebar + max-w-[1200px] inner content; 4 list-view routes temporarily render DailyBriefing as placeholder, swapped in plans 20-06 and 20-07
- [Phase 20-05]: AdminTable + ProfileDrawer + AdminNotesField composed from existing v2 primitives only (Tag/Toggle/Timeline/Button/Pagination/Input). Wave 4 locks the contract surface so list-view plans 20-06/07 are pure assembly — saves context budget across 4 list-page plans.
- [Phase 20-05]: Pagination prop names adjusted from plan body (page/onChange) to live contract (currentPage/totalPages/onPageChange); Timeline accepts `entries` not `items` with `date` field not `timestamp`; StatusBanner has fixed semantic variants (no 'error') so ProfileDrawer error display uses inline `role='alert'` div with --color-danger tokens. All 3 are sanctioned plan-anticipated adjustments.
- [Phase 20-05]: supabase.rpc admin_* type assertion via `as never` — admin_* RPCs not in supabase-js generated function-name union (plan 20-02 was applied via Studio SQL Editor which doesn't update JS types). `as never` collapses to a no-op once types regenerate post-deploy. Cleaner than @ts-expect-error directives.
- [Phase 20-05]: Shape-contract tests (mocked supabase) for 4 admin test files — assert SHAPE the frontend code requires from RPCs, not live integration. 11 tests green; live RPC integration deferred to plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1) per plan instruction. Decouples wave 4 from infrastructure readiness.
- [Phase 20-05]: Drawer-internal confirm row (no modal) for destructive admin actions — Toggle reveals confirm row inside drawer with heading 15px/600 + body 13px/muted (max 60ch) + ghost Cancel + warn (suspend) / primary (reactivate) Confirm CTAs; Escape collapses; no focus trap. Aligns with PRODUCT.md anti-chrome paranoia.

### Blockers/Concerns

- MAIL-02 silently failing (RESEND_API_KEY unset — functions deployed but email sends skip) — plan 15-04 closes this
- DEPLOY-01 CI gap: workflow committed locally but not yet pushed to origin/main — user must `git push` to activate CI
- MAIL-01 Resend `Verified` status not yet captured in artefacts — Phase 15 captures evidence + backfills 13-VERIFICATION.md
- PRIV-02 public-launch blocker (B.9 empirical identity-bypass test never executed) — Phase 16 (depends on Phase 15)

## Session Continuity

Last session: 2026-05-04T22:01:44.851Z
Stopped at: Phase 20-05 complete — 3 reusable admin components (AdminTable, ProfileDrawer, AdminNotesField) + 11 shape-contract tests green; next: plan 20-06 (employer + seeker list pages)
Resume file: None
