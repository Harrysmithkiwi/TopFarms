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
- **History-rewriting commands are off-limits without explicit operator instruction in the chat.** Executors and any spawned agent MUST NOT run `git reset --hard`, `git rebase`, `git push --force`, `git checkout --` (over uncommitted work), `git branch -D`, `git clean -f`, or any equivalent destructive operation unless the operator has explicitly typed the command (or its intent) into the chat. Violation must be surfaced immediately with a `STOP` notice before any further work — fix the underlying problem instead of reaching for a reset. Precedent: §8 (2026-05-05).

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

## 9. Verification discipline

Six errors in one session, 2026-07-30, all the same failure: **an assertion made without
verification** — several compounded by piping away the evidence that would have exposed it.

What caught them was `tsc -b`, a grep gate, a test run. What caught none of them was re-reading
my own work. **Care is not a control. Gates are.** So the rules are mechanical, not attentive:

1. **Stage explicit paths.** Never `git add -A`; read `git status` before you commit.
2. **Never discard an exit code.** If output is piped or suppressed, check `$?`.
3. **Verify before destroying.** Delete, revoke, drop, overwrite — check first, even when a
   document or a subagent says it is safe.
4. **Read the real schema before writing SQL against it.** Signatures and columns come from
   `pg_catalog`, never from memory.
5. **Label provenance.** "An agent reported X" is not "I verified X". A finding carries
   `file:line` or command output, or it is marked unverified.
6. **The gate defines done.** A phase is complete when its gate command produces the stated
   output — not when its tasks are ticked.
7. **Correct yourself out loud.** A false finding costs more than no finding; when an earlier
   claim proves wrong, say so and downgrade it.

## 10. Design canon — two worlds, one is closed

**`impeccable` is the frontend design skill for this project — the default, not an option.**
(https://github.com/pbakaus/impeccable.) Any work on a frontend surface goes through it:
building, reviewing, auditing, polishing. Its PostToolUse hook already runs on every edit and
its config lives at `.impeccable/`; `docs/DESIGN.md` and `docs/PRODUCT.md` are auto-discovered
from `docs/`. Do not reach for a different design skill, and do not hand-roll a design pass
that `impeccable` covers.

Hook findings are not automatically defects. Judge each against the two canons below: a
**visual** finding on a marketing surface is discarded (that world is settled), and a finding
on a gated portal is real. Never silence one with an ignore command without the operator
saying so — the waiver is a change to the gate's shape.

Two design systems ship here on purpose. Applying one to the other's surface is the failure
mode this rule exists to prevent.

- **Gated portals — admin, employer, seeker.** Canon is `docs/DESIGN.md` (one green `#16A34A`,
  Inter, near-white `#FAFBF9`). `src/index.css` wins on any hex. This is the surface the
  impeccable skill audits; `docs/PRODUCT.md` sits beside it and both are auto-discovered from
  `docs/` — do not move them.
- **Public marketing — `Home`, `ForEmployers`, `Pricing`, `legal/`, `src/components/landing/`.**
  Canon is `docs/design/v12-DIRECTIVE.md` as of 2026-08-19 (illustrated NZ paddock, Cormorant
  Garamond over Inter, the `fern` ramp, `linen`/`paper` grounds). It supersedes
  `v11-DIRECTIVE.md`, which keeps a banner and stays readable for its decision history —
  **several of its numbered rules are CARRIED FORWARD, not dead**, and v12 §0 is the
  rule-by-rule table. `PRODUCT.md`'s anti-reference list was amended in the same commit,
  because the operator reviewed the collision and chose the comp; do not "restore" it.
  **`Home` and the public shell are now SETTLED under v12.** `ForEmployers`, `Pricing` and
  `legal/` are still on v13 and are ported separately — the v12 tokens are new names beside
  the v13 ones so both render correctly during that gap. A **visual** finding on a marketing
  surface is still discarded, not filed.

**The split is by dimension, not only by route** (ruled 2026-08-07, design-gate ticket 10).
Three kinds of finding are filed wherever they are found, on any surface, in either canon:

- **Accessibility** — a screen reader does not know which design system a page belongs to.
  See `docs/DESIGN.md` §5 Accessibility.
- **States and authorisation** — the four required states apply to anything that fetches,
  submits, or depends on a session, whatever route it sits on.
- **The product principles in `v11-DIRECTIVE` §1.3, §1.4 and §1.5.** These are not
  marketing-page layout rules. §1.4 — *"Employers see numeric match scores… It never shows the
  worker a score for themselves"* — describes the worker-facing profile panel and the employer
  view, so it binds the portals, not the landing page. §1.3 says the mechanic is deliberately
  underplayed in marketing and **prominent in the portal**.

Why this exists: `/jobs` and `/jobs/:id` are public routes that branch on session and role and
render per-seeker data. Scoping by route alone put them out of scope for states, authorisation
and product-principle findings, which is wrong; their *visual* treatment is still settled under
the marketing canon and stays out of scope.

**The gate is not only visual.** A screen that renders perfectly and leaks data fails. Every
component that fetches, submits, or depends on a session ships loading, empty, error and
unauthorised states in the same commit; a missing state is a functional defect, not a polish
item. Client-side role checks are presentation — the security boundary is always the data
layer (`_admin_gate()` for admin RPCs, RLS elsewhere). Full rules in `docs/DESIGN.md` §5.

## 8. Git Safety Incidents

Log entries here when an agent or session violates the git safety rules in §4. Each entry: date, what was destroyed, recovery path, prevention rule that was added.

### 2026-05-05 — Wave A executor reset wiped Phase 17 planning artifacts

**What happened:** During execution of plan `17-00-test-scaffold` (Wave A of the auto-advance chain `/gsd:plan-phase 17` → `/gsd:execute-phase 17 --auto`), the gsd-executor agent ran `git reset --hard 1f81e6c` without operator instruction. The reset destroyed three commits authored earlier in the same session:

- `0b9d3de docs(17): research phase saved-search domain` (RESEARCH.md, ~852 lines)
- `c3d70b8 docs(17): add validation strategy` (VALIDATION.md, Nyquist contract)
- `91c40de docs(17): create phase plan — saved search across 5 waves` (5 PLAN.md files, ~3,292 lines + ROADMAP entry)

The executor then created the test scaffold on top of the reset HEAD (`f482ad5`, `cf2b196`) without the planning artifacts present. Wave B's executor correctly refused to proceed when its expected `<files_to_read>` paths were missing — that refusal exposed the incident.

**Recovery (non-destructive):** All blobs survived in reflog. Recovered via:
```
git checkout 91c40de -- \
  .planning/phases/17-saved-search/{17-RESEARCH,17-VALIDATION,17-00-test-scaffold-PLAN,17-01-foundation-PLAN,17-02-save-flow-PLAN,17-03-list-page-PLAN,17-04-quick-load-PLAN}.md \
  .planning/ROADMAP.md
```
Then committed as `70a6601 docs(17): recover planning artifacts destroyed by reset incident`. Test-scaffold work (`f482ad5`, `cf2b196`) preserved on top — no history rewrite needed.

**Prevention rule (added to §4):** History-rewriting commands (`git reset --hard`, `git rebase`, `git push --force`, `git branch -D`, `git clean -f`, `git checkout --` over uncommitted work) require explicit operator instruction in the chat. Executors and any spawned agent must surface a `STOP` notice on encountering a situation that *seems* to call for a reset, rather than executing one.

**Why it matters:** Per §3 (diagnose before fix), the cost of being wrong about a reset is much higher than the cost of pausing. In this case the reset destroyed ~4,300 lines of planning work that had to be regenerated — recovery from reflog was lucky; in a more aggressive scenario (gc, push --force, multi-day gap) the work would be unrecoverable.
