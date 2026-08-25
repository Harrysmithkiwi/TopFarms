---
phase: 23
slug: skills-taxonomy-consolidation-admin-analytics
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom, globals:true) — `mergeConfig` from `vite.config.ts` |
| **Config file** | `vitest.config.ts` (setupFiles: `./tests/setup.ts`) |
| **Quick run command** | `npx vitest run tests/skills-taxonomy-migration.test.ts tests/skills-picker-sector-removed.test.ts tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds (quick set) / ~45 seconds (full suite) |

All four Phase 23 nets are authored in plan 23-00 (Wave 0). Three are static-source-guards (`readFileSync` + regex over source/SQL files, pattern from `tests/fk-indexes.test.ts`) and one is an RTL render test (`vi.hoisted` mock pattern from `tests/admin-doc-queue.test.tsx`). No new framework install needed — Vitest + RTL are already configured.

---

## Sampling Rate

- **After every task commit:** Run the quick run command (the 4 Phase 23 test files).
- **After every plan wave:** Run the full suite (`npx vitest run`).
- **Before `/gsd:verify-work`:** Full suite must be green.
- **Max feedback latency:** ~8 seconds (quick set).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-00-01 | 00 | 0 | TAX-01,02,03,05 / ANLY-01,02,03 | static-source-guard (authors test) | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ✅ creates it (RED until 23-01) | ⬜ pending |
| 23-00-02 | 00 | 0 | TAX-04 | static-source-guard (authors test) | `npx vitest run tests/skills-picker-sector-removed.test.ts` | ✅ creates it (RED until 23-01) | ⬜ pending |
| 23-00-03 | 00 | 0 | ANLY-01,02 / TAX-04 / AdminTable+Sidebar | RTL + static-source-guard (authors tests) | `npx vitest run tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` | ✅ creates them (RED until 23-02) | ⬜ pending |
| 23-01-01 | 01 | 1 | TAX-01,02,03,05 / ANLY-01,02,03 | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ✅ W0 (23-00) | ⬜ pending |
| 23-01-02 | 01 | 1 | TAX-04 | static-source-guard | `npx vitest run tests/skills-picker-sector-removed.test.ts` | ✅ W0 (23-00) | ⬜ pending |
| 23-01-03 | 01 | 1 | TAX-01,02,03 (live apply) | checkpoint:human-action (Studio apply) + read-only MCP SELECT verification | manual — Studio `DO $verify$` + MCP `execute_sql` SELECTs (see plan) | n/a (DB-side) | ⬜ pending |
| 23-02-01 | 02 | 2 | ANLY-01,02,03 (union/route/sidebar) | static-source-guard | `npx vitest run tests/admin-skills-sidebar.test.ts` | ✅ W0 (23-00) | ⬜ pending |
| 23-02-02 | 02 | 2 | ANLY-01,02 (page render) | RTL | `npx vitest run tests/admin-skill-coverage.test.tsx` | ✅ W0 (23-00) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist note:** Every code-producing task (23-01-01, 23-01-02, 23-02-01, 23-02-02) has an automated `<verify>` running a pre-existing Wave 0 net. The only task without a pure-automated verify is 23-01-03 — but it is a `checkpoint:human-action` (Studio migration apply, unavoidable per CLAUDE §2 because the pooler CI path is gated, §6), and its post-state is still machine-verified via read-only MCP `execute_sql` SELECTs (count=24, no sector column, RPCs present, analytics_events present) and the in-migration `DO $verify$` block that RAISEs/rolls back on any failed assertion. No three consecutive tasks lack automated verify.

---

## Wave 0 Requirements

- [ ] `tests/skills-taxonomy-migration.test.ts` — static-source-guard over `supabase/migrations/034_skills_taxonomy_v2.sql`: asserts sector CHECK/column dropped, discipline column added, 6-slug category CHECK, 24 competency names verbatim, DELETE-before-reseed ordering, `compute_match_score` recompute, no DairyNZ/qualification rows, `admin_skill_coverage` + `admin_list_analytics_events` RPCs (SECURITY DEFINER + `_admin_gate` + GRANT), `analytics_events` table (4 core cols + RLS + admin-read policy), BEGIN/COMMIT + `DO $verify$`. (covers TAX-01,02,03,05 / ANLY-01,02,03 migration side)
- [ ] `tests/skills-picker-sector-removed.test.ts` — static-source-guard over `src/components/ui/SkillsPicker.tsx`: asserts `sector.eq.` absent, `.eq('discipline', 'agriculture')` present, `sector` prop removed from interface, `CATEGORY_LABELS` present. (covers TAX-04 picker side)
- [ ] `tests/admin-skill-coverage.test.tsx` — RTL render test for `AdminSkillCoverage`: mocks `supabase.rpc('admin_skill_coverage')` → `{ rows, total }`, asserts competency name + supply/demand values + Seekers/Jobs headers render, rpc called by name. (covers ANLY-01,02)
- [ ] `tests/admin-skills-sidebar.test.ts` — static-source-guard over `AdminSidebar.tsx` + `AdminTable.tsx`: asserts `/admin/skills` NavItem present and `AdminListRpc` union includes `'admin_skill_coverage'` + `'admin_list_analytics_events'`. (covers ANLY-01,02,03 wiring)
- [ ] `tests/setup.ts` — already exists; shared RTL fixtures OK, no change needed.

All four nets target artifacts that do not yet exist (migration file absent, SkillsPicker still sector-filtered, AdminSkillCoverage page absent, sidebar item + union entries absent), so they fail RED for the right reason at Wave 0 — proving they are load-bearing, not vacuously passing. `wave_0_complete` flips true once plan 23-00 lands and all four are confirmed RED.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 034 applied to live DB | TAX-01,02,03,05 / ANLY-03 | CLAUDE §2 — migrations applied via Supabase Studio SQL Editor, not CI (pooler auth gated, §6) | Plan 23-01 Task 3 checkpoint: paste 034 into Studio SQL Editor, run (in-SQL `DO $verify$` asserts post-state), backfill registry row, confirm via read-only MCP `execute_sql` SELECTs (24 skills / 6 categories / no sector column / 2 RPCs / analytics_events present) + `list_migrations` shows 034 |
| Both wizard skill steps render new taxonomy in running app | TAX-04 | Live PostgREST round-trip against migrated schema — proves the SkillsPicker discipline query works post-drop (closes Research Pitfall 1 break-avoidance) | Open seeker onboarding skill step + job-posting skill step; both show the 6 new category groups with no "Failed to load skills" error |
| /admin/skills shows real supply/demand counts | ANLY-01,02 | Live RPC round-trip against migrated DB (mocked in RTL, but real-data confirmation is manual) | Visit /admin/skills as admin: 24 competencies render with their actual seeker_count/job_count |

*Migration-apply is manual only because the project's migration path is Studio-applied by hard constraint (CLAUDE §2/§6), but its post-state is machine-verified via the in-migration `DO $verify$` + read-only MCP SELECTs — so it is not an unverified manual step.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (23-01-03 is a checkpoint with machine-verified post-state via `DO $verify$` + read-only MCP)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (all four nets authored in plan 23-00)
- [x] No watch-mode flags
- [x] Feedback latency < ~8s (quick set)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-29
