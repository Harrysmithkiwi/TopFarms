# Phase 15: Email Pipeline Deploy & Verify - Research

**Researched:** 2026-05-01
**Domain:** Supabase Edge Function deployment + GitHub Actions CI + Resend domain verification + production trigger validation
**Confidence:** HIGH (operational mechanics verified against official docs); MEDIUM on Resend API curl evidence shape

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CI permissions:**
- Runtime: **GitHub Actions**. New `.github/workflows/supabase-deploy.yml` triggered on push to `main`. Vercel keeps doing only the SPA build. Supabase deploys are independent of the Vite bundle.
- Credentials: **PAT + DB password.** `SUPABASE_ACCESS_TOKEN` (PAT for `supabase login` + `functions deploy`), `SUPABASE_DB_PASSWORD` (for `supabase db push`).
- **Service role key NEVER in CI** — stays in Edge Function runtime env only.
- PAT scope: **fresh project-scoped PAT** named `topfarms-ci-deploy`; stored in GitHub Actions repo secrets only. Document name + creation date in `15-XX-SUMMARY.md` for rotation tracking.
- Project ref: **hardcode `inlagtgpynemhipnqvty`** in workflow (already public via `.mcp.json`).

**Order of operations:**
- **Manual deploy first, CI second.** Sub-task 1 deploys the 4 functions via local `supabase functions deploy` from the developer's machine to stop prod silent-failure within hours. CI is built as a separate sub-task in the same phase.
- Decoupling: verify deploy mechanic end-to-end manually before automating; confirm trigger → function → email chain works in prod before adding CI complexity.

**CI trigger + scope:**
- Trigger: **push to `main`** with path filters on `supabase/migrations/**` or `supabase/functions/**`.
- Two separate steps, independent failure modes:
  - Step 1: `supabase db push` (migration apply) with **dry-run preflight**.
  - Step 2: `supabase functions deploy <name>` per function (loop or matrix; order doesn't matter at our scale).
- **No tag-driven prod deploys.** Single environment; push-to-main is the prod release event.

**CI failure mode:**
- **Block on migration apply failure** (loud failure is the whole point — drift was the original problem).
- **Notify-only on function-deploy failure** (no auto-rollback; CLI rollback support is thin). Manual re-run via `workflow_dispatch`.
- No auto-rollback for either step.

**MAIL-02 production verification:**
- **Real test job in seeded UAT data.** Mark filled via `MarkFilledModal` UI (not direct SQL). Verify: `pg_net.http_post` 2xx in `net._http_response`; notification email lands in seeded test seeker's inbox.
- Synthetic SQL is acceptable fallback if seeded data is missing.
- Capture in 13-VERIFICATION.md: (a) Resend dashboard delivery success, (b) inbox screenshot, (c) `pg_net` response row.

**13-VERIFICATION.md backfill scope:**
- Goal-backward verification per Phase 13's 4 success criteria — one verdict (PASS / PARTIAL / FAIL) per criterion with empirical evidence:
  1. Resend SPF/DKIM `Verified` (screenshot)
  2. Test email lands in inbox (screenshot)
  3. Filled job → notification email to applicants in `applied | review | interview | shortlisted | offered`
  4. Terminal-status applicants (`hired | declined | withdrawn`) do NOT receive the filled email
- Frontmatter: include `nyquist_compliant: true` if Wave 0 tests now exist for `notify-job-filled`, otherwise note explicit deferral.

**Disk-only function inventory (LOCKED — ordered by impact):**
1. `notify-job-filled` — closes MAIL-02 silent failure (prod-broken NOW)
2. `send-followup-emails` — Phase 1.0 cron-driven Day 7/14 follow-ups (was meant to be deployed in v1.0)
3. `acknowledge-placement-fee` — placement fee acknowledgement flow (v1.0)
4. `create-placement-invoice` — Stripe invoice mint (v1.0)

**Verify_jwt pattern check (LOCKED — carried from BFIX-05):**
- Each of the 4 functions' `index.ts` must be audited for `verify_jwt: true` + `adminClient.auth.getUser(token)` antipattern. Use gateway-trust + local `atob` decode pattern instead.

**Resend Verified status:**
- This phase confirms-and-captures only — does NOT redo DNS work.

### Claude's Discretion

- Exact filename for the GitHub Actions workflow (`supabase-deploy.yml` vs `deploy.yml` vs `backend.yml`)
- Whether to use a job-level matrix or a step loop for per-function deploys
- Exact format of the dry-run preflight (CLI flags vary by Supabase CLI version)
- Whether to add a `concurrency` block to the workflow (recommended yes)
- Whether to capture Slack notification on function-deploy failure
- Order of function deploys within the workflow (any order works — they're independent)
- Whether to write a `supabase/config.toml` to pin local CLI behavior (none exists; recommend adding minimally)

### Deferred Ideas (OUT OF SCOPE)

- CORS-01 (scope down `Access-Control-Allow-Origin`)
- PAT rotation automation
- Slack/email alerting on CI deploy failures (only if webhook URL already in env)
- CI for typecheck/lint/test gates (Phase 18)
- MAIL-03/04/05/06 (weekly digest, inactive nudge, auto-hide, saved-search alerts)
- Migrating to `vercel.ts`
- Vercel build hook for backend deploys (explicitly rejected)
- AUTH-FIX-02 root cause investigation (Phase 18)
- EMPLOYER_VISIBLE_DOCUMENT_TYPES single-source refactor (Phase 18)
- Stale `getUser` comment in `get-applicant-document-url/index.ts:8` (Phase 18)
- Phase 12/13 VALIDATION.md `nyquist_compliant` finalization (Phase 18)
- PRIV-02 empirical identity-bypass test (Phase 16)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **MAIL-02** | Filled-job notification fires for unresolved applicants in production | Edge Function `notify-job-filled` source verified at `supabase/functions/notify-job-filled/index.ts` (NOTIFY_STATUSES exact match `applied/review/interview/shortlisted/offered`); migration 017 trigger live; gap is purely deployment + verification |
| **MAIL-01** | Resend SPF/DKIM verified for production email delivery | Resend Domains dashboard (`https://resend.com/domains`) shows status field; `GET /domains` API returns `status` enum (`not_started/pending/verified/partially_verified/partially_failed/failed`); evidence path is screenshot OR curl |
| **DEPLOY-01** | Migration + Edge Function deploy automation closes drift recurrence | Supabase CLI `db push` (migration apply) + `functions deploy` (Edge Function deploy) wired into GH Actions via `supabase/setup-cli@v1` action; path-filtered on `supabase/migrations/**` and `supabase/functions/**` |
</phase_requirements>

## Summary

This phase is **operational, not architectural** — every implementation decision was locked in CONTEXT.md. Research focuses on getting the Supabase CLI commands right, choosing the correct GitHub Actions wiring (PAT-based, `--use-api` for Docker-less CI), and capturing empirical evidence shape (`net._http_response` row, Resend dashboard screenshot, inbox screenshot).

The **load-bearing technical findings** are:

1. **Use `--use-api` flag with `supabase functions deploy` in CI** — speeds up deploys, removes Docker dependency, fixes a parallel-deploy race condition. Available since CLI v2.13.3 (current latest is v2.95.4).
2. **`supabase functions deploy` (no name argument) deploys all functions** under `supabase/functions/` since CLI v1.62.0. This is simpler than per-function loops or matrices for the MVP CI step.
3. **`supabase db push --dry-run` is the correct preflight** — exits 0 listing pending migrations without applying. Combined with the Studio-applied registry quirk (016, 017 missing from `schema_migrations`), the workflow needs a guard so a "registry empty / no pending" state doesn't get treated as success when actual drift exists.
4. **`supabase/setup-cli@v1` is still the canonical action** but **v2 was released April 2026** with auto-version detection from lockfiles. v1 is acceptable; v2 is preferred for forward-compatibility — but pin the version explicitly to avoid silent CLI behaviour changes.
5. **The 4 disk-only functions all use `Deno.serve` + service-role client** — none use `verify_jwt: true` in code (no `auth.getUser(token)` pattern detected on inspection). The BFIX-05 audit will likely PASS for all 4 with no code changes — but planning still needs to confirm during the deploy task.

**Primary recommendation:** Sub-task 1 (manual deploy + verify) ships in 1-2 hours. Sub-task 2 (GH Actions wiring) follows the canonical Supabase example with `--use-api` and `supabase/setup-cli@v1`. Sub-task 3 (13-VERIFICATION.md backfill) is documentation-only and depends on the empirical evidence captured in Sub-task 1.

## Standard Stack

### Core CI/CD components

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Supabase CLI | v2.95.4 (latest, 2026-04-27) | `db push` + `functions deploy` | Sole supported deploy mechanism for Supabase backend; no alternative |
| `supabase/setup-cli` GitHub Action | `@v1` (canonical) or `@v2` (April 2026) | Install Supabase CLI in GH Actions runner | Official Supabase action; alternative is manual `npm i -g supabase` (more brittle) |
| `actions/checkout` | `@v4` | Check out repo source | GitHub-canonical; v3 still works but v4 is current |
| GitHub Actions | n/a | CI runtime | User-locked decision per CONTEXT.md |

### CLI flags for this phase (verified)

| Flag | Used with | Purpose |
|------|-----------|---------|
| `--project-ref <ref>` | `functions deploy`, `link` | Targets the Supabase project (hardcoded `inlagtgpynemhipnqvty`) |
| `--use-api` | `functions deploy` | Server-side bundling, no Docker; fixes parallel-deploy race; **REQUIRED for CI** |
| `--dry-run` | `db push` | Preview migrations without applying; exit 0; non-destructive |
| `--linked` | `db push` | Push to linked remote project (vs `--db-url` or `--local`) |
| `--password <pw>` | `db push` (or env `SUPABASE_DB_PASSWORD`) | DB password for migration apply |
| `-j, --jobs <n>` | `functions deploy` | Parallel job count; safe to omit (CLI default fine for 4 functions) |
| `--no-verify-jwt` | `functions deploy` | Per-function JWT toggle; **DO NOT USE** — config.toml is the right knob |

### Authentication shape

| Secret | Where | Purpose |
|--------|-------|---------|
| `SUPABASE_ACCESS_TOKEN` | GH Actions secret + env var | PAT for CLI auth; replaces `supabase login` in CI |
| `SUPABASE_DB_PASSWORD` | GH Actions secret + env var | DB password for `db push` (avoids interactive prompt) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Edge Function runtime env, NOT CI** | Used by functions at runtime; explicitly excluded from CI per CONTEXT.md |

### Resend evidence sources

| Source | URL/Endpoint | Use |
|--------|--------------|-----|
| Resend dashboard Domains page | https://resend.com/domains | Screenshot evidence: SPF/DKIM rows show `Verified` (green) — primary MAIL-01 evidence |
| Resend API `GET /domains` | `curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains` | Curl evidence alternative; response includes per-domain `status` field (`verified`, `partially_verified`, etc.) |

### Alternatives Considered

| Instead of | Could Use | Why we chose the standard |
|------------|-----------|---------------------------|
| GitHub Actions PAT auth | OIDC short-lived tokens | Supabase OIDC support is thin per CONTEXT.md; PAT is current standard; revisit in v2.1 |
| `--use-api` (no Docker) | Default Docker bundling | Default is slower in CI and has known parallel-deploy race condition; `--use-api` is the recommended CI mode |
| Per-function deploy loop | Single `supabase functions deploy` (deploys all) | Single command is simpler at our scale (4-9 functions); loop adds complexity for no benefit. **Chosen: single command** |
| `supabase/setup-cli@v2` | `@v1` | v2 (April 2026) adds lockfile-version auto-detection. v1 is canonical and stable. **Recommend v1 with explicit version pin** for predictability; v2 acceptable if pinned |
| Trigger Resend DNS evidence via Resend dashboard screenshot | curl `GET /domains` with API key | Screenshot is more visually unambiguous evidence; curl is more easily reproducible. **CONTEXT.md says screenshot OR curl** — pick screenshot for primary, curl for redundancy if API key handy |

**Installation in workflow** (no node install required):
```yaml
- uses: actions/checkout@v4
- uses: supabase/setup-cli@v1
  with:
    version: 2.95.4   # pin explicitly; "latest" works but pinning is safer
- run: supabase db push --linked --dry-run --password "$SUPABASE_DB_PASSWORD"
- run: supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
- run: supabase functions deploy --use-api --project-ref $PROJECT_ID
```

## Architecture Patterns

### Recommended file layout for this phase

```
.github/
└── workflows/
    └── supabase-deploy.yml      # NEW — single workflow, two jobs (or sequential steps)

supabase/
├── config.toml                  # NEW (optional) — pin verify_jwt etc per function
├── functions/
│   ├── notify-job-filled/       # already on disk; deploy targets
│   ├── send-followup-emails/
│   ├── acknowledge-placement-fee/
│   ├── create-placement-invoice/
│   └── ...                      # 5 already-deployed remain unchanged
└── migrations/
    └── ...                      # unchanged

.planning/phases/13-email-notifications/
└── 13-VERIFICATION.md           # NEW — goal-backward verdicts per Phase 13's 4 criteria
```

### Pattern 1: GitHub Actions workflow — sequential migration → functions

**What:** Single workflow file, two jobs OR two sequential steps inside one job. Migration-apply runs first; function-deploy runs second; failure modes are independent (function deploy uses `continue-on-error: true` per CONTEXT.md "notify-only on function-deploy failure").

**When to use:** Standard deploy step for any push to `main` touching `supabase/**` paths.

**Example:**
```yaml
# Source: https://supabase.com/docs/guides/functions/examples/github-actions
# Adapted for TopFarms with --use-api, dry-run preflight, path filters, concurrency

name: Supabase Deploy

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
      - 'supabase/functions/**'
  workflow_dispatch:

concurrency:
  group: supabase-deploy
  cancel-in-progress: false   # never cancel mid-deploy; queue instead

env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
  PROJECT_ID: inlagtgpynemhipnqvty

jobs:
  migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: 2.95.4

      - name: Link to Supabase project
        run: supabase link --project-ref $PROJECT_ID

      - name: Dry-run migration preview
        run: supabase db push --linked --dry-run

      - name: Apply migrations
        run: supabase db push --linked   # uses SUPABASE_DB_PASSWORD env

  functions:
    runs-on: ubuntu-latest
    needs: migrations            # function deploy depends on schema being up-to-date
    continue-on-error: true       # CONTEXT.md: notify-only on function-deploy failure
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: 2.95.4

      - name: Deploy all functions
        run: supabase functions deploy --use-api --project-ref $PROJECT_ID

      - name: Surface deploy outcome
        if: always()
        run: |
          echo "::notice::Function deploy finished with status: ${{ job.status }}"
```

**Notes on the YAML choices:**

- `paths:` filter ensures non-backend pushes don't burn CI minutes.
- `concurrency: cancel-in-progress: false` prevents two overlapping deploys from racing the registry.
- `needs: migrations` enforces order (functions deploy after migration apply succeeds).
- `continue-on-error: true` on `functions` job satisfies CONTEXT.md "notify-only on function-deploy failure" — workflow exits non-zero on migration failure (loud), but function-deploy failure is logged in the GH summary and recovery is `workflow_dispatch`.
- No `verify_jwt` overrides on the deploy command — that's `config.toml`'s job per pattern below.

### Pattern 2: `supabase/config.toml` for per-function settings

**What:** Optional but recommended `supabase/config.toml` that pins per-function `verify_jwt` settings so they survive across deploys consistently (rather than being implicit/default).

**When to use:** When functions have different JWT requirements OR you want explicit config-as-code for deployment-time settings.

**Source:** Supabase function configuration docs.

**Example:**
```toml
# Source: https://supabase.com/docs/guides/functions/function-configuration

[functions.notify-job-filled]
# Called by pg_net trigger with service_role JWT — keep verify_jwt true (default)
verify_jwt = true

[functions.send-followup-emails]
# Cron-driven; called with service_role JWT
verify_jwt = true

[functions.acknowledge-placement-fee]
# Called from authenticated employer client — verify_jwt true
verify_jwt = true

[functions.create-placement-invoice]
# Called from authenticated employer client — verify_jwt true
verify_jwt = true
```

**Default behavior if config.toml is absent:** "all your Edge Functions have the same settings" — `verify_jwt = true` and standard TypeScript bundling. Adding the file is **optional** for this phase but improves explicitness; CONTEXT.md marks it as Claude's discretion.

### Pattern 3: Studio-applied migration handling (load-bearing per CONTEXT.md)

**What:** Migrations applied via Supabase Studio SQL Editor (016, 017 in this project) do NOT write rows to `supabase_migrations.schema_migrations`. So `supabase db push --dry-run` will incorrectly show those as "pending" forever — except the live registry doesn't, because they're already applied via runtime artefacts (functions, triggers, extensions).

**The trap:** A naive `db push` in CI will try to RE-apply migration 016 / 017 SQL bodies, hitting `IF NOT EXISTS` guards and either succeeding silently (if all guards present) or failing on a non-idempotent statement.

**How to handle in this phase:**

Option A — Repair the registry first (cleanest, but write-mode MCP needed):
```bash
# In Supabase Studio (or via supabase migration repair)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('016', 'phase11_backend_features', ...),
       ('017', 'notify_job_filled_webhook', ...);
```

Option B — Trust idempotency (CONTEXT.md path of least resistance):
- All migration 016 + 017 SQL uses `IF NOT EXISTS` and `CREATE OR REPLACE` — replaying them is safe.
- The dry-run will list them as pending; the real apply will be a no-op for runtime artefacts.
- Document this in workflow comments + 15-XX-SUMMARY.md.

**Recommendation:** Plan-phase decides between A and B. Option B is faster but documents the quirk in code-comments only. Option A repairs the registry once permanently — but requires either MCP write access (CLAUDE.md flag-flip) OR Studio SQL Editor (CLAUDE.md preferred path). Per CLAUDE.md §2 ("Preferred path for one-off DB writes: Supabase Studio SQL Editor"), if Option A is chosen, the registry repair INSERT goes through Studio.

### Anti-Patterns to Avoid

- **Using `--no-verify-jwt` on the CLI deploy command** — config.toml is the right place to express that. CLI flag bypasses the source-of-truth.
- **Auto-rollback on function-deploy failure** — Supabase CLI rollback support is thin; explicitly rejected in CONTEXT.md.
- **Coupling Supabase deploy to Vercel build hooks** — explicitly rejected in CONTEXT.md "Vercel build hook for backend deploys" (coupling fragility).
- **Per-function matrix in YAML** — adds 4 jobs of overhead vs single `supabase functions deploy` (deploys all). At scale of 9 functions, single-command is simpler.
- **Re-validating JWT in `verify_jwt: true` functions via `auth.getUser(token)`** — per CLAUDE.md §5 / BFIX-05, must use gateway-trust + local atob decode. Audit each of the 4 functions during planning.
- **Trusting `mcp__supabase__list_migrations` as the sole source of truth** — Studio-applied migrations (016, 017) are NOT in that registry but ARE applied. Cross-check via `pg_extension`, `pg_proc`, `pg_trigger`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI version pinning in CI | Custom curl + extract | `supabase/setup-cli@v1` action | Official action handles Linux/Windows/macOS; lockfile auto-detect (v2); cache hits |
| Function bundling in CI | Manual Docker setup or Deno bundler | `supabase functions deploy --use-api` | `--use-api` does server-side bundling; no Docker daemon needed in GH runner |
| Per-function JWT config | CLI flags scattered across deploys | `supabase/config.toml` `[functions.<name>]` blocks | Source-of-truth lives in repo; survives across deploys; auditable |
| Migration apply in CI | Custom psql + version tracking | `supabase db push --linked` (with `SUPABASE_DB_PASSWORD` env) | CLI handles registry tracking, idempotency, version computation |
| pg_net trigger response inspection | Custom logging table + INSERTs in trigger | `net._http_response` view (built into pg_net) | pg_net writes responses automatically; queryable for verification |
| Resend domain verification check | Manual DNS lookup + parsing | Resend dashboard Domains page OR `GET /domains` API | Resend already aggregates DNS check results into `status` enum |

**Key insight:** Every operational primitive this phase needs already exists. The phase is plumbing — wiring known-good tools (Supabase CLI, GH Actions, Resend dashboard, pg_net response table) into a deploy pipeline. **No custom infrastructure is justified.**

## Common Pitfalls

### Pitfall 1: Studio-applied migrations re-running in `db push`

**What goes wrong:** Migrations 016 and 017 are functionally live (verified via `pg_extension`, `pg_proc`, `pg_trigger` per `supabase/migrations/NAMING.md`) but absent from `supabase_migrations.schema_migrations`. A `supabase db push --linked` will see them as pending and attempt to re-apply.

**Why it happens:** Studio SQL Editor doesn't write to the registry table. CLI / MCP `apply_migration` does. The two paths are unsynchronised.

**How to avoid:**
1. Run `supabase db push --linked --dry-run` first — review the list of "pending" migrations.
2. Confirm that 016 / 017 SQL bodies are idempotent (they are — `IF NOT EXISTS` + `CREATE OR REPLACE` everywhere).
3. EITHER repair registry via Studio INSERT (Option A), OR trust idempotency and note the no-op replay in workflow comments (Option B).
4. Document the chosen handling in `15-XX-SUMMARY.md` so the next person knows.

**Warning signs:** `db push` output shows 016 / 017 in the "pending" list despite the trigger / extension obviously being live in production.

### Pitfall 2: `notify-job-filled` deployed but pg_net still 404s

**What goes wrong:** Function deployed successfully but the trigger still returns 404 in `net._http_response`.

**Why it happens:**
- Migration 017 uses `vault.decrypted_secrets` to read `supabase_url` — if that vault entry is misnamed or missing, the URL is malformed.
- The function name in the URL (`/functions/v1/notify-job-filled`) must EXACTLY match the deployed function slug.
- Service role key in the trigger Authorization header must match the live key (otherwise 401, not 404, but worth checking).

**How to avoid:**
1. After `functions deploy`, verify via `mcp__supabase__list_edge_functions` that `notify-job-filled` shows status ACTIVE.
2. Trigger a test fire (mark a seeded test job as filled) and immediately query:
   ```sql
   SELECT id, status_code, content, created
   FROM net._http_response
   ORDER BY created DESC
   LIMIT 5;
   ```
3. If 404: check the URL was constructed with the correct project ref. If 401: vault secret stale. If 2xx: success.

**Warning signs:** `net._http_response` shows status_code 404 with content like `"Function not found"` despite the function appearing in `list_edge_functions`.

### Pitfall 3: PAT scope too broad / leak surface

**What goes wrong:** A PAT created at the user-account scope (not project-scoped) leaks access to all the user's Supabase projects if the GH secret is exfiltrated.

**Why it happens:** Supabase PATs default to user-scope. Project-scope is a deliberate choice during creation.

**How to avoid:**
1. CONTEXT.md mandates a fresh PAT named `topfarms-ci-deploy`.
2. Document creation date in `15-XX-SUMMARY.md` for rotation.
3. Restrict the PAT to TopFarms project only (Supabase dashboard → Account → Access Tokens → scoping options).
4. Never log the PAT in workflow output (GH masks `secrets.*` automatically; don't `echo` it).

**Warning signs:** PAT in CI runner logs (would be a redaction failure); cross-project access in token audit.

### Pitfall 4: `--use-api` flag missing → Docker pull failure or parallel race

**What goes wrong:** Without `--use-api`, the CLI tries to start a Docker container for bundling. GH Actions runners have Docker but it's slower; multi-function parallel deploys race a known CLI bug.

**Why it happens:** Default deploy mode is Docker-based. `--use-api` flag is opt-in but recommended for CI.

**How to avoid:** Always use `--use-api` in CI workflows. Confirmed available since CLI v2.13.3; current latest 2.95.4 ships it.

**Warning signs:** CI logs show "Pulling image", "Container starting"; or sporadic deploy failures with parallel function deploys.

### Pitfall 5: BFIX-05 antipattern in unaudited functions

**What goes wrong:** A function with `verify_jwt: true` re-validates the JWT via `adminClient.auth.getUser(token)`, which routes service-role-keyed `/auth/v1/user` differently and rejects valid ES256 tokens (per CLAUDE.md §5).

**Why it happens:** Pattern was used in `get-applicant-document-url` originally; BFIX-05 fixed it but the 4 disk-only functions were never audited.

**How to avoid (Sub-task during planning):**
1. Read each of the 4 functions' `index.ts`.
2. Search for `auth.getUser(` calls with the service-role-keyed client.
3. **As of this research:** all 4 functions use service-role client for DB queries only (no `auth.getUser(token)` calls). Initial inspection suggests they are NOT vulnerable to BFIX-05. The full audit during planning should confirm.

**Warning signs:** First test invocation returns 401 "Invalid auth token" despite the gateway accepting the JWT signature.

### Pitfall 6: Resend domain shows `partially_verified` not `verified`

**What goes wrong:** SPF verifies but DKIM doesn't (or vice versa). Status is `partially_verified` — emails may send but with degraded deliverability.

**Why it happens:** SPF and DKIM are independent DNS records. One can verify before the other; one can fail entirely if a CNAME points wrong.

**How to avoid:**
1. Check Resend dashboard Domains page — both SPF and DKIM rows must show green `Verified`.
2. If using curl: `GET /domains` response `status` field must be `"verified"`, NOT `"partially_verified"` or `"partially_failed"`.
3. If `partially_*`: add the missing DNS records, click "Verify DNS Records" again.

**Warning signs:** Status in dashboard is yellow or partial; emails arrive but go to spam; DMARC reports show DKIM failures.

## Code Examples

### Manual deploy (Sub-task 1 — emergency prod fix)

```bash
# Source: Supabase docs https://supabase.com/docs/guides/functions/deploy
# From the developer's local machine (CLAUDE.md project ref hardcoded)

# Authenticate (one-time per machine)
supabase login   # opens browser; uses developer's PAT, not the CI PAT

# Link to project (creates .supabase/ artefacts; gitignored)
supabase link --project-ref inlagtgpynemhipnqvty

# Deploy all 4 disk-only functions in one command
supabase functions deploy --use-api --project-ref inlagtgpynemhipnqvty

# OR per-function (verbose, but lets you see each result):
supabase functions deploy notify-job-filled --use-api --project-ref inlagtgpynemhipnqvty
supabase functions deploy send-followup-emails --use-api --project-ref inlagtgpynemhipnqvty
supabase functions deploy acknowledge-placement-fee --use-api --project-ref inlagtgpynemhipnqvty
supabase functions deploy create-placement-invoice --use-api --project-ref inlagtgpynemhipnqvty
```

### Verify deploy via MCP (read-only)

```typescript
// Source: project MCP tool conventions
// Confirms each function shows up live with status ACTIVE

mcp__supabase__list_edge_functions({})

// Expected: returns array including all 9 functions:
//   generate-candidate-summary, generate-match-explanation, stripe-webhook,
//   create-payment-intent, get-applicant-document-url,
//   notify-job-filled, send-followup-emails,
//   acknowledge-placement-fee, create-placement-invoice
```

### Trigger fire verification (Sub-task 1 + Sub-task 3)

```sql
-- Source: pg_net docs https://supabase.com/docs/guides/database/extensions/pg_net
-- Run in Supabase Studio SQL Editor or via read-only MCP execute_sql

-- After marking a test job as filled in the UI, query the response log:
SELECT
  id,
  status_code,
  content_type,
  content,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- PASS criteria: status_code = 200, content references {"sent": N, "failed": M, "job_id": "..."}
-- FAIL signals: status_code = 404 (function not deployed) | 401 (auth wrong) | 5xx (function errored)
```

### Resend evidence via curl (Sub-task 1 / 3, alternative to screenshot)

```bash
# Source: https://resend.com/docs/api-reference/domains/list-domains
# Capture status of all sending domains via API (alternative to dashboard screenshot)

curl -X GET 'https://api.resend.com/domains' \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     | jq '.data[] | {name, status, capabilities}'

# PASS criterion (MAIL-01): topfarms.co.nz row shows "status": "verified"
# Acceptable: "verified"
# Not acceptable: "not_started" | "pending" | "partially_verified" | "partially_failed" | "failed"
```

### Cross-reference deployed-vs-callsite check (planning Sub-task)

```bash
# Source: CONTEXT.md "Cross-reference check during planning"
# Identifies any client-referenced function that's NOT deployed

# All callsites in src/:
grep -rn "supabase.functions.invoke\|/functions/v1/" /Users/harrysmith/dev/topfarms/src/

# Then compare against mcp__supabase__list_edge_functions output.
# Confirmed during research (2026-05-01): callsites reference exactly:
#   generate-candidate-summary       (deployed)
#   generate-match-explanation       (deployed)
#   acknowledge-placement-fee        (NOT deployed; in scope)
#   create-placement-invoice         (NOT deployed; in scope)
#   create-payment-intent            (deployed)
#   get-applicant-document-url       (deployed; BFIX-05)
# (notify-job-filled is invoked by pg_net trigger, not src/; send-followup-emails is cron-driven, not src/)
# RESULT: no surprise undeployed-callees beyond the 4 already in CONTEXT.md scope.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-function deploy commands | Single `supabase functions deploy` (deploys all) | CLI v1.62.0 (~2024) | Simpler CI workflows; one step instead of N |
| Docker-based bundling in CI | `--use-api` server-side bundling | CLI v2.13.3 (2025) | Faster CI runs; no Docker dependency; fixes parallel race |
| `supabase/setup-cli@v1` (manual version pin) | `@v2` with lockfile auto-detection | April 2026 | Optional convenience; v1 still canonical and widely used |
| `auth.getUser(token)` re-validation in verify_jwt functions | Gateway-trust + local atob decode | Phase 14 BFIX-05 (2026-04-29) | Only TopFarms-internal pattern but locked in CLAUDE.md §5 |
| Tag-driven prod deploys | Push-to-main path-filtered | This phase (CONTEXT.md decision) | Single-environment project; no staging branch; main IS prod |

**Deprecated/outdated:**
- Default Docker-based `functions deploy` in CI: works but slower and parallel-race-prone; prefer `--use-api`.
- `supabase/setup-cli@v1` without explicit version pin: drifts to whatever's "latest" at runner spawn time; pin explicitly.

## Open Questions

1. **Should CI step deploy ALL functions every push, or just the changed ones?**
   - What we know: `supabase functions deploy` (no name) deploys all functions in `supabase/functions/`. This is idempotent — re-deploying an unchanged function should produce the same artefact server-side.
   - What's unclear: at our scale (9 functions, ~100KB each), does redeploying all 9 every push cause Supabase to send all 9 client-facing notifications / cache busts / cold starts? (Probably not — CLI likely diffs internally.)
   - Recommendation: **deploy all every push**. Simpler workflow, no name-tracking logic, idempotent. If cold-start is observed, revisit with a path-aware filter.

2. **Migration registry repair: Option A (INSERT registry rows) vs Option B (trust idempotency)?**
   - What we know: 016, 017 are live but registry-rowless. `db push --dry-run` will list them as pending forever.
   - What's unclear: does `db push` actually try to apply them and fail on an idempotency edge, OR just no-op cleanly?
   - Recommendation: planning should run `--dry-run` from a developer machine FIRST, capture the output, then decide. If safe, Option B (trust idempotency). If unsafe, Option A (Studio INSERT to repair registry).

3. **Should the GH Actions workflow include a typecheck step before deploy?**
   - What we know: CONTEXT.md defers CI typecheck/lint/test to Phase 18 (Tech Debt Cleanup).
   - What's unclear: should we bake in a `tsc -b` step preemptively to fail fast if a deploy commit also breaks the SPA?
   - Recommendation: **defer per CONTEXT.md.** Vercel SPA build will fail loudly on its own if typecheck breaks. Adding it to the Supabase workflow is scope creep.

4. **Should `supabase/config.toml` be created in this phase?**
   - What we know: CONTEXT.md flags this as Claude's discretion. Default behaviour is `verify_jwt = true` for all functions, which matches the 4 functions' intent.
   - What's unclear: does adding config.toml change anything observable, or is it purely documentation?
   - Recommendation: **add a minimal config.toml** with one block per disk-only function explicitly setting `verify_jwt = true`. It's 12 lines of YAML and prevents future drift if a Supabase CLI default ever flips.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 (frontend + non-Edge-Function logic) — Edge Functions tested via empirical pg_net response inspection (no test runner targets Deno-runtime functions in this repo) |
| Config file | `vite.config.ts` (vitest reads from same config); no separate vitest.config.ts |
| Quick run command | `npm test -- --run <pattern>` |
| Full suite command | `npm test -- --run` |

**Important:** This phase is **operational** (deploy + verify), not code-shipping. The Phase 13 notification logic was unit-testable in principle but no Edge Function tests exist in `tests/` (Edge Functions run on Deno; the repo's vitest is for frontend / TS logic). **Empirical verification (live trigger fire → `net._http_response` row + actual inbox delivery)** is the validation path, NOT automated tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MAIL-02 | `notify-job-filled` deployed; trigger fires → 2xx pg_net response | empirical / manual-only | N/A — verified via SQL query against `net._http_response` post live trigger fire | manual-only (acceptable per Phase scope) |
| MAIL-02 | Notification email lands in test seeker's inbox | empirical / manual-only | N/A — verified via inbox screenshot | manual-only |
| MAIL-02 | Filled-status applicants in `hired/declined/withdrawn` do NOT receive notification | empirical / manual-only | N/A — verified via negative inbox check | manual-only |
| MAIL-01 | Resend dashboard shows SPF/DKIM `Verified` for `topfarms.co.nz` | empirical / manual-only | `curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains \| jq '.data[] \| select(.name=="topfarms.co.nz") \| .status'` (returns `"verified"`) | manual-only |
| DEPLOY-01 | GH Actions workflow exists, triggers on push to main with path filter | static check | `test -f .github/workflows/supabase-deploy.yml && grep -q "supabase functions deploy" .github/workflows/supabase-deploy.yml` | ❌ — Wave 0 will create the workflow file |
| DEPLOY-01 | Workflow successfully runs against a deploy-touching commit | empirical / live | view GH Actions run UI; expected job status = success on first push | manual-only after first run |

**Justification for manual-only:** All MAIL-02 / MAIL-01 verifications require **live external services** (production Supabase, production Resend, real DNS, real inbox). Automating these in CI would require a hermetic test environment that doesn't exist (Phase 18 scope). Empirical verification with screenshot evidence is the correct level of validation for an operational phase.

### Sampling Rate

- **Per task commit:** `npm test -- --run` (frontend regression check; this phase doesn't touch frontend, but commit hooks / CI may still run it)
- **Per wave merge:** Full suite green; manual MAIL-02 trigger fire + inbox check after the manual-deploy task lands
- **Phase gate:** Full suite green before `/gsd:verify-work`; 13-VERIFICATION.md must contain captured evidence (screenshots, pg_net rows) for all 4 Phase 13 success criteria

### Wave 0 Gaps

- [ ] `.github/workflows/supabase-deploy.yml` — covers DEPLOY-01 (NEW file; canonical pattern from Supabase docs, adapted for path filters + dry-run + concurrency)
- [ ] `supabase/config.toml` — optional but recommended; explicit `verify_jwt = true` blocks for the 4 newly-deployed functions
- [ ] `.planning/phases/13-email-notifications/13-VERIFICATION.md` — NEW backfill file; goal-backward verdicts per Phase 13's 4 success criteria with empirical evidence
- [ ] (No test files — see manual-only justification above)
- [ ] Verify GitHub Actions secrets `SUPABASE_ACCESS_TOKEN` (fresh PAT `topfarms-ci-deploy`) and `SUPABASE_DB_PASSWORD` are seeded BEFORE workflow first runs (manual setup; document in 15-XX-SUMMARY.md)

## Sources

### Primary (HIGH confidence)

- **Supabase CLI `functions deploy` reference** — https://supabase.com/docs/reference/cli/supabase-functions-deploy — verified flag set including `--use-api`, `--project-ref`, `--no-verify-jwt`, `-j/--jobs`, deploy-all behaviour
- **Supabase CLI `db push` reference** — https://supabase.com/docs/reference/cli/supabase-db-push — verified `--linked`, `--dry-run`, `--password`, `SUPABASE_DB_PASSWORD` env, registry tracking behaviour
- **Supabase Functions Deploy to Production** — https://supabase.com/docs/guides/functions/deploy — canonical GH Actions YAML; deploy-all-without-name confirmed
- **Supabase Functions GitHub Actions example** — https://supabase.com/docs/guides/functions/examples/github-actions — full workflow YAML example
- **Supabase setup-cli action** — https://github.com/supabase/setup-cli — v1 canonical, v2 released April 2026 with lockfile auto-detection
- **Supabase Function Configuration** — https://supabase.com/docs/guides/functions/function-configuration — config.toml `[functions.<name>]` syntax verified
- **Supabase CLI releases** — https://github.com/supabase/cli/releases — latest stable v2.95.4 (2026-04-27)
- **CLAUDE.md** — TopFarms repo root — project ref `inlagtgpynemhipnqvty`, MCP read-only protocol, Studio-applied migration quirk, BFIX-05 gateway-trust pattern
- **`supabase/migrations/NAMING.md`** — repo-internal — Studio vs CLI registry quirk; load-bearing for migration dry-run handling
- **`.planning/REQUIREMENTS.md`** — repo-internal — MAIL-01, MAIL-02, DEPLOY-01 requirement spec
- **`.planning/phases/15-email-pipeline-deploy/15-CONTEXT.md`** — repo-internal — locked decisions on CI scope, credentials, order of operations
- **`supabase/functions/notify-job-filled/index.ts`** — repo-internal — actual function source code; verifies recipient filter logic + service-role client pattern
- **`supabase/migrations/017_notify_job_filled_webhook.sql`** — repo-internal — trigger SQL using `pg_net.http_post` with vault-stored `supabase_url` + `service_role_key`

### Secondary (MEDIUM confidence)

- **Resend Managing Domains** — https://resend.com/docs/dashboard/domains/introduction — verification status enum (`not_started/pending/verified/partially_verified/partially_failed/failed`); dashboard URL `https://resend.com/domains`
- **Resend List Domains API** — https://resend.com/docs/api-reference/domains/list-domains — curl shape verified; per-domain `status` field used as MAIL-01 evidence
- **`--use-api` recommendation for CI** — surfaced via WebSearch (multiple sources agree); cross-verified with Supabase official docs `supabase functions deploy` reference page

### Tertiary (LOW confidence)

- None — all critical claims cross-referenced against either official Supabase docs or repo-internal evidence files.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — Supabase CLI / GH Actions / Resend are the locked stack per CONTEXT.md; flag set verified against latest official docs.
- Architecture: **HIGH** — workflow YAML adapted from official Supabase example; sequential migration→functions ordering with independent failure modes is canonical.
- Pitfalls: **HIGH** — pitfall 1 (Studio migration quirk) verified against repo's `NAMING.md`; pitfall 2 (404 verification) verified against migration 017 SQL + function source; pitfall 5 (BFIX-05) verified against CLAUDE.md §5.
- Validation architecture: **HIGH** for what's manual-only (correct level for operational phase); **MEDIUM** on whether config.toml addition should be in-scope (Claude's discretion per CONTEXT.md).

**Research date:** 2026-05-01
**Valid until:** ~2026-06-01 (30 days — Supabase CLI moves fast; re-check `--use-api` and `setup-cli@v2` recommendations if pulling later)
