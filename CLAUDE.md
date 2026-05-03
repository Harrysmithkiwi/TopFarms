# TopFarms — Claude house rules

These rules apply to every Claude session in this repo. They are codified from the multi-session AUTH + Phase 14 BFIX work and are designed to survive `/clear`.

The full prose (incident chain, why each rule exists) lives in `.planning/retros/AUTH-RETRO.md`. This file is the operational checklist.

---

## 1. Project-scoped MCP only

- Project ref: **`inlagtgpynemhipnqvty`** (TopFarms Supabase).
- Use the project-scoped `.mcp.json` at the repo root. Never rely on user-home `~/.mcp.json` — different machines/sessions resolve it differently.
- Before the first Supabase MCP call in a session, verify the project ref. If it's wrong, fix the config — do not proceed with a misconfigured MCP.

## 2. `--read-only` ON by default

- The Supabase MCP runs with `--read-only` ON unless a known DB write is in flight.
- **Empirical truth (discovered cleanup-session 2026-04-29):** `/mcp Reconnect` re-establishes the connection but does NOT respawn the MCP subprocess with new args. Editing `--read-only` in `.mcp.json` and reconnecting will leave the server running with whatever flag it was originally spawned with. Flag changes only propagate on a full Claude Code restart.
- **Preferred path for one-off DB writes: Supabase Studio SQL Editor.** Paste the SQL body inline, run, then verify via read-only MCP queries (`list_migrations`, `execute_sql` with SELECT). Avoids the restart cycle entirely. Particularly recommended for migrations using `pg_net` or extensions that resist transactional wrapping. Note: Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows — verify via runtime artefacts (`pg_extension`, `pg_proc`, `pg_trigger`) rather than `list_migrations`.
- **If the restart cycle is genuinely required:** flip `--read-only` OFF in `.mcp.json` → show the diff → quit and relaunch Claude Code → run the write → flip back ON → show the diff → quit and relaunch again. Both flag-flip directions show a diff. No silent state changes.

## 3. Diagnose before fix

- No silent edits, even on docs. Show the SQL body, code body, or doc diff before writing.
- When something fails, read logs/output and form a hypothesis before changing code. The cost of being wrong about the fix is higher than the cost of the diagnosis step.
- Precedent: BFIX-05 took three rounds of diagnosis before the gateway-trust pattern surfaced. Each round was load-bearing — premature "fix" commits would have wasted budget and obscured the real cause.

## 4. Atomic commits — one phase per commit

- One phase (or sub-phase) per commit. Don't bundle unrelated work.
- Amending within the same atomic-commit-window is acceptable when internal consistency requires it (precedent: BFIX-02/03 + BFIX-01 docs reconciliation amended into the Phase 14-03 commit `e8f0882`).

## 5. Gateway-trust JWT pattern for `verify_jwt: true` Edge Functions

When an Edge Function has `verify_jwt: true`, the Supabase gateway has already validated the JWT signature upstream of the handler. **Do not** re-validate by calling `adminClient.auth.getUser(token)` on a service-role-keyed client — that call routes `/auth/v1/user` differently and rejects valid ES256 tokens.

Trust the gateway, decode the JWT payload locally for `sub`, validate `aud === 'authenticated'`:

```ts
const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
if (payload.aud !== 'authenticated') return 401
const callerUserId = payload.sub
```

Reference: `supabase/functions/get-applicant-document-url/index.ts:75-94`. Full prose + diagnostic chain in `.planning/retros/AUTH-RETRO.md` Arc 3.

## 6. Diagnostic-before-rotation for credential failures

When a workflow or job fails with auth errors (SASL, 401, 403, "invalid credentials"), do **not** rotate the credential as the first response. Rotation burns the previous value, doesn't reveal *why* auth failed, and risks adding noise (wrong destination repo, encoding issue, mid-clipboard substitution) on top of the original problem.

After two identical auth failures, switch from "retry with new value" to enumeration:

1. `gh repo set-default --view` — confirm `gh` knows where to write. Without a default set, `gh secret set` without `--repo` silently lands nowhere.
2. `gh api repos/<owner>/<repo>/actions/secrets` + `.../actions/variables` + `.../environments` (and `.../environments/<name>/secrets` per environment) — enumerate every shadowing path.
3. Read the workflow file: confirm env var name, scope (workflow / job / step), and no transformation between resolution and consumer.
4. Test the credential against the same target the workflow uses, with the same byte-stream sent to GH. If local succeeds where CI fails (or vice versa), the values differ — investigate before another rotation.

A read-only enumeration sweep takes ~30s. A rotation cycle takes ~5min. The cost of being wrong about which side has the bug exceeds the cost of one diagnostic pass.

See also §3 (Diagnose before fix) for the general principle.

**Precedent:** 2026-05-01 → 2026-05-03 — six identical SASL auth failures across three rotation cycles before enumeration revealed (a) early rotations had silently landed on no-default-repo because `gh` had no default set, and (b) Supabase Studio's password reset was not persisting server-side. Both findings were available from one `gh api` enumeration sweep that took ~3s.

## 7. Partial-close discipline for REQUIREMENTS.md

A requirement may have multiple gaps (e.g., deploy gap + runtime/secret gap + E2E proof gap). Closing ONE gap is NOT the same as satisfying the requirement. Do not flip `[ ]` to `[x]` in REQUIREMENTS.md unless ALL gaps are empirically closed with evidence.

- When proposing to mark a requirement satisfied, check whether the empirical proof of the FULL requirement exists. If only one of N gaps is closed, write a partial-close note describing what's done and what remains.
- Add carryforward entries to the active milestone audit (`.planning/v{X}-MILESTONE-AUDIT.md`) for each unclosed gap, with effort estimate.
- Counter-signal: when a gap-closure phase explicitly captures the missing evidence and the requirement's must-haves are all empirically met, flipping is correct.

**Precedent:** Phase 15 closeout (2026-05-01). The 4 Edge Functions were deployed (deploy gap closed, MAIL-02 trigger 404 fixed) but `RESEND_API_KEY` was never set in prod secrets — emails silently skip, no E2E proof. Flipping MAIL-02 to `[x]` would have made REQUIREMENTS.md lie. Kept as `[ ]` with partial-close note; carryforward added to `.planning/v2.0-MILESTONE-AUDIT.md`.
