---
phase: 20
slug: super-admin-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/20-super-admin-dashboard/20-RESEARCH.md` § Validation Architecture

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 + @testing-library/react 16.3.0 + jsdom |
| **Config file** | `vitest.config.ts` (globals, setupFiles `./tests/setup.ts`) |
| **Quick run command** | `pnpm test -- tests/admin-*.test.{ts,tsx}` (admin-only suite) |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~25–30 seconds (admin suite); ~60–90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/admin-*.test.{ts,tsx}` (admin-only suite)
- **After every plan wave:** Run `pnpm test` (full vitest suite green)
- **Before `/gsd:verify-work`:** Full suite must be green AND manual ADMIN-BOOTSTRAP-1 UAT recorded
- **Max feedback latency:** 30 seconds for the admin suite

---

## Per-Task Verification Map

> Test IDs derived from RESEARCH.md "Phase Requirements → Test Map". Plan/wave/task IDs filled in by gsd-planner; updated to live IDs at execute-phase time.

| Test ID | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|-----------|-------------------|-------------|--------|
| ADMIN-GATE-FE-1 | Anonymous user redirected from /admin to /login | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-FE-2 | Employer redirected from /admin to /dashboard/employer | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-FE-3 | Seeker redirected from /admin to /dashboard/seeker | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-FE-4 | Admin reaches /admin and sees DailyBriefing | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-BE-1 | Anonymous JWT calling `admin_get_daily_briefing` returns auth error | integration | `pnpm test tests/admin-rpc-gate.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-BE-2 | Employer JWT calling any `admin_*` RPC returns "Forbidden: admin role required" | integration | `pnpm test tests/admin-rpc-gate.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-BE-3 | Seeker JWT calling any `admin_*` RPC returns "Forbidden: admin role required" | integration | `pnpm test tests/admin-rpc-gate.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-GATE-BE-4 | Admin JWT calling each `admin_*` RPC returns 200 + valid jsonb shape | integration | `pnpm test tests/admin-rpc-shapes.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-BOOTSTRAP-1 | Studio-SQL admin insert + session refresh returns role='admin' | manual UAT | `tests/admin-bootstrap-UAT.md` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-DAILY | Daily briefing returns yesterday's counts within 1 of expected | integration | `pnpm test tests/admin-daily-briefing.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-EMPL | Employer list returns paginated rows + matches search filter | integration | `pnpm test tests/admin-employer-list.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-SEEK | Seeker list returns paginated rows + matches search filter | integration | `pnpm test tests/admin-seeker-list.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-JOBS | Jobs list returns rows with applicant count | integration | `pnpm test tests/admin-jobs-list.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-PLAC | Placement pipeline returns ack'd-not-confirmed rows; >14d marked overdue | integration | `pnpm test tests/admin-placement-list.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-MUT-SUS | `admin_set_user_active(uuid, false)` flips state + writes audit row | integration | `pnpm test tests/admin-suspend.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-MUT-REA | `admin_set_user_active(uuid, true)` flips back + writes audit row | integration | `pnpm test tests/admin-suspend.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-MUT-NOTE | `admin_add_note(uuid, text)` inserts note + audit + returns row | integration | `pnpm test tests/admin-notes.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-RLS-NEG-1 | Existing seeker queries return identical row counts pre/post-migration 023 | integration | `pnpm test tests/admin-rls-not-widened.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-RLS-NEG-2 | Existing employer queries return identical row counts pre/post-migration 023 | integration | `pnpm test tests/admin-rls-not-widened.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-DRAWER | `admin_get_user_profile(uuid)` returns the UI-SPEC JSONB shape exactly | integration | `pnpm test tests/admin-drawer-shape.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-AUDIT | Every admin mutation appears in `admin_audit_log` with correct admin_id + target | integration | `pnpm test tests/admin-audit.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-VIEW-RESEND | Daily briefing reads `admin_metrics_cache.resend_stats` and renders rate; "unavailable" copy when cache stale | integration + manual | `pnpm test tests/admin-resend-cache.test.ts` + Resend live UAT | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing test infrastructure is sufficient — vitest config + setup.ts already exist; `tests/protected-route-oauth.test.tsx` is direct precedent for the gate-test pattern. No new framework install needed.

**New test files to scaffold in Wave 0 (stubs sufficient; bodies filled by their owning task):**

- [ ] `tests/admin-protected-route.test.tsx` — covers ADMIN-GATE-FE-1..4
- [ ] `tests/admin-rpc-gate.test.ts` — covers ADMIN-GATE-BE-1..3
- [ ] `tests/admin-rpc-shapes.test.ts` — covers ADMIN-GATE-BE-4
- [ ] `tests/admin-daily-briefing.test.ts` — covers ADMIN-VIEW-DAILY
- [ ] `tests/admin-employer-list.test.ts` — covers ADMIN-VIEW-EMPL
- [ ] `tests/admin-seeker-list.test.ts` — covers ADMIN-VIEW-SEEK
- [ ] `tests/admin-jobs-list.test.ts` — covers ADMIN-VIEW-JOBS
- [ ] `tests/admin-placement-list.test.ts` — covers ADMIN-VIEW-PLAC
- [ ] `tests/admin-suspend.test.ts` — covers ADMIN-MUT-SUS, ADMIN-MUT-REA
- [ ] `tests/admin-notes.test.ts` — covers ADMIN-MUT-NOTE
- [ ] `tests/admin-rls-not-widened.test.ts` — covers ADMIN-RLS-NEG-1..2 (CRITICAL — proves we did not widen RLS)
- [ ] `tests/admin-drawer-shape.test.ts` — covers ADMIN-DRAWER
- [ ] `tests/admin-audit.test.ts` — covers ADMIN-AUDIT
- [ ] `tests/admin-resend-cache.test.ts` — covers ADMIN-VIEW-RESEND
- [ ] `tests/admin-bootstrap-UAT.md` — manual UAT script for ADMIN-BOOTSTRAP-1

**Framework install:** none needed — vitest + RTL + jsdom + @testing-library/jest-dom already wired.

---

## Manual-Only Verifications

| Behavior | Source Decision | Why Manual | Test Instructions |
|----------|----------------|------------|-------------------|
| ADMIN-BOOTSTRAP-1 — Studio SQL one-shot admin assignment, sign-out, sign-in, role refresh visible in `useAuth().role` | CONTEXT.md "First-time setup: one-shot Supabase Studio SQL" | Studio SQL bypasses MCP `--read-only`; cannot be automated in CI without weakening security boundary | (1) In Supabase Studio: `INSERT INTO user_roles (user_id, role, is_active) VALUES ('<harry-auth-uid>', 'admin', true) ON CONFLICT (user_id) DO UPDATE SET role='admin', is_active=true;` (2) Sign out of app, sign back in (3) Open devtools, confirm `useAuth().role === 'admin'` (4) Navigate to `/admin` — DailyBriefing renders (5) Record auth.users.id + screenshot in `tests/admin-bootstrap-UAT.md` |
| ADMIN-VIEW-RESEND (live half) — Resend cache populates correctly from real API | RESEARCH.md cached-metric pattern | Requires real Resend API key + live email send history; not reproducible in pure unit context | (1) After Edge Function `get-resend-stats` deploy + cron schedule, wait 6h or invoke once manually (2) Verify `SELECT resend_stats FROM admin_metrics_cache WHERE id='resend'` returns recent timestamp + non-zero counts (3) Reload `/admin` daily briefing, confirm "Resend rate" tile shows percentage + last-updated timestamp |

---

## Critical Validation Note: RLS Not-Widened Proof

The single most important test for Phase 20 is **ADMIN-RLS-NEG-1 / ADMIN-RLS-NEG-2** — empirical proof that introducing the admin role + admin RPCs did not change any existing seeker's or employer's data access.

**Methodology (per RESEARCH.md):**
1. Before applying migration `023_admin_rpcs.sql`, capture row-count baselines for representative queries with seeker/employer JWTs (jobs visible to seeker, applications visible to employer, match_scores visible to seeker)
2. Apply migration 023
3. Re-run identical queries with the same JWTs
4. Assert counts are identical — any drift means a policy was widened; investigate before phase merge

This is the empirical equivalent of CONTEXT.md's "don't widen existing RLS holes" decision and CLAUDE.md §3 "Diagnose before fix".

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (15 test files + UAT)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for admin suite
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
