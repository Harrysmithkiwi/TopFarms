# Phase 23: Skills Taxonomy Consolidation + Admin Analytics - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

> Operator chose "you decide all" on the 4 gray areas (no interactive discussion). Decisions below are made from `.planning/v2.1-MILESTONE-SCOPING.md` + the live schema + codebase map, recorded for operator review. Adjust any before planning.

<domain>
## Phase Boundary

Consolidate the current ~40 dairy-heavy `skills` rows into ~24 broad agriculture competencies across 6 categories, migrate existing skill references, redesign the `skills` schema for ag-broad + future verticals, and stand up admin analytics (skill-coverage + taxonomy-usage views + a reusable event-logging foundation).

**Fixed scope.** This phase delivers the ag-broad taxonomy foundation + admin analytics. It does NOT build skills-gap UI (Phase 24, gated), the training directory (Phase 25, gated), or credential tracking (Phase 26, gated). DairyNZ qualification levels are removed from the competency taxonomy here and preserved as data for Phase 26 — but no credential UI is built now.
</domain>

<decisions>
## Implementation Decisions

### 1. Taxonomy final count — 24 competencies (defer #25; keep Sustainable separate)
- **24 broad competencies** across 6 categories — the operator's primary proposal, exactly:
  - **Livestock (5):** Dairy cattle management · Beef cattle management · Sheep & lamb handling · Animal health & husbandry · Mustering & stockmanship
  - **Cropping & agronomy (4):** Arable & grain production · Vegetable & root crop production · Pasture & forage management · Agronomy & soil management
  - **Machinery & equipment (4):** Tractor operation · Heavy machinery & harvest equipment · Spraying & application equipment · Farm vehicle handling
  - **Farm operations & infrastructure (4):** Fencing & yard construction · Irrigation & water systems · General farm maintenance · Fuel & chemical handling
  - **Management & business (4):** Farm planning & operations management · Staff supervision & leadership · Farm financial management · Compliance & record-keeping
  - **Cross-cutting (3):** Health & safety competency · Sustainable & regenerative practices · Data & farm tech literacy
- **DEFER #25 "Customer & supplier relations"** — operator flagged it optional; it's the weakest fit for "a competency a seeker self-assesses + an employer tags a job with" (soft/relational, harder to gap-analyze). Add in a later taxonomy revision if demand surfaces.
- **KEEP "Sustainable & regenerative practices" as a standalone cross-cutting competency** — do NOT merge into Agronomy (the operator's trim-to-22 option). Rationale: it maps to a distinct training-directory category ("Sustainable & emerging practices") and NZ employers increasingly tag regen/environmental separately; merging would lose train-pillar signal.
- Granular detail (e.g. specific milking systems, specific machinery) lives in job descriptions, NOT the taxonomy.

### 2. Skill metadata model — keep all existing metadata (load-bearing for Phase 24)
- **Keep `seeker_skills.proficiency`** (learning/competent/experienced/expert) — now self-assessed at competency level (e.g. "experienced in Dairy cattle management"), which is more meaningful than per-granular-skill.
- **Keep `seeker_skills.willing_to_learn`** — directly valuable for the train pillar: "willing to learn X" = a training-directory lead in Phase 25.
- **Keep `job_skills.requirement_level`** (required/preferred) — makes Phase 24 gap analysis precise (missing a *required* competency matters more than a *preferred* one).
- No simplification — these already exist, cost nothing to keep, and feed the gated downstream phases. Removing them would discard signal the train pillar wants.

### 3. Future-vertical schema axis — drop `sector` CHECK; `category` primary + `discipline` forward-compat column
- **Drop** the `skills.sector` CHECK constraint (`IN ('dairy','sheep_beef','both')`) — it blocks ag-broad.
- **`category`** becomes the primary controlled axis — the 6 v2.1 categories above. (Mechanism — CHECK constraint vs enum vs lookup table — is Claude's discretion at planning; lean to a controlled vocabulary that's self-documenting and low-maintenance.)
- **Add `discipline` column, default `'agriculture'`** — pre-stages future verticals so v3.0 horticulture / v3.x viticulture expansion is **additive** (insert rows with `discipline='horticulture'`) rather than another schema migration. No CHECK on discipline so verticals add freely. This directly serves the documented per-vertical roadmap.
- All 24 v2.1 competencies seed with `discipline='agriculture'`.

### 4. Admin analytics surface — extend existing /admin dashboard; minimal event-logging foundation
- **Reuse the existing `/admin/*` pattern** (AdminLayout + AdminSidebar + AdminTable + SECURITY DEFINER admin RPCs from migrations 023/033 + the `platform_stats` RPC pattern). Add a new AdminSidebar item (e.g. "Skills" or "Analytics") → a skill-coverage page. NOT a new top-level route outside /admin.
- **ANLY-01 skill-coverage view:** new admin RPC (e.g. `admin_skill_coverage`) returning supply (seeker count per competency) vs demand (job count per competency) — surfaces platform supply/demand gaps. Render via AdminTable.
- **ANLY-02 taxonomy usage:** per-competency seeker/job reference counts (same view or a sibling).
- **ANLY-03 event-logging foundation:** create a generic `analytics_events` table (`event_type`, `entity_id`, `metadata jsonb`, `created_at`) + a minimal admin read surface + a documented event-type naming convention. Phase 23 stands up the table + basic read only — it does NOT build full dashboards. Future phases (24 gap-prompt events, 25 directory-view/lead events) write to it. RLS: admin-only read; writes via RPC/authenticated. **Deliberately minimal** — the event types that matter depend on the gated phases, so over-building dashboards now would be speculation.

### Claude's Discretion
- Exact `category` enforcement mechanism (CHECK vs Postgres enum vs lookup table) — pick the lowest-maintenance self-documenting option at planning.
- Exact admin RPC signatures + AdminTable column layouts.
- `analytics_events` table column details beyond the core 4 + index strategy.
- Old→new skill mapping table format (for the SUMMARY traceability doc).
- Whether category labels live in a `skill_categories` lookup table or inline.

### Migration data handling (decided — low stakes)
- **Clear the 12 test `seeker_skills` rows and let the 3 test seekers re-tag** against the new taxonomy. No value in mapping test data; the 3 seekers are test accounts. `job_skills` is already empty (0 rows). Recompute `match_scores` (3 rows, derived).
- Still produce a documented **old→new mapping table** in the plan SUMMARY for traceability (consolidate / net-new / relocate / drop classes per scoping doc), even though no production data depends on it.

### Migration application (constraint — not a choice)
- New migration is the next in sequence (likely `034_*`). **Apply via Supabase Studio SQL Editor per CLAUDE §2** — the migrations CI path is gated off (§6 pooler auth, blocked on Supabase support). Verify via read-only MCP (`list_migrations`, `pg_proc`, column checks). Backfill the `supabase_migrations.schema_migrations` registry row Studio-side (registry-backfill pattern already used for 023-033). Do NOT rely on `supabase db push`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher if any, planner, executor) MUST read these before planning/implementing.**

### v2.1 scope + taxonomy (authoritative)
- `.planning/v2.1-MILESTONE-SCOPING.md` §Phase 23 — full ~24-competency target list, 6 categories, old→new migration mapping classes (consolidate/net-new/relocate/drop), the `sector` CHECK gotcha, the migration reality check (12 test rows / 0 job_skills)
- `.planning/REQUIREMENTS.md` v2.1 section — TAX-01..05 + ANLY-01..03 acceptance wording
- `.planning/ROADMAP.md` §Phase 23 — goal + 5 success criteria

### Current schema (what's being migrated)
- `supabase/migrations/001_initial_schema.sql` — `skills` table (`sector` CHECK `IN ('dairy','sheep_beef','both')`), `job_skills` (`requirement_level`), `seeker_skills` (`proficiency`, `willing_to_learn`), `match_scores`
- `supabase/migrations/003_skills_seed.sql` — the current ~40 dairy-heavy seed (the consolidation source); includes the 5 DairyNZ Level rows (`category='qualification'`) that relocate to Phase 26
- `supabase/migrations/010_match_scores_precompute.sql` — match-score recompute logic (re-run after migration)

### Migration process constraints
- `CLAUDE.md` §2 — Studio-applied migration path + registry-backfill discipline (pooler CI is gated)
- `CLAUDE.md` §6 — pooler auth blocked (why CI path is unavailable)
- `.planning/v2.0-MILESTONE-AUDIT.md` §6 carryforward + §"018-022 drift" — registry-backfill precedent + the migrations-CI gate

### Admin + codebase patterns to reuse
- `.planning/codebase/STRUCTURE.md` + `.planning/codebase/ARCHITECTURE.md` — /admin layout, AdminTable, SECURITY DEFINER RPC pattern, RLS conventions
- `.planning/codebase/CONVENTIONS.md` — code style, migration naming, RLS helper (`get_user_role`)
- `supabase/migrations/023_admin_rpcs.sql` + `033_admin_doc_rpcs.sql` — admin SECURITY DEFINER RPC pattern + `_admin_gate()` helper
- `src/pages/admin/` (AdminDocumentsQueue.tsx, AdminTable) — admin page + sidebar-item precedent (Phase 21)
- `supabase/migrations/012_platform_stats_rpc.sql` — the platform-stats RPC pattern to mirror for `admin_skill_coverage`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`skills` / `job_skills` / `seeker_skills` / `match_scores` tables** — the migration target; metadata columns (proficiency, willing_to_learn, requirement_level) all kept.
- **Seeker onboarding skill step + job-posting skill step** — existing UIs that select from `skills`; must keep working against the new taxonomy (TAX-04). Find the components that query `skills` (seeker onboarding wizard skill step; job-posting wizard skill step).
- **/admin pattern** — AdminLayout, AdminSidebar (the "Documents" item added in Phase 21 is the precedent for adding a "Skills"/"Analytics" item), AdminTable, `_admin_gate()` SECURITY DEFINER helper, ProtectedRoute requiredRole='admin'.
- **`platform_stats` RPC** — pattern to mirror for `admin_skill_coverage`.

### Established Patterns
- Sequence-prefix migrations (`034_*` next); Studio-applied + registry-backfilled (§2/§6).
- SECURITY DEFINER admin RPCs with `_admin_gate()` + `GRANT EXECUTE TO authenticated`.
- RLS on every table via `get_user_role(auth.uid())`; `analytics_events` needs admin-only read RLS.
- Vitest + RTL + static-source-guard tests (Nyquist nets) — taxonomy migration + admin views should get regression coverage.

### Integration Points
- Migration `034_*` (schema redesign + reseed) — Studio-applied.
- Seeker onboarding wizard skill step + job-posting wizard skill step — re-point at new taxonomy (TAX-04).
- AdminSidebar new item + new admin page(s) + new admin RPC(s).
- `match_scores` recompute after reseed.
</code_context>

<specifics>
## Specific Ideas

- Taxonomy is competency-level, not granular — "a seeker can self-assess and an employer can plausibly tag a job with it." ~24 is the deliberate sweet spot (70+ = noisy gap analysis "you're missing 23 things"; 5-10 = too coarse).
- `willing_to_learn` is explicitly a train-pillar hook for Phase 25 (training leads), not just matching metadata — preserve it with that intent.
- `discipline` column is a deliberate forward-compat investment for the per-vertical roadmap (horticulture v3.0 → viticulture → …) so verticals are additive inserts, not migrations.
- Keep admin analytics minimal in Phase 23 — full dashboards depend on event types the gated phases (24/25) generate; build the foundation, not speculation.
</specifics>

<deferred>
## Deferred Ideas

- **#25 "Customer & supplier relations" competency** — deferred from the 24-set; add in a future taxonomy revision if demand surfaces.
- **Full analytics dashboards** (gap-prompt funnels, directory-view trends, lead conversion) — depend on events generated by gated Phases 24/25; only the `analytics_events` foundation is built now.
- **Credential UI** (DairyNZ levels, GROWSAFE, expiry alerts) — Phase 26 (gated). Phase 23 only *relocates the qualification data out of the competency taxonomy* + preserves it; no credential UI.
- **Skills-gap surfacing** — Phase 24 (gated).
- **Future verticals** (horticulture/viticulture/etc. skills) — v3.0+; the `discipline` column pre-stages them but no non-agriculture skills are seeded now.
</deferred>

---

*Phase: 23-skills-taxonomy-consolidation-admin-analytics*
*Context gathered: 2026-05-29*
