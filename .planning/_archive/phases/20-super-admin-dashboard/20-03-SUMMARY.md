---
phase: 20-super-admin-dashboard
plan: 03
subsystem: infra
tags: [edge-functions, deno, resend, supabase, cron, webhook-secret, admin-metrics-cache]

# Dependency graph
requires:
  - phase: 20-super-admin-dashboard
    provides: "public.admin_metrics_cache table (created by plan 20-02 migration 023)"
  - phase: 18-launch-hardening
    provides: "X-Webhook-Secret defence-in-depth pattern for verify_jwt=false functions"
provides:
  - "supabase/functions/get-resend-stats/index.ts — cron-driven Resend /emails poller"
  - "Cached external-metric Edge Function pattern (RESEARCH.md Pattern 4)"
  - "supabase/config.toml [functions.get-resend-stats] block with verify_jwt=false + rationale"
affects: [20-04, 20-05, 20-06, 20-07, 20-08, daily-briefing, resend-delivery-rate-card]

# Tech tracking
tech-stack:
  added: [deno-2.7.14]
  patterns:
    - "Cached external-metric Edge Function: cron-driven poller writes to admin_metrics_cache; SECURITY DEFINER RPCs read from cache only (no pg_net out-calls inside read RPCs)"
    - "X-Webhook-Secret defence-in-depth for verify_jwt=false functions (Phase 18 hardening #15)"
    - "RESEND_API_KEY-unset graceful degradation: cache {unavailable: true} marker so UI can render 'Delivery data unavailable' copy without throwing"

key-files:
  created:
    - "supabase/functions/get-resend-stats/index.ts"
  modified:
    - "supabase/config.toml"
    - ".gitignore"

key-decisions:
  - "Use deno.lock in .gitignore — local typecheck artefact, Supabase CLI handles dependency resolution at deploy time; no prior deno.lock in repo history"
  - "Graceful RESEND_API_KEY-unset path writes 'unavailable' marker to admin_metrics_cache instead of erroring — preserves daily-briefing render path during MAIL-02-style outages"
  - "Aggregate delivered = delivered + opened + clicked (Resend's last_event progresses monotonically: opened/clicked imply delivered)"

patterns-established:
  - "Pattern: cron Edge Function for cached external metrics (mirrors notify-job-filled createClient + service-role pattern; no CORS headers since cron-only)"
  - "Pattern: X-Webhook-Secret validation immediately after method check, before any external IO"
  - "Pattern: Edge Function source written + typechecked locally (deno check) before Supabase CLI deploy — catches type errors at write time rather than deploy time"

requirements-completed: []

# Metrics
duration: 7 min
completed: 2026-05-04
---

# Phase 20 Plan 03: get-resend-stats Edge Function Summary

**Cron-driven Resend /emails poller that aggregates last_event into delivered/bounced/complained counts and upserts the result into admin_metrics_cache; verify_jwt=false at gateway with X-Webhook-Secret defence-in-depth inside the handler.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-04T11:37:30Z (approx — execution kicked off at start of session)
- **Completed:** 2026-05-04T11:44:28Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Wrote complete Edge Function source (`supabase/functions/get-resend-stats/index.ts`, 119 lines) implementing the cached external-metric pattern locked in 20-RESEARCH.md §"Pattern 4"
- Function passes `deno check` (Deno 2.7.14) — type errors and unresolved imports caught at write time rather than deploy time
- Defence-in-depth wired from day one: X-Webhook-Secret header validation immediately after method check (Phase 18 hardening #15)
- RESEND_API_KEY-unset path writes `{unavailable: true}` marker to cache so daily briefing renders "Delivery data unavailable" copy without crashing
- Registered function in `supabase/config.toml` with `verify_jwt = false` and a 9-line rationale comment distinguishing it from the CLAUDE.md §5 gateway-trust pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the Edge Function source** — `d0ecf4a` (feat)
2. **Task 2: Register get-resend-stats in supabase/config.toml** — `db20b88` (chore)

**Plan metadata:** (pending — final commit)

## Files Created/Modified

- `supabase/functions/get-resend-stats/index.ts` (created, 119 lines) — Cron-driven Resend stats poller with X-Webhook-Secret validation, RESEND_API_KEY-unset graceful path, last_event aggregation, and admin_metrics_cache upsert
- `supabase/config.toml` (modified, +13 lines) — New `[functions.get-resend-stats]` block with `verify_jwt = false` + comment block clarifying this is NOT the §5 gateway-trust pattern
- `.gitignore` (modified, +3 lines) — Added `deno.lock` exclusion (local typecheck artefact)

## Decisions Made

- **deno.lock gitignored** — `deno check` generates a lockfile in the project root; no prior `deno.lock` exists in repo history, and Supabase CLI handles dependency resolution at deploy time. Committing it would establish a new convention without explicit decision; ignoring it keeps the repo clean.
- **Graceful RESEND_API_KEY-unset path** — instead of returning an error, the function caches `{unavailable: true, reason: 'RESEND_API_KEY unset'}` so the daily briefing renders the "Delivery data unavailable" copy from 20-UI-SPEC.md without an extra error path. Mirrors how `notify-job-filled` logs and continues when the key is missing.
- **delivered = delivered + opened + clicked** — Resend's `last_event` progresses monotonically; an email with `last_event=opened` was necessarily delivered. Summing all three captures the true delivery total without double-counting (each email has exactly one `last_event`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Deno 2.7.14 via Homebrew**
- **Found during:** Task 1 acceptance verification
- **Issue:** Plan acceptance criterion requires `deno check supabase/functions/get-resend-stats/index.ts` to exit 0, but Deno was not installed on the system (`which deno` returned nothing). Supabase CLI is installed but doesn't expose a standalone `deno check` command.
- **Fix:** `brew install deno` (164.6 MB, ~2 min). Installed Deno 2.7.14 stable on aarch64-apple-darwin.
- **Files modified:** None (system-level install).
- **Verification:** `deno --version` returns `deno 2.7.14`; `deno check supabase/functions/get-resend-stats/index.ts` exits 0 (downloads esm.sh deps + typechecks successfully).
- **Committed in:** N/A (system tooling, not source).

**2. [Rule 3 - Blocking] Added deno.lock to .gitignore**
- **Found during:** Task 1 commit staging
- **Issue:** Running `deno check` generated a `deno.lock` file in the repo root. No prior `deno.lock` existed in repo history; left untracked, it would create noise on every future `deno check` invocation.
- **Fix:** Appended `deno.lock` to `.gitignore` under a new "Deno" section with a comment explaining Supabase CLI handles deploy-time dep resolution.
- **Files modified:** `.gitignore` (+3 lines).
- **Verification:** `git status --short` no longer reports `deno.lock` as untracked; lockfile is preserved on disk for local incremental typechecks.
- **Committed in:** `d0ecf4a` (rolled into Task 1 commit alongside the Edge Function source it was generated by).

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking, both required for the `deno check` acceptance criterion).
**Impact on plan:** Both auto-fixes were prerequisites for satisfying a documented acceptance criterion (`deno check ... exits 0`). No scope creep — the plan's verify command implicitly required Deno; the planner reasonably assumed it would be available since the Supabase CLI is installed (it isn't bundled).

## Issues Encountered

None during planned task execution. The two Rule 3 auto-fixes above (Deno install, deno.lock gitignore) were anticipated tooling-environment work, handled inline.

## Authentication Gates

None. This plan writes source only; deploy + cron schedule are deferred to plan 20-08 where the auth gate (Supabase project login + secrets configuration) will land.

## User Setup Required

None - no external service configuration required for this plan. Plan 20-08 will require setting `ADMIN_METRICS_WEBHOOK_SECRET` and `RESEND_API_KEY` in Supabase Edge Function secrets before deploy + cron activation.

## Next Phase Readiness

- **Ready for plan 20-04** (next plan in Phase 20). The cached external-metric pattern is now established — admin_get_daily_briefing (planned for a later wave) will read from `admin_metrics_cache` where `metric_key='resend_stats'` rather than calling out via pg_net.
- **Plan 20-08 prerequisites:** the `[functions.get-resend-stats]` config block + the function source are both in place; deploy can proceed via `supabase functions deploy get-resend-stats` once 20-08 lands. The pg_cron schedule + secret configuration are 20-08's scope.
- **No blockers.** Function source is type-checked; config block is registered; existing 4 function blocks are untouched.

## Self-Check: PASSED

- File `supabase/functions/get-resend-stats/index.ts` exists on disk: PASS
- File `supabase/config.toml` contains `[functions.get-resend-stats]` block: PASS (1 occurrence)
- `deno check supabase/functions/get-resend-stats/index.ts` exits 0: PASS
- Commit `d0ecf4a` (Task 1) exists in git log: PASS
- Commit `db20b88` (Task 2) exists in git log: PASS
- No `adminClient.auth.getUser` substring in `supabase/functions/get-resend-stats/`: PASS
- `verify_jwt = false` count in config.toml >= 3: PASS (4 matches; 3 directives + 1 in comment text)

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*
