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

## When to revisit this decision

- If the project picks up multiple concurrent contributors writing migrations simultaneously, switch to timestamp-style on disk to avoid number collisions during PR rebasing. At that point, rename all existing migrations as a single atomic commit to keep the directory consistent.
- If the project starts using `supabase db push` / `supabase migration new` workflows directly (CLI-driven, not MCP-driven), the CLI will generate timestamp filenames on disk; align with that and rename existing files in one pass.
