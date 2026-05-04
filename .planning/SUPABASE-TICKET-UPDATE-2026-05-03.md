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

---

# Supabase support ticket — update 2 (2026-05-04)

**Purpose:** verbatim text to paste as a follow-up reply on the same support ticket. Adds two more platform-side state-shifts discovered 2026-05-03 evening during empirical testing of the trigger→Edge Function chain (Phase 15-02 MAIL-02 closeout). Same drift class as the four-phantom-applied-migrations finding above; appears to be the same underlying pattern of "platform changed, app silently broke, surfaced only when empirical fire happened."

**Paste-from-here ↓ ↓ ↓ (everything between the rules)**

---

Quick follow-up on the previous update — two more platform-state-shifts surfaced last night during empirical testing of `notify-job-filled`. Same project ref `inlagtgpynemhipnqvty`. Same class as the 011–014 phantom-applied finding. Both remediated client-side; flagging in case they're useful to your platform team for cross-project pattern detection.

**Finding 1 — `pg_net.http_post` signature drift:**

Migration 017 (committed 2026-04-03) calls `net.http_post(url := ..., headers := ..., body := payload::text)` from a trigger function. As of 2026-05-03 (pg_net `0.20.0` in our project per `SELECT extversion FROM pg_extension WHERE extname='pg_net'`), only the `body jsonb` overload exists — the `body text` overload has been removed. Every trigger fire since 017's deploy errored with:

```
function net.http_post(url => text, headers => jsonb, body => text) does not exist
```

The trigger error rolled back the underlying `UPDATE jobs SET status='filled'` in PostgREST, so employers' "Mark as filled" actions silently failed — but the symptom looked like a UI bug rather than a platform shift. Empirical fire surfaced the actual cause.

**Fix client-side:** drop `::text` cast (migration 022). pg_net 0.20.0's `body jsonb` accepts our `jsonb_build_object(...)` payload directly.

**Question:** when did the `body text` overload get removed? It would be useful to know so we can audit other projects with similar trigger-uses-pg_net patterns.

**Finding 2 — Legacy JWT rejection at Edge Functions gateway:**

After Finding 1 was fixed, the next fire produced a 401 from the gateway:

```
status_code: 401
body: {"code":"UNAUTHORIZED_LEGACY_JWT","message":"Invalid JWT"}
```

The bearer token being rejected is the project's `service_role` JWT (fetched from Project Settings → API). That JWT is in legacy HS256 format. The gateway appears to have been migrated to require non-legacy (asymmetric ES256/JWKS) JWTs for `verify_jwt:true` Edge Functions — but Project Settings → API still exposes the legacy HS256 service_role key with no migration prompt or warning.

**Fix client-side:** flipped `verify_jwt = false` in `supabase/config.toml` for the two server-side functions (`notify-job-filled`, `send-followup-emails`) and redeployed. Functions called from authenticated browsers (employer flows) keep `verify_jwt = true` — those use user-session JWTs which apparently work fine, only `service_role` legacy JWTs are rejected.

**Question:** is there a way to migrate this project's `service_role` key to the new asymmetric format from the dashboard, so we can flip those functions back to `verify_jwt = true` without losing defence-in-depth? Project Settings → API doesn't surface a JWT signing key migration UI in this project.

**Pattern across all five findings:**

Combining the previous update (011–014 phantom-applied) with these two:

1. Schema effects of 011 / 012 / 013 / 014 missing despite registry rows present (April–May timeframe)
2. `pg_net.http_post` `body text` overload removed (between 017 deploy 2026-04-03 and 2026-05-03)
3. Edge Functions gateway started rejecting legacy HS256 `service_role` JWTs (between BFIX-05 audit 2026-04-29 and 2026-05-03)

Plus two related operational gaps that surfaced in the same testing session (not necessarily platform-caused, but in the same neighbourhood):

4. `vault.secrets` was empty — migration 017's trigger reads `(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='supabase_url')` and got NULL, propagated to a NULL URL, pg_net rejected on not-null constraint. (We hadn't populated the vault when 017 deployed; flagging because the failure mode is silent and worth documenting somewhere prominent if other projects use this pattern.)
5. The original ticket symptom — pooler password reset not propagating — is the fifth in the same window.

**Common thread:** in every case the symptom was silent at the user-facing layer ("nothing happened" / "auth failed"), and the root cause was platform-level state that had drifted between when the code was written/deployed and when it was actually exercised. We discovered all of this only after empirical fires; deploy-state inspection alone never caught any of them.

**Useful for your team?** If your support team has visibility into deployment events, extension version bumps, or auth-system migrations on `inlagtgpynemhipnqvty` between 2026-04-03 (migration 015 commit) and 2026-05-03, correlating those against our timeline might surface a single root event. Happy to share specific timestamps from `net._http_response` and Edge Function logs if useful.

No urgency. Production is now functioning end-to-end (MAIL-01/02 verified empirically with DKIM=pass headers; PRIV-02 privacy gate verified empirically). Just flagging the pattern in case it helps elsewhere.

Thanks!

---

**Notes for Harry (do not paste):**

- This update can be sent as a single reply to the same ticket. If support has already responded to the 2026-05-03 update, paste this as a follow-up to that reply rather than a fresh thread.
- If support asks for the specific Edge Function logs / pg_net entries: `notify-job-filled` v5 deployment timestamp + `net._http_response` rows id 3 (401 UNAUTHORIZED_LEGACY_JWT, 2026-05-03 11:52:36 UTC) and id 4 (200 success, 2026-05-03 12:01:46 UTC) are the empirical evidence. All read-only via MCP if needed.
- Phase 18 entries 15–18 in ROADMAP.md track the client-side hardening work that complements whatever support's response is. Entry 16 specifically tracks the JWT signing key migration question.
- If support confirms a single platform event behind some/all five findings: log it in `.planning/DRIFT-AUDIT-2026-05-03.md` §"Pattern hypothesis" (replace "awaiting Supabase support confirmation" with the confirmed cause). If they confirm separate causes: document each separately. Either way, useful evidence for the v2.0 retrospective.
