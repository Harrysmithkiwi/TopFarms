# AUTH + BFIX-05 Retro — Multi-Session Saga

**Period:** 2026-04-26 → 2026-04-29
**Phases involved:** 12 (OAuth), 14-01 (JOBS-01 fallout), out-of-band AUTH-FIX, AUTH-02, BFIX-05
**Closing commits:** `2fce4b7` (AUTH-FIX), `cdc9df7` (AUTH-02), `da74ced` (docs close), `e8f0882` (Phase 14 close inc. BFIX-05)

> **Operational checklist: see `CLAUDE.md` at repo root.** This retro is the prose explaining *why* each rule earned its place.

This retro exists so future-Claude doesn't re-derive these lessons.

---

## Why this saga happened

Auth in this project is a layered system: Supabase Auth (`auth.users`) → DB trigger (`handle_new_user`) → `user_roles` table → React `AuthContext` → Edge Functions verifying caller identity. The bugs that surfaced over these sessions all came from cross-layer impedance mismatches. None were single-component bugs.

The work landed in roughly three arcs:

1. **AUTH-FIX** — React-layer Web Lock contention from 22 components each running their own `useAuth`. Symptom: indefinite `useAuth.loading` hangs after login on certain pages.
2. **AUTH-02** — DB-layer `user_roles` row missing for some signups; SelectRole client INSERT silently failing under RLS.
3. **BFIX-05** — Edge-Function-layer JWT validation mismatch: `adminClient.auth.getUser(token)` rejects valid ES256 tokens when the client is keyed with the service role.

Each arc had its own diagnostic chain. Each was load-bearing. Each fix was pre-empted at least once by a "fix" that addressed the symptom rather than the cause.

---

## Arc 1 — AUTH-FIX (Web Lock contention)

### Symptoms
- Inconsistent: some logged-in users hit `useAuth.loading` and stayed there.
- Reproducible only with React StrictMode + concurrent page mounts.
- Logs showed `AbortError: Lock 'lock:sb-<…>-auth-token' was stolen`.

### First "fix" (c6066ea)
Wrapped `loadRole` in a 3s `Promise.race` timeout and `.catch()` on the `getSession` chain. Mitigated symptom, did not address the cause. **Useful as defence-in-depth but should not have closed the bug.**

### Root cause (2fce4b7)
22 separate `useAuth()` instances each owned their own `getSession + onAuthStateChange + loadRole` chain. With StrictMode double-mounts and concurrent page mounts, up to 8 simultaneous `loadRole` queries competed for the same `auth-token` Web Lock, producing lock-stealing and indefinite hangs.

### Fix
Single `AuthProvider` at the root mounts the auth subscription once. All 22 callers now read from a shared context. Hook signature unchanged so no caller required modification.

**Multi-tab safety:** `onAuthStateChange` skips `loadRole` on `TOKEN_REFRESHED` (cross-tab token sync events). `loadRoleWithTimeout` returns a discriminated outcome so a 3s timeout preserves the previous role rather than clobbering it to null (which had been bouncing logged-in tabs to `/auth/select-role`).

**Defence kept:** the c6066ea timeout + catch live inside the new provider. They don't fix the bug, but they make the provider robust against any future supabase-js internal hang.

### Lesson
**A defence-in-depth fix and a root-cause fix look similar at the symptom level.** When a "fix" lands, ask: "is the failure mode now impossible, or just less likely?" If just less likely, keep digging.

---

## Arc 2 — AUTH-02 (`user_roles` missing rows + SelectRole RLS)

### Symptoms
- One user (harry.symmans.smith) had no `user_roles` row after email signup. `handle_new_user` trigger should have created it.
- OAuth users picking a role on `/auth/select-role` saw no error but role didn't persist.

### Root causes
1. **Trigger reliability:** the `handle_new_user` trigger is sound, but a single observation of a missing row is enough to warrant defensive belt-and-braces. Under prod (email confirmation ON) the trigger handles row creation reliably; the defensive path is reserve coverage for any future email-confirmation-OFF flow or trigger regression.
2. **SelectRole client INSERT under RLS:** `SelectRole.tsx` was attempting a direct `from('user_roles').insert(...)` from the client. With RLS on and only a SELECT policy, that INSERT was either silently rejected or conflicting with the trigger's auto-created default `'seeker'` row. Either way, the chosen role didn't persist.

### Fix (cdc9df7)
- **Migration 018** adds `set_user_role` RPC: `SECURITY DEFINER` UPSERT, idempotent, validates `auth.uid()` non-null, validates `role IN ('employer', 'seeker')` (deliberately excludes `'admin'` so users can't self-promote).
- **AuthContext `signUpWithRole`:** read `user_roles` after signup and backfill via the new RPC if the trigger row is missing. Surfaces a clear `AuthError` on backfill failure.
- **SelectRole.tsx:** swap direct INSERT for `set_user_role` RPC.

### UAT outcomes
- Cases 1, 2 (signup → row): PASS via synthetic INSERT (form-based UAT blocked by Supabase email rate-limit, but the trigger pathway is unchanged in this commit).
- Case 5 (idempotency): PASS — same-role re-call returns void, no row mutation.
- Cases 6.1/6.2/6.3 (negative — anon, `'admin'`, `'garbage'`): PASS — all raise expected exceptions.
- Case 4 (OAuth integration): deferred to UAT-04 (logged in REQUIREMENTS.md "Deferred Validations").

### Lesson
**RLS turns `INSERT` failures into silent no-ops.** Any INSERT/UPSERT from the client into a table with RLS-but-no-INSERT-policy is a bug waiting to surface. Use `SECURITY DEFINER` RPCs for state changes that must happen regardless of the caller's row-policy reach.

---

## Arc 3 — BFIX-05 (Edge Function gateway-trust JWT decode)

### Symptoms
- Phase 14-03's `get-applicant-document-url` Edge Function rejected every employer request with `401 Invalid auth token`, even with a valid Bearer.
- Token decoded fine in jwt.io. Token passed gateway `verify_jwt: true` (function reached the handler — confirmed via deploy logs).

### Diagnostic chain — three rounds

**Round 1 — naive deploy.** Function used `await adminClient.auth.getUser(token)` to validate the JWT and pull the caller `sub`. This is the documented pattern for non-`verify_jwt` functions. Failed empirically: 401 on every call.

**Round 2 — assumed token format issue.** Hypothesis: maybe the gateway is stripping/replacing the JWT. Tried logging the token, comparing to client-side, and re-running. Token was identical. Rejected hypothesis.

**Round 3 — empirical test against the real failure mode.** Read the function logs. The error wasn't "invalid signature" — it was the auth API returning a generic auth error. Tested the same token via a fresh anon-keyed client (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`) and `auth.getUser` succeeded. Tested via the service-role-keyed `adminClient` and it failed. **The bug was that service-role-keyed clients route the `/auth/v1/user` call differently** — the auth API rejects valid ES256 user tokens when called from a service-role context.

### Fix
Trust the gateway's `verify_jwt: true` (which has already validated signature upstream of the handler) and decode the JWT payload locally:

```ts
const payload = JSON.parse(
  atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
)
if (payload.aud !== 'authenticated') throw new Error('Token audience is not user-scoped')
const callerUserId = payload.sub
```

Reference implementation: `supabase/functions/get-applicant-document-url/index.ts:75-94`.

### Lesson
**The "documented pattern" assumes a non-service-role-keyed client.** When you use a service-role key (because you need admin-level data access for relationship walks), you are NOT on the documented path for `auth.getUser`. The signature validation has already happened at the gateway. Re-validating is both redundant and broken. Trust the gateway, decode locally.

This pattern is now codified in CLAUDE.md item 5 and is the recommended approach for any future `verify_jwt: true` Edge Function in this codebase.

---

## What worked across all three arcs

1. **Diagnose before fix.** Each arc had at least one "fix" attempt that addressed a symptom, not a cause. The wins came from refusing to close the bug until the failure mode was *impossible*, not just less likely. This is now CLAUDE.md item 3.

2. **Read actual logs / outputs vs. assume.** Round 3 of BFIX-05 only worked because we read the actual function logs and noticed the error didn't match the "invalid signature" assumption. The earlier rounds had assumed; the winning round measured.

3. **Defence-in-depth kept, even after root-cause fix.** AUTH-FIX preserved c6066ea's 3s `loadRoleWithTimeout` and `.catch` even after the single-provider fix landed. They don't fix the original bug but they're cheap insurance for future supabase-js regressions and multi-tab edge cases. **Don't strip safety nets when you find the root cause** — the safety net wasn't the bug.

4. **Atomic commits per fix arc.** Each arc landed in one commit with full context in the body. The three closing commits (`2fce4b7`, `cdc9df7`, `da74ced`) are independently revertible and each tells one story. This is now CLAUDE.md item 4.

---

## Cross-references

- **CLAUDE.md** (repo root) — operational checklist of the standing rules these arcs produced.
- **`src/contexts/AuthContext.tsx`** — single-provider auth state (AUTH-FIX).
- **`supabase/migrations/018_set_user_role_rpc.sql`** — `SECURITY DEFINER` role RPC (AUTH-02).
- **`src/pages/auth/SelectRole.tsx`** — RPC-based role persistence (AUTH-02).
- **`supabase/functions/get-applicant-document-url/index.ts:75-94`** — gateway-trust JWT decode pattern (BFIX-05).
- **REQUIREMENTS.md "Deferred Validations"** — UAT-04 (OAuth round-trip) and PRIV-02 (B.9 identity-bypass) are public-launch blockers carried forward.

---

## Open carryforwards

- **UAT-04** — Google OAuth → SelectRole → `user_roles` round-trip empirical test. ~5 min. Run before MVP public launch or on first real OAuth user.
- **PRIV-02** — B.9 identity-bypass empirical test against deployed `get-applicant-document-url`. Public-launch blocker. Test snippet + expected response in REQUIREMENTS.md.
- **DEPLOY-01** — 4 Edge Functions on disk are not deployed live (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`). Migration 017 was applied in cleanup-session via Studio (the trigger is now live; `notify-job-filled` Edge Function deploy still pending — trigger fires-but-fails-silently until then).

---

## Footnote: MCP `--read-only` flag-flip protocol nuance (cleanup-session 2026-04-29)

Phase 14 work appeared to use `--read-only` flag-flips successfully via the documented `/mcp Reconnect` cycle. The cleanup-session re-attempt for migration 017 surfaced that **`/mcp Reconnect` does NOT respawn the MCP subprocess** — it only re-establishes the connection. Flag changes in `.mcp.json` don't propagate via reconnect alone; only a full Claude Code restart picks up new args.

This contradicts the apparently-working flips from Phase 14. Two plausible explanations:
1. The Phase 14 flips happened across implicit session restarts (Claude Code reload, machine sleep/wake, etc.) that respawned the subprocess incidentally. The user attributed success to `/mcp Reconnect` when the real mechanism was the underlying restart.
2. Some `--read-only` writes in Phase 14 were actually rejected by the server but the failure mode was less obvious than migration 017's clear "Cannot apply migration in read-only mode" error.

CLAUDE.md rule 2 has been corrected to reflect the empirical reality. Preferred path for one-off DB writes is now **Supabase Studio SQL Editor** (no flag-flip needed; verify runtime artefacts via read-only MCP queries instead of relying on `list_migrations`, since Studio doesn't write registry rows).
