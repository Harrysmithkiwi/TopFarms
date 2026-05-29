---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: "01"
subsystem: skills-taxonomy
status: checkpoint-reached
checkpoint_type: human-action
checkpoint_task: "Task 3 — Apply migration 034 via Supabase Studio"
tags: [skills, taxonomy, migration, analytics, admin-rpcs, skills-picker]
dependency_graph:
  requires: ["23-00"]
  provides: ["034_skills_taxonomy_v2 SQL authored", "SkillsPicker discipline-query", "admin_skill_coverage RPC", "admin_list_analytics_events RPC", "analytics_events table"]
  affects: ["23-02 (admin analytics page consumes RPCs)", "seeker onboarding skill step", "job posting skill step"]
tech_stack:
  added: ["analytics_events table", "admin_skill_coverage RPC", "admin_list_analytics_events RPC"]
  patterns: ["SECURITY DEFINER + _admin_gate pattern (023/033 precedent)", "Studio-apply + registry backfill (CLAUDE §2)", "discipline-based skills query (ag-broad taxonomy v2)"]
key_files:
  created:
    - supabase/migrations/034_skills_taxonomy_v2.sql
  modified:
    - src/components/ui/SkillsPicker.tsx
    - src/pages/onboarding/steps/SeekerStep4Skills.tsx
    - src/pages/jobs/steps/JobStep3Skills.tsx
decisions:
  - "Coupling honored: migration SQL and SkillsPicker re-point authored + committed together before live apply — app never broken between commits (Research Pitfall 1)"
  - "discipline specified explicitly on every INSERT row (Research Pitfall 5 — no reliance on DEFAULT)"
  - "No discipline CHECK constraint — verticals add freely per CONTEXT decision #3"
  - "seeker_skills → match_scores → skills DELETE order for FK-safe clear (Research Pitfall 2/3)"
  - "useEffect deps [] (loads once on mount; no sector dependency post-re-point)"
  - "CATEGORY_LABELS map added for human-readable ag-broad category display in SkillsPicker"
  - "getSector helper removed from SeekerStep4Skills; sectorPref prop stays (harmless declared prop)"
  - "sector: string prop stays on JobStep3Skills Step3Props (used for other purposes; Research Pitfall 7)"
metrics:
  duration_seconds: 190
  completed_date: "2026-05-29"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 23 Plan 01: Migration & Re-point Summary

**One-liner:** Schema migration 034 authored (24 ag-broad competencies, discipline column, 2 admin analytics RPCs, analytics_events table) + SkillsPicker re-pointed to discipline query — stopped at Studio-apply checkpoint.

## Status: Checkpoint Reached (human-action)

Tasks 1 and 2 complete and committed. Task 3 (live Studio apply) is a `checkpoint:human-action` — the operator must apply the migration via Supabase Studio SQL Editor per CLAUDE.md §2 (pooler/`supabase db push` CI path gated off per §6).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Author migration 034_skills_taxonomy_v2.sql | b345993 | supabase/migrations/034_skills_taxonomy_v2.sql (created, 312 lines) |
| 2 | Re-point SkillsPicker + wizard callers | 61f7324 | SkillsPicker.tsx, SeekerStep4Skills.tsx, JobStep3Skills.tsx |

## Task 3 Awaiting (checkpoint:human-action)

Apply migration `034_skills_taxonomy_v2.sql` to the live TopFarms database (project ref `inlagtgpynemhipnqvty`) via Supabase Studio SQL Editor. See checkpoint message for exact steps.

## Old → New Mapping (from 23-RESEARCH.md)

| Class | Old | New |
|-------|-----|-----|
| Consolidate | ~40 dairy-scoped skills across sector='dairy'/'sheep_beef'/'both' | 24 ag-broad competencies across 6 categories, discipline='agriculture' |
| Net-new | — | Cropping & agronomy (4), Farm operations & infrastructure (4), Cross-cutting (3 — incl. Sustainable & regenerative, Data & farm tech literacy) |
| Relocated | All dairy-specific livestock variants | Merged into 'Dairy cattle management' + 'Beef cattle management' + 'Sheep & lamb handling' |
| Drop | skills.sector column, skills_sector_check constraint | — |
| Deferred to Phase 26 | DairyNZ Level / qualification rows (TAX-05) | — |

## What the Migration Does (Section-by-Section)

1. **Schema alterations:** Drop `skills_sector_check` + `sector` column, add `discipline text NOT NULL DEFAULT 'agriculture'`, replace category CHECK with 6 ag-broad slugs.
2. **Clear existing data:** `DELETE FROM seeker_skills → match_scores → skills` (FK-safe order).
3. **Reseed 24 competencies:** Explicit discipline='agriculture' on every row. Livestock (5), Cropping & agronomy (4), Machinery & equipment (4), Farm operations & infrastructure (4), Management & business (4), Cross-cutting (3).
4. **Recompute match_scores:** Verbatim backfill from 010. Skills dimension = 0 post-reseed (expected — recovers as seekers re-tag).
5. **admin_skill_coverage RPC:** SECURITY DEFINER STABLE, _admin_gate, LEFT JOINs seeker_skills/job_skills, returns `{rows, total}` with seeker_count + job_count per skill.
6. **analytics_events table + admin_list_analytics_events RPC:** RLS enabled, admin-read policy, paginated read RPC with optional event_type filter. Naming convention: `<domain>.<action>`.
7. **DO $verify$:** 7 post-state assertions — rolls back entire transaction on any failure.

## Wave 0 Guard Tests

Both Wave 0 static-source-guard tests flipped GREEN:

- `tests/skills-taxonomy-migration.test.ts` — 56/56 passed (TAX-01/02/03/05, ANLY-01/02/03)
- `tests/skills-picker-sector-removed.test.ts` — 5/5 passed (TAX-04)
- Combined: `npx vitest run tests/skills-taxonomy-migration.test.ts tests/skills-picker-sector-removed.test.ts` → 61/61 GREEN

## Deviations from Plan

None — plan executed exactly as written. The coupling constraint (Research Pitfall 1) was honored: migration SQL and SkillsPicker re-point authored and committed together before the live apply checkpoint.

## Self-Check: PASSED

- [x] `supabase/migrations/034_skills_taxonomy_v2.sql` exists: FOUND
- [x] `src/components/ui/SkillsPicker.tsx` modified: FOUND (contains CATEGORY_LABELS, .eq('discipline','agriculture'), no sector prop)
- [x] Commit b345993 exists: FOUND
- [x] Commit 61f7324 exists: FOUND
- [x] Both Wave 0 guard tests GREEN: CONFIRMED (61/61)
- [x] Typecheck clean: CONFIRMED (npx tsc --noEmit — no output)
