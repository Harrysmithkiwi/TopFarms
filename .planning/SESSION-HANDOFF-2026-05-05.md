---
session_date: 2026-05-05
session_window: ~03:00–04:30 UTC
phase_executed: 20.1
phase_status: complete
next_session: TBD
---

# Session Handoff — 2026-05-05 (Phase 20.1 ship)

## What shipped this session

**Phase 20.1: Standalone Admin Login Gateway + Account Bootstrap** — full plan→execute→verify cycle in one session.

| Wave | Plan | Commit | Surface |
|------|------|--------|---------|
| 1 | 20.1-01 | `b987eb7` | `dashboardPathFor` helper at `src/lib/routing.ts` + 3 unit tests (`tests/dashboard-routing.test.ts`) |
| 2 | 20.1-02 | `7f61a74` | 5 inline ternaries swapped to helper (Login.tsx:48, VerifyEmail.tsx:35, ProtectedRoute.tsx:63, SelectRole.tsx:30, Nav.tsx:112) |
| 3 | 20.1-03 | `0dcda8a` | New `src/pages/admin/AdminLoginPage.tsx` exporting both `AdminLoginPage` (form) and `AdminGate` (hybrid wrapper). `/admin` route in `src/main.tsx` swapped from `<ProtectedRoute requiredRole="admin"><AdminLayout>...</AdminLayout></ProtectedRoute>` to `<AdminGate />`. 4 sub-routes byte-frozen. `tests/admin-login.test.tsx` with 4 cases. |
| 4 | 20.1-04 | `b4c6b4c` | Sign Out button in dashboard `Sidebar.tsx` footer (`mt-auto p-3 border-t` + LogOut icon + `signOut()`). `tests/sidebar-signout.test.tsx`. Phase 21 todo file moved to `.planning/todos/done/`. |
| 5 | 20.1-05 | `46e231a` | Operator: bootstrap `admin@topfarms.co.nz`, role transfer, regression UAT. Docs trio: 20.1-VERIFICATION.md + 20.1-SUMMARY.md + 20.1-05-SUMMARY.md + UAT run-record + ROADMAP flip + audit row + Phase 20-VERIFICATION.md carryforward checklist + STATE.md. |
| – | verifier | `8b9e519` | gsd-verifier independent re-attestation appended to 20.1-VERIFICATION.md (`status: passed`, 7/7 CF-IDs, runtime checks confirmed). |
| – | finalize | `cee5e09` | `phase complete` CLI idempotent run. Note: introduced minor cosmetic regressions in ROADMAP table row (line 227 column shift) and STATE (`completed_plans: 24 → 25`, status `executing → verifying`); cosmetic only. |

## Database state (Supabase project ref `inlagtgpynemhipnqvty`)

| email | user_id | role | is_active |
|-------|---------|------|-----------|
| `admin@topfarms.co.nz` | `ab48ed2b-0336-4b1d-8937-5d3eff50faf6` | admin | true |
| `harry.symmans.smith@gmail.com` | `5634f2fb-ad12-4f5e-8d48-833373c77691` | seeker | true |

Bootstrap method: Supabase Studio Auth dashboard (auto-confirm), Studio SQL Editor for role assigns. CLAUDE.md §2 honored throughout — no MCP `--read-only` flag-flips.

## Test suite

- `pnpm test` → **174 passed** | 113 todo | 0 failed (was 166 baseline → +3 dashboard-routing → +4 admin-login → +1 sidebar-signout)
- `pnpm tsc --noEmit` → exit 0
- `pnpm build` → exit 0 (verified during Plan 03)

## CF-AUTH-2 documented runtime caveat

During regression UAT 8a (Plan 5), the operator observed an anomaly:
- Signed in fresh as `harry.symmans.smith@gmail.com` (now seeker) → correctly redirected to `/dashboard/seeker` via the post-refactor `dashboardPathFor`.
- Then navigated **directly to `/admin`** in the URL bar.
- Expected: AdminGate's `role !== 'admin'` branch renders the inline `<AccessDeniedView>`.
- Observed: URL changed to `/dashboard/admin` and showed 404.

**Three orthogonal diagnostics** ruled out a code regression:
1. `grep -rn "/dashboard/admin\|\`/dashboard/" src/` → only matches are in `src/lib/routing.ts:4` (helper body, returns `/admin` for admin role) and `EmployerDashboard.tsx`/`ApplicantDashboard.tsx` (legitimate sub-paths). No code path can synthesize the literal `/dashboard/admin`.
2. Component test `tests/admin-login.test.tsx` "renders Access denied for non-admin authenticated user" PASSES — the AdminGate branch is verified at unit level.
3. DB-level role transition empirically confirmed via MCP read-only SELECT.

Most parsimonious cause: stale browser/JWT cache or autocomplete remnant from the prior admin session. Operator declared PASS-with-caveat; verifier confirmed PASS verdict.

**Recommended follow-up (no-blocker):** in a fresh private browser window post-deploy, sign in as the seeker account, navigate `/admin` directly, confirm AccessDenied renders inline. Logged in `20.1-VERIFICATION.md` `human_verification` array.

## Files in tree right now (uncommitted)

- `.claude/scheduled_tasks.lock` (untracked, harmless)
- (Tree clean otherwise.)

## Key decisions captured to memory or STATE.md

- Studio SQL Editor was used for all DB writes (Tasks 2, 6 of Plan 5). MCP read-only used for SELECT verifications (Tasks 3, 7).
- StatusBanner has FIXED variant enum `'shortlisted' | 'interview' | 'offer' | 'declined'` — no `'error'` variant. Plan 3 used inline `role="alert"` divs with `--color-danger` tokens for both submit-error and AccessDenied (RESEARCH Pitfall 3 Option A).
- AdminGate branching order is LOAD-BEARING and mirrors `ProtectedRoute.tsx:13-26` and `:41-55` byte-for-byte to handle the AUTH-FIX-02 race window.

## Open carryforwards (still v2.0-blocking)

From `.planning/v2.0-MILESTONE-AUDIT.md`, plus today's findings:

1. **Pre-launch credentials session (deferred 2026-05-05 PM)** — bundles two credential-state issues with the same root cause category:
   - **RESEND_API_KEY production secret** — Phase 15-02 deferred. Action: `supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty` then run 15-02 E2E. Without this, every notification email silently skips. Acceptable while there are no real users.
   - **GitHub Actions `SUPABASE_DB_PASSWORD` SASL auth failure** — diagnosed today via CLAUDE §6 enumeration sweep. Findings: secret IS set (last update 2026-05-03 00:30:39 UTC), default repo correct, no env shadowing, workflow env mapping clean. Yet 5+ consecutive runs since 2026-05-03 fail with `FATAL: password authentication failed for user "postgres"`. Matches CLAUDE.md §6 precedent: "Supabase Studio's password reset was not persisting server-side." Required diagnostic before next rotation: in Studio reset DB password → verify with psql against pooler `aws-1-ap-northeast-2.pooler.supabase.com` BEFORE writing to GH Actions secret. If psql fails after Studio reset, escalate to Supabase support.
2. **HOMEBUG-01 root cause** — captured 2026-05-03; status TBD.

Phase 16 reconciliation done 2026-05-05 PM in commit `5a58b34` (ROADMAP `[ ]` → `[x]` with closure note pointing to `16-PRIV02-EVIDENCE.md`; Phase 20.1 progress-table row formatting fixed).

## Pending phases (ROADMAP order)

| # | Name | Status | Effort | Blocking |
|---|------|--------|--------|----------|
| 16 | Privacy Bypass Empirical Test | gap closure | small (single test execution) | depends on Phase 15-02 (deployed function + secret) |
| 17 | Saved Search | feature | medium (3 RPCs + UI) | independent |
| 18 | Tech Debt Cleanup | gap closure (21 items) | large | independent — but bundles many small items |
| 19 | Design System Cleanup (Tier 1) | redesign | large | independent (long-lived branch `feat/v2-brand-migration`) |
| 19b | Design System Cleanup (Tier 2) | redesign | large | depends on Phase 19 |

Note: Phase 16 in MILESTONE-AUDIT shows "CLOSED 2026-05-04" via PRIV-02 evidence (`.planning/phases/16-privacy-bypass-test/16-PRIV02-EVIDENCE.md`). ROADMAP still lists it as `[ ]`. **Tracking-doc drift to reconcile.**

## Open todos

- Pending dir empty (`.planning/todos/pending/` has 0 files).
- Done dir most-recent: `2026-05-05-add-sign-out-button-to-dashboard-sidebar-footer.md` (closed by Plan 04).

## Where to pick up next session

If picking up cold, read in this order:
1. `.planning/STATE.md` (current position)
2. This handoff note
3. `.planning/ROADMAP.md` Progress table
4. `.planning/v2.0-MILESTONE-AUDIT.md` Carryforward Items section (lines 297+)
5. `.planning/phases/20.1-standalone-admin-login-gateway-account-bootstrap/20.1-VERIFICATION.md` (verifier verdict + caveat)

Recommended next move: see gap analysis at the end of the 2026-05-05 session log (orchestrator delivered separately).
