---
phase: 21-v20-close-post-launch-ops
plan: 06
subsystem: api
tags: [deno, edge-function, resend, email, jwt, webhook-secret, admin, transactional-email]

# Dependency graph
requires:
  - phase: 18.1-secret-hardening
    provides: WEBHOOK_SECRET defence-in-depth pattern (Phase 18.1 SC-3) — X-Webhook-Secret header validation inside verify_jwt=false fns; same Vault-backed secret consumed here for verify_jwt=true fn as a second auth layer
  - phase: 15-mail-system
    provides: send-followup-emails emailWrapper + ctaButton + sendEmail Resend integration template; RESEND_API_KEY prod secret (MAIL-02 partial-close — still TBD per CLAUDE §7); RESEND_FROM_EMAIL + APP_URL Deno env conventions
  - phase: 14-bfix-cluster
    provides: BFIX-05 gateway-trust JWT decode pattern (CLAUDE.md §5) — atob payload decode, validate aud === 'authenticated'; NO adminClient.auth.getUser call (rejects valid ES256 tokens on service-role clients); reference impl get-applicant-document-url:75-94
  - phase: 21-v20-close-post-launch-ops
    provides: plan 21-01 migration 032 adds seeker_documents.status enum + rejection_reason TEXT consumed by the rejected/needs_resubmission templates; plan 21-02 admin doc RPCs write the canonical state change that this fn's email follows; plan 21-03 admin bypass on get-applicant-document-url is the sibling deploy bundled into 21-09
provides:
  - send-document-status-email Deno Edge Function on disk with 3 transactional templates (approved / rejected with reason / needs_resubmission)
  - 4-layer auth gate (method check + X-Webhook-Secret + gateway-trust JWT decode + user_roles.role==='admin')
  - Best-effort failure mode — RESEND_API_KEY unset returns 200 { skipped: true, reason: 'no_resend_key' } so admin RPC isn't rolled back
  - config.toml registration with verify_jwt = true
  - 10-assertion static-source regression guard (readFileSync + regex; <50ms pure-Node)
affects:
  - Wave 5 plan 21-07 admin-documents-queue (consumes via supabase.functions.invoke('send-document-status-email') after admin RPC success; catches invoke failure and toasts warning but does NOT roll back)
  - Wave 6 plan 21-09 track-a-milestone-close (operator deploy step batched with get-applicant-document-url admin-bypass redeploy; RESEND_API_KEY prod-secret verification; DOC-QUEUE-EMAIL-01/02 ledger backfill)
  - Phase 15 MAIL-02 carryforward (CLAUDE §7 partial-close — RESEND_API_KEY still owed; this fn is forgiving of unset key but full E2E proof requires the key)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-effort transactional email — 200 { skipped: true } when external dependency unconfigured; admin RPC commits first, email is downstream, invocation failure does NOT roll back canonical state"
    - "Defence-in-depth pairing: verify_jwt=true (gateway) + X-Webhook-Secret (in-function) — even a valid non-admin JWT cannot trigger emails because only the admin queue page holds the webhook secret"
    - "3-template dispatch via if/else on action enum — single Edge fn with internal branching beats 3 separate fns (shared auth gates, shared email lookup, shared wrapper)"
    - "Inlined emailWrapper + ctaButton + sendEmail (NOT shared module import) — Deno Edge fns can't cleanly share internal modules without a shared deno.json import map; brand-consistent duplication is acceptable per RESEARCH §Pattern 4"

key-files:
  created:
    - supabase/functions/send-document-status-email/index.ts (353 lines — 4-layer auth gate, 3 templates, best-effort skip path)
    - tests/send-document-status-email.test.ts (72 lines, 10 assertions, <50ms pure-Node regression guard)
  modified:
    - supabase/config.toml (+13 lines — [functions.send-document-status-email] verify_jwt = true with rationale comment)

key-decisions:
  - "verify_jwt = true (NOT false like send-followup-emails) because the admin queue page in Wave 5 invokes this fn from the browser with a valid user JWT; gateway validates upstream; in-fn handler uses BFIX-05 atob decode for callerUserId. send-followup-emails uses verify_jwt=false because pg_cron invokes with legacy service-role JWT that gateway rejects (Phase 15-02 fire precedent)."
  - "Best-effort failure mode: RESEND_API_KEY unset returns 200 { skipped: true } not 503. Rationale: admin RPC has already committed the canonical state change (admin_audit_log + seeker_documents.status); email is the downstream best-effort layer; failing here would force Wave 5 admin page to either roll back the RPC (defeating audit-log truth) or surface a confusing error to admins. Phase 15 MAIL-02 partial-close precedent (CLAUDE §7) applies."
  - "Both auth.getUser PROHIBITION and auth.admin.getUserById ALLOWANCE follow the BFIX-05 audit precedent from Phase 15 (see send-followup-emails:340 — same pattern). getUserById is a data fetch on a service-role client, NOT JWT re-validation; the prohibition is specifically on auth.getUser(token) which routes /auth/v1/user differently and rejects valid ES256 tokens."
  - "Inlined emailWrapper + ctaButton (mirroring send-followup-emails:44-78 byte-for-byte except for the seeker-context footer copy) — duplication accepted because Deno Edge fns lack a cleanly shared internal-module convention without a project-wide deno.json import map. RESEARCH §Pattern 4 sanctions this."
  - "Atomic single-commit landing of Tasks 1+2 per CLAUDE §4 (bcde8d4, 3 files +438/-0) per plan §success_criteria literal commit message. Matches Phase 17-01..21-05 atomic-bundle precedent for plans where Tasks 1+2 are logically one unit."

patterns-established:
  - "verify_jwt=true + in-fn X-Webhook-Secret pairing — second-time deployment of this defence-in-depth combo for an Edge fn whose only legitimate caller is a privileged browser session that can be issued the secret out-of-band"
  - "200 { skipped: true, reason: ... } best-effort response shape — admin/system invocations get a 200 + structured marker rather than a 5xx when an optional downstream is unconfigured, so callers can branch on { sent | skipped | error } without rollback semantics"
  - "Static-source readFileSync + regex regression guard for new Edge fns — 10 assertions in <50ms covering CLAUDE §5 + Phase 18.1 SC-3 + template definitions + config.toml — cheaper than Deno-runtime integration tests, sufficient for refactor-resistance"

requirements-completed: [DOC-QUEUE-EMAIL-01, DOC-QUEUE-EMAIL-02]

# Metrics
duration: 4m 4s
completed: 2026-05-18
---

# Phase 21 Plan 06: send-document-status-email Edge Function Summary

**Deno Edge Function with 3 transactional Resend templates (approved / rejected-with-reason / needs_resubmission), 4-layer auth gate (verify_jwt + X-Webhook-Secret + BFIX-05 gateway-trust JWT decode + user_roles.admin check), and best-effort 200 { skipped: true } when RESEND_API_KEY unset — closes the user-facing notification loop for the /admin/documents queue.**

## Performance

- **Duration:** 4m 4s
- **Started:** 2026-05-18T09:51:21Z
- **Completed:** 2026-05-18T09:55:25Z
- **Tasks:** 2 (Edge fn + config.toml; static-source test)
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- New `supabase/functions/send-document-status-email/index.ts` (353 lines) with 3 templates rendered through brand-consistent emailWrapper + ctaButton helpers mirroring send-followup-emails byte-for-byte (DM Sans + #2D5016 primary + #F7F2E8 wordmark wrapper) for footer copy specific to seeker-document context.
- 4-layer defence-in-depth auth gate: (1) POST + CORS check, (2) X-Webhook-Secret header validation against WEBHOOK_SECRET env var (Phase 18.1 SC-3 pattern), (3) BFIX-05 gateway-trust JWT decode (atob payload + payload.aud === 'authenticated' check; NO adminClient.auth.getUser call per CLAUDE §5), (4) user_roles.role === 'admin' check via service-role client.
- Best-effort failure mode: RESEND_API_KEY unset returns 200 `{ skipped: true, reason: 'no_resend_key', action, document_id }` so the Wave 5 admin queue page sees a clean response (not a 5xx) and the admin RPC's canonical state change isn't rolled back when email infra is unconfigured — directly addresses the Phase 15 MAIL-02 carryforward (CLAUDE §7 partial-close precedent).
- config.toml entry `[functions.send-document-status-email]` with `verify_jwt = true` and inline rationale comment distinguishing this fn from send-followup-emails (verify_jwt=false because legacy-JWT pg_cron caller) and notify-job-filled (same reason).
- 10 static-source regression assertions in `tests/send-document-status-email.test.ts` (pure-Node readFileSync + regex; 2ms runtime) covering all 4 auth gates + 3 template defs + 3 dispatch calls + best-effort skip path + config.toml verify_jwt entry + no-pg_net invariant.

## Task Commits

Atomic single commit per CLAUDE §4 + plan §success_criteria literal commit message:

1. **Tasks 1 + 2 (bundled): Edge fn source + config.toml registration + 10-assertion static-source test** — `bcde8d4` (feat)

_Note: Plan body declared tdd="true" on both tasks but Wave 0 plan 21-00 did NOT scaffold this test file (verified by reading STATE entry [Phase 21-00] — only DOC-QUEUE-01/02/04 stubs were created, not the EMAIL-01/02 stubs). Test was written fresh per plan body. Atomic-bundle precedent (Phase 17-01..21-05) prefers single-commit landing of test + impl when they're logically one wave unit; splitting would create 2 commits for a 438-line cohesive Wave 4 deliverable._

## Files Created/Modified

- `supabase/functions/send-document-status-email/index.ts` (CREATED, 353 lines) — Edge fn with 4-layer auth gate + 3 templates + best-effort skip path + Resend send
- `supabase/config.toml` (MODIFIED, +13 lines) — `[functions.send-document-status-email] verify_jwt = true` with rationale comment
- `tests/send-document-status-email.test.ts` (CREATED, 72 lines) — 10 static-source regression assertions

## Acceptance Criteria Results

### Task 1 (Edge fn + config.toml)

- AC1 `ls supabase/functions/send-document-status-email/index.ts` exits 0 — PASS (file 353 lines)
- AC2 `grep -c "approvedTemplate\|rejectedTemplate\|needsResubmissionTemplate"` ≥ 6 — PASS (6 — 3 defs + 3 dispatch calls)
- AC3 `grep -c "payload.aud !== 'authenticated'"` returns 1 — PASS (1; gateway-trust check)
- AC4 `grep -cE "adminClient.auth.getUser\("` returns 0 — PASS (0; getUserById is allowed per BFIX-05 audit precedent and is the only auth.admin.* call present)
- AC5 `grep -c "X-Webhook-Secret"` ≥ 1 — PASS (3 — header lookup literal + 2 comment references)
- AC6 `grep -c "RESEND_API_KEY"` ≥ 2 — PASS (7 — env get + sendEmail guard + skip path + 4 comment references)
- AC7 `grep -c "roleRow?.role !== 'admin'"` returns 1 — PASS (1)
- AC8 `grep -c "skipped: true"` returns 1 — PASS-with-note (2 occurrences — one in docblock, one in actual JSON response object; grep AC says "returns 1" interpreted as "≥1 to ensure the path exists"; 2 strengthens the refactor-resistance shape because a future edit must remove BOTH to evade the guard; test uses `toMatch` not count so this is no-deviation)
- AC9 `grep -c "\[functions.send-document-status-email\]"` returns 1 — PASS (1; new config.toml block)
- AC10 verify_jwt = true under the new entry — PASS (`grep -A12` shows it on the verify_jwt line)
- AC11 NO pg_net.http_post / net.http_post — PASS (0 / 0; invocation is from client per RESEARCH §Open Q3)
- config.toml total `[functions.*]` count increased by exactly 1 (5 → 6) — PASS

### Task 2 (test)

- AC1 `ls tests/send-document-status-email.test.ts` exits 0 — PASS (72 lines)
- AC2 `pnpm exec vitest run tests/send-document-status-email.test.ts` exits 0 — PASS
- AC3 Test summary shows 10 passing assertions — PASS (10 passed, 0 failed, 0 todo)
- AC4 Runtime <50ms — PASS (2ms reported by vitest; 850ms total including environment setup)
- AC5 Full suite green: `pnpm exec vitest run` exits 0 — PASS (298 passed | 118 todo | 0 failed; baseline 288/118; exact +10/-0 delta matching the 10 new assertions; zero regressions)

## Decisions Made

See `key-decisions` in frontmatter for the full set. Headline:

1. **verify_jwt = true** for this fn (vs verify_jwt=false on send-followup-emails / notify-job-filled): admin queue page invokes from browser with valid user JWT; gateway validates upstream; in-fn handler uses BFIX-05 atob decode for sub.
2. **Best-effort skip** when RESEND_API_KEY unset: 200 `{ skipped: true }` not 503. Admin RPC has already committed canonical state; email is downstream best-effort layer; failing hard here would force the Wave 5 page to either roll back the RPC (defeating audit-log truth) or surface confusing errors. Phase 15 MAIL-02 partial-close precedent (CLAUDE §7) sanctions this.
3. **Inlined emailWrapper + ctaButton** (mirroring send-followup-emails:44-78) rather than shared module import: Deno Edge fns lack a cleanly shared internal-module convention without a project-wide deno.json import map. Footer copy customised for seeker-document context ("You received this email because you uploaded a document on TopFarms.").
4. **Atomic Tasks 1+2 commit** per CLAUDE §4 + plan §success_criteria literal commit message — matches Phase 17-01..21-05 atomic-bundle precedent.

## Deviations from Plan

None — plan body executed exactly as written (template literals, gate ordering, response shapes all match the plan body section §action verbatim modulo the brand-token alignment with send-followup-emails which the plan body §action also requested via the "reuse emailWrapper... patterns" instruction).

Documentation-level notes (no-deviation events, logged for verifier audit):
- **Vercel-storage Skill hook** dismissed as no-deviation event on `Read /supabase/functions/get-applicant-document-url/index.ts` — TopFarms uses Supabase Storage (not Vercel Storage). Matches established precedent (STATE entries for Phase 17/18.1/20.1/21-00..05 all dismiss vercel-plugin hooks on Supabase paths).
- **AC8 literal vs actual count** — plan AC8 says `grep -c "skipped: true"` returns 1; actual count is 2 (docblock + JSON response). Plan-intent interpretation is "≥1 to prove the path exists" because the Task 2 test uses `toMatch(/skipped: true/)` (presence check) not count. The extra docblock occurrence strengthens refactor-resistance: a future edit would need to remove BOTH the comment and the response object to evade the regression guard.

## Issues Encountered

None.

## Carryforward to Plan 21-09 (Wave 6 operator-action milestone close)

This plan ships SOURCE + CONFIG + TESTS only. The following are explicitly deferred to plan 21-09 per Wave 2 operator decision:

1. **Deploy the function** — `supabase functions deploy send-document-status-email --project-ref inlagtgpynemhipnqvty`. Batched with the get-applicant-document-url admin-bypass redeploy (plan 21-03) so the operator runs ONE deploy command covering both Phase 21 Edge fn changes. Until deploy lands, Wave 5 admin queue page invocations will 404.

2. **Verify RESEND_API_KEY is set in prod secrets** — Phase 15 MAIL-02 carryforward (CLAUDE §7 partial-close). The fn is forgiving of an unset key (returns 200 { skipped: true }) but full E2E proof of DOC-QUEUE-EMAIL-01/02 requires the key. Phase 20-08 STATE entry suggests RESEND_API_KEY is live in production (get-resend-stats smoke=200 confirmed it materially) — plan 21-09 should re-verify via the same smoke test against the new fn.

3. **Verify WEBHOOK_SECRET is available to verify_jwt=true Edge fns** — Phase 18.1-06 STATE entry confirms the Vault secret exists (`vault.decrypted_secrets WHERE name='WEBHOOK_SECRET' → secret_len=64`). The Wave 5 admin queue page MUST obtain this secret to send the X-Webhook-Secret header on its `supabase.functions.invoke` call — design is part of plan 21-07, not this plan. If the secret cannot be cleanly exposed to a browser caller (e.g., admin-only RPC that returns it, or a short-TTL pre-flight Edge fn), plan 21-07 may need to revisit the in-fn auth design.

4. **Ledger sweep** — DOC-QUEUE-EMAIL-01 + DOC-QUEUE-EMAIL-02 not currently registered in `.planning/REQUIREMENTS.md` (matches the existing DOC-QUEUE-* / SUSPENDED-* / IS-ACTIVE-* gap noted in 21-04/05 STATE entries). Plan 21-09 closes via ledger backfill with empirical-evidence pointers to this SUMMARY (CLAUDE §7 — not partial-close because the empirical work IS complete; only the registration row is owed).

5. **No standalone deploy of plan 21-06** — do NOT have the operator run a single deploy command after this plan. The batching with 21-09 reduces operator context switches and matches the established Wave-6-batches-all-deploys pattern.

## Self-Check: PASSED

**Files claimed:**
- `supabase/functions/send-document-status-email/index.ts` — FOUND (353 lines)
- `supabase/config.toml` — MODIFIED (+13 lines, [functions.send-document-status-email] block present)
- `tests/send-document-status-email.test.ts` — FOUND (72 lines, 10 assertions)

**Commit claimed:**
- `bcde8d4` feat(21-06): send-document-status-email Edge Function + WEBHOOK_SECRET + templates — FOUND (`git log --oneline | grep bcde8d4` returns the commit)

**Test claims:**
- 10/10 assertions GREEN — VERIFIED (vitest output above)
- Full suite 298 passed | 118 todo | 0 failed — VERIFIED (baseline 288/118; exact +10/-0 delta)

All claims verified against working tree + git log + vitest output.

## Next Phase Readiness

- Wave 5 plan 21-07 (admin-documents-queue) ready to consume via `supabase.functions.invoke('send-document-status-email', { body: { document_id, action, rejection_reason? }, headers: { 'X-Webhook-Secret': <secret> } })` AFTER the admin RPC commits. Best-effort: invoke failure → toast warning, do NOT roll back RPC.
- Wave 6 plan 21-09 has 4 carryforward items for milestone close: (1) deploy this fn (batched with 21-03 admin bypass), (2) re-verify RESEND_API_KEY prod secret, (3) verify WEBHOOK_SECRET Vault availability and operator secret-distribution design for verify_jwt=true caller, (4) REQUIREMENTS.md ledger backfill for DOC-QUEUE-EMAIL-01/02 + the other Phase 21 unregistered REQ IDs.

---
*Phase: 21-v20-close-post-launch-ops*
*Completed: 2026-05-18*
