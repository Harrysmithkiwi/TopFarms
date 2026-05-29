# Phase 23: Skills Taxonomy Consolidation + Admin Analytics — Research

**Researched:** 2026-05-29
**Domain:** Supabase PostgreSQL schema migration + React/Vite admin UI extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Taxonomy final count — 24 competencies** across 6 categories (Livestock 5, Cropping & agronomy 4, Machinery & equipment 4, Farm operations & infrastructure 4, Management & business 4, Cross-cutting 3). Exact names are canonical in CONTEXT.md §1.
2. **Keep all existing metadata** — `seeker_skills.proficiency` (basic/intermediate/advanced), `seeker_skills.willing_to_learn`, `job_skills.requirement_level` (required/preferred).
3. **Schema axis** — drop `skills.sector` CHECK constraint, make `category` primary controlled axis (6 v2.1 categories), add `discipline` column DEFAULT 'agriculture' (no CHECK — future verticals add freely).
4. **Admin analytics surface** — extend existing `/admin/*` pattern. New AdminSidebar item + admin page + SECURITY DEFINER RPCs. ANLY-01 = `admin_skill_coverage` (supply vs demand per competency). ANLY-02 = taxonomy usage (seeker + job counts per competency). ANLY-03 = `analytics_events` table (event_type, entity_id, metadata jsonb, created_at) + admin-only read RLS + event-type naming convention.
5. **Migration data handling** — clear 12 test `seeker_skills` rows; `job_skills` already empty (0 rows); recompute 3 `match_scores` rows. Document old→new mapping in SUMMARY.
6. **Migration application path** — Studio SQL Editor + registry-backfill per CLAUDE §2/§6. DO NOT use `supabase db push`. Sequence: `034_*`.

### Claude's Discretion

- Exact `category` enforcement mechanism (CHECK vs Postgres enum vs lookup table).
- Exact admin RPC signatures + AdminTable column layouts.
- `analytics_events` column details beyond the core 4 + index strategy.
- Old→new skill mapping table format (for SUMMARY traceability doc).
- Whether category labels live in a `skill_categories` lookup table or inline.

### Deferred Ideas (OUT OF SCOPE)

- Competency #25 "Customer & supplier relations" — deferred from the 24-set.
- Full analytics dashboards (gap-prompt funnels, directory-view trends, lead conversion) — Phase 24/25.
- Credential UI (DairyNZ levels, GROWSAFE, expiry alerts) — Phase 26. Phase 23 only removes qualification rows from the competency taxonomy.
- Skills-gap surfacing — Phase 24.
- Future verticals (horticulture/viticulture) — v3.0+.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TAX-01 | Drop `skills.sector` CHECK (`dairy`/`sheep_beef`/`both`); organise by 6 v2.1 categories | §Schema: 001 defines the CHECK; §Migration Pattern confirms ALTER TABLE DROP CONSTRAINT + ADD COLUMN discipline approach |
| TAX-02 | `skills` master holds ~24 broad ag competencies across 6 categories, replacing ~40 dairy-heavy skills | §Current Seed confirms 40 rows in 003; §Target Taxonomy lists canonical 24 competency names |
| TAX-03 | Existing seeker skill refs, job skill tags, match scores migrated; no orphaned refs; documented old→new mapping | §Data Migration: 12 seeker_skills, 0 job_skills, 3 match_scores — all clearable; mapping classes documented |
| TAX-04 | Seeker can self-assess in onboarding; employer can tag job — both UIs work against new taxonomy | §UI Re-point: SkillsPicker currently filters `.or('sector.eq.${sector},sector.eq.both')` — must be redesigned to query by category/discipline |
| TAX-05 | DairyNZ qualification levels removed from competency taxonomy + preserved as credential data for Phase 26 | §Current Seed: 5 `category='qualification'` rows identified; excluded from the 24-competency INSERT |
| ANLY-01 | Admin view: supply (seeker count) vs demand (job count) per competency | §Admin RPC Pattern: `_admin_gate()` + SECURITY DEFINER + GRANT EXECUTE to authenticated; `admin_skill_coverage` modelled on `admin_list_*` pattern |
| ANLY-02 | Admin view: per-competency usage counts (seekers + jobs referencing each) | §Admin RPC Pattern: same RPC or sibling; AdminTable rendering |
| ANLY-03 | Reusable analytics event-logging foundation (generic table + admin read surface + naming convention) | §analytics_events table design; admin-only RLS; minimal surface — writes by future phases |
</phase_requirements>

---

## Summary

Phase 23 is a brownfield schema migration + admin UI extension on an established Supabase + React/Vite SPA. The migration work (`034_*`) is the critical-path item: it must drop the `skills.sector` CHECK constraint (which hard-wires dairy/sheep-beef), DELETE all 40 current skill rows (which reference that sector column), ADD the `discipline` column, then INSERT 24 new competency rows using a purely `category`-based vocabulary. The data side is low-risk — production data is entirely test data (12 seeker_skills rows, 0 job_skills rows, 3 match_scores rows).

The UI work has two parts. First, `SkillsPicker.tsx` currently fetches skills with a sector filter (`.or('sector.eq.${sector},sector.eq.both')`). That filter must be replaced to work against the new schema — since `sector` is being dropped, the query should simply fetch all skills and group by `category`. The sector prop is no longer meaningful; both `SeekerStep4Skills` and `JobStep3Skills` pass it, so the prop signature changes. Second, the admin analytics surface follows the established Phase 21 pattern exactly: new SECURITY DEFINER RPCs in `034_*` (or a companion migration), a new `AdminSidebar` item, and a new admin page consuming `AdminTable`.

The `analytics_events` table is the most open-ended deliverable (ANLY-03). The approach is deliberately minimal: create the table with RLS (admin-only read, authenticated write or write-via-RPC), add an `admin_list_analytics_events` RPC, and document event-type naming conventions. Full dashboards for Phase 24/25 events are explicitly deferred.

**Primary recommendation:** Deliver migration `034_*` as a single Studio-applied SQL file (BEGIN/COMMIT wrapped with a DO $verify$ post-state check). All UI changes (SkillsPicker re-point, AdminSidebar + page, RPC extension to AdminTable) are straightforward brownfield extensions of established patterns.

---

## Standard Stack

### Core (already in use — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgreSQL | cloud | Skills schema, RLS, RPC | Existing BaaS — all DB work stays here |
| @supabase/supabase-js | 2.49+ | Client queries and RPC calls | Existing client singleton in `src/lib/supabase.ts` |
| React + Vite | 19 / 6 | Admin page + SkillsPicker update | Existing SPA |
| Tailwind CSS v4 | v4 | Styling all new components | Existing utility CSS |
| lucide-react | current | Icons (new sidebar item) | Used in all existing admin sidebar items |
| sonner | current | Toast feedback in admin page | Used in all existing admin pages |

### No New Dependencies Required

All work is accomplished with existing stack. No new npm packages needed.

---

## Architecture Patterns

### Pattern 1: Migration 034 Structure (Studio-applied)

**What:** Single `034_*.sql` file, wrapped in `BEGIN; ... COMMIT;` with a `DO $verify$` post-state assertion block.

**Template (from 033_admin_doc_rpcs.sql + 018_* mutation pattern):**

```sql
-- 034_skills_taxonomy_v2.sql
BEGIN;

-- Section 1: Schema alterations
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_sector_check;
ALTER TABLE public.skills DROP COLUMN IF EXISTS sector;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'agriculture';
-- Category enforcement: CHECK constraint (simplest, self-documenting, low-maintenance)
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_category_check;
ALTER TABLE public.skills ADD CONSTRAINT skills_category_check
  CHECK (category IN (
    'livestock',
    'cropping_agronomy',
    'machinery_equipment',
    'farm_operations_infrastructure',
    'management_business',
    'cross_cutting'
  ));

-- Section 2: Clear existing data
DELETE FROM public.seeker_skills;   -- 12 test rows
DELETE FROM public.match_scores;    -- 3 derived rows
DELETE FROM public.skills;          -- 40 dairy-heavy rows

-- Section 3: Insert 24 new competencies
INSERT INTO public.skills (name, category, discipline) VALUES
  -- Livestock (5)
  ('Dairy cattle management', 'livestock', 'agriculture'),
  ...

-- Section 4: Admin RPCs (admin_skill_coverage, admin_taxonomy_usage)
CREATE OR REPLACE FUNCTION public.admin_skill_coverage() ...

-- Section 5: analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events ( ... );

-- Section 6: DO $verify$ post-state assertion
DO $verify$
BEGIN
  -- Assert 24 skills, 0 old-sector rows, RPCs exist
  ...
END
$verify$;

COMMIT;
```

**When to use:** All DB changes for Phase 23, applied via Supabase Studio SQL Editor.

**Registry backfill (after Studio apply):**

```sql
-- Run in Studio SQL Editor after confirming migration applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('034', '034_skills_taxonomy_v2', ARRAY['...'])
ON CONFLICT (version) DO NOTHING;
```

This matches the established pattern used for migrations 023-033 (confirmed in MILESTONE-AUDIT carryforward + STATE.md Phase 21 entries).

---

### Pattern 2: SkillsPicker Re-point (TAX-04)

**What:** `SkillsPicker.tsx` currently queries skills with a sector filter. After migration, `sector` column is gone; the component must query all `discipline='agriculture'` skills and group by `category`.

**Current query (broken after 034):**
```typescript
// src/components/ui/SkillsPicker.tsx:56-59
const { data, error: fetchError } = await supabase
  .from('skills')
  .select('*')
  .or(`sector.eq.${sector},sector.eq.both`)  // BROKEN — sector column removed
  .order('category')
  .order('name')
```

**Replacement query:**
```typescript
const { data, error: fetchError } = await supabase
  .from('skills')
  .select('*')
  .eq('discipline', 'agriculture')  // or omit filter — all current skills are agriculture
  .order('category')
  .order('name')
```

**Props change:** The `sector: 'dairy' | 'sheep_beef'` prop is no longer needed for the query. Decision: remove it from the `SkillsPicker` interface (since the new taxonomy is ag-broad and doesn't split by dairy vs sheep-beef). Update callers:
- `SeekerStep4Skills.tsx` — remove `getSector()` helper + `sector` prop pass
- `JobStep3Skills.tsx` — remove `sector as 'dairy' | 'sheep_beef'` cast + prop pass

Category grouping stays as-is — `grouped` reducer on `skill.category` still works; the 6 new categories produce 6 groups.

---

### Pattern 3: Admin RPC — `admin_skill_coverage`

**What:** SECURITY DEFINER RPC returning supply (seeker_skills count) vs demand (job_skills count) per competency. Follows the exact `_admin_gate()` + `jsonb_build_object` + `GRANT EXECUTE TO authenticated` pattern from 023/033.

**Canonical template (from 023_admin_rpcs.sql):**
```sql
CREATE OR REPLACE FUNCTION public.admin_skill_coverage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY s.category, s.name), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'skill_id',       s.id,
      'name',           s.name,
      'category',       s.category,
      'discipline',     s.discipline,
      'seeker_count',   COUNT(DISTINCT ss.seeker_id),
      'job_count',      COUNT(DISTINCT js.job_id)
    ) AS row_obj
    FROM public.skills s
    LEFT JOIN public.seeker_skills ss ON ss.skill_id = s.id
    LEFT JOIN public.job_skills    js ON js.skill_id = s.id
    WHERE s.discipline = 'agriculture'
    GROUP BY s.id, s.name, s.category, s.discipline
    ORDER BY s.category, s.name
  ) sub;

  RETURN jsonb_build_object('rows', v_rows, 'total', jsonb_array_length(v_rows));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_skill_coverage() TO authenticated;
```

ANLY-01 (supply vs demand gap) and ANLY-02 (usage counts) are served by this single RPC — seeker_count is supply, job_count is demand, both counts are usage. No need for a separate RPC unless the planner splits them.

---

### Pattern 4: `analytics_events` Table (ANLY-03)

**What:** Generic event-logging table. Minimal now; writes come from Phase 24/25.

```sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,         -- naming convention: '<domain>.<action>' e.g. 'skill_gap.viewed'
  entity_id   uuid,                  -- nullable — some events are platform-level not entity-level
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS analytics_events_type_idx  ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_entity_idx ON public.analytics_events (entity_id, created_at DESC) WHERE entity_id IS NOT NULL;

-- RLS: admin read-only; no direct write from anon/seeker/employer — write via RPC
CREATE POLICY "analytics_events: admin read"
  ON public.analytics_events FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');
```

**Admin read RPC:**
```sql
CREATE OR REPLACE FUNCTION public.admin_list_analytics_events(
  p_event_type text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();
  -- paginated read with optional event_type filter
  ...
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_analytics_events(text, int, int) TO authenticated;
```

**Event-type naming convention (document in migration comment):**
`'<domain>.<action>'` — e.g. `skill_gap.viewed`, `directory.entry_viewed`, `gap_prompt.clicked`. Domain maps to the phase that generates it (skill_gap = Phase 24, directory = Phase 25).

---

### Pattern 5: AdminSidebar + Admin Page Extension

**What:** Add a new `NavItem` to `AdminSidebar.tsx` and create a new admin page component at `src/pages/admin/AdminSkillCoverage.tsx`.

**AdminSidebar addition (src/components/layout/AdminSidebar.tsx):**
```typescript
import { BarChart2 } from 'lucide-react'  // or ChartBar, TrendingUp

const adminItems: NavItem[] = [
  { to: '/admin', label: 'Daily Briefing', icon: LayoutDashboard },
  { to: '/admin/employers', label: 'Employers', icon: Building2 },
  { to: '/admin/seekers', label: 'Seekers', icon: Users },
  { to: '/admin/documents', label: 'Documents', icon: FileText },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/placements', label: 'Placement Pipeline', icon: DollarSign },
  { to: '/admin/skills', label: 'Skills', icon: BarChart2 },  // NEW
]
```

**AdminTable extension (src/components/admin/AdminTable.tsx):**
```typescript
type AdminListRpc =
  | 'admin_list_employers'
  | 'admin_list_seekers'
  | 'admin_list_jobs'
  | 'admin_list_placements'
  | 'admin_list_document_queue'
  | 'admin_skill_coverage'         // NEW
  | 'admin_list_analytics_events'  // NEW
```

**Route addition (src/main.tsx):**
```typescript
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

**Page shape (src/pages/admin/AdminSkillCoverage.tsx):**
Renders `<AdminTable rpc="admin_skill_coverage" searchable={false} ...>` with columns: Category, Competency, Seekers (supply), Jobs (demand). No pagination needed at launch (24 rows max).

---

### Recommended Project Structure Changes

```
supabase/migrations/
└── 034_skills_taxonomy_v2.sql      -- schema + reseed + RPCs + analytics_events

src/
├── components/
│   ├── admin/
│   │   └── AdminTable.tsx           -- extend AdminListRpc union (2 entries)
│   ├── layout/
│   │   └── AdminSidebar.tsx         -- add Skills nav item
│   └── ui/
│       └── SkillsPicker.tsx         -- remove sector prop; query by discipline
├── pages/
│   ├── admin/
│   │   └── AdminSkillCoverage.tsx   -- NEW: supply/demand view
│   ├── jobs/steps/
│   │   └── JobStep3Skills.tsx       -- remove sector prop pass to SkillsPicker
│   └── onboarding/steps/
│       └── SeekerStep4Skills.tsx    -- remove getSector() + sector prop pass
└── main.tsx                         -- add /admin/skills route
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin auth gate | Custom middleware | `_admin_gate()` SECURITY DEFINER helper (023) | Single source of truth; proven pattern |
| Supply/demand aggregation | Client-side JOIN | SECURITY DEFINER RPC | Data never leaves Postgres for admin-only aggregates |
| Skill category enforcement | Application-layer validation | Postgres CHECK constraint on `category` | Enforced at DB level regardless of client |
| Event log writes from future phases | Direct table insert | Write-via-RPC | RLS blocks direct table INSERT; RPC can validate/sanitize |
| SkillsPicker category grouping | New grouping library | Existing `reduce` pattern in SkillsPicker | Already groups by `skill.category` — just works with new values |

---

## Common Pitfalls

### Pitfall 1: Forgetting SkillsPicker's `sector` filter after migration
**What goes wrong:** `SkillsPicker` fetches `.or('sector.eq.dairy,sector.eq.both')` — after `034_*` drops the `sector` column, this query returns a PostgREST 400 error and the picker shows "Failed to load skills."
**Why it happens:** The component prop signature still accepts `sector: 'dairy' | 'sheep_beef'` and passes it to a column that no longer exists.
**How to avoid:** The SkillsPicker re-point is a Wave 0 or Wave 1 task alongside the migration — not a later wave. Treat it as load-bearing for TAX-04.
**Warning signs:** Skills picker renders empty with error state after migration applies.

### Pitfall 2: `seeker_skills` FK violation if not cleared before DELETE FROM skills
**What goes wrong:** `DELETE FROM public.skills` fails with FK constraint violation because `seeker_skills.skill_id` references `public.skills(id)` ON DELETE CASCADE — but only if you run DELETE on skills rows that have referencing seeker_skills rows first.
**Why it happens:** `ON DELETE CASCADE` handles it only if the parent delete runs before the child delete (cascade fires automatically). But if you explicitly `DELETE FROM skills` before clearing seeker_skills, the cascade fires correctly. Ordering: clear `seeker_skills` → clear `match_scores` → clear `skills` is the safest explicit order.
**How to avoid:** Explicit ordering in the migration: DELETE seeker_skills, then match_scores, then skills. The CASCADE would handle it anyway, but explicit order is clearer and matches the CONTEXT.md plan.

### Pitfall 3: `match_scores` trigger fires on reseed and fails on empty job/seeker cross
**What goes wrong:** The seeker profile trigger `trigger_recompute_seeker_scores` fires on seeker_profiles UPDATE, recomputing match_scores — but after the reseed, seeker_skills are empty. This produces zero-score match_scores, not an error. However the 3 existing match_scores (from test seekers × 1 active job) become stale and reference old skill data.
**Why it happens:** match_scores rows are pre-computed and stored. After clearing seeker_skills, the scores are stale (skills dimension = 0).
**How to avoid:** Explicitly `DELETE FROM public.match_scores` in the migration before clearing skills. After seeding, the nightly cron or manual trigger will recompute fresh scores.

### Pitfall 4: `admin_skill_coverage` not in `AdminListRpc` union
**What goes wrong:** `AdminTable` has `rpc: AdminListRpc` typed as a literal union. If `admin_skill_coverage` is not added to the union, TypeScript rejects `rpc="admin_skill_coverage"` at the call site.
**Why it happens:** The Phase 20-05 workaround uses `as never` for Studio-applied RPCs to bypass the generated-types union. The `AdminListRpc` type is manually maintained in AdminTable.tsx.
**How to avoid:** When writing `AdminSkillCoverage.tsx`, extend the `AdminListRpc` union in `AdminTable.tsx` to include `'admin_skill_coverage'` and `'admin_list_analytics_events'`. This is a minor but required change.

### Pitfall 5: `discipline` column DEFAULT not propagating to existing skills query
**What goes wrong:** After migration, a query `SELECT * FROM skills` returns rows where `discipline` is NULL for any skills that were inserted in a transaction before the column's DEFAULT was set.
**Why it happens:** Since the migration DELETEs all old skills and INSERTs fresh ones, there are no pre-existing rows. The DEFAULT 'agriculture' applies on INSERT. This pitfall only matters if the INSERT list accidentally omits the `discipline` value — the DEFAULT saves it.
**How to avoid:** Always specify `discipline = 'agriculture'` explicitly in the INSERT VALUES list rather than relying on the DEFAULT, so the intent is unambiguous and verifiable in the DO $verify$ block.

### Pitfall 6: Category CHECK constraint vs. existing `category` values in seeker_skills
**What goes wrong:** The CHECK constraint on `skills.category` enforces the 6 new values. But the `seeker_skills` and `job_skills` tables reference `skills.id` via FK, not `skills.category` directly — so no constraint on `seeker_skills` is needed. However, if the `category` CHECK does not include the old values (milking, livestock, shearing, etc.), any INSERT that accidentally uses old names fails.
**Why it happens:** Typos in category names during INSERT.
**How to avoid:** Use the DO $verify$ block to COUNT(*) per expected category and assert 24 total rows.

### Pitfall 7: JobStep3Skills still has dairy-specific fields after taxonomy change
**What goes wrong:** `JobStep3Skills.tsx` has `minExperience` (labeled "Minimum dairy experience"), `QUALIFICATION_OPTIONS` (DairyNZ levels), and other dairy-specific UI fields that no longer match the ag-broad taxonomy. These are NOT part of Phase 23 scope (they're job-level details, not skills taxonomy), but they're in the same file as the SkillsPicker re-point.
**Why it happens:** The file mixes skills taxonomy UI with other job-level fields.
**How to avoid:** Phase 23 only re-points the SkillsPicker prop (removing `sector`). Leave the dairy-specific non-skills fields untouched — they're Phase 24+ scope.

---

## Code Examples

### Current skills table definition (source: 001_initial_schema.sql:94-99)
```sql
CREATE TABLE public.skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL,
  sector   text NOT NULL CHECK (sector IN ('dairy', 'sheep_beef', 'both'))
);
```

### Current skills seed (source: 003_skills_seed.sql) — 40 rows
- 7 milking skills (category='milking', sector='dairy')
- 6 dairy livestock skills (category='livestock', sector='dairy')
- 5 DairyNZ Level rows (category='qualification', sector='dairy') — TAX-05: remove
- 9 sheep/beef livestock + shearing + mustering (sector='sheep_beef')
- 8 machinery + infrastructure (sector='both')
- 5 management (sector='both')

### Target skills CHECK mechanism: inline CHECK (Claude's discretion resolved)
**Recommendation:** Inline CHECK constraint on `skills.category` column. Rationale:
- **Lowest maintenance** — adding a new category means `ALTER TABLE skills DROP CONSTRAINT ... ADD CONSTRAINT` in the next migration. No lookup table to seed.
- **Self-documenting** — the allowed values are visible in the migration file itself.
- **Precedent** — the project uses inline CHECK throughout (requirement_level, proficiency, role, status, sector, contract_type).
- **Postgres enum pitfall avoided** — `ALTER TYPE` to add enum values requires exclusive lock and cannot be transactional in Supabase-hosted Postgres without care.
- **Lookup table overhead not justified** — category values are admin-controlled (not user-entered), and there are only 6 of them.

### Admin RPC gate pattern (source: 023_admin_rpcs.sql:77-93)
```sql
CREATE OR REPLACE FUNCTION public._admin_gate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
END;
$$;
-- Not granted to anyone — only called from inside other SECURITY DEFINER RPCs.
```

### AdminTable consumption pattern (source: AdminDocumentsQueue.tsx:167-170)
```typescript
<AdminTable<SkillCoverageRow>
  rpc="admin_skill_coverage"
  searchable={false}
  emptyHeading="No skills found"
  emptyBody="The taxonomy has not been seeded yet."
  errorCopy="Failed to load skill coverage. Refresh the page."
  columns={[
    { key: 'category', label: 'Category' },
    { key: 'name', label: 'Competency' },
    { key: 'seeker_count', label: 'Seekers (supply)' },
    { key: 'job_count', label: 'Jobs (demand)' },
  ]}
  renderRow={(row) => ( ... )}
/>
```

### Studio-applied migration registry backfill (source: MILESTONE-AUDIT §023-033 pattern)
After applying `034_*` in Studio SQL Editor, run:
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '034',
  '034_skills_taxonomy_v2',
  ARRAY['-- see migration file']
)
ON CONFLICT (version) DO NOTHING;
```
Note: Studio-applied migrations don't auto-write this row. Verify via MCP `list_migrations` or `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5`.

---

## Old → New Mapping (for SUMMARY traceability)

| Class | Old Skills | New Competency |
|-------|-----------|----------------|
| Consolidate | Rotary milking, Herringbone milking, AMS/robotic milking, Swing-over milking, Milk quality and hygiene, Teat scoring and mastitis detection, Cluster attachment and post-dip, Herd health monitoring, Calving assistance, AI (artificial insemination), Body condition scoring, Calf rearing, Feeding systems management | Dairy cattle management |
| Consolidate | Mustering (on foot), Mustering (motorbike), Mustering (helicopter coordination) | Mustering & stockmanship |
| Consolidate | Fencing (post and wire), Fencing (electric) | Fencing & yard construction |
| Consolidate | Tractor operation (general), Tractor (loader) | Tractor operation |
| Consolidate | ATV/quad bike, Motorbike (farm) | Farm vehicle handling |
| Consolidate | Lamb marking and docking, Shearing (operator), Shearing (shed hand), Stock handling and yards, Drench and vaccination, Condition scoring and drafting | Sheep & lamb handling + Animal health & husbandry + Mustering & stockmanship |
| Consolidate | Irrigation systems, Effluent system management | Irrigation & water systems + General farm maintenance |
| Consolidate | Staff supervision | Staff supervision & leadership |
| Consolidate | Feed budgeting, Farm financial basics | Farm planning & operations management + Farm financial management |
| Consolidate | Health and safety compliance, Environmental compliance | Health & safety competency + Compliance & record-keeping |
| Net-new | (none) | Arable & grain production, Vegetable & root crop production, Pasture & forage management, Agronomy & soil management, Heavy machinery & harvest equipment, Spraying & application equipment, Fuel & chemical handling, Beef cattle management, Farm planning & operations management, Sustainable & regenerative practices, Data & farm tech literacy |
| Relocate (Phase 26) | DairyNZ Level 1-5 (category='qualification') | Removed from competency taxonomy; preserved as Phase 26 credential data |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dairy-scoped skills (sector='dairy'/'sheep_beef'/'both') | Ag-broad competencies by category + discipline | Phase 23 (now) | Enables gap analysis and training directory across all NZ ag sectors |
| No event logging | analytics_events foundation | Phase 23 (now) | Future phases (24/25) can instrument without new infra |

**Deprecated/outdated after migration:**
- `skills.sector` column — removed entirely; do not reference in new queries
- `SkillsPicker` `sector` prop — removed; grouping is now by `category` only
- The 40 seed skills in `003_skills_seed.sql` — superseded by 024-competency reseed in `034_*`

---

## Validation Architecture

Config check: `workflow.nyquist_validation` key is **absent** from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (mergeConfig from vite.config, vitest.config.ts) |
| Config file | `vitest.config.ts` — jsdom env, globals:true, setupFiles:['./tests/setup.ts'] |
| Quick run command | `npx vitest run --reporter=verbose tests/skills-taxonomy-*.test.ts tests/admin-skill-coverage*.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TAX-01 | `034_*.sql` drops the `skills.sector` CHECK constraint + adds `discipline` column | static-source-guard (read migration file) | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| TAX-02 | Migration inserts exactly 24 skills across 6 categories | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| TAX-03 | Migration includes DELETE FROM seeker_skills + DELETE FROM match_scores before reseed | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| TAX-04 | SkillsPicker no longer uses `.or('sector.eq...')` filter; uses discipline filter instead | static-source-guard (grep source) | `npx vitest run tests/skills-picker-sector-removed.test.ts` | ❌ Wave 0 |
| TAX-04 | AdminSkillCoverage renders with `rpc="admin_skill_coverage"` prop | unit/RTL | `npx vitest run tests/admin-skill-coverage.test.tsx` | ❌ Wave 0 |
| TAX-05 | No `category='qualification'` skills in the 034 INSERT block | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| ANLY-01 | `admin_skill_coverage` RPC name referenced in migration 034 with SECURITY DEFINER | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| ANLY-01 | `admin_skill_coverage` returns `{rows, total}` shape | mock-RPC unit | `npx vitest run tests/admin-skill-coverage.test.tsx` | ❌ Wave 0 |
| ANLY-02 | Each row contains `seeker_count` and `job_count` fields | mock-RPC unit | `npx vitest run tests/admin-skill-coverage.test.tsx` | ❌ Wave 0 |
| ANLY-03 | `analytics_events` table creation SQL is present in migration 034 | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| ANLY-03 | RLS policy "admin read" on analytics_events present in migration | static-source-guard | `npx vitest run tests/skills-taxonomy-migration.test.ts` | ❌ Wave 0 |
| AdminSidebar | `/admin/skills` NavItem present in `adminItems` array | static-source-guard | `npx vitest run tests/admin-skills-sidebar.test.ts` | ❌ Wave 0 |
| AdminTable | `AdminListRpc` union includes `admin_skill_coverage` | static-source-guard | `npx vitest run tests/admin-skills-sidebar.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/skills-taxonomy-migration.test.ts tests/skills-picker-sector-removed.test.ts tests/admin-skill-coverage.test.tsx tests/admin-skills-sidebar.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/skills-taxonomy-migration.test.ts` — static-source-guard for `034_*.sql`: assert no `sector` column reference, 24 INSERT rows, 6 categories, `analytics_events` table creation, admin RPC names, DO $verify$ block present. Pattern: `readFileSync` SQL path + regex assertions (see `tests/fk-indexes.test.ts` exact precedent).
- [ ] `tests/skills-picker-sector-removed.test.ts` — static-source-guard for `SkillsPicker.tsx`: assert the `.or('sector.eq.` string is absent; assert `.eq('discipline',` or `discipline` query is present. Pattern: `readFileSync` on the tsx source.
- [ ] `tests/admin-skill-coverage.test.tsx` — RTL unit test for `AdminSkillCoverage` page: mock `supabase.rpc` returning `{ rows: [...], total: 4 }`, assert competency names render, assert supply/demand columns render. Pattern: `admin-doc-queue.test.tsx`.
- [ ] `tests/admin-skills-sidebar.test.ts` — static-source-guard: assert `adminItems` in `AdminSidebar.tsx` includes `{ to: '/admin/skills', ... }` and `AdminListRpc` in `AdminTable.tsx` includes `'admin_skill_coverage'` and `'admin_list_analytics_events'`.
- [ ] `tests/setup.ts` — already exists; shared fixtures OK.

---

## Open Questions

1. **Does `seeker_skills.willing_to_learn` get surfaced in Phase 23 UI or just preserved?**
   - What we know: CONTEXT.md says keep it (train-pillar hook for Phase 25). Current `SeekerStep4Skills.tsx` does NOT expose `willing_to_learn` in the UI — it's not passed to `SkillsPicker` or saved in the submit handler.
   - What's unclear: Should Phase 23 surface `willing_to_learn` in the SkillsPicker (a "I'd like to learn this" toggle alongside the proficiency dropdown) or just preserve the column for Phase 25?
   - Recommendation: Keep the column but DO NOT surface it in Phase 23 UI. The column already exists; Phase 25 (training directory) is the right home for that toggle. Exposing it now without the training links would be incomplete UX.

2. **Should `sector` be dropped entirely or repurposed as a coarse column?**
   - What we know: CONTEXT.md §3 says drop the CHECK constraint; `discipline` is the forward-compat column. The existing `sector` column had values: 'dairy', 'sheep_beef', 'both'. After migration, the column has no remaining CHECK, but it's still a column.
   - Recommendation: Drop the `sector` column entirely (`ALTER TABLE skills DROP COLUMN sector`). The `discipline` column serves the same intent at the right granularity. Keeping a dead column with no CHECK creates confusion.

3. **SkillsPicker category display labels — use raw DB values or mapped labels?**
   - What we know: The current SkillsPicker renders `category.replace(/_/g, ' ')` for display. The new categories use underscore-separated slugs (e.g. `cropping_agronomy` → "cropping agronomy"). That's readable but not perfectly formatted ("cropping agronomy" vs "Cropping & agronomy").
   - Recommendation: Add a `CATEGORY_LABELS` mapping object in SkillsPicker (e.g. `{ livestock: 'Livestock', cropping_agronomy: 'Cropping & agronomy', ... }`) instead of the `replace(/_/g, ' ')` approach. This is a display-only change, no schema impact.

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/001_initial_schema.sql` — `skills` table definition with sector CHECK, `job_skills` + `seeker_skills` table definitions, FK structure
- `supabase/migrations/003_skills_seed.sql` — confirmed 40 existing seed rows (7 milking, 6 dairy livestock, 5 DairyNZ quals, 9 sheep/beef, 8 machinery/infra, 5 management)
- `supabase/migrations/023_admin_rpcs.sql` — `_admin_gate()` pattern, SECURITY DEFINER RPC template, `GRANT EXECUTE TO authenticated` pattern
- `supabase/migrations/033_admin_doc_rpcs.sql` — Phase 21 precedent for new admin RPCs in a migration: `BEGIN; ... DO $verify$; COMMIT` pattern
- `supabase/migrations/010_match_scores_precompute.sql` — match_scores recompute triggers; confirms `j.sector = ANY(sp.sector_pref)` scoping (this trigger logic is unaffected by removing `skills.sector` — it uses `jobs.sector`, not `skills.sector`)
- `supabase/migrations/012_platform_stats_rpc.sql` — `get_platform_stats()` template for read-only SECURITY DEFINER RPC
- `supabase/migrations/002_rls_policies.sql` — `skills` RLS ("authenticated users can view"), `seeker_skills` RLS, `job_skills` RLS
- `src/components/ui/SkillsPicker.tsx` — current sector-based query + category grouping + proficiency/requirement UI
- `src/pages/onboarding/steps/SeekerStep4Skills.tsx` — sector prop pass, supabase.from('seeker_skills') delete+insert pattern
- `src/pages/jobs/steps/JobStep3Skills.tsx` — sector cast, SkillsPicker requirementMode=true, other dairy-specific fields (unscoped from Phase 23)
- `src/components/layout/AdminSidebar.tsx` — exact `adminItems` array + NavItem interface for extension
- `src/components/admin/AdminTable.tsx` — `AdminListRpc` union type, RPC call pattern, pagination
- `src/pages/admin/AdminDocumentsQueue.tsx` — Phase 21 admin page precedent (RTL mock pattern for tests)
- `src/main.tsx` — admin route registration pattern (ProtectedRoute + AdminLayout)
- `.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-CONTEXT.md` — locked decisions, canonical refs
- `.planning/v2.1-MILESTONE-SCOPING.md` §Phase 23 — target taxonomy canonical names, migration mapping classes, data reality check (12 seeker_skills, 0 job_skills, 3 match_scores)
- `.planning/codebase/CONVENTIONS.md` — naming conventions, import order, test file naming
- `.planning/codebase/ARCHITECTURE.md` — RLS policy pattern, SECURITY DEFINER pattern, wizard architecture
- `vitest.config.ts` — test framework config (jsdom, globals, setupFiles, include pattern)
- `tests/fk-indexes.test.ts` — static-source-guard test pattern using `readFileSync` (exact template for Wave 0 tests)
- `tests/admin-rpc-shapes.test.ts` — mock-RPC test pattern for admin RPCs

### Secondary (MEDIUM confidence)

- `.planning/v2.0-MILESTONE-AUDIT.md` — registry-backfill pattern (INSERT INTO supabase_migrations.schema_migrations) confirmed used for 023-033; pooler-blocked CI gate confirmed open
- `.planning/STATE.md` — current focus confirmed as Phase 23; phase 21-02 Studio-applied pattern confirmed
- `tests/admin-rls-not-widened.test.ts` — static-baseline test pattern (precedent for migration guard tests)

### Tertiary (LOW confidence)

- None — all critical findings verified against source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from source files; no new libraries needed
- Architecture: HIGH — confirmed from 023/033 migrations + AdminDocumentsQueue + AdminTable precedents
- Pitfalls: HIGH — derived from direct code reading (SkillsPicker sector filter, FK CASCADE order, AdminListRpc union)
- Test strategy: HIGH — fk-indexes.test.ts provides the exact static-source-guard pattern

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stable stack; no fast-moving dependencies)
