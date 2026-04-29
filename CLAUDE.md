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
- To perform a DB write: flip `--read-only` OFF in `.mcp.json` → show the diff → `/mcp Reconnect` → run the write → flip back ON → show the diff again → `/mcp Reconnect`.
- Both flag-flip directions show a diff. No silent state changes.

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
