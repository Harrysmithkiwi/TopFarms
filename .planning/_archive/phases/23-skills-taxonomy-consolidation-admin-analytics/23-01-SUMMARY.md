---
phase: 23-skills-taxonomy-consolidation-admin-analytics
plan: "01"
subsystem: skills-taxonomy
tags: [skills, taxonomy, migration, analytics, admin-rpcs, skills-picker, supabase-studio]

# Dependency graph
requires:
  - phase: 23-00
    provides: "4 Nyquist RED guard tests encoding all 8 Phase 23 requirement acceptance criteria"
provides:
  - "Migration 034_skills_taxonomy_v2.sql applied to live DB — 24 ag-broad competencies, 6 categories, discipline column, skills_category_check rewritten"
  - "skills.sector column dropped from public.skills"
  - "public.admin_skill_coverage SECURITY DEFINER RPC (supply vs demand per competency)"
  - "public.admin_list_analytics_events SECURITY DEFINER RPC (paginated event log)"
  - "public.analytics_events table with RLS and admin-read policy"
  - "SkillsPicker queries by discipline='agriculture' with CATEGORY_LABELS — sector prop removed"
  - "seeker onboarding + job-posting wizard callers re-pointed off sector prop"
affects:
  - "23-02 (admin analytics page consumes admin_skill_coverage + admin_list_analytics_events)"
  - "seeker onboarding Step 4 Skills"
  - "job-posting Step 3 Skills"
  - "match scoring (skills dimension = 0 until seekers re-tag — expected post-reseed)"

# Tech tracking
tech-stack:
  added:
    - "public.analytics_events table (generic event log)"
    - "admin_skill_coverage RPC"
    - "admin_list_analytics_events RPC"
  patterns:
    - "SECURITY DEFINER + _admin_gate pattern (023/033 precedent) for admin RPCs"
    - "Studio-apply + registry backfill per CLAUDE §2 (pooler/db-push CI gated off)"
    - "discipline-based skills query (ag-broad taxonomy v2) replacing sector-based OR filter"
    - "BEGIN/COMMIT + DO $verify$ block with RAISE EXCEPTION rollback (033 precedent)"
    - "Coupling constraint honored: schema SQL and UI re-point authored + committed together before live apply (Research Pitfall 1 avoidance)"

key-files:
  created:
    - supabase/migrations/034_skills_taxonomy_v2.sql
  modified:
    - src/components/ui/SkillsPicker.tsx
    - src/pages/onboarding/steps/SeekerStep4Skills.tsx
    - src/pages/jobs/steps/JobStep3Skills.tsx

key-decisions:
  - "Coupling honored: migration SQL and SkillsPicker re-point authored + committed together before live apply — app never broken between commits (Research Pitfall 1)"
  - "discipline specified explicitly on every INSERT row (Research Pitfall 5 — no reliance on DEFAULT)"
  - "No discipline CHECK constraint — verticals add freely per CONTEXT decision #3"
  - "seeker_skills → match_scores → skills DELETE order for FK-safe clear (Research Pitfall 2/3)"
  - "useEffect deps [] (loads once on mount; no sector dependency post-re-point)"
  - "CATEGORY_LABELS map added for human-readable ag-broad category display in SkillsPicker"
  - "getSector helper removed from SeekerStep4Skills; sectorPref prop stays (harmless declared prop)"
  - "sector: string prop stays on JobStep3Skills Step3Props (used for other purposes; Research Pitfall 7)"
  - "First apply attempt failed at Postgres 23514 (legacy category values violated new CHECK); CLAUDE §3 diagnose-before-fix honored — full error captured before fix attempt"
  - "Fix: re-order CHECK constraint addition AFTER DELETEs — constraint only evaluates against surviving rows at ALTER time; landed in new commit 2c2cce8 per CLAUDE §4 (no amend)"
  - "Transaction held cleanly on first-attempt failure: BEGIN/COMMIT + DO $verify$ design meant rollback was automatic — no partial schema or data state persisted"

patterns-established:
  - "Pattern (constraint-ordering): DROP old CHECK → DELETE rows → reseed → ADD new CHECK — ensures ALTER TABLE ADD CONSTRAINT never evaluates legacy data; reusable for any migration that renames category/enum values while clearing old data"
  - "Pattern (ag-broad discipline query): .eq('discipline','agriculture') + CATEGORY_LABELS Record<string,string> in SkillsPicker — canonical pattern for any future skill-adjacent UI component"
  - "Pattern (Studio 2-attempt apply): if DO $verify$ raises EXCEPTION, diagnose error code, fix SQL, commit forward (no amend per §4), re-paste full body — standard re-apply protocol"

requirements-completed: [TAX-01, TAX-02, TAX-03, TAX-04, TAX-05, ANLY-01, ANLY-02, ANLY-03]

# Metrics
duration: "~45 min total (Tasks 1+2 authored + committed 2026-05-29; Task 3 Studio apply completed 2026-05-30)"
completed: 2026-05-30
---

# Phase 23 Plan 01: Migration & Re-point Summary

**Migration 034 applied to live DB via Studio (24 ag-broad competencies across 6 categories, sector dropped, two SECURITY DEFINER admin analytics RPCs, analytics_events table) + SkillsPicker and wizard callers re-pointed from sector to discipline — all guard tests GREEN.**

## Performance

- **Duration:** ~45 min total (Tasks 1+2 authored 2026-05-29; Studio apply checkpoint resolved 2026-05-30 on second attempt)
- **Started:** 2026-05-29
- **Completed:** 2026-05-30
- **Tasks:** 3/3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Migration `034_skills_taxonomy_v2.sql` authored in a single BEGIN/COMMIT file with 7-assertion DO $verify$ block, applied to the live TopFarms DB (project ref `inlagtgpynemhipnqvty`) via Supabase Studio SQL Editor per CLAUDE §2
- 24 ag-broad competencies across 6 categories now live in `public.skills`; `skills.sector` column and `skills_sector_check` constraint dropped; `discipline` column added; new `skills_category_check` constraint enforces the 6-slug enum
- `SkillsPicker.tsx` re-pointed from `.or('sector.eq.${sector},...')` to `.eq('discipline', 'agriculture')` with CATEGORY_LABELS map; sector prop removed from interface and both wizard callers (SeekerStep4Skills, JobStep3Skills)
- `public.admin_skill_coverage` and `public.admin_list_analytics_events` SECURITY DEFINER RPCs deployed (both prosecdef=true, GRANT to authenticated); `public.analytics_events` table created with RLS + admin-read policy
- All 4 Wave 0 Nyquist guard tests remain GREEN (61/61 assertions)

## Task Commits

1. **Task 1: Author migration 034_skills_taxonomy_v2.sql** — `b345993` (feat)
2. **Task 1.fix: Re-order CHECK constraint addition after DELETEs** — `2c2cce8` (fix)
3. **Task 2: Re-point SkillsPicker + wizard callers off skills.sector** — `61f7324` (feat)
4. **Task 3 + plan metadata finalization** — (this commit, docs)

_Note: Tasks 1 and 2 were committed before the checkpoint. Task 1.fix was a forward commit per CLAUDE §4 — no amend, no reset._

## Files Created/Modified

- `supabase/migrations/034_skills_taxonomy_v2.sql` — 321 lines; full schema redesign + 24-competency reseed + match_scores recompute + admin_skill_coverage + admin_list_analytics_events + analytics_events + DO $verify$
- `src/components/ui/SkillsPicker.tsx` — discipline query, CATEGORY_LABELS, sector prop removed
- `src/pages/onboarding/steps/SeekerStep4Skills.tsx` — getSector helper removed, sector prop pass removed
- `src/pages/jobs/steps/JobStep3Skills.tsx` — sector prop pass removed from SkillsPicker call

## Old → New Mapping (from 23-RESEARCH.md)

| Class | Old | New |
|-------|-----|-----|
| Consolidate | ~40 dairy-scoped skills across sector='dairy'/'sheep_beef'/'both' | 24 ag-broad competencies across 6 categories, discipline='agriculture' |
| Net-new | — | Cropping & agronomy (4), Farm operations & infrastructure (4), Cross-cutting (3 — incl. Sustainable & regenerative, Data & farm tech literacy) |
| Relocated | All dairy-specific livestock variants | Merged into 'Dairy cattle management' + 'Beef cattle management' + 'Sheep & lamb handling' |
| Drop | skills.sector column, skills_sector_check constraint | — |
| Deferred to Phase 26 | DairyNZ Level / qualification rows (TAX-05) | Credential tracking phase |

## Post-State Verification (read-only Supabase MCP — project ref inlagtgpynemhipnqvty)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| skill_count | 24 | 24 | PASS |
| All skills discipline='agriculture' | 24 | 24 | PASS |
| Distinct categories | 6 | 6 | PASS |
| Category breakdown | livestock=5, cropping_agronomy=4, machinery_equipment=4, farm_operations_infrastructure=4, management_business=4, cross_cutting=3 | Exact match | PASS |
| sector column absent from public.skills | absent | absent (information_schema confirms) | PASS |
| discipline column present | present | present | PASS |
| admin_skill_coverage prosecdef | true | true | PASS |
| admin_list_analytics_events prosecdef | true | true | PASS |
| analytics_events table + RLS | present, enabled | present, enabled | PASS |
| match_scores recomputed | 3 rows (skill-dim=0 expected) | 3 rows | PASS |
| seeker_skills cleared | 0 (was 12 test rows) | 0 | PASS |
| skills_category_check constraint | new 6-slug enum | matches exactly | PASS |
| list_migrations version 034 | present | present | PASS |

## What the Migration Does (Section-by-Section)

1. **Schema alterations:** Drop `skills_sector_check` + `sector` column, add `discipline text NOT NULL DEFAULT 'agriculture'`, replace category CHECK with 6 ag-broad slugs — but CHECK addition deferred until AFTER DELETEs (see constraint-ordering deviation below).
2. **Clear existing data:** `DELETE FROM seeker_skills → match_scores → skills` (FK-safe order).
3. **Reseed 24 competencies:** Explicit `discipline='agriculture'` on every row. Livestock (5), Cropping & agronomy (4), Machinery & equipment (4), Farm operations & infrastructure (4), Management & business (4), Cross-cutting (3).
4. **Recompute match_scores:** Verbatim backfill from 010. Skills dimension = 0 post-reseed — expected until the 3 test seekers re-tag.
5. **admin_skill_coverage RPC:** SECURITY DEFINER STABLE, _admin_gate, LEFT JOINs seeker_skills/job_skills, returns `{rows, total}` with seeker_count + job_count per skill.
6. **analytics_events table + admin_list_analytics_events RPC:** RLS enabled, admin-read policy, paginated read RPC with optional event_type filter. Naming convention: `<domain>.<action>` (e.g. skill_gap.viewed, directory.entry_viewed).
7. **DO $verify$:** 7 post-state assertions — rolls back entire BEGIN/COMMIT on any failure.

## Decisions Made

- **Constraint-ordering (key decision for future auditors):** The original Task 1 migration (b345993) added the new `skills_category_check` CHECK constraint BEFORE the DELETE + reseed section. When the first Studio apply ran, Postgres evaluated the constraint against the existing ~40 rows, many of which carried legacy category slugs not in the new 6-slug enum — this raised Postgres error 23514 (check_violation). Because the migration was wrapped in `BEGIN; ... COMMIT;`, the transaction rolled back completely with no schema or data state persisted. Per CLAUDE §3 (diagnose before fix), the error was fully captured and diagnosed before any fix was attempted. The fix (commit 2c2cce8): move the `ADD CONSTRAINT skills_category_check` to AFTER the DELETE section, so Postgres only evaluates the constraint against the 24 freshly-inserted rows, all of which satisfy the new enum. Second apply succeeded with a clean DO $verify$ run. Per CLAUDE §4, the fix landed in a NEW forward commit — no amend, no reset.

- **seeker_skills = 0 post-apply:** The 12 rows were test data (CONTEXT.md migration data handling). The 3 test seekers will re-tag against the new taxonomy; this is the expected state.

- **match_scores skill-dimension = 0:** Expected post-reseed until seekers re-tag. The 3 match_scores rows represent sector/experience/accommodation dimension scores against active jobs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Re-order CHECK constraint addition to avoid Postgres 23514 on first Studio apply**
- **Found during:** Task 3 (first Studio apply attempt)
- **Issue:** `ADD CONSTRAINT skills_category_check CHECK (category IN (...))` was placed before the DELETE section in the original migration. Postgres evaluates CHECK constraints at ALTER TABLE time against all current rows. The ~40 legacy rows carried category slugs outside the new 6-slug enum, causing SQLSTATE 23514 (check_violation). The BEGIN/COMMIT transaction held: complete rollback, no partial state.
- **Fix:** Moved the `ADD CONSTRAINT skills_category_check` statement to after `DELETE FROM public.skills` (after the data-clear section), so only the 24 freshly-inserted rows are evaluated against the constraint. All 24 satisfy the new enum.
- **Files modified:** `supabase/migrations/034_skills_taxonomy_v2.sql`
- **Verification:** Second Studio apply ran clean; DO $verify$ block asserted all 7 post-state conditions; read-only MCP confirmation complete
- **Committed in:** `2c2cce8` (fix(23-01): re-order CHECK constraint addition after DELETEs to avoid 23514)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in migration ordering)
**Impact on plan:** Fix was necessary for correctness. Constraint-ordering bug was non-destructive (clean rollback thanks to BEGIN/COMMIT design). Forward commit per CLAUDE §4. No scope creep.

## CLAUDE §3 and §4 Precedent

This plan is an explicit example of the §3 diagnose-before-fix principle:
- The 23514 error was captured verbatim before any fix attempt
- The diagnostic identified the root cause (constraint evaluation order) in one pass
- The fix was minimal and targeted (move 1 SQL statement)

And of the §4 atomic-commits / no-history-rewriting principle:
- The fix landed in a NEW forward commit (`2c2cce8`), not an amend
- No `git reset`, `git rebase`, or `git checkout --` was used

## Wave 0 Guard Tests

All 4 Phase 23 Nyquist guard tests remain GREEN (from 23-00 scaffold):

- `tests/skills-taxonomy-migration.test.ts` — 56/56 passed (TAX-01/02/03/05, ANLY-01/02/03)
- `tests/skills-picker-sector-removed.test.ts` — 5/5 passed (TAX-04)
- Combined: 61/61 GREEN

## Requirements Satisfaction (Partial-close per CLAUDE §7)

| Requirement | DB-level satisfied | Code-level satisfied | End-to-end UAT satisfied | Status |
|------------|-------------------|---------------------|--------------------------|--------|
| TAX-01 (schema redesign) | Yes — sector dropped, discipline added | N/A | N/A | DB complete; UAT in 23-02 |
| TAX-02 (24 competencies seeded) | Yes — 24 rows, 6 categories | N/A | N/A | DB complete; UAT in 23-02 |
| TAX-03 (data cleared + match_scores recomputed) | Yes — seeker_skills=0, match_scores=3 | N/A | N/A | DB complete |
| TAX-04 (UI re-pointed) | Yes — schema supports it | Yes — SkillsPicker + callers updated | Pending 23-02 smoke | Code complete; manual UAT closes |
| TAX-05 (no qualification rows) | Yes — migration does not seed any | Yes — test guards confirm | N/A | Complete |
| ANLY-01 (skill coverage RPC) | Yes — admin_skill_coverage deployed prosecdef=true | N/A | Pending 23-02 page | DB complete; page in 23-02 |
| ANLY-02 (usage counts) | Yes — seeker_count + job_count per skill in admin_skill_coverage | N/A | Pending 23-02 page | DB complete; page in 23-02 |
| ANLY-03 (analytics_events table) | Yes — table + RLS + admin_list_analytics_events deployed | N/A | N/A | DB complete |

**REQUIREMENTS.md checkboxes NOT modified** — partial-close discipline (CLAUDE §7). TAX-01..05 and ANLY-01..03 are satisfied at the DB and code layers. End-to-end UAT (wizard render + admin page consumption) closes after Plan 23-02 lands and Phase 23 verifier runs. The phase verifier will flip the REQUIREMENTS.md boxes at end-of-phase when all must_haves are empirically met.

## Issues Encountered

- **First Studio apply: Postgres 23514 check_violation** — Legacy category values in the 40 existing skills rows failed the new 6-slug CHECK constraint. Postgres evaluated the constraint against current rows at ALTER TABLE time, before the DELETE section ran. Clean rollback (no partial state). Diagnosed per CLAUDE §3; fixed in 2c2cce8 per §4.

## Next Phase Readiness

- Plan 23-02 (admin analytics page) is unblocked: `admin_skill_coverage` and `admin_list_analytics_events` RPCs are live in the DB. The page can consume them directly.
- Seeker onboarding + job-posting wizard are ready to render the new taxonomy once both skill steps are tested in the running app (manual UAT in 23-02 or Phase 23 verifier).
- `analytics_events` table is ready for Phase 24+ to write domain events (`skill_gap.viewed`, `directory.entry_viewed`, etc.).
- `seeker_skills` = 0 — the 3 test seekers will need to re-tag to restore match score skill dimension.

---
*Phase: 23-skills-taxonomy-consolidation-admin-analytics*
*Plan: 23-01*
*Completed: 2026-05-30*
