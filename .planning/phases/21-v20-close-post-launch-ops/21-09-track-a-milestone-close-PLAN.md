---
phase: 21-v20-close-post-launch-ops
plan: 09
type: execute
wave: 6
depends_on: [00, 01, 02, 03, 04, 05, 06, 07, 08]
files_modified:
  - .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md
  - .planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md
  - .planning/v2.0-MILESTONE-AUDIT.md
  - .planning/DECISIONS-PENDING.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
autonomous: false
requirements:
  - PEND-01
  - 18.1-SC-2
  - SMOKE-A
  - SMOKE-B
  - SMOKE-C
  - SMOKE-D
  - SMOKE-E
  - DOC-QUEUE-03
  - SUSPENDED-FLOW-UAT
  - DOC-QUEUE-APPROVE-UAT
  - DOC-QUEUE-REJECT-UAT
  - DOC-QUEUE-MORE-INFO-UAT
  - BADGE-VISIBILITY-UAT
must_haves:
  truths:
    - "Stripe live-mode keys swapped + smoke test passes (PEND-01 9-item checklist complete)"
    - "All 5 visual smoke tests (a-e) confirmed in browser"
    - "Suspended flow UAT: admin suspends seeker → seeker refreshes → /suspended; admin reactivates → seeker can re-enter dashboard"
    - "Doc queue UAT: approve / reject (with reason) / request-more-info all functional with email delivery + badge visibility"
    - "18.1-VERIFICATION.md SC-2 flipped PARTIAL → PASS with date and Stripe live-mode evidence"
    - "21-VERIFICATION.md created with all 21 Track A + B truths and verdicts"
    - "REQUIREMENTS.md unchanged (no new public REQ-IDs); v2.0-MILESTONE-AUDIT.md updated to reflect PEND-01 closure"
    - "ROADMAP Phase 18.1 flipped from [ ] to [x]; Phase 21 flipped to [x]"
    - "After this plan ships: operator runs /gsd:complete-milestone v2.0"
  artifacts:
    - path: ".planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md"
      provides: "Phase 21 verification record"
      contains: "verified_at:"
    - path: ".planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md"
      provides: "SC-2 PARTIAL → PASS flip"
      contains: "SC-2: PASS"
  key_links:
    - from: ".planning/v2.0-MILESTONE-AUDIT.md"
      to: ".planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md (SC-2 flip)"
      via: "PEND-01 closure removes the milestone blocker"
      pattern: "PEND-01.*CLOSED"
---

<objective>
Wave 6 — The v2.0 milestone closeout track. Operator runs the 9-item PEND-01 checklist for Stripe live-mode key swap, then conducts 5 visual smoke tests for Phases 18.2/20.1 human-verification gates, plus full UAT of the Track B features shipped in Waves 1-5 (suspended flow + doc queue approve/reject/request-more-info + badge visibility). Each step captures empirical evidence into the phase VERIFICATION.md. After all evidence is captured, 18.1 SC-2 flips PARTIAL → PASS, ROADMAP gets the [x] flips, v2.0-MILESTONE-AUDIT.md is updated, and the operator runs `/gsd:complete-milestone v2.0`.

Purpose: Closes the v2.0 milestone. Everything else has shipped; this plan is the operator-driven verification + milestone-closure ledger.

Output:
- Stripe live-mode key swap empirical proof
- 5 smoke-test screenshots/notes
- Track B end-to-end UAT (4 scenarios)
- Edge Function deploys: `get-applicant-document-url` (with admin bypass from plan 21-03) + `send-document-status-email` (from plan 21-06)
- 21-VERIFICATION.md (phase verification ledger)
- 18.1-VERIFICATION.md SC-2 flipped
- ROADMAP + STATE + MILESTONE-AUDIT updated
- Atomic docs commit per CLAUDE §4
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/v2.0-MILESTONE-AUDIT.md
@.planning/DECISIONS-PENDING.md
@.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@.planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md
@CLAUDE.md

<!--
LOCKED DECISION: PEND-01 = 9-item checklist in DECISIONS-PENDING.md §PEND-01 — operator follows verbatim
LOCKED DECISION: 5 smoke tests from CONTEXT.md §"Smoke tests + PEND-01"
LOCKED DECISION: Suspended flow UAT + 4 doc queue UAT flows per 21-VALIDATION.md §"Manual-Only Verifications"
RESEARCH §Pitfall 6: Vercel deployment hash must match latest commit before smoke tests (otherwise stale UI may fail)
-->
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Deploy Edge Functions (admin bypass + email)</name>
  <files>(operator runs supabase CLI; no source files changed)</files>

  <read_first>
    - CLAUDE.md §1 (project ref `inlagtgpynemhipnqvty`)
    - supabase/functions/get-applicant-document-url/index.ts (plan 21-03 admin branch shipped)
    - supabase/functions/send-document-status-email/index.ts (plan 21-06 + plan 21-07 sibling X-Webhook-Secret removal)
    - supabase/config.toml (verify_jwt = true entry for send-document-status-email)
  </read_first>

  <action>
**Operator action required.** See `<how-to-verify>` below for full step-by-step instructions. Executor agents (claude) must not attempt to execute these steps autonomously — they require human operator interaction with external dashboards/CLI. The `<how-to-verify>` block IS the action specification for this checkpoint.
  </action>

  <verify>
    <automated>(operator confirms via resume-signal — no automated check; see acceptance_criteria in `<how-to-verify>`)</automated>
  </verify>

  <done>
    Operator pastes resume-signal per `<resume-signal>` block below; executor parses to advance.
  </done>

  <what-built>
    Both Edge Functions on disk; not yet redeployed live. This step pushes them to production. NO secrets needed (admin auth via verify_jwt:true gateway + admin role check; no RESEND_API_KEY changes needed — Phase 20-08 confirmed RESEND_API_KEY already live in production secrets).
  </what-built>

  <how-to-verify>
1. **Verify deployment target:**
   ```bash
   supabase functions list --project-ref inlagtgpynemhipnqvty
   ```
   Confirm `get-applicant-document-url` (exists from Phase 14) and `send-document-status-email` does NOT yet appear (new).

2. **Deploy both:**
   ```bash
   supabase functions deploy get-applicant-document-url --project-ref inlagtgpynemhipnqvty
   supabase functions deploy send-document-status-email --project-ref inlagtgpynemhipnqvty
   ```

3. **Verify deploy status:**
   ```bash
   supabase functions list --project-ref inlagtgpynemhipnqvty
   ```
   Both functions should show recent `version` timestamps.

4. **Smoke test admin bypass with curl** (NO secret needed — admin's JWT carries authority):
   Operator logs in as admin@topfarms.co.nz in browser, copies the JWT from DevTools → Application → Local Storage → `sb-...auth-token`. Then:
   ```bash
   curl -i -X POST 'https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url' \
     -H 'Authorization: Bearer <admin JWT>' \
     -H 'Content-Type: application/json' \
     -d '{"document_id":"<an existing seeker_document.id>"}'
   ```
   Expected: HTTP 200 with `{ "url": "https://...signed...", "expires_in": 900 }`.

5. **Smoke test send-document-status-email** (use a real document_id; expect Resend send):
   ```bash
   curl -i -X POST 'https://inlagtgpynemhipnqvty.supabase.co/functions/v1/send-document-status-email' \
     -H 'Authorization: Bearer <admin JWT>' \
     -H 'Content-Type: application/json' \
     -d '{"document_id":"<an existing seeker_document.id>","action":"approved"}'
   ```
   Expected: HTTP 200 with `{ "sent": true, "action": "approved", "document_id": "..." }` AND an email arrives in the seeker's inbox.

6. **Resume signal:** Paste curl outputs from steps 4 + 5; type `deployed` or `failed: <reason>`.
  </how-to-verify>

  <resume-signal>Paste curl outputs from steps 4 and 5; type `deployed` (or `failed: <reason>`)</resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: PEND-01 — Stripe live-mode key swap (9-item checklist)</name>
  <files>(operator-only — Stripe Dashboard + Supabase secrets + Vercel env)</files>

  <read_first>
    - .planning/DECISIONS-PENDING.md §PEND-01 (9-item checklist VERBATIM)
    - .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md SC-2 (PARTIAL state to flip)
    - tests/stripe-webhook-events-UAT.md (6-check UAT script to re-run in live mode)
  </read_first>

  <action>
**Operator action required.** See `<how-to-verify>` below for full step-by-step instructions. Executor agents (claude) must not attempt to execute these steps autonomously — they require human operator interaction with external dashboards/CLI. The `<how-to-verify>` block IS the action specification for this checkpoint.
  </action>

  <verify>
    <automated>(operator confirms via resume-signal — no automated check; see acceptance_criteria in `<how-to-verify>`)</automated>
  </verify>

  <done>
    Operator pastes resume-signal per `<resume-signal>` block below; executor parses to advance.
  </done>

  <what-built>
    Nothing new — operator-driven configuration swap. All code shipped.
  </what-built>

  <how-to-verify>
Follow the 9-item checklist in `.planning/DECISIONS-PENDING.md` §PEND-01 verbatim. Each step is a separate operator action with a confirmation marker:

1. [ ] Rotate `STRIPE_SECRET_KEY` in Supabase secrets to `sk_live_*` (Project Settings → Edge Functions → Secrets → edit)
2. [ ] Register webhook endpoint at `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook` in Stripe **live-mode** dashboard
3. [ ] Subscribe live-mode webhook to the same 6 events the sandbox webhook listens to (cross-check via stripe-webhook/index.ts event handlers)
4. [ ] Copy live-mode webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` in Supabase secrets
5. [ ] Rotate `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel env to `pk_live_*`
6. [ ] Trigger a Vercel redeploy so the new publishable key takes effect
7. [ ] Smoke test: $0.50 PaymentIntent live → webhook fires → `placement_fees` row updated → immediate refund. Confirm both directions in Stripe live dashboard.
8. [ ] Confirm idempotency: re-deliver the same webhook event from Stripe's "Resend" tooling; verify no duplicate `placement_fees` row created.
9. [ ] Document the swap in commit/changelog so future-readers know when test→live transition happened.

For each step, capture the empirical evidence required by `.planning/DECISIONS-PENDING.md` §"Smoke evidence to capture":
- Screenshot of Stripe Dashboard live-mode transactions list showing $0.50 charge + refund
- `mcp__supabase__execute_sql "SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5"` output (or pg_net log shape) showing webhook fired with status_code 200
- `placement_fees` row state diff (before charge → after charge → after refund) — capture via MCP query at each stage

**Hard fail signals** (per §PEND-01):
- Webhook returns non-2xx → STRIPE_WEBHOOK_SECRET mismatch
- PaymentIntent fails to create → STRIPE_SECRET_KEY in wrong mode
- Frontend Stripe Elements shows test-mode banner after deploy → publishable key not yet `pk_live_*` OR Vercel deploy didn't pick up new env

**Resume signal:** All 9 checkboxes ticked off + evidence captured (screenshots saved under `.planning/phases/21-v20-close-post-launch-ops/21-09-EVIDENCE/stripe-live-mode/` or pasted inline). Type `pend-01-complete` (or `pend-01-failed: <step #>: <reason>`).
  </how-to-verify>

  <resume-signal>List the 9 checklist items with [x] markers + paste/attach evidence; type `pend-01-complete` (or `pend-01-failed: step #X: <reason>`)</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Five visual smoke tests (Phases 18.2 + 20.1 gates)</name>
  <files>(operator-only — browser UAT, deployed app at https://top-farms.vercel.app)</files>

  <read_first>
    - .planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md §"Smoke tests + PEND-01"
    - .planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md §"Manual-Only Verifications" rows for smoke (a)-(e)
    - .planning/v2.0-MILESTONE-AUDIT.md §human_verification_gates (4 from Phase 18.2 + 1 from Phase 20.1)
    - CLAUDE.md §3 (diagnose before fix — if any smoke fails, capture full DevTools/screenshot before retry)
  </read_first>

  <action>
**Operator action required.** See `<how-to-verify>` below for full step-by-step instructions. Executor agents (claude) must not attempt to execute these steps autonomously — they require human operator interaction with external dashboards/CLI. The `<how-to-verify>` block IS the action specification for this checkpoint.
  </action>

  <verify>
    <automated>(operator confirms via resume-signal — no automated check; see acceptance_criteria in `<how-to-verify>`)</automated>
  </verify>

  <done>
    Operator pastes resume-signal per `<resume-signal>` block below; executor parses to advance.
  </done>

  <what-built>
    Phases 18.2 + 20.1 shipped code that needed visual confirmation. All 5 are quick browser observations.
  </what-built>

  <how-to-verify>
For each smoke test, navigate the production app and confirm expected behaviour. Capture screenshot or note (preferred: screenshot for visual gates a/b/c; DevTools console screenshot for d; flow note for e). All evidence stored under `.planning/phases/21-v20-close-post-launch-ops/21-09-EVIDENCE/smokes/`.

**Smoke (a) — My Documents link in seeker nav/sidebar:**
1. Sign in as a seeker (e.g., harry.symmans.smith@gmail.com — now seeker per Phase 20.1)
2. Land on /dashboard/seeker
3. Locate "My Documents" link in the sidebar (Sidebar.tsx) AND the top nav (Nav.tsx)
4. Click → land on /dashboard/seeker/documents
5. Capture: screenshot of sidebar showing "My Documents" entry
6. ✓ PASS

**Smoke (b) — MarkFilledModal shows applicant names + status + points:**
1. Sign in as an employer with a job that has applicants
2. Open the job → click "Mark Filled"
3. Modal renders applicant list. Each radio option must show: seeker name (NOT just `Applicant #<uuid>`), application status (e.g. "Applied"), match score points (e.g. "85 pts")
4. Capture: screenshot of modal with at least 1 applicant rendered
5. ✓ PASS (Phase 18.2 SC-10 carryforward)

**Smoke (c) — Salary preset chips in seeker onboarding step 5:**
1. Sign in as a NEW seeker (or use a seeker mid-onboarding)
2. Navigate to /onboarding/seeker step 5 (Life Situation)
3. Confirm salary field shows preset chips ($50-60k, $60-70k, ... $120k+) — NOT a free-text number input
4. Capture: screenshot of chip set
5. ✓ PASS (Phase 18.2 SC-11 carryforward)

**Smoke (d) — AUTH-FIX-02 console.time output in DevTools:**
1. Open DevTools → Console (preserve log enabled)
2. Sign in to any dashboard (seeker, employer, or admin)
3. Confirm console shows: `[AUTH-FIX-02] loadRole:db-query: XXms`
4. Capture: screenshot of console with timing line visible
5. ✓ PASS (Phase 18.2 SC-7 instrumentation — also note Xms value for the AUTH-FIX-02 latency-source post-launch carryforward)

**Smoke (e) — Phase 20.1 admin fresh-session login no AccessDenied:**
1. Sign out completely
2. Clear browser site data for top-farms.vercel.app (DevTools → Application → Clear storage)
3. Hard refresh
4. Sign in as admin@topfarms.co.nz
5. Navigate to /admin
6. Confirm AdminLayout renders WITHOUT any AccessDenied flicker or 404 redirect (closes CF-AUTH-2 caveat from Phase 20.1 VERIFICATION)
7. Capture: screenshot of /admin DailyBriefing rendered post-fresh-session login
8. ✓ PASS

**Resume signal:** All 5 smokes confirmed with capture evidence path; type `smokes-5-of-5-pass`. If any fail: type `smoke-failed: <(a|b|c|d|e)>: <description>` and STOP for diagnosis.
  </how-to-verify>

  <resume-signal>Confirm 5/5 pass with evidence paths; type `smokes-5-of-5-pass` (or `smoke-failed: <letter>: <issue>`)</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Track B end-to-end UAT (suspended flow + doc queue 3 actions + badge visibility)</name>
  <files>(operator-only — browser UAT on deployed app)</files>

  <read_first>
    - .planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md §"Manual-Only Verifications" rows for Suspended + Doc Queue UATs
    - .planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md (full feature spec)
    - tests/admin-bootstrap-UAT.md (precedent UAT log style — capture per-step observations)
  </read_first>

  <action>
**Operator action required.** See `<how-to-verify>` below for full step-by-step instructions. Executor agents (claude) must not attempt to execute these steps autonomously — they require human operator interaction with external dashboards/CLI. The `<how-to-verify>` block IS the action specification for this checkpoint.
  </action>

  <verify>
    <automated>(operator confirms via resume-signal — no automated check; see acceptance_criteria in `<how-to-verify>`)</automated>
  </verify>

  <done>
    Operator pastes resume-signal per `<resume-signal>` block below; executor parses to advance.
  </done>

  <what-built>
    Track B features shipped across plans 21-01..21-08. This task runs end-to-end UATs to capture empirical evidence.
  </what-built>

  <how-to-verify>
Capture evidence (screenshots + DevTools network/console where relevant) under `.planning/phases/21-v20-close-post-launch-ops/21-09-EVIDENCE/uat/`. Use a single markdown log file `21-09-EVIDENCE/uat/track-b-uat.md` with a section per UAT.

**UAT 1 — Suspended flow (full gate):**
1. As admin: open /admin/seekers → click on a test seeker → ProfileDrawer opens → toggle Active OFF → confirm via existing inline confirm row (Phase 20-05 pattern)
2. As that test seeker (different browser / incognito): sign in (if not already)
3. Navigate to /dashboard/seeker
4. **Expected:** Redirected to /suspended; sees "Your account has been suspended" message + hello@topfarms.co.nz contact link + Sign Out button
5. Click Sign Out → lands on /login
6. As admin: re-toggle Active ON for that seeker (via ProfileDrawer)
7. As the test seeker: sign in again → navigate to /dashboard/seeker → renders normally
8. Capture: screenshot of /suspended page; DevTools network showing the redirect on step 3

**UAT 2 — Doc queue Approve flow:**
1. As a test seeker: upload a new document via /dashboard/seeker/documents → row should be created with status='pending' (per migration 032 default)
2. As admin: navigate to /admin/documents → confirm the doc appears in the queue (pending row at top per ORDER BY pending-first)
3. Click Approve on that doc
4. **Expected:** toast.success 'Document approved'; row refreshes to status='approved' (green Tag)
5. As seeker: confirm email arrives in inbox with subject "Your document has been verified — TopFarms"
6. As an employer viewing that seeker's application (open ApplicantPanel for an application from this seeker): confirm "Documents Verified" badge visible in the panel header
7. Capture: screenshot of queue row + email + employer-side badge

**UAT 3 — Doc queue Reject flow with reason:**
1. As a test seeker: upload another doc → status='pending'
2. As admin: in queue, click Reject on that doc → inline reason input + Confirm button surface
3. Enter a reason (e.g., "Document is illegible — please re-scan at higher resolution")
4. Click Confirm reject
5. **Expected:** toast.success 'Document rejected'; row refreshes to status='rejected' (red Tag) with rejection_reason text shown
6. As seeker: confirm email arrives with subject "Action required — your document was not accepted" + body containing the reason text
7. Capture: screenshot of queue + email (showing reason)

**UAT 4 — Doc queue Request More Info flow:**
1. As a test seeker: upload another doc → status='pending'
2. As admin: in queue, click "Request more info" → toast.success → row status='needs_resubmission' (blue Tag)
3. As seeker: confirm email arrives with subject "Please re-upload your document — TopFarms"
4. Capture: screenshot + email

**UAT 5 — Negative: empty reject reason:**
1. As admin: click Reject on a doc → leave reason empty → Click Confirm reject
2. **Expected:** toast.error 'Please enter a rejection reason.' OR backend error from RPC; no status change in DB; no email sent
3. Capture: screenshot of error toast

**Resume signal:** All 5 UATs complete with evidence; type `track-b-uat-5-of-5-pass`. If any fail: `track-b-uat-failed: <#>: <issue>` and STOP.
  </how-to-verify>

  <resume-signal>Confirm 5/5 UATs pass with evidence paths; type `track-b-uat-5-of-5-pass` (or `track-b-uat-failed: <#>: <issue>`)</resume-signal>
</task>

<task type="auto">
  <name>Task 5: Author 21-VERIFICATION.md + flip 18.1-VERIFICATION.md SC-2 + update tracking docs</name>
  <files>.planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md, .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md, .planning/v2.0-MILESTONE-AUDIT.md, .planning/DECISIONS-PENDING.md, .planning/ROADMAP.md, .planning/STATE.md</files>

  <read_first>
    - All evidence captured in Tasks 1-4
    - .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md (current SC-2 block — lines 40-56)
    - .planning/phases/20-super-admin-dashboard/20-VERIFICATION.md (verification structure model)
    - .planning/v2.0-MILESTONE-AUDIT.md (PEND-01 carryforward section to update)
    - .planning/DECISIONS-PENDING.md §PEND-01 (mark checklist done)
    - .planning/ROADMAP.md Phase 18.1 + Phase 21 entries
    - .planning/STATE.md (update last_activity, completed_phases)
  </read_first>

  <action>
**File 1 — .planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md** (NEW):

```markdown
---
phase: 21
status: PASS
verified_at: <ISO timestamp of close>
verifier: gsd-executor (operator-action plan 21-09 execution)
nyquist_compliant: true
sc_summary:
  Track-A-PEND-01: PASS
  Track-A-SMOKE-A: PASS
  Track-A-SMOKE-B: PASS
  Track-A-SMOKE-C: PASS
  Track-A-SMOKE-D: PASS
  Track-A-SMOKE-E: PASS
  Track-A-18.1-SC-2-FLIP: PASS
  Track-B-IS-ACTIVE-01-RED: PASS
  Track-B-IS-ACTIVE-02-loadRole: PASS
  Track-B-IS-ACTIVE-03-default-true: PASS
  Track-B-SUSPENDED-PAGE: PASS
  Track-B-DOC-QUEUE-SCHEMA: PASS
  Track-B-DOC-QUEUE-RPCS: PASS
  Track-B-DOC-QUEUE-EDGE-BYPASS: PASS
  Track-B-DOC-QUEUE-EMAIL-FN: PASS
  Track-B-DOC-QUEUE-PAGE: PASS
  Track-B-DOC-QUEUE-NAV: PASS
  Track-B-DOC-QUEUE-BADGE: PASS
  Track-B-UAT-SUSPENDED: PASS
  Track-B-UAT-APPROVE: PASS
  Track-B-UAT-REJECT: PASS
  Track-B-UAT-MORE-INFO: PASS
  Track-B-UAT-EMPTY-REASON: PASS
---

# Phase 21 — Verification Record

**Phase:** 21 v2.0 Close + Post-Launch Ops
**Verification type:** Operator-action UAT + Edge Function deploys + visual smoke tests + static-source guards + RTL/RPC shape tests
**Overall status:** PASS

---

## Track A — v2.0 Milestone Closeout

### PEND-01 — Stripe live-mode key swap
**Verdict:** PASS
**Evidence:** 9/9 checklist items complete (see `.planning/DECISIONS-PENDING.md` §PEND-01 with [x] marks); Stripe live-mode $0.50 charge + refund confirmed in dashboard; webhook 200 in pg_net log; placement_fees row created + idempotent under Resend re-delivery. Evidence under `21-09-EVIDENCE/stripe-live-mode/`.

### Smoke tests (a)-(e)
**Verdict:** PASS (5/5)
- Smoke (a) — My Documents nav link visible: PASS (screenshot)
- Smoke (b) — MarkFilledModal picker shows names + status + points: PASS (screenshot)
- Smoke (c) — Salary preset chips render: PASS (screenshot)
- Smoke (d) — AUTH-FIX-02 console.time output captured: PASS (screenshot; observed Xms = <value>)
- Smoke (e) — Admin fresh-session login: PASS (no AccessDenied flicker; closes Phase 20.1 CF-AUTH-2 caveat)

### 18.1 SC-2 PARTIAL → PASS
**Verdict:** PASS (see 18.1-VERIFICATION.md SC-2 block, flipped this commit).

---

## Track B — Post-Launch Ops Features

### is_active gate (IS-ACTIVE-01/02/03)
**Verdict:** PASS
- Test stubs (Wave 0): 14 todos created
- loadRole extension shipped: single round-trip `select('role, is_active')` (Wave 3 plan 21-04 commit)
- ProtectedRoute guard added at correct position (Pitfall 1): grep order verified
- Wave 0 stubs flipped GREEN: 10 assertions across 2 files
- End-to-end suspended UAT: PASS (UAT 1 in 21-09-EVIDENCE/uat/track-b-uat.md)

### Suspended page (SUSPENDED-PAGE-01)
**Verdict:** PASS
- Component shipped + route registered outside ProtectedRoute
- Verbatim message: "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz."
- 4 RTL assertions GREEN; UAT confirms full gate behaviour

### Doc verification queue (DOC-QUEUE-* full chain)
**Verdict:** PASS
- Migration 032 applied via Studio; status + rejection_reason columns + index verified via MCP
- Migration 033 applied via Studio; 4 SECURITY DEFINER RPCs with prosecdef=true verified
- get-applicant-document-url admin bypass deployed; admin curl returns 200 + signed URL (Task 1 step 4 evidence)
- send-document-status-email deployed; smoke test sent real email (Task 1 step 5 evidence)
- AdminDocumentsQueue page shipped; nav link visible
- DocumentsVerifiedBadge component + ApplicantPanel integration shipped
- Approve flow UAT: badge visible to employer, email arrived (UAT 2)
- Reject-with-reason UAT: email contained reason text (UAT 3)
- Request-more-info UAT: email arrived (UAT 4)
- Empty-reason negative UAT: blocked with toast error (UAT 5)

### Sibling Rule 1 deviation (plan 21-07 → plan 21-06)
**Verdict:** documented and PASS
- send-document-status-email originally had X-Webhook-Secret gate; removed in plan 21-07 sibling edit because the secret cannot live in the admin browser. verify_jwt:true + admin role check carry the threat model (different from send-followup-emails which uses verify_jwt:false because it's pg_net-invoked).

---

## Phase Verdict

**PASS** — all 21 SCs PASS with empirical evidence. Track A unblocks v2.0 milestone close; Track B ships 2 post-launch ops features. Operator runs `/gsd:complete-milestone v2.0` after this commit.

**Next step:** `/gsd:complete-milestone v2.0`
```

**File 2 — .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md**:

Update the frontmatter line `SC-2: PARTIAL` → `SC-2: PASS`. Update top-level `status: PARTIAL` → `status: PASS`. Update SC-2 section body (currently lines 40-56) — keep all existing PARTIAL evidence but APPEND a new "## SC-2 Closure (Phase 21 plan 21-09)" subsection containing:
- Date of live-mode swap
- 9/9 checklist confirmed in DECISIONS-PENDING.md
- 6/6 Stripe checks re-run in live mode → all PASS
- Verbatim verdict: "**Why PASS:** all 6 configuration checks confirmed in live mode. PEND-01 closure complete per Phase 21 plan 21-09 Task 2."

**File 3 — .planning/v2.0-MILESTONE-AUDIT.md**:

Update PEND-01 section (currently appears under "Critical Blockers" and "Carryforward Items"):
- "Critical Blockers" section: change `status: tech_debt` to `status: ready_to_close`; remove PEND-01 from `critical_blockers` array (set to `[]`)
- "Carryforward: PEND-01" entry: append `**STATUS 2026-MM-DD: ✓ CLOSED via Phase 21 plan 21-09 live-mode swap.** See 21-VERIFICATION.md Track A.`
- `human_verification_gates` section: append `STATUS 2026-MM-DD: ✓ ALL CLOSED via Phase 21 plan 21-09 Task 3 (5/5 smoke pass).`

**File 4 — .planning/DECISIONS-PENDING.md**:

Mark all 9 PEND-01 checklist items `[x]` with the date. Append at the end of §PEND-01:
```
**STATUS 2026-MM-DD: ✓ COMPLETE.** All 9 items confirmed; live mode active. SC-2 in 18.1-VERIFICATION.md flipped PASS. See `.planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md` Track A for full evidence chain.
```

**File 5 — .planning/ROADMAP.md**:

- Phase 18.1 line: `[ ]` → `[x]`; append `— fully closed 2026-MM-DD (SC-2 PEND-01 live-mode swap complete; see 18.1-VERIFICATION.md + Phase 21 plan 21-09)`
- Phase 21 line: `[ ]` → `[x]`; append `— completed 2026-MM-DD (Track A v2.0 closeout + Track B is_active gate + doc verification queue + Documents Verified badge; see 21-VERIFICATION.md PASS verdict)`
- Progress table: update Phase 18.1 row Status to `Complete`; add Phase 21 row to the progress table

**File 6 — .planning/STATE.md**:

Update top frontmatter:
- `status: verifying` → `status: complete` (or `ready-to-close` — verifier's call)
- `stopped_at: ` → `Phase 21 COMPLETE — v2.0 ready for milestone close`
- `last_updated: <ISO>`
- `last_activity: ` → describe Phase 21 closure summary
- `progress.total_phases: 13` → `14` (Phase 21 added); `completed_phases: 9` → bumped accordingly
- Append Phase 21 entries to the `Decisions` section (Wave 1-6 highlights)

**Commit:** atomic per CLAUDE §4. Single commit message: `docs(21): close phase + flip 18.1 SC-2 PASS + close PEND-01 + ready v2.0 milestone close`.
  </action>

  <verify>
    <automated>grep "SC-2: PASS" .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md && grep "status: PASS" .planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md</automated>
  </verify>

  <acceptance_criteria>
    - `ls .planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md` exits 0
    - `grep -c "PASS" .planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md` returns ≥ 20 (all SC-* lines + Track A + Track B verdicts)
    - `grep "SC-2: PASS" .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` exit 0
    - `grep "status: PASS" .planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` exit 0
    - `grep "STATUS .*: ✓ COMPLETE" .planning/DECISIONS-PENDING.md` exit 0
    - `grep -E "Phase 21:.*\\[x\\]|Phase 18.1.*\\[x\\]" .planning/ROADMAP.md` shows BOTH lines
    - `grep "PEND-01" .planning/v2.0-MILESTONE-AUDIT.md | grep -i "closed"` exit 0
    - STATE.md updated last_activity contains "Phase 21" + closure language
    - Git status shows 6 files staged
    - `git log -1 --format=%s` matches `docs(21): close phase + flip 18.1 SC-2 PASS + close PEND-01 + ready v2.0 milestone close` (or close paraphrase)
  </acceptance_criteria>

  <done>
    All 6 docs updated atomically. 18.1 PARTIAL → PASS. PEND-01 closed. ROADMAP + STATE + MILESTONE-AUDIT current. Operator can now run `/gsd:complete-milestone v2.0`.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 6: Operator runs /gsd:complete-milestone v2.0</name>
  <files>(no source — orchestrator command)</files>

  <read_first>
    - .planning/v2.0-MILESTONE-AUDIT.md (post-Task-5 — should show PEND-01 CLOSED + 11/11 REQs satisfied + all phases verified)
    - .planning/ROADMAP.md (post-Task-5 — Phase 21 + 18.1 both [x])
  </read_first>

  <action>
**Operator action required.** See `<how-to-verify>` below for full step-by-step instructions. Executor agents (claude) must not attempt to execute these steps autonomously — they require human operator interaction with external dashboards/CLI. The `<how-to-verify>` block IS the action specification for this checkpoint.
  </action>

  <verify>
    <automated>(operator confirms via resume-signal — no automated check; see acceptance_criteria in `<how-to-verify>`)</automated>
  </verify>

  <done>
    Operator pastes resume-signal per `<resume-signal>` block below; executor parses to advance.
  </done>

  <what-built>
    All v2.0 work shipped + verified. This step is the formal milestone closure.
  </what-built>

  <how-to-verify>
1. Operator runs in chat:
   ```
   /gsd:complete-milestone v2.0
   ```
2. Follow the orchestrator's prompts (milestone-close workflow handles SUMMARY.md generation + tagging + v2.0-COMPLETION-SUMMARY.md authoring per existing GSD workflow)
3. Confirm final commit lands (typically `chore(v2.0): close milestone — launch-ready`)
4. Resume signal: `milestone-closed` (or `failed: <orchestrator error>`)

**If orchestrator surfaces unaddressed gaps:** STOP and report. Plan 21-09 is supposed to close everything; any orchestrator-detected gap is a bug in our verification.
  </how-to-verify>

  <resume-signal>Type `milestone-closed` after the /gsd:complete-milestone v2.0 workflow finishes (or describe `failed: <reason>`)</resume-signal>
</task>

</tasks>

<verification>
1. Edge Functions deployed + smoke-tested
2. PEND-01 9-item checklist 9/9 complete with Stripe live-mode evidence
3. 5 visual smoke tests 5/5 PASS
4. 5 Track B UATs 5/5 PASS
5. 21-VERIFICATION.md + 18.1 SC-2 PARTIAL→PASS flip + tracking docs all updated
6. /gsd:complete-milestone v2.0 runs to completion
</verification>

<success_criteria>
- v2.0 milestone closed
- Phase 18.1 finally [x] (SC-2 PEND-01 closed)
- Phase 21 [x]
- All 5 human verification gates from MILESTONE-AUDIT closed
- Two new product features (is_active gate + doc queue) live with end-to-end UAT evidence
- Atomic docs commit per CLAUDE §4
</success_criteria>

<output>
After all 6 tasks complete, create `.planning/phases/21-v20-close-post-launch-ops/21-09-SUMMARY.md` capturing:
- All evidence paths under `21-09-EVIDENCE/` (stripe-live-mode/, smokes/, uat/)
- 21-VERIFICATION.md verdict summary
- 18.1 SC-2 flip note + date
- /gsd:complete-milestone v2.0 final commit hash
- v2.1 / post-launch carryforward notes (JWT HS256→ES256 still deferred to Phase 22; AUTH-FIX-02 latency-source from smoke (d) captured for future investigation)
- Pointer forward: `/gsd:new-milestone` for the next cycle
</output>
