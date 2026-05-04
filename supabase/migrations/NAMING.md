# Migration naming convention

**Decision:** disk filenames use **sequence-prefix style** (`NNN_short_name.sql`). The live Supabase registry uses **timestamp-style versions** (`YYYYMMDDHHmmss`) generated at apply-time by the Supabase CLI / MCP. The two systems are intentionally decoupled.

---

## Why two conventions co-exist

When a migration is applied via `mcp__supabase__apply_migration`, the tool takes the SQL body + a name and stores it under a CLI-generated timestamp version. The disk filename is *not* preserved as the live version ID — it is a project-side organisational artefact only.

So the disk-side choice and the live-side choice are independent. There is no way to make the live registry use sequence-prefix versions without bypassing the CLI/MCP and writing directly to `supabase_migrations.schema_migrations`, which is more risk than the cosmetic gain is worth.

## Why sequence-prefix on disk

- All 20 existing migrations (`001_initial_schema.sql` through `020_seeker_documents_employer_policy.sql`) already use sequence-prefix consistently. Switching mid-project is churn for no functional gain.
- Sequence-prefix is more readable in `ls` / `git log` / `git diff` output. Ordering at a glance.
- Solo-contributor project — there's no concurrent-author collision risk that timestamp-style is designed to solve.
- `git blame` history on this directory follows the sequence-prefix pattern; preserving it keeps the history coherent.

## Convention for new migrations

- File: `NNN_short_descriptive_name.sql` where `NNN` is the next zero-padded sequential number.
- Always wrap in `BEGIN; ... COMMIT;` so partial failure rolls back cleanly.
- Use `IF NOT EXISTS` / `NOT EXISTS` guards where idempotency matters.
- Apply via `mcp__supabase__apply_migration({ name: 'NNN_short_descriptive_name', query: <sql> })`. The `name` argument should match the disk filename's stem (no extension, no path). Supabase will assign its own timestamp version automatically.

## Lookup table (disk filename → live registry)

Verified against `mcp__supabase__list_migrations` on 2026-04-29. Migrations 001–015 use plain integer versions (pre-MCP era); 018+ use CLI-generated timestamps.

| Disk filename | Live version | Live name | Applied | Notes |
|---|---|---|---|---|
| `001_initial_schema.sql` … `015_phase9_schema.sql` | `001` … `015` | unprefixed (`initial_schema`, etc.) | various 2026-03 | Plain integer versions, name has no `NNN_` prefix |
| `016_phase11_backend_features.sql` | **NOT IN REGISTRY** (runtime artefacts presumably present — Phase 11 features have been working in production) | — | applied via non-MCP path (likely Studio / Dashboard) before 2026-04-29 | Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows — that table is only updated by CLI / MCP `apply_migration`. So `list_migrations` is not the full source of truth for what's deployed. |
| `017_notify_job_filled_webhook.sql` | **NOT IN REGISTRY** (runtime artefacts confirmed: pg_net extension, public.handle_job_filled function, on_job_filled trigger on public.jobs) | — | applied via Studio SQL Editor 2026-04-29 (cleanup-session) | Same Studio-vs-registry pattern as 016. Apply was forced via Studio because `/mcp Reconnect` doesn't respawn the MCP subprocess with new `--read-only` args — see CLAUDE.md rule 2 for the corrected protocol. |
| `018_set_user_role_rpc.sql` | `20260428043338` | `set_user_role_rpc` | 2026-04-28 (cdc9df7) | AUTH-02 fix. `name` was passed without `018_` prefix. |
| `019_seeker_documents.sql` | `20260428053314` | `019_seeker_documents` | 2026-04-28 (5a228e0) | BFIX-03. `name` was passed *with* `019_` prefix. |
| `020_seeker_documents_employer_policy.sql` | `20260429031148` | `seeker_documents_employer_policy` | 2026-04-29 (e8f0882) | BFIX-02 employer SELECT RLS policy. `name` was passed without `020_` prefix. |
| `023_admin_rpcs.sql` | **NOT IN REGISTRY** (runtime artefacts confirmed: `public.admin_audit_log`, `public.admin_notes`, `public.admin_metrics_cache` tables, `public.user_roles.is_active` column, 10 `admin_*` SECURITY DEFINER RPCs, `public._admin_gate` helper) | — | applied via Studio SQL Editor 2026-05-04 (Phase 20 plan 20-02) | Studio path chosen per CLAUDE.md §2 to avoid the `/mcp Reconnect`/restart cycle for `--read-only` flip. Same Studio-vs-registry pattern as 016 + 017. RLS not widened: 6 baseline row counts (jobs_active, match_scores, applications, jobs, employer_profiles, seeker_profiles) identical pre/post — empirical ADMIN-RLS-NEG-1/2 ground truth (see `.planning/phases/20-super-admin-dashboard/20-02-SUMMARY.md`). |

### Going-forward convention for the `name` argument

Existing data shows drift: 018 and 020 omitted the `NNN_` prefix, 019 included it. Going forward: **the `name` argument to `apply_migration` should match the disk filename stem (with `NNN_` prefix, without `.sql` extension)**. Example for the next migration:

```ts
mcp__supabase__apply_migration({
  name: '021_short_descriptive_name',         // matches disk: 021_short_descriptive_name.sql
  query: <SQL body>,
})
```

This makes the live `name` field self-describing and matches the disk filename — no cross-reference needed for human inspection of the registry.

Update the lookup table above when applying a new migration. For migrations 001–017, the live versions match the disk numbering closely enough that no per-row lookup is needed beyond the deploy-gap notes already captured.

## Supabase Migration Registry Repair

When `supabase migration repair` CLI fails due to filename-vs-registry drift (sequence-prefix on disk, timestamp in remote), repair via Supabase Studio SQL Editor:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('<timestamp>', '<filename-stem>', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;
```

**Why CLI repair fails for this project:** `supabase migration repair` attempts to glob-match disk files by version ID. TopFarms uses sequence-prefix naming on disk (`018_set_user_role_rpc.sql`); MCP-applied migrations generate timestamp version IDs (`20260428043338`). These two conventions are incompatible with the CLI's file-glob matching logic — the CLI cannot find a file named `20260428043338*.sql` and errors out.

**Verify with:**
```sql
SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '<timestamp>';
```

**Example (executed 2026-05-01, plan 15-03):**
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260428043338', 'set_user_role_rpc', ARRAY[]::text[]),
  ('20260428053314', '019_seeker_documents', ARRAY[]::text[]),
  ('20260429031148', 'seeker_documents_employer_policy', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;
```

Full incident record and verification SELECT output: `.planning/phases/15-email-pipeline-deploy/15-03-EVIDENCE/registry_repair_method.md`

Established in plan 15-03. See also CLAUDE.md §2 (MCP `--read-only` flag-flip protocol).

---

## Phantom-applied migration class

A migration is **phantom-applied** when `supabase_migrations.schema_migrations` has a row for it (with `statements` column containing the full SQL body) but the schema effects are absent from the live database. The registry says "applied"; the schema says "no it didn't."

**Detection:** mismatch surfaces when comparing layers — registry row exists, but `information_schema.columns` / `pg_proc` / `cron.job` / etc. don't reflect the migration's effects. Comprehensive 9-layer audit recommended (migration files / registry / schema / functions / triggers / extensions / RLS / cron / Edge Functions). See `.planning/DRIFT-AUDIT-2026-05-03.md` §"Audit Method" for the layer list.

**Pattern hypothesis (2026-05-03 incident):** consecutive registry-as-applied + schema-not-applied for migrations 011–014 was consistent with a database restore from a snapshot pre-dating the migrations, with the registry rows preserved separately. Awaiting Supabase support confirmation.

**Distinct from the 016/017 class above:** 016/017 had files on disk + schema effects in place + no registry rows (Studio-applied without registry insert). Phantom-applied is the inverse — registry rows present + schema effects absent.

**Remediation pattern:** re-apply the migration body via Supabase Studio SQL Editor with a pre-flight guard that aborts cleanly if state has diverged since the investigation. The guard checks **both directions** — target state absent AND prerequisite source state present — so a re-run against an already-reconciled DB or against a DB that has drifted further does not silently re-apply or partially apply.

```sql
-- Pre-flight guard: bidirectional state check
DO $guard$
BEGIN
  -- Abort if target state already present (migration appears already applied)
  IF EXISTS (<state-check matching what the migration would create>) THEN
    RAISE EXCEPTION 'Pre-flight: target state already present — investigation outdated. Halting.';
  END IF;

  -- Abort if prerequisite source state missing (schema not in expected pre-migration state)
  IF NOT EXISTS (<state-check confirming migration's prerequisites>) THEN
    RAISE EXCEPTION 'Pre-flight: schema not in expected pre-migration state. Halting.';
  END IF;
END;
$guard$;

-- Migration body verbatim from the original NNN_*.sql file
-- (drop inner BEGIN/COMMIT inside Studio paste — Studio's implicit
-- transaction wraps the whole script; explicit BEGIN raises a
-- "transaction already in progress" warning. See CLAUDE.md §2.)
<migration body sans wrapper BEGIN/COMMIT>

-- Post-verify: confirm migration body produced expected state
DO $verify$
BEGIN
  IF NOT EXISTS (<state-check confirming migration landed>) THEN
    RAISE EXCEPTION 'Post-verify failed: migration body did not produce expected state.';
  END IF;
  RAISE NOTICE 'Post-verify OK.';
END;
$verify$;
```

**Critical:** do NOT INSERT into `supabase_migrations.schema_migrations` for a phantom-applied re-apply. The original row is still there and still valid (the registry was never wrong; the schema effects went missing, not the registry record). This distinguishes phantom-applied remediation from the registry-repair pattern above (which is for the inverse drift class).

**Precedent:** 2026-05-03 — migrations 011/012/013/014 reconciled via BLOCK 1/2/3 sequence. Full evidence in `.planning/DRIFT-AUDIT-2026-05-03.md`.

---

## When to revisit this decision

- If the project picks up multiple concurrent contributors writing migrations simultaneously, switch to timestamp-style on disk to avoid number collisions during PR rebasing. At that point, rename all existing migrations as a single atomic commit to keep the directory consistent.
- If the project starts using `supabase db push` / `supabase migration new` workflows directly (CLI-driven, not MCP-driven), the CLI will generate timestamp filenames on disk; align with that and rename existing files in one pass.
