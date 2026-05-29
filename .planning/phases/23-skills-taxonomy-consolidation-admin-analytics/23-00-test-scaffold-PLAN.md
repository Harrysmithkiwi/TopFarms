---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/skills-taxonomy-migration.test.ts
  - tests/skills-picker-sector-removed.test.ts
  - tests/admin-skill-coverage.test.tsx
  - tests/admin-skills-sidebar.test.ts
autonomous: true
requirements: [TAX-01, TAX-02, TAX-03, TAX-04, TAX-05, ANLY-01, ANLY-02, ANLY-03]
must_haves:
  truths:
    - "Running the four Phase 23 test files fails RED before implementation (asserting expected end state that does not yet exist)"
    - "The test files encode the exact acceptance criteria for the 034 migration, SkillsPicker re-point, admin skill-coverage page, and sidebar/union extension"
  artifacts:
    - path: "tests/skills-taxonomy-migration.test.ts"
      provides: "Static-source-guard over supabase/migrations/034_skills_taxonomy_v2.sql"
      contains: "readFileSync"
    - path: "tests/skills-picker-sector-removed.test.ts"
      provides: "Static-source-guard over SkillsPicker.tsx asserting sector filter removed"
      contains: "readFileSync"
    - path: "tests/admin-skill-coverage.test.tsx"
      provides: "RTL render test for AdminSkillCoverage page consuming admin_skill_coverage RPC"
      contains: "vi.hoisted"
    - path: "tests/admin-skills-sidebar.test.ts"
      provides: "Static-source-guard over AdminSidebar.tsx + AdminTable.tsx"
      contains: "readFileSync"
  key_links:
    - from: "tests/skills-taxonomy-migration.test.ts"
      to: "supabase/migrations/034_skills_taxonomy_v2.sql"
      via: "readFileSync(resolve(__dirname, '..', 'supabase/migrations/034_skills_taxonomy_v2.sql'))"
      pattern: "034_skills_taxonomy_v2\\.sql"
    - from: "tests/admin-skill-coverage.test.tsx"
      to: "src/pages/admin/AdminSkillCoverage.tsx"
      via: "await import('@/pages/admin/AdminSkillCoverage')"
      pattern: "AdminSkillCoverage"
---

<objective>
Create the four Wave 0 test scaffolds that encode the acceptance criteria for every Phase 23 requirement BEFORE any implementation exists. These are the Nyquist nets: each downstream task's `<verify>` runs one of these files, so they must exist first and fail RED until the implementing task lands.

Purpose: Lock the contract (migration shape, SkillsPicker re-point, admin RPC shape, sidebar/union extension) in executable form so Wave 1/2 executors implement against fixed expectations, not assumptions.
Output: 4 test files in `tests/`, all failing RED (their targets do not exist yet — migration file absent, SkillsPicker still uses sector filter, AdminSkillCoverage page absent, sidebar item absent).
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-CONTEXT.md
@.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-RESEARCH.md
@.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-VALIDATION.md

<interfaces>
<!-- Exact patterns the executor must replicate. Do not re-derive — use these directly. -->

Static-source-guard pattern (from tests/fk-indexes.test.ts — the canonical template):
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL_PATH = resolve(__dirname, '..', 'supabase/migrations/034_skills_taxonomy_v2.sql')

describe('...', () => {
  const sql = readFileSync(SQL_PATH, 'utf8')
  it('...', () => { expect(sql).toMatch(/.../) })
})
```

RTL + vi.hoisted mock pattern (from tests/admin-doc-queue.test.tsx — canonical for admin page render):
```typescript
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))
// render(<MemoryRouter><AdminSkillCoverage /></MemoryRouter>); await waitFor(...)
```

AdminTable RPC contract (from src/components/admin/AdminTable.tsx): the RPC returns `{ rows: TRow[], total: number }`; the table calls `supabase.rpc(rpc as never, args as never)`.

Current SkillsPicker query (src/components/ui/SkillsPicker.tsx:56-59) — the string the test asserts is REMOVED:
```typescript
.or(`sector.eq.${sector},sector.eq.both`)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration static-source-guard test (skills-taxonomy-migration.test.ts)</name>
  <read_first>
    - tests/fk-indexes.test.ts (exact readFileSync + regex pattern to copy)
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-RESEARCH.md (§Validation Architecture → Wave 0 Gaps; §Pattern 1 migration structure; §Old→New Mapping)
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-CONTEXT.md (decision #1 — the 24 competency names + 6 categories)
    - supabase/migrations/033_admin_doc_rpcs.sql (BEGIN/DO $verify$/COMMIT + GRANT pattern the migration will follow)
  </read_first>
  <action>
    Create `tests/skills-taxonomy-migration.test.ts` as a static-source-guard over `supabase/migrations/034_skills_taxonomy_v2.sql` (the file does NOT exist yet — these assertions are RED until plan 23-01 authors it). Copy the `readFileSync(resolve(__dirname, '..', 'supabase/migrations/034_skills_taxonomy_v2.sql'), 'utf8')` shape from fk-indexes.test.ts verbatim.

    Assert ALL of the following (one `it()` per group; use `expect(sql).toMatch(/regex/i)` or `.match(...).toHaveLength(n)`):

    TAX-01 (schema):
    - `expect(sql).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+skills_sector_check/i)`
    - `expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+sector/i)`
    - `expect(sql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+discipline\s+text\s+NOT\s+NULL\s+DEFAULT\s+'agriculture'/i)`
    - `expect(sql).toMatch(/skills_category_check/i)` AND the CHECK lists all six category slugs: `livestock`, `cropping_agronomy`, `machinery_equipment`, `farm_operations_infrastructure`, `management_business`, `cross_cutting` (one assertion per slug, e.g. `expect(sql).toMatch(/'cropping_agronomy'/)`).

    TAX-02 (24 competencies): assert exactly 24 INSERT value rows. Count `('` -prefixed competency name rows inside the INSERT block. Simplest robust assertion: each of the 24 exact names appears verbatim — write a `const COMPETENCIES = [...]` array of all 24 names (copy verbatim from CONTEXT.md decision #1: 'Dairy cattle management', 'Beef cattle management', 'Sheep & lamb handling', 'Animal health & husbandry', 'Mustering & stockmanship', 'Arable & grain production', 'Vegetable & root crop production', 'Pasture & forage management', 'Agronomy & soil management', 'Tractor operation', 'Heavy machinery & harvest equipment', 'Spraying & application equipment', 'Farm vehicle handling', 'Fencing & yard construction', 'Irrigation & water systems', 'General farm maintenance', 'Fuel & chemical handling', 'Farm planning & operations management', 'Staff supervision & leadership', 'Farm financial management', 'Compliance & record-keeping', 'Health & safety competency', 'Sustainable & regenerative practices', 'Data & farm tech literacy') and `it.each(COMPETENCIES)('seeds %s', (name) => expect(sql).toContain(name))`. Also assert `COMPETENCIES` has length 24.

    TAX-03 (data migration): assert the migration clears data before reseed in the right order:
    - `expect(sql).toMatch(/DELETE\s+FROM\s+public\.seeker_skills/i)`
    - `expect(sql).toMatch(/DELETE\s+FROM\s+public\.match_scores/i)`
    - `expect(sql).toMatch(/DELETE\s+FROM\s+public\.skills/i)`
    - assert recompute happens: `expect(sql).toMatch(/compute_match_score/i)` (the backfill re-INSERT into match_scores).

    TAX-05 (no quals): assert the INSERT block does NOT seed any qualification competency:
    - `expect(sql).not.toMatch(/DairyNZ Level/i)`
    - `expect(sql).not.toMatch(/'qualification'/i)`

    ANLY-01/ANLY-02 (coverage RPC in migration):
    - `expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_skill_coverage/i)`
    - `expect(sql).toMatch(/SECURITY\s+DEFINER/i)`
    - `expect(sql).toMatch(/PERFORM\s+public\._admin_gate\(\)/i)`
    - `expect(sql).toMatch(/seeker_count/i)` AND `expect(sql).toMatch(/job_count/i)`
    - `expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.admin_skill_coverage.*TO\s+authenticated/i)`

    ANLY-03 (analytics_events):
    - `expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.analytics_events/i)`
    - assert the 4 core columns: `event_type`, `entity_id`, `metadata`, `created_at` (one assertion each).
    - `expect(sql).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)` near analytics_events
    - assert admin read RLS: `expect(sql).toMatch(/get_user_role\(auth\.uid\(\)\)\s*=\s*'admin'/i)`
    - assert read RPC: `expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_list_analytics_events/i)`

    Migration structure:
    - `expect(sql).toMatch(/^BEGIN;/m)` and `expect(sql).toMatch(/COMMIT;/)`
    - `expect(sql).toMatch(/DO \$verify\$/)`
  </action>
  <verify>
    <automated>npx vitest run tests/skills-taxonomy-migration.test.ts</automated>
    Expect RED (suite fails because 034_skills_taxonomy_v2.sql does not exist — readFileSync throws ENOENT). This is the correct Wave 0 state.
  </verify>
  <acceptance_criteria>
    - File `tests/skills-taxonomy-migration.test.ts` exists
    - grep: `tests/skills-taxonomy-migration.test.ts` contains `034_skills_taxonomy_v2.sql`
    - grep: contains `skills_sector_check`, `discipline text NOT NULL DEFAULT 'agriculture'`, `admin_skill_coverage`, `analytics_events`, `admin_list_analytics_events`
    - grep: contains all 6 category slugs (`livestock`, `cropping_agronomy`, `machinery_equipment`, `farm_operations_infrastructure`, `management_business`, `cross_cutting`)
    - grep: `COMPETENCIES` array literal present with 24 entries; contains the exact string `'Sustainable & regenerative practices'`
    - grep: contains `.not.toMatch(/DairyNZ Level/i)` and `.not.toMatch(/'qualification'/i)`
    - `npx vitest run tests/skills-taxonomy-migration.test.ts` runs (fails RED on missing file — acceptable for Wave 0)
  </acceptance_criteria>
  <done>Migration guard test exists, encodes all TAX/ANLY migration-side assertions, and runs RED (target SQL file absent).</done>
</task>

<task type="auto">
  <name>Task 2: SkillsPicker re-point guard (skills-picker-sector-removed.test.ts)</name>
  <read_first>
    - tests/fk-indexes.test.ts (readFileSync pattern)
    - src/components/ui/SkillsPicker.tsx (current state — line 59 has the `.or('sector.eq...')` filter the test asserts is removed)
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-RESEARCH.md (§Pattern 2 SkillsPicker Re-point)
  </read_first>
  <action>
    Create `tests/skills-picker-sector-removed.test.ts` as a static-source-guard over `src/components/ui/SkillsPicker.tsx`. Use `readFileSync(resolve(__dirname, '..', 'src/components/ui/SkillsPicker.tsx'), 'utf8')`.

    Assert (TAX-04):
    - The sector filter is GONE: `expect(src).not.toContain('sector.eq.')` and `expect(src).not.toMatch(/\.or\(`sector/)`.
    - The discipline filter is PRESENT: `expect(src).toMatch(/\.eq\('discipline',\s*'agriculture'\)/)`.
    - The `sector` prop is removed from the interface: `expect(src).not.toMatch(/sector:\s*'dairy'\s*\|\s*'sheep_beef'/)`.
    - Category labels mapping present (research recommendation #3): `expect(src).toMatch(/CATEGORY_LABELS/)`.

    These are RED until plan 23-01 re-points the component.
  </action>
  <verify>
    <automated>npx vitest run tests/skills-picker-sector-removed.test.ts</automated>
    Expect RED (SkillsPicker.tsx still has the sector filter, no discipline filter, no CATEGORY_LABELS).
  </verify>
  <acceptance_criteria>
    - File `tests/skills-picker-sector-removed.test.ts` exists
    - grep: contains `src/components/ui/SkillsPicker.tsx`
    - grep: contains `.not.toContain('sector.eq.')`
    - grep: contains `.eq('discipline', 'agriculture')` (as the asserted-present string) and `CATEGORY_LABELS`
    - `npx vitest run tests/skills-picker-sector-removed.test.ts` runs RED against current SkillsPicker
  </acceptance_criteria>
  <done>SkillsPicker guard test exists, asserts sector filter removed + discipline filter + CATEGORY_LABELS present, runs RED.</done>
</task>

<task type="auto">
  <name>Task 3: Admin skill-coverage page RTL test + sidebar/union guard (admin-skill-coverage.test.tsx + admin-skills-sidebar.test.ts)</name>
  <read_first>
    - tests/admin-doc-queue.test.tsx (vi.hoisted + MemoryRouter + rpcMock RTL pattern to copy verbatim)
    - tests/fk-indexes.test.ts (readFileSync pattern for the sidebar guard)
    - src/components/admin/AdminTable.tsx (current AdminListRpc union — the test asserts the 2 new entries are added)
    - src/components/layout/AdminSidebar.tsx (current adminItems array — test asserts the new /admin/skills item)
    - src/pages/admin/AdminDocumentsQueue.tsx (page-shape precedent the future AdminSkillCoverage page mirrors)
  </read_first>
  <action>
    Create TWO files.

    (A) `tests/admin-skill-coverage.test.tsx` — RTL render test for the future `AdminSkillCoverage` page (does NOT exist yet → RED). Copy the `vi.hoisted` + `vi.mock('@/lib/supabase', ...)` + `MemoryRouter` shape from admin-doc-queue.test.tsx. Mock `supabase.rpc` so that when called with `'admin_skill_coverage'` it resolves:
    ```
    { data: { rows: [
        { skill_id: 's1', name: 'Dairy cattle management', category: 'livestock', discipline: 'agriculture', seeker_count: 3, job_count: 1 },
        { skill_id: 's2', name: 'Tractor operation', category: 'machinery_equipment', discipline: 'agriculture', seeker_count: 0, job_count: 2 },
      ], total: 2 }, error: null }
    ```
    Then `const { AdminSkillCoverage } = await import('@/pages/admin/AdminSkillCoverage')`, render inside `<MemoryRouter>`, and assert (ANLY-01/ANLY-02/TAX-04):
    - `await waitFor(() => expect(screen.getByText('Dairy cattle management')).toBeInTheDocument())`
    - the supply column value `3` and demand column value `1` render for that row
    - `expect(rpcMock).toHaveBeenCalledWith('admin_skill_coverage', expect.anything())` (AdminTable calls it with `{ p_limit, p_offset }` and no `p_search` because searchable=false; assert the rpc name was called).
    - a "Seekers" / supply header and a "Jobs" / demand header render (use `screen.getByText(/seekers/i)` and `screen.getByText(/jobs/i)`).

    (B) `tests/admin-skills-sidebar.test.ts` — static-source-guard over `AdminSidebar.tsx` and `AdminTable.tsx`. Read both files via readFileSync. Assert:
    - AdminSidebar: `expect(sidebarSrc).toMatch(/to:\s*'\/admin\/skills'/)` and the label string is present (`expect(sidebarSrc).toMatch(/'Skills'|'Analytics'/)`).
    - AdminTable union (Pitfall 4): `expect(tableSrc).toContain("'admin_skill_coverage'")` AND `expect(tableSrc).toContain("'admin_list_analytics_events'")`.

    Both files are RED until plan 23-02 ships the page, route, sidebar item, and union extension.
  </action>
  <verify>
    <automated>npx vitest run tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts</automated>
    Expect RED (AdminSkillCoverage page absent → import throws; sidebar item + union entries absent).
  </verify>
  <acceptance_criteria>
    - Files `tests/admin-skill-coverage.test.tsx` and `tests/admin-skills-sidebar.test.ts` exist
    - admin-skill-coverage.test.tsx grep: contains `vi.hoisted`, `MemoryRouter`, `admin_skill_coverage`, `AdminSkillCoverage`, `Dairy cattle management`
    - admin-skills-sidebar.test.ts grep: contains `/admin/skills`, `'admin_skill_coverage'`, `'admin_list_analytics_events'`
    - `npx vitest run tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` runs RED
  </acceptance_criteria>
  <done>Both admin test files exist, encode the page render + RPC shape + sidebar/union acceptance criteria, and run RED.</done>
</task>

</tasks>

<verification>
- All four test files exist in `tests/`.
- `npx vitest run tests/skills-taxonomy-migration.test.ts tests/skills-picker-sector-removed.test.ts tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` runs and reports RED (every target artifact is absent — this is the expected Wave 0 baseline that proves the tests are load-bearing, not vacuously passing).
- No test uses a watch-mode flag (no `--watch`).
</verification>

<success_criteria>
- 4 test files created encoding all 8 requirements' acceptance criteria.
- Each file fails RED for the right reason (target artifact not yet built), confirming the Nyquist nets are real.
- Downstream plans 23-01 and 23-02 can run their `<verify>` against these files and watch them flip GREEN.
</success_criteria>

<output>
After completion, create `.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-00-SUMMARY.md`
</output>
