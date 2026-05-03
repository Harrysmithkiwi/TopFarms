# Supabase support ticket — update message (2026-05-03)

**Purpose:** verbatim text to paste as a follow-up reply on the existing open Supabase support ticket (originally re: pooler password auth, project `inlagtgpynemhipnqvty`). This is an **update to that ticket**, not a new ticket — the finding below shares the same project ref and is informational for the platform team.

**Paste-from-here ↓ ↓ ↓ (everything between the rules)**

---

Hi team — adding a separate finding to this ticket as it shares the same project ref. This is informational; we've already remediated client-side. Happy to file as a separate ticket if you'd prefer.

**Project ref:** `inlagtgpynemhipnqvty`

**Finding:** four consecutive migrations (011, 012, 013, 014) were observed in a state we're calling "phantom-applied" — `supabase_migrations.schema_migrations` had a row for each (with the full SQL body recorded in the `statements` column, suggesting each ran via `apply_migration` or `db push` historically), but the runtime schema effects were absent in the live database.

**Evidence summary:**

- Registry side (read via `SELECT version, name FROM supabase_migrations.schema_migrations`): all four rows present with non-empty `statements`.
- Schema side: columns the migrations declared on `placement_fees`, `employer_profiles`, `jobs`, `seeker_profiles` were missing; `platform_stats()` RPC was absent; cron schedule from 011 §3 was unregistered; `ownership_type` column had not been converted from scalar text to `text[]`.
- The four affected migrations are a contiguous range (011–014). Migrations 001–010 and 015–020 were intact (registry + schema in agreement). The contiguous range is what made us think this is a single event rather than four independent failures.

**Timeframe:**

- Migrations 011–014 were committed to the project repo between 2026-03-17 and 2026-03-21.
- Migration 015 was committed 2026-03-22 with intact schema effects observed today.
- Drift discovered 2026-05-03.
- Event window: between 2026-03-22 and 2026-05-03 (~6 weeks).

**Hypothesis (informational):** the contiguous registry-as-applied + schema-not-applied range is consistent with a database restoration from a snapshot taken before migrations 011–014 were applied, with the `supabase_migrations.schema_migrations` rows for those migrations preserved separately (e.g., a partial-table restore or registry re-import on top of an older snapshot).

**Question:** is there any platform event — managed restore, region migration, snapshot-based recovery, automated maintenance — between 2026-03-22 and 2026-05-03 on `inlagtgpynemhipnqvty` that could explain this pattern? We have no record of initiating a restore on our side, but we're a single-developer project so it's possible a restore happened we weren't aware of.

Worth noting: the original ticket on this thread (pooler password not propagating after reset) shares the project ref and timeframe. If both symptoms trace to the same platform event, the diagnosis may be unified — but flagging as possibility, not assertion.

**Remediation already complete:** we've re-applied the four migrations via the SQL Editor with pre-flight guards (verifying state was still as observed, not since-diverged) and post-verify checks. All schema effects are now in place. We did **not** insert new registry rows because the original rows were never wrong — only the schema effects went missing.

**Why we're flagging this even though it's remediated:** if a platform event caused this, other projects could be affected silently (the registry says "applied", schema says "no", and `pg_net` / cron / RPC failures from missing artefacts can be silent). We can share more detail (specific migration SQL, before/after schema dumps, exact timestamps from `pg_stat_activity` or audit logs) if useful.

No urgency on response time — schema is reconciled and we're operating around the original auth issue via the SQL Editor and Management API paths.

Thanks!

---

**Notes for Harry (do not paste):**

- If the support agent asks for the migration bodies: they are at `supabase/migrations/011_placement_fee_followups.sql`, `012_platform_stats_rpc.sql`, `013_phase8_wizard_fields.sql`, `014_ownership_type_array.sql` in the project repo (commits from 2026-03-17 to 2026-03-21).
- If they ask for evidence of the registry-vs-schema mismatch: the prior session transcript captured the read queries; can be re-run via Supabase MCP read-only against `inlagtgpynemhipnqvty` if needed.
- If they confirm a platform event: log it in `.planning/DRIFT-AUDIT-2026-05-03.md` §"Pattern hypothesis" (replace "awaiting Supabase support confirmation" with the confirmed cause). If they don't find one: document that too — non-finding is also useful evidence.
- The original ticket subject (pooler password auth) is unrelated to this finding at the symptom level; if support feels strongly about ticket hygiene, they may ask you to file separately. The opening sentence offers that.
