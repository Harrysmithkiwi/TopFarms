---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: 02
type: execute
wave: 2
depends_on: ["23-01"]
files_modified:
  - src/pages/admin/AdminSkillCoverage.tsx
  - src/components/admin/AdminTable.tsx
  - src/components/layout/AdminSidebar.tsx
  - src/main.tsx
autonomous: true
requirements: [ANLY-01, ANLY-02, ANLY-03]
user_setup: []
must_haves:
  truths:
    - "An admin visiting /admin/skills sees a table of the 24 competencies with per-competency seeker (supply) and job (demand) counts"
    - "The AdminSidebar has a Skills/Analytics nav item linking to /admin/skills"
    - "The manually-maintained AdminListRpc union in AdminTable.tsx includes both new RPC names so the page compiles without an `as never` cast on the rpc prop"
  artifacts:
    - path: "src/pages/admin/AdminSkillCoverage.tsx"
      provides: "Admin skill-coverage page rendering admin_skill_coverage via AdminTable"
      contains: "admin_skill_coverage"
      min_lines: 30
    - path: "src/components/admin/AdminTable.tsx"
      provides: "AdminListRpc union extended with the two Phase 23 RPCs"
      contains: "admin_skill_coverage"
    - path: "src/components/layout/AdminSidebar.tsx"
      provides: "Skills nav item in adminItems"
      contains: "/admin/skills"
    - path: "src/main.tsx"
      provides: "/admin/skills route wired through ProtectedRoute + AdminLayout"
      contains: "AdminSkillCoverage"
  key_links:
    - from: "src/pages/admin/AdminSkillCoverage.tsx"
      to: "public.admin_skill_coverage RPC"
      via: "AdminTable rpc=\"admin_skill_coverage\""
      pattern: "rpc=\"admin_skill_coverage\""
    - from: "src/main.tsx"
      to: "src/pages/admin/AdminSkillCoverage.tsx"
      via: "import + /admin/skills route element"
      pattern: "AdminSkillCoverage"
---

<objective>
Build the admin-facing half of the analytics surface: a `/admin/skills` page that renders the `admin_skill_coverage` RPC (created in plan 23-01) through the existing AdminTable, plus the sidebar nav item, route registration, and the AdminListRpc union extension. This is the consumer side of ANLY-01 (supply vs demand) and ANLY-02 (per-competency usage counts); ANLY-03's read RPC + table already exist in the DB from 23-01, and this plan makes its RPC name type-valid in AdminTable for future use.

Purpose: ANLY-01/ANLY-02 user-visible delivery + ANLY-03 type wiring. Depends on 23-01 having applied the migration (the RPCs must exist in the live DB for the page to return data).
Output: `AdminSkillCoverage.tsx`, extended `AdminTable.tsx` union, new `AdminSidebar.tsx` item, `/admin/skills` route in `main.tsx`. Tests `admin-skill-coverage.test.tsx` and `admin-skills-sidebar.test.ts` flip GREEN.
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

<interfaces>
<!-- Exact contracts the executor must replicate. Do not re-derive — use these directly. -->

admin_skill_coverage RPC return shape (from 23-01 migration): `{ rows: SkillCoverageRow[], total: number }` where each row is:
```typescript
interface SkillCoverageRow extends Record<string, unknown> {
  skill_id: string
  name: string
  category: string
  discipline: string
  seeker_count: number   // supply
  job_count: number      // demand
}
```

AdminListRpc union to extend (src/components/admin/AdminTable.tsx:7-12) — manually maintained, NOT generated:
```typescript
type AdminListRpc =
  | 'admin_list_employers'
  | 'admin_list_seekers'
  | 'admin_list_jobs'
  | 'admin_list_placements'
  | 'admin_list_document_queue'
```
AdminTable calls `supabase.rpc(rpc as never, args as never)` with args `{ p_limit, p_offset }` (and `p_search` only when `searchable` is true). `admin_skill_coverage()` takes no params; AdminTable will still pass `{ p_limit, p_offset }` — the RPC ignores unknown args because plpgsql functions with defaults accept zero positional args from PostgREST when called by name with a json body of unmatched keys. To be safe and match the no-pagination intent, set `pageSize` high (e.g. 100) so a single page renders all 24 rows; `searchable={false}`.

AdminTable consumption pattern (from AdminDocumentsQueue.tsx:167-180) — copy this shape:
```tsx
<AdminTable<SkillCoverageRow>
  rpc="admin_skill_coverage"
  searchable={false}
  pageSize={100}
  emptyHeading="No competencies found"
  emptyBody="The taxonomy has not been seeded yet."
  errorCopy="Failed to load skill coverage. Refresh the page."
  columns={[
    { key: 'category', label: 'Category' },
    { key: 'name', label: 'Competency' },
    { key: 'seeker_count', label: 'Seekers (supply)' },
    { key: 'job_count', label: 'Jobs (demand)' },
  ]}
  renderRow={(row) => ( /* <td>…</td> cells, mirror AdminDocumentsQueue */ )}
/>
```
Page header pattern (AdminDocumentsQueue.tsx:155-165): `<h1>` with `text-[20px] font-semibold` + a muted `<p>` intro. renderRow returns a `<>` fragment of `<td className="px-4 py-3">` cells; reuse CATEGORY_LABELS-style display for the category cell or render the raw slug — your discretion, but make the seeker_count and job_count cells render the integer values.

AdminSidebar adminItems array (src/components/layout/AdminSidebar.tsx:19-26) — append one NavItem. Import a lucide icon (e.g. `BarChart2`) alongside the existing icon imports (lines 2-10).

main.tsx route pattern (main.tsx:281-289, the /admin/documents block) — copy verbatim, swapping path to `/admin/skills`, element to `<AdminSkillCoverage />`. Add the import next to the other admin imports (line 40).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend AdminListRpc union + add AdminSidebar Skills item + /admin/skills route</name>
  <files>src/components/admin/AdminTable.tsx, src/components/layout/AdminSidebar.tsx, src/main.tsx</files>
  <read_first>
    - src/components/admin/AdminTable.tsx lines 7-12 (the AdminListRpc union — manually maintained, Research Pitfall 4)
    - src/components/layout/AdminSidebar.tsx lines 2-26 (icon imports + adminItems array)
    - src/main.tsx lines 40 + 281-289 (admin import block + /admin/documents route to mirror)
    - tests/admin-skills-sidebar.test.ts (the RED assertions to satisfy)
  </read_first>
  <behavior>
    tests/admin-skills-sidebar.test.ts must flip GREEN: AdminSidebar source contains `to: '/admin/skills'` and a 'Skills' or 'Analytics' label; AdminTable source contains `'admin_skill_coverage'` and `'admin_list_analytics_events'` in the union.
  </behavior>
  <action>
    (A) In `src/components/admin/AdminTable.tsx`, extend the `AdminListRpc` union (Research Pitfall 4 — this union is manually maintained, not generated, so the new RPCs must be added by hand or `rpc="admin_skill_coverage"` is a type error). Add both lines:
    ```typescript
    | 'admin_skill_coverage'
    | 'admin_list_analytics_events'
    ```
    Both are added now even though only `admin_skill_coverage` is consumed this phase — `admin_list_analytics_events` is the ANLY-03 read RPC, type-wired ahead of its future consumer per the test contract.

    (B) In `src/components/layout/AdminSidebar.tsx`, import a lucide icon (add `BarChart2` to the existing `lucide-react` import block) and append to `adminItems`:
    ```typescript
    { to: '/admin/skills', label: 'Skills', icon: BarChart2 },
    ```

    (C) In `src/main.tsx`, add `import { AdminSkillCoverage } from '@/pages/admin/AdminSkillCoverage'` next to the other admin page imports (after the AdminDocumentsQueue import line 40), and append a route block mirroring the `/admin/documents` block (lines 281-289):
    ```tsx
    {
      path: '/admin/skills',
      element: (
        <ProtectedRoute requiredRole="admin">
          <AdminLayout>
            <AdminSkillCoverage />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    ```
    (The AdminSkillCoverage component is created in Task 2 of this plan; if Task 2 runs first the import resolves, otherwise create them together — they are the same plan.)
  </action>
  <verify>
    <automated>npx vitest run tests/admin-skills-sidebar.test.ts</automated>
    Expect GREEN.
  </verify>
  <acceptance_criteria>
    - grep: `src/components/admin/AdminTable.tsx` contains `'admin_skill_coverage'` AND `'admin_list_analytics_events'`
    - grep: `src/components/layout/AdminSidebar.tsx` contains `to: '/admin/skills'` and `BarChart2`
    - grep: `src/main.tsx` contains `AdminSkillCoverage` and `path: '/admin/skills'`
    - `npx vitest run tests/admin-skills-sidebar.test.ts` is GREEN
  </acceptance_criteria>
  <done>AdminListRpc union carries both Phase 23 RPC names, the sidebar has a Skills nav item, and /admin/skills is a registered admin-gated route. The sidebar/union guard test is GREEN.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build AdminSkillCoverage page</name>
  <files>src/pages/admin/AdminSkillCoverage.tsx</files>
  <read_first>
    - src/pages/admin/AdminDocumentsQueue.tsx (full page shape: header, AdminTable usage, renderRow td cells, Record<string,unknown> row type)
    - src/components/admin/AdminTable.tsx (props contract: rpc, searchable, pageSize, columns, renderRow, emptyHeading/Body, errorCopy)
    - tests/admin-skill-coverage.test.tsx (the RED RTL assertions — the mock returns 2 rows incl. 'Dairy cattle management' with seeker_count 3 / job_count 1; the page must render the name + the supply/demand values + 'Seekers'/'Jobs' headers)
  </read_first>
  <behavior>
    tests/admin-skill-coverage.test.tsx must flip GREEN: mounting AdminSkillCoverage with a mocked supabase.rpc('admin_skill_coverage') returning `{ rows: [...], total: 2 }` renders 'Dairy cattle management', the supply value 3 and demand value 1, and 'Seekers'/'Jobs' (case-insensitive) column headers; rpcMock was called with 'admin_skill_coverage'.
  </behavior>
  <action>
    Create `src/pages/admin/AdminSkillCoverage.tsx` exporting a named `AdminSkillCoverage` component (named export — the test does `const { AdminSkillCoverage } = await import('@/pages/admin/AdminSkillCoverage')`). Mirror AdminDocumentsQueue.tsx structure:
    - Declare `interface SkillCoverageRow extends Record<string, unknown> { skill_id: string; name: string; category: string; discipline: string; seeker_count: number; job_count: number }`.
    - Render a page header `<h1>` "Skill Coverage" + a muted `<p>` intro explaining supply (seekers holding each competency) vs demand (jobs requiring each).
    - Render `<AdminTable<SkillCoverageRow> rpc="admin_skill_coverage" searchable={false} pageSize={100} ...>` with the four columns from the interfaces block: Category, Competency, `Seekers (supply)`, `Jobs (demand)`. The header labels MUST include the words "Seekers" and "Jobs" so the test's `getByText(/seekers/i)` / `getByText(/jobs/i)` pass.
    - `renderRow={(row) => ( <><td className="px-4 py-3">{categoryDisplay}</td><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.seeker_count}</td><td className="px-4 py-3">{row.job_count}</td></> )}` — render the integer counts directly so `getByText('3')` and `getByText('1')` resolve. For the category cell you may map the slug to a friendly label inline or render the raw slug — your discretion.
    - Empty/error copy per the interfaces block. No mutations, no row click handler needed (read-only view).

    Do NOT add pagination logic — 24 rows fit one page at pageSize 100.
  </action>
  <verify>
    <automated>npx vitest run tests/admin-skill-coverage.test.tsx</automated>
    Expect GREEN.
  </verify>
  <acceptance_criteria>
    - File `src/pages/admin/AdminSkillCoverage.tsx` exists with a named export `AdminSkillCoverage`
    - grep: contains `rpc="admin_skill_coverage"`, `seeker_count`, `job_count`, `Seekers`, `Jobs`
    - `npx vitest run tests/admin-skill-coverage.test.tsx` is GREEN
    - `npx vitest run tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` both GREEN together (page import resolves, route + union compile)
  </acceptance_criteria>
  <done>AdminSkillCoverage renders the competency supply/demand table via admin_skill_coverage; the RTL render test is GREEN and the page is reachable at /admin/skills.</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts` GREEN.
- `npx vitest run` (full suite) GREEN — no regressions from the union/route changes.
- Manual (optional, in execute-phase verification): visit /admin/skills as admin against the live DB (migration applied in 23-01) — the 24 competencies render with their real seeker/job counts.
</verification>

<success_criteria>
- ANLY-01 + ANLY-02 delivered: an admin sees per-competency supply (seeker_count) and demand (job_count) at /admin/skills.
- ANLY-03 type-wired: admin_list_analytics_events is in the AdminListRpc union, ready for a future consumer; the analytics_events table + read RPC already live in the DB from 23-01.
- All four Phase 23 Wave 0 guard tests are GREEN, full suite passes.
</success_criteria>

<output>
After completion, create `.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-02-SUMMARY.md`.
</output>
