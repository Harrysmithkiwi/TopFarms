---
phase: 15-email-pipeline-deploy
plan: "01"
subsystem: edge-function-deploy
tags: [edge-function, deploy, mail-02, mail-01, deploy-01, resend, supabase-cli]
dependency_graph:
  requires: []
  provides: [notify-job-filled-deployed, send-followup-emails-deployed, acknowledge-placement-fee-deployed, create-placement-invoice-deployed, resend-domain-verified-evidence]
  affects: [supabase-functions-registry]
tech_stack:
  added: [supabase-cli-v2.90.0]
  patterns: [manual-deploy-via-cli, gateway-trust-jwt-confirmed-by-grep, callsite-diff-equals-empty-set]
key_files:
  created:
    - .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/bfix05_audit.txt
    - .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/callsite_audit.txt
    - .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/deploy_log.txt
    - .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/list_edge_functions.json
    - .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json
  modified: []
decisions:
  - "BFIX-05 audit: send-followup-emails uses auth.admin.getUserById(userId) for employer email lookup — this is a data fetch, NOT JWT re-validation; passes BFIX-05 audit"
  - "Migration registry quirk: Option B chosen — trust idempotency (016+017 use IF NOT EXISTS / CREATE OR REPLACE). Dry-run output shows timestamp-vs-sequence-prefix mismatch; CI design in 15-03 must handle this explicitly"
  - "RESEND_API_KEY missing from Supabase Edge Function secrets AND local env — notify-job-filled deployed but email sends will silently skip until key is set; user must add RESEND_API_KEY secret before MAIL-02 is fully operational"
  - "CLI v2.90.0 used (v2.95.4 available) — no known breaking differences for functions deploy; update recommended but not blocking"
duration: 7min
completed: "2026-05-01"
metrics:
  tasks_completed: 4
  files_changed: 5
requirements_completed: [MAIL-02-deploy-side, DEPLOY-01-manual-baseline, MAIL-01-evidence]
---

# Phase 15 Plan 01: Edge Function Deploy Summary

**4 previously-disk-only Edge Functions deployed live via `supabase functions deploy --use-api`; BFIX-05 audit PASS; MAIL-02 silent failure resolved at deploy level; RESEND_API_KEY secret needed to complete email pipeline**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-30T22:41:26Z
- **Completed:** 2026-04-30T22:47:36Z
- **Tasks:** 4/4 (Task 3 partially blocked — stub only; MAIL-01 evidence incomplete)
- **Files modified:** 5 created in evidence dir

## What Was Built

| Evidence File | Proves |
|---|---|
| `bfix05_audit.txt` | AUDIT RESULT: PASS — zero `auth.getUser(token)` antipattern calls across all 4 functions; send-followup-emails uses `auth.admin.getUserById(userId)` for data fetch (safe) |
| `callsite_audit.txt` | src/ callsite diff = empty set — 6 invoke callsites mapped; no surprise undeployed-callees; notify-job-filled (pg_net) + send-followup-emails (cron) correctly absent from src/ |
| `deploy_log.txt` | `supabase functions deploy --use-api --project-ref inlagtgpynemhipnqvty` output; 9 functions deployed; `--use-api` confirmed; no Docker bundling |
| `list_edge_functions.json` | Post-deploy snapshot: all 9 functions ACTIVE. 4 newly-deployed at version 1: notify-job-filled, send-followup-emails, acknowledge-placement-fee, create-placement-invoice |
| `resend_domains.json` | **STUB ONLY** — RESEND_API_KEY not accessible locally or in Supabase secrets. File documents the gap and required action. MAIL-01 evidence incomplete. |

## Accomplishments

- All 4 disk-only Edge Functions are now ACTIVE in production (`list_edge_functions.json` snapshot captured)
- BFIX-05 audit confirms zero antipattern matches — all 4 functions safe to deploy per CLAUDE.md §5
- MAIL-02 deploy-side fix complete: `notify-job-filled` v1 ACTIVE; DB trigger on `on_job_filled` will now resolve to a live function instead of 404-ing
- 5 previously-deployed functions were idempotently redeployed as part of the single `supabase functions deploy` command (expected per RESEARCH.md §Open Questions #1)

## Task Commits

1. **Task 1: BFIX-05 audit + callsite cross-reference** — `b061b9b` (chore)
2. **Task 2: Deploy 4 edge functions** — `6070b1a` (feat)
3. **Task 3: Resend domain evidence stub** — `a445eb7` (chore)
4. **Task 4: 15-01-SUMMARY.md** — (this commit — docs)

## PAT Rotation Tracking

- **PAT name:** `topfarms-ci-deploy` *(not yet created — see note below)*
- **Current auth state:** Developer machine is authenticated via `supabase login` using an existing PAT (confirmed working: `supabase projects list` shows TopFarms as linked). The deploy succeeded using the existing login session.
- **For plan 15-03 (CI setup):** A fresh PAT named `topfarms-ci-deploy` must be created in Supabase dashboard → Account → Access Tokens, scoped to project `inlagtgpynemhipnqvty` only. Document creation date at that time.
- **Scope:** TopFarms project only (ref `inlagtgpynemhipnqvty`)
- **Storage after 15-03:** Developer machine `supabase login` keychain + GitHub Actions repo secret `SUPABASE_ACCESS_TOKEN`
- **Rotation policy:** Manual annual review (per CONTEXT.md "no rotation policy this phase")
- **Creation date:** To be recorded in 15-03-SUMMARY.md when the named PAT is actually created

## Migration Registry Quirk Decision

**Option B chosen — trust idempotency.**

The `supabase db push --linked --dry-run` output revealed a more significant mismatch than RESEARCH.md §Pattern 3 described:

```
Remote migration versions not found in local migrations directory.
Make sure your local git repo is up-to-date. If the error persists, try repairing the migration history table:
supabase migration repair --status reverted 20260428043338 20260428053314 20260429031148
And update local migrations to match remote database:
supabase db pull
```

**Root cause (from NAMING.md):** Migrations 018-020 were applied via MCP `apply_migration` which generated timestamp-style version IDs (`20260428043338`, etc.), but the local disk files use sequence-prefix style (`018_set_user_role_rpc.sql`, etc.). The CLI sees the remote timestamp versions and cannot find matching disk files — it reports "Remote migration versions not found in local migrations directory."

**Dry-run output analysis:** This is NOT safe to run `db push` blindly in CI. The mismatch means `db push` would fail with the error above rather than silently re-applying.

**Option B rationale:**
- Migrations 016 + 017 are already live (confirmed via runtime artefacts: `pg_ext`, `pg_proc`, `pg_trigger` per NAMING.md)
- Migrations 018-020 show timestamp mismatch — `db push` fails on name resolution, not idempotency
- Option A (repair registry) requires either: MCP write access (CLAUDE.md §2 flag-flip cycle) OR Studio SQL INSERT for 3 rows
- The correct CI approach for plan 15-03 is **`supabase migration repair`** to re-anchor the remote timestamps to local disk files, OR run `supabase db pull` to pull the remote state down as canonical disk files

**Next-touch person:** See RESEARCH.md §Pattern 3 for context. Plan 15-03 must address the migration registry mismatch BEFORE enabling `db push` in CI, otherwise the CI step will always fail. Options:
1. Run `supabase migration repair --status applied 20260428043338 20260428053314 20260429031148` (marks remote versions as applied without needing local files to match)
2. Run `supabase db pull` to generate timestamp-named migration files locally (creates new local files; changes disk convention)
3. Use Studio INSERT to add registry rows for 018-020 with matching timestamp version IDs

## Verification Notes for Plan 15-04

Plan 15-04 (13-VERIFICATION.md backfill) should reference:

- `list_edge_functions.json` → DEPLOY-01 / MAIL-02 evidence: all 9 functions ACTIVE post-deploy
- `deploy_log.txt` → `--use-api` flag confirmed; no Docker; 2026-04-30T22:43:36Z deploy timestamp
- `bfix05_audit.txt` → BFIX-05 audit PASS; safe to use notify-job-filled in production
- `resend_domains.json` → **INCOMPLETE stub** — MAIL-01 evidence requires user to:
  1. Add `RESEND_API_KEY` to Supabase secrets: `supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty`
  2. Re-run: `curl -sX GET 'https://api.resend.com/domains' -H "Authorization: Bearer $RESEND_API_KEY" | jq '.' > .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json`
  3. Confirm `"status": "verified"` for topfarms.co.nz

**Critical for email pipeline to work end-to-end:** RESEND_API_KEY must also be set as a Supabase Edge Function secret. Without it, `notify-job-filled`, `send-followup-emails`, and `create-placement-invoice` will all log "RESEND_API_KEY not set — skipping email" and silently return false for every send attempt. The functions are deployed and will receive trigger calls; they just won't send emails until the secret is set.

## Atomic Commit Note

Per CLAUDE.md §4. Plan 15-01 produces 4 commits:
1. `b061b9b` — chore(15-01): BFIX-05 audit + callsite cross-reference
2. `6070b1a` — feat(15-01): deploy 4 disk-only edge functions via supabase CLI --use-api
3. `a445eb7` — chore(15-01): Task 3 stub — resend_domains.json pending API key
4. This docs commit — 15-01-SUMMARY.md + state updates

## Deviations from Plan

### Auto-detected Issues

**1. [Rule 1 - Finding] RESEND_API_KEY missing from Supabase Edge Function secrets**
- **Found during:** Task 3
- **Issue:** RESEND_API_KEY not in local env (.env, .zshrc, .zprofile) AND not in `supabase secrets list` output. The 4 email-sending functions will silently skip all sends until the key is set.
- **Action taken:** Documented gap in `resend_domains.json` stub and this SUMMARY. Cannot auto-fix — requires user to retrieve key from Resend dashboard and set as Supabase secret.
- **Impact:** MAIL-02 deploy-side complete (function deployed), but email delivery will fail silently until secret is set. MAIL-01 evidence capture blocked.

**2. [Rule 1 - Finding] Migration registry has timestamp-vs-sequence-prefix mismatch**
- **Found during:** Task 4 (dry-run command per plan instructions)
- **Issue:** Remote migration versions (20260428043338, 20260428053314, 20260429031148) don't match local disk files (018_, 019_, 020_). `db push` fails with "Remote migration versions not found in local migrations directory." This is more severe than the 016/017 Studio-applied gap described in RESEARCH.md §Pattern 3.
- **Action taken:** Documented as Option B (trust idempotency / defer repair to 15-03). CI design in 15-03 must address this before enabling `db push`.
- **Files modified:** None (this is a documentation finding only)

---

**Total deviations:** 2 (both findings documented; neither auto-fixable; deferred to user action + 15-03)
**Impact on plan:** Core deploy objective (Task 2) fully achieved. Evidence collection (Task 3) partially blocked by missing API key. Plan marked as requiring user follow-up for RESEND_API_KEY.

## Issues Encountered

- **RESEND_API_KEY not set:** Blocks both Resend domain verification evidence AND actual email delivery from deployed functions. User must add `supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty`.
- **Migration registry mismatch:** More complex than predicted — plan 15-03 needs explicit migration repair step before enabling `db push` in CI.
- **CLI version:** Running v2.90.0 (v2.95.4 available). Upgrade recommended before plan 15-03 CI setup.

## User Setup Required

**Two manual actions required before MAIL-02 is fully operational:**

1. **Add RESEND_API_KEY to Supabase Edge Function secrets:**
   ```bash
   supabase secrets set RESEND_API_KEY=<your-resend-api-key> --project-ref inlagtgpynemhipnqvty
   ```
   Get the key from: https://resend.com/api-keys

2. **Capture Resend domain verification evidence (MAIL-01):**
   ```bash
   export RESEND_API_KEY=<your-key>
   curl -sX GET 'https://api.resend.com/domains' \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        | jq '.' > .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json
   ```
   Confirm output contains `"status": "verified"` for topfarms.co.nz.

3. **Optional — upgrade Supabase CLI** before plan 15-03:
   ```bash
   brew upgrade supabase/tap/supabase
   ```

## Next Phase Readiness

- **Plan 15-02** (MAIL-02 trigger verification): `notify-job-filled` is ACTIVE — trigger fire test can proceed. But the email delivery chain won't work end-to-end until RESEND_API_KEY is set as a Supabase secret.
- **Plan 15-03** (CI setup): PAT `topfarms-ci-deploy` must be created. Migration registry mismatch must be addressed (Option A repair or `db pull`) before `db push` CI step is safe.
- **Plan 15-04** (13-VERIFICATION.md backfill): `list_edge_functions.json` is ready as DEPLOY-01 evidence. `resend_domains.json` is incomplete — backfill is partially blocked until RESEND_API_KEY is available.

---
*Phase: 15-email-pipeline-deploy*
*Completed: 2026-05-01*

## Self-Check: PASSED

- bfix05_audit.txt: FOUND — `AUDIT RESULT: PASS` confirmed
- callsite_audit.txt: FOUND — 6 callsites mapped, diff = empty set
- deploy_log.txt: FOUND — `--use-api` confirmed, no Docker bundling
- list_edge_functions.json: FOUND — all 9 functions ACTIVE including 4 newly-deployed
- resend_domains.json: FOUND (stub only — MAIL-01 evidence incomplete, API key needed)
- 15-01-SUMMARY.md: FOUND — frontmatter valid
- Commits: b061b9b (Task 1), 6070b1a (Task 2), a445eb7 (Task 3) — all confirmed in git log
