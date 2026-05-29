---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: "00"
subsystem: test-scaffold
tags: [tdd, wave-0, skills-taxonomy, admin-analytics]
dependency_graph:
  requires: []
  provides:
    - tests/skills-taxonomy-migration.test.ts
    - tests/skills-picker-sector-removed.test.ts
    - tests/admin-skill-coverage.test.tsx
    - tests/admin-skills-sidebar.test.ts
  affects:
    - supabase/migrations/034_skills_taxonomy_v2.sql (guarded — plan 23-01)
    - src/components/ui/SkillsPicker.tsx (guarded — plan 23-01)
    - src/pages/admin/AdminSkillCoverage.tsx (guarded — plan 23-02)
    - src/components/layout/AdminSidebar.tsx (guarded — plan 23-02)
    - src/components/admin/AdminTable.tsx (guarded — plan 23-02)
tech_stack:
  added: []
  patterns:
    - readFileSync static-source-guard (from fk-indexes.test.ts)
    - vi.hoisted RTL mock (from admin-doc-queue.test.tsx)
key_files:
  created:
    - tests/skills-taxonomy-migration.test.ts
    - tests/skills-picker-sector-removed.test.ts
    - tests/admin-skill-coverage.test.tsx
    - tests/admin-skills-sidebar.test.ts
  modified: []
decisions:
  - "Wave 0 scaffold-first: 4 test files encode all 8 requirement acceptance criteria (TAX-01..05, ANLY-01..03) before any implementation. RED state is the success condition."
  - "Migration guard uses COMPETENCIES array + it.each (24 names verbatim from CONTEXT.md decision #1) — both compact and exhaustive."
  - "RTL render test (admin-skill-coverage.test.tsx) uses vi.hoisted mock pattern from admin-doc-queue.test.tsx precedent (required for static-import SUT)."
  - "Sidebar guard tests /admin/skills route presence + AdminListRpc union extension — Pitfall 4 guard ensures AdminTable will accept the new RPC names."
metrics:
  duration: "~3 minutes"
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_created: 4
  files_modified: 0
---

# Phase 23 Plan 00: Test Scaffold Summary

Wave 0 test scaffold for Phase 23 skills taxonomy consolidation + admin analytics. Four static-source-guard and RTL test files encode all 8 requirement acceptance criteria before any implementation exists, establishing the Nyquist nets that downstream plans 23-01 and 23-02 must satisfy.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Migration static-source-guard | `0c35494` | tests/skills-taxonomy-migration.test.ts |
| 2 | SkillsPicker re-point guard | `b3ecc6d` | tests/skills-picker-sector-removed.test.ts |
| 3 | Admin skill-coverage RTL + sidebar/union guard | `2ad3794` | tests/admin-skill-coverage.test.tsx, tests/admin-skills-sidebar.test.ts |

## Test Files and What They Guard

### `tests/skills-taxonomy-migration.test.ts`
Static-source-guard over `supabase/migrations/034_skills_taxonomy_v2.sql` (absent until plan 23-01).

Encodes:
- **TAX-01**: `DROP CONSTRAINT skills_sector_check`, `DROP COLUMN sector`, `ADD COLUMN discipline text NOT NULL DEFAULT 'agriculture'`, `skills_category_check` with all 6 category slugs (`livestock`, `cropping_agronomy`, `machinery_equipment`, `farm_operations_infrastructure`, `management_business`, `cross_cutting`)
- **TAX-02**: 24-entry `COMPETENCIES` array + `it.each` over every name verbatim from CONTEXT.md decision #1; `COMPETENCIES.length === 24` assertion
- **TAX-03**: `DELETE FROM public.seeker_skills`, `DELETE FROM public.match_scores`, `DELETE FROM public.skills` (in dependency order); `compute_match_score` recompute
- **TAX-05**: `.not.toMatch(/DairyNZ Level/i)`, `.not.toMatch(/'qualification'/i)`
- **ANLY-01/02**: `CREATE OR REPLACE FUNCTION public.admin_skill_coverage`, `SECURITY DEFINER`, `PERFORM public._admin_gate()`, `seeker_count`, `job_count`, `GRANT EXECUTE ... TO authenticated`
- **ANLY-03**: `CREATE TABLE IF NOT EXISTS public.analytics_events`, 4 core columns, `ENABLE ROW LEVEL SECURITY`, `get_user_role(auth.uid()) = 'admin'` RLS, `CREATE OR REPLACE FUNCTION public.admin_list_analytics_events`
- Migration structure: `BEGIN;`, `COMMIT;`, `DO $verify$`

**RED state**: ENOENT on missing `034_skills_taxonomy_v2.sql`

### `tests/skills-picker-sector-removed.test.ts`
Static-source-guard over `src/components/ui/SkillsPicker.tsx`.

Encodes **TAX-04**:
- `.not.toContain('sector.eq.')` — old `.or('sector.eq.${sector},sector.eq.both')` filter removed
- `.not.toMatch(/\.or(\`sector/)` — no `.or()` with sector filter
- `.toMatch(/\.eq\('discipline',\s*'agriculture'\)/)` — discipline filter present
- `.not.toMatch(/sector:\s*'dairy'\s*\|\s*'sheep_beef'/)` — old sector prop type removed
- `.toMatch(/CATEGORY_LABELS/)` — human-readable category label mapping present

**RED state**: Current SkillsPicker.tsx still has sector filter, no discipline filter, no CATEGORY_LABELS (5 assertions fail)

### `tests/admin-skill-coverage.test.tsx`
RTL render test for the future `src/pages/admin/AdminSkillCoverage.tsx`.

Encodes **ANLY-01/02/TAX-04**:
- `vi.hoisted` rpcMock pattern (canonical from admin-doc-queue.test.tsx)
- Mock `admin_skill_coverage` RPC returns `{ rows: [{skill_id, name, category, discipline, seeker_count, job_count}], total }`
- `await import('@/pages/admin/AdminSkillCoverage')` + `render(<MemoryRouter><AdminSkillCoverage /></MemoryRouter>)`
- Asserts: `'Dairy cattle management'` renders; supply value `3` + demand value `1` render; `rpcMock` called with `'admin_skill_coverage'`; `screen.getByText(/seekers/i)` + `screen.getByText(/jobs/i)` headers present

**RED state**: Failed to resolve import `@/pages/admin/AdminSkillCoverage` (module absent)

### `tests/admin-skills-sidebar.test.ts`
Static-source-guard over `src/components/layout/AdminSidebar.tsx` and `src/components/admin/AdminTable.tsx`.

Encodes **ANLY-01/03** (Pitfall 4 guard):
- `sidebarSrc.toMatch(/to:\s*'\/admin\/skills'/)` — `/admin/skills` nav item present
- `sidebarSrc.toMatch(/'Skills'|'Analytics'/)` — label string present
- `tableSrc.toContain("'admin_skill_coverage'")` — AdminListRpc union extended
- `tableSrc.toContain("'admin_list_analytics_events'")` — AdminListRpc union extended

**RED state**: Sidebar has no `/admin/skills` item; AdminListRpc union lacks both new entries (4 assertions fail)

## Overall Verification

```
npx vitest run tests/skills-taxonomy-migration.test.ts \
  tests/skills-picker-sector-removed.test.ts \
  tests/admin-skill-coverage.test.tsx \
  tests/admin-skills-sidebar.test.ts
```

Result: **4 test files failed, 9 tests failed** — all RED for the right reasons. Wave 0 baseline confirmed.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `tests/skills-taxonomy-migration.test.ts` — FOUND
- `tests/skills-picker-sector-removed.test.ts` — FOUND
- `tests/admin-skill-coverage.test.tsx` — FOUND
- `tests/admin-skills-sidebar.test.ts` — FOUND
- commit `0c35494` — FOUND (git log)
- commit `b3ecc6d` — FOUND (git log)
- commit `2ad3794` — FOUND (git log)
- All 4 files fail RED: confirmed by vitest run output
