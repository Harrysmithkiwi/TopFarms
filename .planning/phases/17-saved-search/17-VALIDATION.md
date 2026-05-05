---
phase: 17
slug: saved-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `17-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 + @testing-library/react 16.3.0 + jsdom 29.0.0 |
| **Config file** | `vitest.config.ts` (mergeConfig with vite.config; include `tests/**/*.test.{ts,tsx}`) |
| **Quick run command** | `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` |
| **Full suite command** | `pnpm test -- --run` |
| **Estimated runtime** | ~12s (phase scope) / ~95s (full suite) |

---

## Sampling Rate

- **After every task commit:** `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}`
- **After every plan wave:** `pnpm test -- --run` (full suite — guards against regression in `JobSearch.tsx`, `Sidebar.tsx`, JOBS-01 fix)
- **Before `/gsd:verify-work`:** Full suite green + 6 manual UAT items passed
- **Max feedback latency:** 12 seconds for phase scope, 95 seconds for full suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-* | 01 | 0 | (Wave 0 stubs) | scaffold | `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` (expect red — stubs only) | ❌ W0 | ⬜ pending |
| 17-02-* | 02 | 1 | SRCH-13 | unit (RTL) | `pnpm test -- --run tests/saved-search-modal.test.tsx` | ❌ W0 | ⬜ pending |
| 17-02-* | 02 | 1 | SRCH-13 | unit (pure) | `pnpm test -- --run tests/saved-search-snapshot.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-* | 02 | 1 | SRCH-13 | unit (RTL) | `pnpm test -- --run tests/saved-search-cap.test.tsx` | ❌ W0 | ⬜ pending |
| 17-03-* | 03 | 2 | SRCH-15 | unit (RTL) | `pnpm test -- --run tests/saved-search-list.test.tsx` | ❌ W0 | ⬜ pending |
| 17-04-* | 04 | 3 | SRCH-14 | unit (RTL) | `pnpm test -- --run tests/saved-search-quick-load.test.tsx` | ❌ W0 | ⬜ pending |
| 17-04-* | 04 | 3 | SRCH-14 | unit (RTL — regression) | `pnpm test -- --run tests/saved-search-load-integration.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plan numbers above are provisional; planner sets final assignment. The Req → Test mapping is fixed.*

---

## Wave 0 Requirements

- [ ] `tests/saved-search-modal.test.tsx` — stubs for SRCH-13 (modal render + Zod validation)
- [ ] `tests/saved-search-snapshot.test.ts` — stubs for SRCH-13 (`snapshotFilters` + `deriveAutoName` pure functions)
- [ ] `tests/saved-search-cap.test.tsx` — stubs for SRCH-13 (10-cap replace modal)
- [ ] `tests/saved-search-list.test.tsx` — stubs for SRCH-15 (delete + undo + inline rename)
- [ ] `tests/saved-search-quick-load.test.tsx` — stubs for SRCH-14 (dropdown lists top 5 + navigates)
- [ ] `tests/saved-search-load-integration.test.tsx` — stubs for SRCH-14 (regression: ONE fetchJobs call on load, match-scores intact)
- [ ] `tests/saved-search-UAT.md` — manual UAT script for the 6 items in §Manual-Only Verifications

*Existing test infrastructure (vitest + RTL + jsdom + supabase mock pattern in `admin-employer-list.test.ts`) covers all Phase 17 requirements. No framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Save → load round-trip | SRCH-13 + SRCH-14 | E2E URL-state restoration is jsdom-fragile (react-router navigate + searchParams subscription chain) | Sign in as seeker; set filters `shed_type=dairy`, `region=Waikato`, `accommodation=true`; click Save with auto-name; reload page; navigate to `/dashboard/seeker/saved-searches`; click Load on the saved row; verify URL `?shed_type=dairy&region=Waikato&accommodation=true` and result list matches |
| Delete with undo | SRCH-15 | Sonner toast + 5s timer + DOM unmount-during-toast scenarios are timing-sensitive in jsdom | Click delete on a saved row; click Undo within 5s; verify row reappears; query Supabase Studio `select count(*) from saved_searches where id = '<id>'` returns 1 |
| Delete without undo | SRCH-15 | DB DELETE + RLS verification needs real Supabase connection | Click delete on a saved row; wait 6s; verify row gone from list AND from `select count(*) from saved_searches where id = '<id>'` returns 0 |
| 10-cap replace | SRCH-13 (UX) | Multi-step modal flow + DB count assertion | Save 10 distinct searches; attempt 11th save; verify replace-oldest modal appears with the OLDEST name; click Replace; verify oldest deleted from DB AND new saved (count remains 10) |
| Cross-session persistence | SRCH-13 (success criterion 4) | Auth state + cross-session DB read | Save searches as seeker A; sign out; sign back in; verify saved searches still listed in `/dashboard/seeker/saved-searches` |
| Multi-tab race (low priority) | SRCH-13 edge case | Cross-tab race condition cannot be simulated in jsdom | Open two tabs as same seeker, both at count=9; click Save in tab A and tab B near-simultaneously; verify count=11 (acceptable +1 drift) and no error toast |
| RLS isolation (seeker A vs seeker B) | Cross-cutting (CLAUDE §1, ownership pattern) | Cannot mock RLS — needs real Supabase with two distinct authed users | In browser: sign in as seeker A; in DevTools console run `await supabase.from('saved_searches').select('*').eq('user_id', '<seeker_B_uuid>')`; expect empty array (RLS filters cross-user reads server-side) |
| RLS isolation (anonymous) | Cross-cutting (CLAUDE §1) | Cannot mock RLS | In incognito (signed out): run `await supabase.from('saved_searches').select('*')`; expect empty array regardless of seeker_id |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s (phase scope), < 95s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner integrates Wave 0 + per-task verifies)

**Approval:** pending
