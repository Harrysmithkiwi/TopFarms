# Phase 15: Email Pipeline Deploy & Verify - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the email-pipeline gap surfaced by `v2.0-MILESTONE-AUDIT.md`. Specifically:

1. Deploy the 4 disk-only Edge Functions live (`notify-job-filled`, `acknowledge-placement-fee`, `create-placement-invoice`, `send-followup-emails`) so the production `on_job_filled` trigger stops 404-ing silently and MAIL-02 actually fires.
2. Add a Vercel/CI deploy step for migrations + functions so this drift cannot recur (DEPLOY-01).
3. Confirm Resend dashboard shows `Verified` SPF/DKIM status and capture evidence (MAIL-01).
4. Backfill `13-VERIFICATION.md` with empirical goal-backward verification of MAIL-01 + MAIL-02 against the now-deployed pipeline.

**Out of scope** (do not build):

- New email types beyond what Phase 13 already wrote on disk — content/tone/recipient filtering already locked in `13-CONTEXT.md`
- Refactor of any of the 4 deployed functions — they ship as-shipped from Phase 13 (modulo any deploy-time bugs surfaced)
- PRIV-02 empirical identity-bypass test — that's Phase 16, but Phase 16 depends on this phase deploying `get-applicant-document-url` (already deployed; verify no regression)
- CI for the React app — Vercel already builds the SPA; we only add Supabase backend deploy steps
- Scoping Allow-Origin headers (CORS-01) — separate post-launch concern
- Saved search (Phase 17)

</domain>

<decisions>
## Implementation Decisions

### CI permissions (DISCUSSED)

- **Runtime: GitHub Actions.** New `.github/workflows/supabase-deploy.yml` triggered on push to `main`. Vercel keeps doing only the SPA build. Supabase deploys are independent of the Vite bundle — function-deploy failures must not break frontend deploys, and long-running function deploys must not eat Vercel build minutes.
- **Credentials in CI: PAT + DB password.**
  - `SUPABASE_ACCESS_TOKEN` — Personal Access Token, used for `supabase login` + `supabase functions deploy`.
  - `SUPABASE_DB_PASSWORD` — used for `supabase db push` migration apply.
  - **Service role key NEVER in CI** — stays in Edge Function runtime env only. CI deploy steps don't need superuser-level DB access; widening the surface for one-off admin SQL is not worth the blast radius.
- **PAT scope: fresh project-scoped PAT.** Create a NEW PAT in Supabase dashboard (Account → Access Tokens) named `topfarms-ci-deploy`; store in GitHub Actions repo secrets only. Document name + creation date in `15-XX-SUMMARY.md` for rotation tracking. Compromise blast radius = TopFarms project only.
- **Project ref:** hardcode `inlagtgpynemhipnqvty` in the workflow file. Already public via `.mcp.json`; no need to treat as secret.

### Order of operations (RESOLVED — recommended default)

- **Manual deploy first, CI second.** Because MAIL-02 is silently failing in production right now, the very first sub-task in Phase 15 deploys the 4 functions via local `supabase functions deploy` from the developer's machine. This stops the prod silent-failure within hours, not days. CI is built as a separate sub-task in the same phase to prevent the drift recurring.
- **Decoupling rationale:** uncoupling the emergency fix from CI design lets us (a) verify the function-deploy mechanic end-to-end manually before automating, (b) confirm the trigger → function → email chain actually works in prod before adding CI complexity, (c) avoid a CI design that fails on first run blocking the prod fix.

### CI trigger + scope (RESOLVED — recommended default)

- **Trigger: push to `main`** that touches `supabase/migrations/**` or `supabase/functions/**`. Pushes that don't touch those paths skip the workflow (path filters).
- **Deploys both migrations and functions, in separate steps.**
  - Step 1: `supabase db push` (migration apply). Dry-run check first (`supabase db push --dry-run` if available, otherwise list pending migrations and abort if registry is unexpectedly empty per the Studio-applied quirk in `supabase/migrations/NAMING.md`).
  - Step 2: `supabase functions deploy <name>` for each function whose source has changed since the last deploy. Loop or matrix; doesn't matter at our scale.
- **Separation rationale:** function-deploy failure must not block migration apply (and vice versa). Migrations and functions have independent failure modes.
- **No tag-driven prod deploys.** Single environment (production); push-to-main is the prod release event.

### CI failure mode (RESOLVED — recommended default)

- **Block on migration apply failure.** Migration drift is the original problem this phase exists to fix; failing loudly is the whole point. Workflow exits non-zero, GitHub shows the X, developer has to fix forward (or revert the migration commit).
- **Notify-only on function-deploy failure.** Supabase CLI rollback support is thin; auto-rollback would be over-engineered. On function-deploy failure: log the error, post a notice (GitHub Actions step summary + maybe a Slack ping if one's already wired — otherwise just the summary), continue. Manual re-run via `workflow_dispatch` is the recovery path.
- **No auto-rollback** for either step.

### MAIL-02 production verification (RESOLVED — recommended default)

- **Real test job in seeded UAT data.** Use existing seeded test seeker + test job. Mark the job as filled via the actual `MarkFilledModal` UI (not direct SQL). Verify: `pg_net.http_post` response is 2xx in the `net._http_response` table; notification email lands in the seeded test seeker's inbox (Gmail or Outlook, not spam).
- **Synthetic SQL is acceptable as a fallback** if seeded data is missing — `UPDATE jobs SET status='filled' WHERE id=$test_job_id`, then verify the same downstream signals.
- **Capture in 13-VERIFICATION.md:** screenshot or curl evidence of (a) Resend dashboard showing email delivery success, (b) inbox screenshot of the received email, (c) `pg_net` response row from the trigger fire.

### 13-VERIFICATION.md backfill scope (RESOLVED — recommended default)

- **Goal-backward verification per the 4 success criteria in `ROADMAP.md` Phase 13** — one verdict (PASS / PARTIAL / FAIL) per criterion with empirical evidence:
  1. Resend SPF/DKIM `Verified` (screenshot)
  2. Test email lands in inbox (screenshot)
  3. Filled job → notification email to applicants in `applied | review | interview | shortlisted | offered` (test execution + inbox confirmation)
  4. Terminal-status applicants (`hired | declined | withdrawn`) do NOT receive the filled email (test execution + negative inbox check)
- **Not a full retrospective** — this isn't `audit-milestone`; it's targeted backfill against the phase's own promised criteria.
- **Frontmatter:** include `nyquist_compliant: true` if Wave 0 tests now exist for `notify-job-filled`, otherwise note the explicit deferral.

### Disk-only function inventory (LOCKED)

The 4 functions to deploy live, ordered by impact:

1. `supabase/functions/notify-job-filled/` — closes MAIL-02 silent failure (prod-broken NOW)
2. `supabase/functions/send-followup-emails/` — Phase 1.0 cron-driven Day 7/14 follow-ups (was meant to be deployed in v1.0 — never was)
3. `supabase/functions/acknowledge-placement-fee/` — placement fee acknowledgement flow (v1.0)
4. `supabase/functions/create-placement-invoice/` — Stripe invoice mint (v1.0)

**Cross-reference check during planning:** `grep -rn "supabase.functions.invoke" src/` against `mcp__supabase__list_edge_functions` output. Any callsite referencing a function not in `list_edge_functions` is undeployed-callee debt; widen scope only if a NEW name appears (none expected per audit, but confirm during plan-phase).

### Verify_jwt pattern check (LOCKED — carried from Phase 14)

- Per `CLAUDE.md` item 5 (BFIX-05) — any `verify_jwt: true` function being deployed/redeployed must use the gateway-trust + local `atob` decode pattern, not `adminClient.auth.getUser(token)`.
- **Pattern audit during planning:** read each of the 4 functions' `index.ts`. Flag any that re-validate JWT via service-role-keyed `auth.getUser(token)`. Currently only `get-applicant-document-url` had the BFIX-05 fix applied; the 4 disk-only functions have not been pattern-checked because they were never deployed.

### Resend Verified status confirmation (LOCKED)

- Already configured in Phase 13-02 per `13-02-SUMMARY.md` claim. This phase confirms-and-captures only — does NOT redo DNS work.
- Evidence: screenshot of Resend dashboard `Domains` page showing `topfarms.co.nz` (or whatever domain) with `Verified` next to SPF and DKIM. Pasted into `13-VERIFICATION.md` MAIL-01 verdict.

### Claude's Discretion

- Exact filename for the GitHub Actions workflow (`supabase-deploy.yml` vs `deploy.yml` vs `backend.yml`)
- Whether to use a job-level matrix or a step loop for per-function deploys
- Exact format of the dry-run preflight (CLI flags vary by Supabase CLI version)
- Whether to add a `concurrency` block to the workflow (recommended yes, to prevent overlapping deploys, but exact key is implementation detail)
- Whether to capture Slack notification on function-deploy failure (yes if a webhook URL is already in env, otherwise just GH summary)
- Order of function deploys within the workflow (any order works — they're independent)
- Whether to write a `supabase/config.toml` to pin local CLI behavior (none exists currently — recommend adding minimally during this phase)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract (locked)
- `.planning/REQUIREMENTS.md` — MAIL-01, MAIL-02 (Email Deliverability), DEPLOY-01 (Operations), MCP-QUIRK-01
- `.planning/ROADMAP.md` — Phase 15 section: 5 success criteria, dependency note (Phase 16 depends on this)
- `.planning/v2.0-MILESTONE-AUDIT.md` — Source of phase scope: §"Broken Flows" MAIL-02, §"Critical Blockers" #1 + #2, §"Cross-Phase Integration" "Job filled → email notification" row

### Prior phase context (carry-forward)
- `.planning/phases/13-email-notifications/13-CONTEXT.md` — Notification system design decisions (template, recipient filter, trigger architecture)
- `.planning/phases/13-email-notifications/13-01-SUMMARY.md` — What 13-01 actually shipped on disk
- `.planning/phases/13-email-notifications/13-02-SUMMARY.md` — DNS configuration claim (MAIL-01)
- `.planning/phases/14-bug-fixes/14-CONTEXT.md` — BFIX-05 gateway-trust pattern reference, deploy ordering precedent
- `.planning/phases/14-bug-fixes/14-VERIFICATION.md` — Phase-level VERIFICATION.md format reference (we're producing 13-VERIFICATION.md to match)

### House rules (project-level)
- `CLAUDE.md` §1 — Project ref `inlagtgpynemhipnqvty`, project-scoped MCP only
- `CLAUDE.md` §2 — `--read-only` MCP behavior, Supabase Studio fallback, Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows
- `CLAUDE.md` §5 — Gateway-trust JWT pattern for `verify_jwt: true` Edge Functions (audit each of the 4 functions during planning)

### Code (the 4 functions to deploy)
- `supabase/functions/notify-job-filled/index.ts` — Phase 13 notification function; MAIL-02 deploy target
- `supabase/functions/send-followup-emails/index.ts` — v1.0 cron-driven follow-ups; reference Resend integration pattern
- `supabase/functions/acknowledge-placement-fee/index.ts` — v1.0 placement fee acknowledgement
- `supabase/functions/create-placement-invoice/index.ts` — v1.0 Stripe invoice mint
- `supabase/functions/get-applicant-document-url/index.ts` — already deployed (BFIX-05 reference for verify_jwt pattern)

### Migration registry quirk
- `supabase/migrations/NAMING.md` — Lookup table for disk-prefix vs live-version mismatches; informs the dry-run preflight design (can't trust `list_migrations` alone as source of truth)
- `supabase/migrations/017_notify_job_filled_webhook.sql` — Studio-applied 2026-04-29; trigger that needs `notify-job-filled` deployed to actually fire

### Vercel + CI references
- `vercel.json` — Current minimal config (SPA rewrite + Vite build); not modified by this phase
- `package.json` — `npm run build` / `npm run typecheck`; CI workflow can call typecheck if scope warrants

### Supabase CLI docs (fetch fresh during research)
- Supabase CLI `functions deploy` reference — for exact command syntax and flag set per current CLI version
- Supabase CLI `db push` reference — for migration apply behavior, dry-run support, idempotency
- GitHub Actions OIDC for Supabase (alternative to long-lived PAT — discussed but not selected)

### Project context
- `MILESTONE_LAUNCH.md` — §2.3 Resend DNS blocker (MAIL-01 evidence target)
- `.planning/PROJECT.md` — Tech stack constraints (no deviation from Supabase + Vercel)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`vercel.json`** — minimal SPA config; does NOT include build hooks. Confirms Vercel is doing only frontend; no existing backend deploy coupling to disturb.
- **No `.github/workflows/`** — clean slate for the new `supabase-deploy.yml`. No existing GH Action patterns to align with; pick the canonical Supabase + GH Actions pattern from current docs.
- **No `supabase/config.toml`** — local CLI uses defaults. Adding a minimal config is in-scope discretion (helps pin CLI behavior across dev + CI).
- **9 Edge Functions on disk**, 5 currently deployed: `generate-candidate-summary`, `generate-match-explanation`, `stripe-webhook`, `create-payment-intent`, `get-applicant-document-url`. The disk-vs-deployed delta IS the phase scope.
- **Edge Function CORS + service-role scaffolding** consistent across all 4 disk-only functions — no per-function deploy-time peculiarities expected.

### Established Patterns

- **MCP `list_edge_functions`** is the source of truth for what's deployed live (use it during plan-phase to baseline the gap).
- **MCP `list_migrations`** is NOT a complete source of truth for what's applied (per NAMING.md). The dry-run preflight must account for this — query `supabase_migrations.schema_migrations` AND `pg_extension`/`pg_proc`/`pg_trigger` runtime artefacts to baseline drift.
- **Atomic commit discipline** (CLAUDE.md §4) — Phase 15 will likely produce 2-4 commits: (a) manual function deploy + Resend verification capture, (b) GH Action workflow, (c) 13-VERIFICATION.md backfill, (d) any incidental fixes surfaced during deploy.

### Integration Points

- **GitHub Actions secrets store** (NEW) — `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`. Both populated manually during plan execution; documented in `15-XX-SUMMARY.md`.
- **`net._http_response` table in Supabase** — pg_net response log; primary signal for "did the trigger actually call the function".
- **Resend dashboard** — external system; `Domains` page is the MAIL-01 evidence source.
- **Test seeker + test job in seeded UAT data** — verification target. Confirm seeded data exists during plan-phase; if not, plan task includes seeding.

</code_context>

<specifics>
## Specific Ideas

- **MAIL-02 is silently failing in production right now.** The DB trigger fires `pg_net.http_post` to a function that returns 404. Every employer who marks a job filled has been failing to notify applicants since Phase 13 shipped. Treat this as urgent — manual deploy in the first sub-task, not last.
- **Don't re-do Phase 13's design work.** The notification template, recipient filter, status list (`applied | review | interview | shortlisted | offered`), and CTA destination are all locked in `13-CONTEXT.md`. Phase 15 is operational, not design.
- **OIDC tokens were considered.** GitHub Actions supports OIDC short-lived tokens, and Supabase has limited support. Decided against in favor of PAT+DB-password for current CLI maturity. Worth revisiting in v2.1 if Supabase ships first-class OIDC.
- **The Studio-applied migration quirk is load-bearing.** Migrations 016 + 017 are functionally live but registry-rowless. The CI dry-run preflight design has to handle this — `list_migrations` will be empty for those two but they're already applied. Document the quirk-handling in the workflow comments.

</specifics>

<deferred>
## Deferred Ideas

- **CORS-01** — scope down `Access-Control-Allow-Origin` to production domain — post-launch hardening, not Phase 15
- **PAT rotation automation** — no rotation policy this phase; manual annual review noted in SUMMARY for future hardening
- **Slack/email alerting on CI deploy failures** — only if a webhook URL is already in env; otherwise relies on GH Actions failure email
- **CI for typecheck/lint/test gates** — separate concern; Phase 18 tech debt cleanup territory
- **MAIL-03/04/05/06** (weekly digest, inactive nudge, auto-hide, saved-search alerts) — Future Requirements, post-launch
- **Migrating to `vercel.ts`** for Vercel project config — newer pattern per session-context, but `vercel.json` is sufficient and unchanged by this phase
- **Vercel build hook for backend deploys** — explicitly rejected during gray-area resolution (coupling fragility)
- **AUTH-FIX-02 root cause investigation** — Phase 18
- **EMPLOYER_VISIBLE_DOCUMENT_TYPES single-source-of-truth refactor** — Phase 18
- **Stale `getUser` comment in `get-applicant-document-url/index.ts:8`** — Phase 18 (cosmetic; no behavior impact)
- **Phase 12/13 VALIDATION.md `nyquist_compliant` finalization** — Phase 18
- **PRIV-02 empirical identity-bypass test** — Phase 16 (depends on this phase confirming `get-applicant-document-url` is not regressed by any deploy here)

</deferred>

---

*Phase: 15-email-pipeline-deploy*
*Context gathered: 2026-05-01*
*Source of scope: `.planning/v2.0-MILESTONE-AUDIT.md` Critical Blockers #1 + #2; ROADMAP.md commit `beaca5f`*
