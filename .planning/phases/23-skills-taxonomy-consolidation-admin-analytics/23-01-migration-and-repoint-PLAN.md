---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: 01
type: execute
wave: 1
depends_on: ["23-00"]
files_modified:
  - supabase/migrations/034_skills_taxonomy_v2.sql
  - src/components/ui/SkillsPicker.tsx
  - src/pages/onboarding/steps/SeekerStep4Skills.tsx
  - src/pages/jobs/steps/JobStep3Skills.tsx
autonomous: false
requirements: [TAX-01, TAX-02, TAX-03, TAX-04, TAX-05, ANLY-01, ANLY-02, ANLY-03]
user_setup: []
must_haves:
  truths:
    - "The 034 migration file exists on disk with the full schema redesign, 24-competency reseed, match_scores recompute, two admin RPCs, and the analytics_events table — all in one Studio-applicable SQL file"
    - "SkillsPicker no longer references skills.sector; it queries by discipline and the sector prop is removed from its interface and both callers"
    - "After Studio apply + registry backfill, the live skills table has exactly 24 agriculture competencies across 6 categories, no sector column, no qualification rows"
    - "Seeker onboarding skill step and job-posting skill step render against the new taxonomy without a PostgREST 400 (the dropped-column break is closed because code and schema change together)"
  artifacts:
    - path: "supabase/migrations/034_skills_taxonomy_v2.sql"
      provides: "Schema redesign + 24-competency reseed + match_scores recompute + admin_skill_coverage + admin_list_analytics_events + analytics_events table"
      contains: "CREATE OR REPLACE FUNCTION public.admin_skill_coverage"
      min_lines: 120
    - path: "src/components/ui/SkillsPicker.tsx"
      provides: "Sector-free skills query grouped by category with CATEGORY_LABELS"
      contains: "CATEGORY_LABELS"
    - path: "src/pages/onboarding/steps/SeekerStep4Skills.tsx"
      provides: "Seeker skill self-assessment step with no sector prop pass"
      contains: "SkillsPicker"
    - path: "src/pages/jobs/steps/JobStep3Skills.tsx"
      provides: "Job-posting skill step with no sector prop pass"
      contains: "SkillsPicker"
  key_links:
    - from: "src/components/ui/SkillsPicker.tsx"
      to: "public.skills (discipline column)"
      via: "supabase.from('skills').eq('discipline','agriculture')"
      pattern: "\\.eq\\('discipline',\\s*'agriculture'\\)"
    - from: "supabase/migrations/034_skills_taxonomy_v2.sql"
      to: "public.compute_match_score"
      via: "backfill re-INSERT into match_scores"
      pattern: "compute_match_score"
---

<objective>
Deliver the coupled schema-migration + UI re-point that converts TopFarms from a dairy-scoped skills model to an agriculture-broad competency taxonomy, AND stands up the analytics SQL surface (two admin RPCs + the analytics_events table) in the same Studio-applied migration file. This plan is INTENTIONALLY coupled: dropping `skills.sector` instantly breaks SkillsPicker's `.or('sector.eq...')` filter, so the SQL file and the SkillsPicker re-point must be authored together and the live migration applied only after both are committed — the app is never left broken between commits (Research Pitfall 1).

Purpose: TAX-01..05 (schema, taxonomy, data migration, UI re-point, qualification removal) + the SQL half of ANLY-01/02/03 (RPCs + table defined in the migration). The admin page that consumes the RPCs is plan 23-02.
Output: `supabase/migrations/034_skills_taxonomy_v2.sql` (authored + Studio-applied + registry-backfilled), re-pointed `SkillsPicker.tsx`, and updated wizard callers. Tests `skills-taxonomy-migration.test.ts` and `skills-picker-sector-removed.test.ts` flip GREEN.
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

Current skills table (001_initial_schema.sql:94-99) — what is being migrated:
```sql
CREATE TABLE public.skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL,
  sector   text NOT NULL CHECK (sector IN ('dairy', 'sheep_beef', 'both'))
);
```

Migration shell (copy from 033_admin_doc_rpcs.sql): `BEGIN; ... DO $verify$ ... $verify$; COMMIT;`. SECURITY DEFINER RPC template: `LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public`, first body statement `PERFORM public._admin_gate();`, then `GRANT EXECUTE ON FUNCTION ... TO authenticated;`.

`_admin_gate()` already exists (023_admin_rpcs.sql) — do NOT redefine it; just `PERFORM public._admin_gate();`.

match_scores recompute backfill (010_match_scores_precompute.sql:169-189) — re-run verbatim after reseed:
```sql
SET statement_timeout = '0';
INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
SELECT j.id, sp.id, (result->>'total_score')::int, result->'breakdown', now()
FROM public.jobs j
JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
CROSS JOIN LATERAL public.compute_match_score(sp.id, j.id) AS result
WHERE j.status = 'active'
ON CONFLICT (job_id, seeker_id) DO UPDATE SET
  total_score = EXCLUDED.total_score, breakdown = EXCLUDED.breakdown, calculated_at = EXCLUDED.calculated_at;
RESET statement_timeout;
```
Note `compute_match_score(seeker_id, job_id)` and the seeker/job match triggers use `jobs.sector` and `seeker_profiles.sector_pref` — those are UNAFFECTED by dropping `skills.sector` (Research §sources, 010 note). The recompute will produce skills-dimension=0 scores until the 3 test seekers re-tag; that is the expected post-reseed state (CONTEXT.md migration data handling).

SkillsPicker current query (SkillsPicker.tsx:56-59) — the line that breaks when sector is dropped:
```typescript
.or(`sector.eq.${sector},sector.eq.both`)
```
SkillsPicker current prop (SkillsPicker.tsx:8-9): `interface SkillsPickerProps { sector: 'dairy' | 'sheep_beef'; ... }`. The `useEffect` deps array is `[sector]` (line 78). Category display currently uses `category.replace(/_/g, ' ')` (line 133).

SeekerStep4Skills caller (SeekerStep4Skills.tsx:15-27, 125-130): has a `getSector(sectorPref)` helper and passes `sector={sector}` to SkillsPicker. The component receives `sectorPref?: string[]` — leave that prop on SeekerStep4Skills (it may be used elsewhere) but stop deriving/forwarding `sector` to SkillsPicker.

JobStep3Skills caller (JobStep3Skills.tsx:100-105): passes `sector={sector as 'dairy' | 'sheep_beef'}` to SkillsPicker. The `sector: string` prop on JobStep3Skills stays (it is the job's sector, used for other purposes); only the SkillsPicker prop pass is removed. Per Research Pitfall 7, leave the dairy-specific non-skills fields (minExperience, QUALIFICATION_OPTIONS, etc.) untouched — out of Phase 23 scope.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author migration 034_skills_taxonomy_v2.sql (schema + reseed + recompute + RPCs + analytics_events)</name>
  <files>supabase/migrations/034_skills_taxonomy_v2.sql</files>
  <read_first>
    - supabase/migrations/033_admin_doc_rpcs.sql (BEGIN/DO $verify$/COMMIT shell + SECURITY DEFINER RPC + GRANT pattern — copy verbatim)
    - supabase/migrations/023_admin_rpcs.sql (the `_admin_gate()` definition — confirm it exists, do NOT redefine)
    - supabase/migrations/010_match_scores_precompute.sql lines 169-189 (the backfill block to re-run after reseed)
    - supabase/migrations/001_initial_schema.sql lines 94-99 (current skills table) + the seeker_skills/job_skills/match_scores FK defs
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-CONTEXT.md decision #1 (the 24 competency names + 6 categories — copy VERBATIM)
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-RESEARCH.md §Architecture Patterns 1,3,4 (migration shell, admin_skill_coverage body, analytics_events DDL)
    - tests/skills-taxonomy-migration.test.ts (the RED assertions this file must satisfy — author to pass every one)
  </read_first>
  <behavior>
    The static-source-guard tests/skills-taxonomy-migration.test.ts must flip from RED (ENOENT) to GREEN. Specifically it asserts: skills_sector_check dropped, sector column dropped, discipline column added (NOT NULL DEFAULT 'agriculture'), skills_category_check listing all 6 slugs, all 24 competency names present verbatim, DELETE-before-reseed ordering, compute_match_score recompute, no DairyNZ/qualification rows, admin_skill_coverage + admin_list_analytics_events RPCs with SECURITY DEFINER + _admin_gate + GRANT, analytics_events table with 4 core columns + RLS + admin-read policy, BEGIN/COMMIT + DO $verify$.
  </behavior>
  <action>
    Create `supabase/migrations/034_skills_taxonomy_v2.sql`, wrapped `BEGIN; ... COMMIT;` with a header comment block (mirror 033's header) noting Studio-apply per CLAUDE §2 and the registry-backfill follow-up. Sections, in this exact order (ordering is load-bearing — FK + break-avoidance):

    SECTION 1 — Schema alterations:
    ```sql
    ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_sector_check;
    ALTER TABLE public.skills DROP COLUMN IF EXISTS sector;
    ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'agriculture';
    ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_category_check;
    ALTER TABLE public.skills ADD CONSTRAINT skills_category_check
      CHECK (category IN ('livestock','cropping_agronomy','machinery_equipment','farm_operations_infrastructure','management_business','cross_cutting'));
    ```
    (Inline CHECK per Research §"Target skills CHECK mechanism" — lowest-maintenance, self-documenting, matches project precedent. NO discipline CHECK — verticals add freely per CONTEXT decision #3.)

    SECTION 2 — Clear existing data (explicit order avoids FK ambiguity, Research Pitfall 2/3):
    ```sql
    DELETE FROM public.seeker_skills;
    DELETE FROM public.match_scores;
    DELETE FROM public.skills;
    ```

    SECTION 3 — Insert the 24 competencies. Use `INSERT INTO public.skills (name, category, discipline) VALUES` with `discipline` specified EXPLICITLY on every row (Research Pitfall 5 — do not rely on DEFAULT). Copy these names + category slugs VERBATIM from CONTEXT decision #1:
    - Livestock (category 'livestock'): 'Dairy cattle management', 'Beef cattle management', 'Sheep & lamb handling', 'Animal health & husbandry', 'Mustering & stockmanship'
    - Cropping & agronomy (category 'cropping_agronomy'): 'Arable & grain production', 'Vegetable & root crop production', 'Pasture & forage management', 'Agronomy & soil management'
    - Machinery & equipment (category 'machinery_equipment'): 'Tractor operation', 'Heavy machinery & harvest equipment', 'Spraying & application equipment', 'Farm vehicle handling'
    - Farm operations & infrastructure (category 'farm_operations_infrastructure'): 'Fencing & yard construction', 'Irrigation & water systems', 'General farm maintenance', 'Fuel & chemical handling'
    - Management & business (category 'management_business'): 'Farm planning & operations management', 'Staff supervision & leadership', 'Farm financial management', 'Compliance & record-keeping'
    - Cross-cutting (category 'cross_cutting'): 'Health & safety competency', 'Sustainable & regenerative practices', 'Data & farm tech literacy'
    That is exactly 24 rows. Do NOT seed competency #25 'Customer & supplier relations' (deferred) and do NOT seed any 'qualification' / DairyNZ Level rows (TAX-05 — relocated to Phase 26).

    SECTION 4 — match_scores recompute: paste the backfill block from 010_match_scores_precompute.sql lines 169-189 verbatim (SET statement_timeout='0' … RESET statement_timeout). seeker_skills is now empty so scores carry a 0 skills dimension — that is the expected state until the 3 test seekers re-tag.

    SECTION 5 — admin_skill_coverage RPC (ANLY-01 supply vs demand + ANLY-02 usage counts — single RPC serves both). Follow Research Pattern 3 exactly: SECURITY DEFINER STABLE, SET search_path=public, `PERFORM public._admin_gate();`, LEFT JOIN seeker_skills (DISTINCT seeker_id = seeker_count = supply) and job_skills (DISTINCT job_id = job_count = demand) onto skills WHERE discipline='agriculture', GROUP BY s.id,s.name,s.category,s.discipline ORDER BY s.category,s.name, build each row with jsonb_build_object keys: skill_id, name, category, discipline, seeker_count, job_count. RETURN `jsonb_build_object('rows', v_rows, 'total', jsonb_array_length(v_rows))` (matches AdminTable's {rows,total} contract). End with `GRANT EXECUTE ON FUNCTION public.admin_skill_coverage() TO authenticated;`.

    SECTION 6 — analytics_events table + read RPC (ANLY-03), per Research Pattern 4:
    ```sql
    CREATE TABLE IF NOT EXISTS public.analytics_events (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type  text NOT NULL,   -- naming convention: '<domain>.<action>' e.g. 'skill_gap.viewed'
      entity_id   uuid,
      metadata    jsonb NOT NULL DEFAULT '{}',
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
    CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON public.analytics_events (event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS analytics_events_entity_idx ON public.analytics_events (entity_id, created_at DESC) WHERE entity_id IS NOT NULL;
    DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
    CREATE POLICY "analytics_events_admin_read" ON public.analytics_events
      FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
    ```
    Then `admin_list_analytics_events(p_event_type text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)` — SECURITY DEFINER STABLE, `PERFORM public._admin_gate();`, paginated SELECT with optional event_type filter, RETURN `jsonb_build_object('rows', v_rows, 'total', v_total)`. `GRANT EXECUTE ON FUNCTION public.admin_list_analytics_events(text, int, int) TO authenticated;`. Add an SQL comment documenting the `'<domain>.<action>'` naming convention (e.g. skill_gap.viewed = Phase 24, directory.entry_viewed = Phase 25).

    SECTION 7 — DO $verify$ post-state assertions (mirror 033's verify shell):
    - `SELECT count(*) FROM public.skills` = 24
    - `SELECT count(*) FROM public.skills WHERE discipline = 'agriculture'` = 24
    - count of distinct categories = 6
    - assert no column named 'sector' on public.skills (query information_schema.columns; RAISE if found)
    - assert pg_proc has admin_skill_coverage AND admin_list_analytics_events both prosecdef=true (mirror 033's pg_proc count check, expect 2)
    - assert analytics_events table exists (pg_class / to_regclass)
    Each failed assertion `RAISE EXCEPTION` with a descriptive message.

    Do NOT apply to the live DB in this task — that is the checkpoint in Task 3. This task only authors the file.
  </action>
  <verify>
    <automated>npx vitest run tests/skills-taxonomy-migration.test.ts</automated>
    Expect GREEN — every assertion in the migration guard now passes against the authored file.
  </verify>
  <acceptance_criteria>
    - File `supabase/migrations/034_skills_taxonomy_v2.sql` exists
    - grep: contains `DROP COLUMN IF EXISTS sector`, `discipline text NOT NULL DEFAULT 'agriculture'`, `skills_category_check`
    - grep: contains all 6 category slugs (`'livestock'`, `'cropping_agronomy'`, `'machinery_equipment'`, `'farm_operations_infrastructure'`, `'management_business'`, `'cross_cutting'`)
    - grep: contains all 24 competency names verbatim including `'Sustainable & regenerative practices'` and `'Data & farm tech literacy'`
    - grep: does NOT contain `qualification` or `DairyNZ Level`
    - grep: contains `DELETE FROM public.seeker_skills`, `DELETE FROM public.match_scores`, `DELETE FROM public.skills`, `compute_match_score`
    - grep: contains `CREATE OR REPLACE FUNCTION public.admin_skill_coverage`, `CREATE OR REPLACE FUNCTION public.admin_list_analytics_events`, `CREATE TABLE IF NOT EXISTS public.analytics_events`, `PERFORM public._admin_gate()`, `DO $verify$`
    - `npx vitest run tests/skills-taxonomy-migration.test.ts` is GREEN
  </acceptance_criteria>
  <done>Migration file authored on disk satisfying every assertion in the Wave 0 migration guard; the guard test is GREEN. File NOT yet applied to the live DB.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Re-point SkillsPicker + wizard callers off skills.sector</name>
  <files>src/components/ui/SkillsPicker.tsx, src/pages/onboarding/steps/SeekerStep4Skills.tsx, src/pages/jobs/steps/JobStep3Skills.tsx</files>
  <read_first>
    - src/components/ui/SkillsPicker.tsx (current sector filter line 59, prop line 9, useEffect deps line 78, category label line 133)
    - src/pages/onboarding/steps/SeekerStep4Skills.tsx (getSector helper lines 15-20, sector prop pass line 126)
    - src/pages/jobs/steps/JobStep3Skills.tsx (sector cast prop pass line 101)
    - tests/skills-picker-sector-removed.test.ts (the RED assertions to satisfy)
    - .planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-RESEARCH.md §Pattern 2 + Open Question 3 (CATEGORY_LABELS recommendation)
  </read_first>
  <behavior>
    tests/skills-picker-sector-removed.test.ts must flip GREEN: source no longer contains `sector.eq.` or `.or(`sector`; contains `.eq('discipline', 'agriculture')`; the `sector: 'dairy' | 'sheep_beef'` prop is gone from the interface; a `CATEGORY_LABELS` map is present.
  </behavior>
  <action>
    In `src/components/ui/SkillsPicker.tsx`:
    - Remove the `sector: 'dairy' | 'sheep_beef'` line from `SkillsPickerProps` and remove `sector` from the destructured params.
    - Replace the query filter line 59 `.or(`sector.eq.${sector},sector.eq.both`)` with `.eq('discipline', 'agriculture')`. Keep `.order('category').order('name')`.
    - Change the `useEffect` deps from `[sector]` to `[]` (skills load once on mount; no sector dependency). Keep the `cancelled` cleanup guard.
    - Add a `const CATEGORY_LABELS: Record<string, string> = { livestock: 'Livestock', cropping_agronomy: 'Cropping & agronomy', machinery_equipment: 'Machinery & equipment', farm_operations_infrastructure: 'Farm operations & infrastructure', management_business: 'Management & business', cross_cutting: 'Cross-cutting' }` near the other module constants. In the category header render (line 133), use `CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ')` so unknown future categories still display gracefully.
    - Update the empty-state copy ("No skills available for this sector.") to drop the sector wording (e.g. "No skills available.").

    In `src/pages/onboarding/steps/SeekerStep4Skills.tsx`:
    - Remove the `getSector` helper and the `const sector = getSector(sectorPref)` line.
    - Remove the `sector={sector}` prop from the `<SkillsPicker>` call (keep `selectedSkills`, `onChange`, `requirementMode={false}`).
    - Leave the `sectorPref?: string[]` prop on the component signature (harmless; avoids touching the wizard parent). If `sectorPref` becomes an unused param after removing getSector, prefix-rename is unnecessary — leave it; it's a declared prop, not a local.

    In `src/pages/jobs/steps/JobStep3Skills.tsx`:
    - Remove the `sector={sector as 'dairy' | 'sheep_beef'}` prop from the `<SkillsPicker>` call (keep `selectedSkills`, `onChange`, `requirementMode={true}`).
    - Leave the `sector: string` prop on the Step3Props interface and all other fields (minExperience, QUALIFICATION_OPTIONS, etc.) untouched — Research Pitfall 7, out of Phase 23 scope.

    Run `npx tsc --noEmit` (or the project typecheck) to confirm no dangling `sector` references remain after the prop removal.
  </action>
  <verify>
    <automated>npx vitest run tests/skills-picker-sector-removed.test.ts</automated>
    Expect GREEN.
  </verify>
  <acceptance_criteria>
    - grep: `src/components/ui/SkillsPicker.tsx` does NOT contain `sector.eq.` and does NOT contain `sector: 'dairy'`
    - grep: `src/components/ui/SkillsPicker.tsx` contains `.eq('discipline', 'agriculture')` and `CATEGORY_LABELS`
    - grep: `src/pages/onboarding/steps/SeekerStep4Skills.tsx` does NOT contain `getSector` and the `<SkillsPicker` call has no `sector=` prop
    - grep: `src/pages/jobs/steps/JobStep3Skills.tsx` `<SkillsPicker` call has no `sector=` prop
    - `npx vitest run tests/skills-picker-sector-removed.test.ts` is GREEN
    - typecheck passes (no unresolved `sector` references against SkillsPickerProps)
  </acceptance_criteria>
  <done>SkillsPicker queries by discipline with CATEGORY_LABELS, the sector prop is removed from its interface and both callers, and the SkillsPicker guard test is GREEN. The code now matches the post-034 schema, so applying the migration (Task 3) will not break the picker.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Apply migration 034 via Supabase Studio + registry backfill (CLAUDE §2)</name>
  <files>supabase/migrations/034_skills_taxonomy_v2.sql</files>
  <action>
    HUMAN-REQUIRED step — Claude CANNOT do this autonomously because the project's migration path is Studio-applied by hard constraint (CLAUDE §2; the pooler/`supabase db push` CI path is gated off per §6). Do NOT attempt `supabase db push`. The detailed apply + verify steps are in <how-to-verify>. In short: paste the full 034 SQL into the Supabase Studio SQL Editor for project inlagtgpynemhipnqvty and Run (the in-SQL DO $verify$ block rolls back on any failed post-state assertion), backfill the supabase_migrations.schema_migrations registry row Studio-side, then confirm the post-state via the read-only Supabase MCP (--read-only stays ON — verification only). This task only follows steps 1-5 below; it produces no new repo files.
  </action>
  <what-built>
    Migration file `034_skills_taxonomy_v2.sql` is authored (Task 1) and SkillsPicker + callers are re-pointed to the post-migration schema (Task 2). Both are committed. The migration is NOT yet applied to the live TopFarms database (project ref inlagtgpynemhipnqvty). Per CLAUDE §2, migrations are applied via Supabase Studio SQL Editor, not `supabase db push` (the pooler CI path is gated off — CLAUDE §6).
  </what-built>
  <how-to-verify>
    1. Open the Supabase Studio SQL Editor for project `inlagtgpynemhipnqvty` (TopFarms).
    2. Paste the FULL body of `supabase/migrations/034_skills_taxonomy_v2.sql` and Run. The `DO $verify$` block at the end will RAISE EXCEPTION (rolling back the whole BEGIN/COMMIT) if any post-state assertion fails — a clean run means all assertions passed (24 skills, no sector column, both RPCs, analytics_events table).
    3. Backfill the migration registry row Studio-side (Studio-applied migrations do not auto-write it — CLAUDE §2, registry-backfill precedent for 023-033):
       ```sql
       INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
       VALUES ('034', '034_skills_taxonomy_v2', ARRAY['-- see supabase/migrations/034_skills_taxonomy_v2.sql'])
       ON CONFLICT (version) DO NOTHING;
       ```
    4. Verify via the READ-ONLY Supabase MCP (--read-only stays ON — this is verification, not a write; CLAUDE §2): run `execute_sql` SELECTs to confirm `SELECT count(*) FROM skills` = 24, `SELECT count(DISTINCT category) FROM skills` = 6, `information_schema.columns` has no `sector` on `skills`, `pg_proc` has `admin_skill_coverage` + `admin_list_analytics_events`, and `to_regclass('public.analytics_events')` is not null. Confirm `list_migrations` shows version 034.
    5. Manual smoke (the break-avoidance proof): open the seeker onboarding skill step and the job-posting skill step in the app — both must render the 6 new category groups with no "Failed to load skills" error (proves SkillsPicker's discipline query works against the migrated schema; closes Research Pitfall 1).
  </how-to-verify>
  <verify>Read-only Supabase MCP SELECTs confirm post-state: count(*) skills = 24, count(distinct category) = 6, no sector column, admin_skill_coverage + admin_list_analytics_events in pg_proc, analytics_events in pg_class, list_migrations shows 034.</verify>
  <done>Migration 034 applied to the live DB via Studio with a clean DO $verify$ run, registry row backfilled, post-state machine-confirmed via read-only MCP, and both wizard skill steps render the new taxonomy in the running app.</done>
  <resume-signal>Type "applied" once Studio reports a clean run, the registry row is backfilled, the read-only MCP SELECTs confirm the post-state, and both wizard skill steps render the new taxonomy without error. Report any DO $verify$ exception verbatim so the SQL can be diagnosed before re-apply (CLAUDE §3 — diagnose before fix).</resume-signal>
</task>

</tasks>

<verification>
- `npx vitest run tests/skills-taxonomy-migration.test.ts tests/skills-picker-sector-removed.test.ts` is GREEN (both Wave 0 guards flipped).
- Live DB confirmed via read-only MCP: 24 skills, 6 categories, no sector column, 2 new RPCs, analytics_events table present, registry shows 034.
- Both wizard skill steps render the new taxonomy in the running app with no PostgREST 400.
</verification>

<success_criteria>
- TAX-01..05 satisfied: schema redesigned, 24 competencies seeded, data cleared + match_scores recomputed, both UIs re-pointed, no qualification rows.
- ANLY-01/02/03 SQL surface in place: admin_skill_coverage + admin_list_analytics_events RPCs and analytics_events table exist in the live DB (consumed by plan 23-02).
- The schema-drop ↔ SkillsPicker coupling is honored: code and schema changed together, app never broken between commits.
</success_criteria>

<output>
After completion, create `.planning/phases/23-skills-taxonomy-consolidation-admin-analytics/23-01-SUMMARY.md`. Include the old→new mapping table (consolidate / net-new / relocate / drop classes) from 23-RESEARCH.md §"Old → New Mapping" for traceability (CONTEXT.md migration data handling).
</output>
