# TopFarms — Comprehensive Drift Audit (2026-05-03)

**Purpose:** canonical record of the schema/registry/source-of-truth audit performed 2026-05-03 across all 9 layers, the four phantom-applied migrations discovered (011/012/013/014), the BLOCK 1/2/3 reconciliation applies, and post-remediation drift state.

**Read with:** `STATUS-2026-05-03.md` (session accomplishments), `supabase/migrations/NAMING.md` §"Phantom-applied migration class" (pattern doc), `SENSE_CHECK_AUDIT_2026-05-01.md` correction note (downstream re-framing of UXBUG-01).

---

## TL;DR

Four consecutive migrations (011/012/013/014) were discovered in a "phantom-applied" state: `supabase_migrations.schema_migrations` had full registry rows (with SQL bodies recorded), but the runtime schema effects were absent. Pattern is consistent with a database restoration from a snapshot taken before these migrations were committed, with the registry rows preserved separately.

All four were reconciled via Studio SQL (BLOCK 1/2/3 sequence). Post-remediation, all 9 audit layers are clean. One additional drift item — `rls_auto_enable` function + `ensure_rls` event trigger — was captured into version control as migration 021 (this session, commit `daedb41`).

Open follow-ups carried to Phase 18 — root cause investigation pending Supabase support response, performance advisor cleanup (~115 lints), three documentation/posture items.

---

## Audit Method

9 layers checked, all read-only via Supabase MCP (`--read-only` ON throughout):

1. Migration files on disk (`supabase/migrations/*.sql`)
2. Migration registry (`supabase_migrations.schema_migrations`)
3. Schema state (`information_schema.columns` / `pg_constraint` / `pg_index`)
4. Functions and procedures (`pg_proc`)
5. Triggers (`pg_trigger`, `pg_event_trigger`)
6. Extensions (`pg_extension`)
7. RLS policies (`pg_policies`)
8. Cron schedules (`cron.job`)
9. Edge Functions deployed vs. on-disk source

Each layer was compared against the others; mismatches enumerated and triaged.

---

## Phantom-applied Migrations

| Migration | Discovered via | Registry state | Schema state | Remediation |
|---|---|---|---|---|
| 011 placement_fee_followups (§1 columns) | Drift Item C cron-not-scheduled | row + body present | columns absent on `placement_fees` | BLOCK 3 §1 |
| 011 placement_fee_followups (§3 cron) | Same | (above) | cron schedule absent | BLOCK 3 §3 |
| 012 platform_stats_rpc | HOMEBUG-01 root-cause | row + body present | RPC `platform_stats()` absent | BLOCK 3 §2 |
| 013 phase8_wizard_fields | UXBUG-01 root-cause | row + body present | wizard columns absent across `employer_profiles`, `jobs`, `seeker_profiles` | BLOCK 1 |
| 014 ownership_type_array | Cascade from 013 | row + body present | `ownership_type` still scalar text | BLOCK 2 |

**Discovery sequence:** UXBUG-01 (Step7Preview reads "dropped" columns) → schema check showed 013 columns weren't actually dropped → 014 cascading discovery → 011 surfaced during cron-schedule drift check → 012 surfaced during HOMEBUG-01.

**Pattern hypothesis (informational, awaiting Supabase support response):** consecutive registry-as-applied + schema-not-applied for migrations 011–014 (committed 2026-03-17 to 2026-03-21 per git log) is consistent with a database restore from a snapshot pre-dating commit of 015 (2026-03-22), with `supabase_migrations.schema_migrations` rows preserved separately. No alternative hypothesis (manual schema rollback, partial CLI failure) explains the contiguous range. Event window: 2026-03-22 to 2026-05-03 (~6 weeks).

---

## Reconciliation (BLOCK 1/2/3)

Applied via Supabase Studio SQL Editor with pre-flight guards (CLAUDE.md §2). All three blocks landed cleanly with post-verify passes.

- **BLOCK 1** — re-applied 013 (wizard fields across `employer_profiles` / `jobs` / `seeker_profiles`). Pre-flight verified columns absent; post-verify confirmed columns present with correct types.
- **BLOCK 2** — re-applied 014 (`ownership_type` scalar text → `text[]`). Pre-flight verified column type unchanged; post-verify confirmed array conversion landed.
- **BLOCK 3** — re-applied 011 §1 + §3 + 012 (`placement_fees` columns + cron schedule + `platform_stats()` RPC). Pre-flight verified absent; post-verify confirmed schema artefacts present and cron schedule registered.

Evidence (SQL bodies, Studio outputs, post-verify results) captured in prior session transcript.

---

## Post-Remediation Drift State

All 9 layers verified clean as of 2026-05-03:

| Layer | State | Notes |
|---|---|---|
| Migration files | 21 files (001–021) | 021 added this session |
| Registry | 21 rows | Includes `20260503000000 / 021_rls_auto_enable_capture` (Studio-applied + manual registry insert per CLAUDE.md §2 / NAMING.md §"Registry Repair") |
| Schema | matches all migrations | 011/012/013/014 reconciled |
| Functions/procedures | matches | `rls_auto_enable` now declared (021) |
| Triggers | matches | `ensure_rls` event trigger now declared (021) |
| Extensions | matches | pg_net, pg_cron, pgcrypto present |
| RLS policies | matches all migrations | |
| Cron schedules | matches | `placement-fee-followup-job` scheduled (re-applied via BLOCK 3) |
| Edge Functions | 9 deployed = 9 in source tree | |

---

## Drift Items — Resolved This Session

- **Drift Item A** (`rls_auto_enable` function + `ensure_rls` event trigger not in any migration) — captured as `021_rls_auto_enable_capture.sql`, commit `daedb41`.
- **Drift Item C** (cron schedule for `placement-fee-followup-job` not registered) — resolved by BLOCK 3 §3 (re-application of 011 §3).

## Drift Items — Carried to Phase 18

- **011/012/013/014 root cause** — pending Supabase support response (open ticket, amended this session — see `SUPABASE-TICKET-UPDATE-2026-05-03.md`).
- **Performance advisor lints** (~115 total: 33 `auth_rls_initplan` + 14 `unindexed_foreign_keys` + others) — non-blocking, deferred.
- **`jobs.benefits` jsonb vs text[]** — 013 declared `text[]`, live schema has `jsonb`. Functionally equivalent at JS layer; document the intent-vs-reality mismatch.
- **`couples_welcome` (boolean) vs `accommodation_extras['Couples welcome']` (text[] member)** — confirm semantic distinction (boolean preference vs accommodation feature) and document intended source-of-truth.
- **Stripe production-mode posture** — pre-launch checklist gap; `.env.example` doesn't document Stripe vars; live-mode confirmation has no artefact in `.planning/`.

---

## References

- Stage 4 commit: `daedb41` — captures `rls_auto_enable` + `ensure_rls` (this session)
- Stage 4 file: `supabase/migrations/021_rls_auto_enable_capture.sql`
- Stage 4 frontend simplification: `d5e8dfc` — Step7Preview defensive reads removed (separate from BLOCK 1/2/3 — frontend follow-up after the BLOCKs landed)
- CLAUDE.md §2 (Studio SQL Editor protocol), §6 (diagnostic-before-rotation), §7 (partial-close discipline)
- `supabase/migrations/NAMING.md` §"Phantom-applied migration class" (added this session, commit 1)
- Supabase support ticket — amended this session (see `.planning/SUPABASE-TICKET-UPDATE-2026-05-03.md`)
