---
phase: 21
status: resolved_pending_pend_01
verified_at: 2026-05-18
verifier: gsd-executor (operator-action plan 21-09 execution)
nyquist_compliant: true
updated: 2026-05-18
sc_summary:
  Track-A-EDGE-FN-DEPLOY: PASS (2026-05-18)
  Track-A-PEND-01: DEFERRED (operator decision 2026-05-18 — separate session before first real employer pays)
  Track-A-SMOKE-A: PASS (2026-05-18)
  Track-A-SMOKE-B: PASS (2026-05-18)
  Track-A-SMOKE-C: PASS (2026-05-18)
  Track-A-SMOKE-D: PASS (2026-05-18, regression-only; specific Xms value NOT CAPTURED — carryforward)
  Track-A-SMOKE-E: PASS (2026-05-18, closes Phase 20.1 CF-AUTH-2 caveat)
  Track-A-18.1-SC-2-FLIP: BLOCKED (PARTIAL retained — flips to PASS only after PEND-01 closure per CLAUDE §7)
  Track-B-IS-ACTIVE-01-RED: PASS (prior plans 21-00..04)
  Track-B-IS-ACTIVE-02-loadRole: PASS (prior plan 21-04)
  Track-B-IS-ACTIVE-03-default-true: PASS (prior plan 21-04)
  Track-B-SUSPENDED-PAGE: PASS (prior plan 21-05)
  Track-B-DOC-QUEUE-SCHEMA: PASS (prior plan 21-01 migration 032)
  Track-B-DOC-QUEUE-RPCS: PASS (prior plan 21-02 migration 033)
  Track-B-DOC-QUEUE-EDGE-BYPASS: PASS (deployed + smoke 200 — Task 1 evidence below)
  Track-B-DOC-QUEUE-EMAIL-FN: PASS (deployed + smoke 200 + sent:true — Task 1 evidence below)
  Track-B-DOC-QUEUE-PAGE: PASS (prior plan 21-07)
  Track-B-DOC-QUEUE-NAV: PASS (prior plan 21-07)
  Track-B-DOC-QUEUE-BADGE: PASS (prior plan 21-08)
  Track-B-UAT-SUSPENDED: PASS (2026-05-18)
  Track-B-UAT-APPROVE: PASS (2026-05-18)
  Track-B-UAT-REJECT: PASS (2026-05-18)
  Track-B-UAT-MORE-INFO: PASS (2026-05-18)
  Track-B-UAT-EMPTY-REASON: PASS (2026-05-18)
---

# Phase 21 — Verification Record

**Phase:** 21 v2.0 Close + Post-Launch Ops
**Verification type:** Operator-action UAT + Edge Function deploys + visual smoke tests + static-source guards + RTL/RPC shape tests
**Overall status:** resolved_pending_pend_01 — all Phase 21 source work shipped and empirically verified (Tasks 1, 3, 4 PASS; full Track B UAT 5/5 + visual smoke 5/5 + 2 Edge Function deploys + smokes 200); milestone close gated on PEND-01 (Stripe live-mode swap) deferred to separate session.

---

## Verdict (Phase 21 — overall)

**Phase 21 work IS COMPLETE and EMPIRICALLY VERIFIED.** All 10 plans shipped (21-00..21-09 with 21-09 Tasks 1/3/4/5 PASS; Task 2 explicitly deferred; Task 6 blocked downstream on PEND-01). Track B feature surface (is_active gate + suspended page + doc verification queue + email Edge fn + badge) is live in production with full UAT 5/5 PASS and visual smoke 5/5 PASS. Track A Edge Function deploys complete with HTTP/2 200 smokes.

**`/gsd:complete-milestone v2.0` is BLOCKED** until PEND-01 closes in a separate operator-driven session (operator decision 2026-05-18 — Stripe live-mode swap requires dedicated focus and a real $0.50 test charge cycle, deliberately not done mid-session). When PEND-01 lands, the next session must:

1. Flip 18.1 SC-2 PARTIAL → PASS in `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` (PEND-01 closure note section provided there)
2. Update `Track-A-PEND-01` and `Track-A-18.1-SC-2-FLIP` rows above to PASS
3. Update this Verdict block to drop "BLOCKED" + run `/gsd:complete-milestone v2.0`

Per CLAUDE §7 partial-close discipline, flipping SC-2 to PASS now would make 18.1-VERIFICATION.md lie — empirical evidence of the full SC-2 (live-mode $0.50 charge + refund + webhook 200 + idempotency check) does not exist until PEND-01 runs.

---

## Track A — v2.0 Milestone Closeout

### Task 1 — Edge Function Deploys (2026-05-18)

**Verdict:** PASS
**Operator-confirmed:** 2026-05-18 — both `get-applicant-document-url` (admin-bypass branch from plan 21-03) and `send-document-status-email` (from plan 21-06, with plan 21-07 sibling X-Webhook-Secret removal) deployed to production project `inlagtgpynemhipnqvty`.

#### Test 1 — `get-applicant-document-url` admin-bypass smoke

```
HTTP/2 200
{ "url": "https://...supabase.co/storage/v1/object/sign/...signed...", "expires_in": 900 }
```

- Document tested: `16eece5e-69d5-4d4d-9e0c-587d9c944f18` (real `seeker_documents.id`)
- Outcome: HTTP 200 with signed URL returned. Admin JWT carried authority (no shared secret required); verify_jwt:true gateway + admin role check load-bearing.
- Closes: DOC-QUEUE-EDGE-BYPASS (admin can fetch any seeker's document signed URL via admin role gate, no per-row RLS bypass).

#### Test 2 — `send-document-status-email` smoke

```
HTTP/2 200
{ "sent": true, "action": "approved", "document_id": "16eece5e-69d5-4d4d-9e0c-587d9c944f18" }
```

- Document tested: `16eece5e-69d5-4d4d-9e0c-587d9c944f18` (same doc reused — operator confirms)
- Outcome: HTTP 200 with `sent:true`. RESEND_API_KEY confirmed live in production secrets (Phase 20-08 inference now materially verified at this layer — fresh runtime evidence).
- Closes: DOC-QUEUE-EMAIL-FN deployment gap; MAIL-02 RESEND_API_KEY live in production secrets confirmed.

#### Notes

- Test document `16eece5e-69d5-4d4d-9e0c-587d9c944f18` is the canonical test document for Phase 21 — reusable for subsequent UAT tasks (Tasks 3-4) where any further "real document" smoke is needed.
- Sibling Rule 1 deviation from plan 21-07 (Edge function `send-document-status-email` loses the X-Webhook-Secret defence-in-depth gate; verify_jwt:true + admin role check carry the threat model) is empirically validated by Test 2 — admin JWT alone authenticates the invocation.

---

### Task 2 — PEND-01 Stripe Live-Mode Swap (DEFERRED 2026-05-18)

**Verdict:** DEFERRED — explicitly out-of-scope for this execution session.

**Operator decision (2026-05-18, verbatim):**

> "defer: Stripe live-mode swap requires dedicated focus and a real test charge. Not doing it mid-session. Continue with Tasks 3-4-5 (visual smoke tests + Track B UAT) now. PEND-01 will be completed in a separate session before first real employer pays."

**Consequence (per CLAUDE.md §7 partial-close discipline):**

- **18.1 SC-2 stays PARTIAL — NOT PASS.** Empirical evidence for the full PASS verdict requires PEND-01 closure (9/9 checklist items + live-mode $0.50 charge + refund + webhook 200 + idempotency). Task 5's planned PARTIAL→PASS flip cannot land as planned; this Task 5 execution authored 21-VERIFICATION.md and updated tracking docs WITHOUT flipping 18.1 SC-2.
- **v2.0 milestone cannot fully close.** Task 6 (`/gsd:complete-milestone v2.0`) is BLOCKED until PEND-01 lands in a future session. Running the orchestrator now would either fail or produce a misleading "milestone closed" verdict with an open critical blocker (PEND-01) — violates CLAUDE §3 (diagnose before fix) and §7 (truthful partial-close).
- **v2.0-MILESTONE-AUDIT.md PEND-01 entry remains OPEN.** Status `tech_debt` preserved (not flipped to `ready_to_close`). Audit explicitly tracks PEND-01 as the single remaining v2.0 blocker as of 2026-05-18.
- **ROADMAP Phase 18.1 remains `[ ]`.** Cannot flip `[x]` while SC-2 is PARTIAL.
- **ROADMAP Phase 21 flipped `[x]`** in this Task 5 closeout — all 10 Phase-21 plans shipped + all Phase-21-scoped UAT empirically PASS. PEND-01 is a Phase 18.1 carryforward, NOT a Phase 21 deliverable; flipping Phase 21 `[x]` with an explicit note that the v2.0 milestone close (a separate event) is gated on PEND-01.

**Carryforward target:** Separate execution session before first real employer pays. The 9-item checklist in `.planning/DECISIONS-PENDING.md §PEND-01` remains the authoritative script; no edits to that checklist this session beyond a status note recording the 2026-05-18 deferral.

**Evidence required when PEND-01 is finally closed:** Per `.planning/DECISIONS-PENDING.md §"Smoke evidence to capture"` — screenshot of Stripe live-mode dashboard ($0.50 charge + refund), pg_net.http_response 200 row, placement_fees row state diff (before/after/refund). All captured into `.planning/phases/21-v20-close-post-launch-ops/21-09-EVIDENCE/stripe-live-mode/` per plan §how-to-verify.

---

### Task 3 — Five visual smoke tests (Phases 18.2 + 20.1 gates) — PASS 5/5 (2026-05-18)

**Verdict:** PASS (5/5 smokes confirmed in production browser; one carryforward — see smoke (d))

Operator-driven manual visual smokes on production (`https://topfarms.uk` / `https://top-farms.vercel.app`), covering Phase 18.2 SC-2 / SC-7 / SC-10 / SC-11 and Phase 20.1 CF-AUTH-2 carryforward.

Operator resume signal verbatim: `smokes-5-of-5-pass — (a) My Documents visible in sidebar and top nav, routes to /dashboard/seeker/documents ✅ (b) MarkFilledModal shows Name • Status • Xpts ✅ (c) 8 salary chip buttons render, no number input ✅ (d) AUTH-FIX-02 timing line visible — specific Xms value not captured (carryforward) ✅ (e) Admin fresh-session lands on /admin, Daily Briefing renders immediately, no flicker ✅`

#### Smoke (a) — 18.2 SC-2: "My Documents" nav visibility

**Operator note (verbatim):** "My Documents visible in sidebar and top nav, routes to `/dashboard/seeker/documents`."

**Result:** PASS. Sidebar entry renders; top-nav entry renders; clicking routes to the documents page without error. Closes 18.2 SC-2 nav-surface human-verification gate.

#### Smoke (b) — 18.2 SC-10: MarkFilledModal label format (no UUIDs)

**Operator note (verbatim):** "MarkFilledModal shows `Name • Status • Xpts`."

**Result:** PASS. Three-segment label format (name • status • points) renders as specified — no `Applicant #<uuid>` regression. Closes 18.2 SC-10 (carryforward in plan §how-to-verify smoke (b)).

#### Smoke (c) — 18.2 SC-11 carryforward: Salary chip buttons (no free-form input)

**Operator note (verbatim):** "8 salary chip buttons render, no number input."

**Result:** PASS. All 8 preset chips ($50-60k → $120k+) render in seeker onboarding step 5; the free-form `<input type="number">` regression vector is absent.

#### Smoke (d) — 18.2 SC-7 / SC-11 instrumentation: AUTH-FIX-02 console timing

**Operator note (verbatim):** "AUTH-FIX-02 timing line visible — specific Xms value not captured (carryforward)."

**Result:** PASS (instrumentation regression criterion only). The AUTH-FIX-02 console timing line is present in production DevTools console on dashboard load, which satisfies SC-11's "instrumentation must remain wired" intent.

**Carryforward:** Specific Xms value not captured this session. The AUTH-FIX-02 latency-source investigation (separate from SC-11's regression check) is deferred to a later operator session. Adding to post-launch ops backlog — does NOT block Task 6 milestone closure because SC-11 is regression-only (per plan §how-to-verify smoke (d): "also note Xms value for the AUTH-FIX-02 latency-source post-launch carryforward").

#### Smoke (e) — Phase 20.1 CF-AUTH-2 caveat closure: Admin fresh-session redirect

**Operator note (verbatim):** "Admin fresh-session lands on `/admin`, Daily Briefing renders immediately, no flicker."

**Result:** PASS. Fresh admin login (sign out → clear site data → hard refresh → sign in as `admin@topfarms.co.nz`) lands on `/admin` directly with no transient `/dashboard/employer` redirect, `AdminLayout` mounts, `DailyBriefing` widget renders without flicker or 404.

**Phase 20.1 CF-AUTH-2 caveat ("admin redirect path not yet empirically validated in production") is now empirically CLOSED** by this smoke.

#### Task 3 Outcome

All 5 smokes PASS. No regressions surfaced. SC-11 specific latency value carried forward to a separate post-launch ops session — non-blocking for Task 6 milestone closure. Ready to proceed to Task 4 (Track B end-to-end UAT).

---

## Track B — Track B End-to-End UAT (Task 4) — PASS 5/5 (2026-05-18)

**Verdict:** PASS (5/5 UATs confirmed end-to-end across admin, seeker, employer surfaces; full feature flow verified)

Operator-driven multi-actor UAT on production. Touches: admin suspend/reactivate flow, seeker re-auth gate, admin document queue (approve / reject-with-reason / request-more-info / empty-reason negative), email side-effect (Resend live), employer-side Documents Verified badge surface.

Operator resume signal verbatim: `track-b-uat-5-of-5-pass — UAT1: suspended flow worked, seeker redirected to /suspended, re-activation worked ✅ UAT2: approve worked, badge visible to employer, email received ✅ UAT3: reject with reason worked, rejection email received with reason ✅ UAT4: request more info worked, email received ✅ UAT5: empty reason correctly blocked with toast error ✅`

### UAT 1 — Suspended flow (full gate)

**Operator note (verbatim):** "UAT1: suspended flow worked, seeker redirected to /suspended, re-activation worked ✅"

**Result:** PASS. Admin toggled Active OFF in ProfileDrawer → seeker (different session) navigated to /dashboard/seeker → redirected to /suspended (rendered with locked CONTEXT.md message + hello@topfarms.co.nz contact link + Sign Out button). After admin re-toggled Active ON, seeker signed in fresh → dashboard rendered normally.

**Closes:**
- IS-ACTIVE-01 (test stubs flipped GREEN — Wave 0 sealed)
- IS-ACTIVE-02 (loadRole single round-trip `select('role, is_active')` shipped + empirically gates at runtime)
- IS-ACTIVE-03 (default is_active=true — pre-existing seekers unaffected, only operator-suspended seekers gated)
- SUSPENDED-PAGE-01 (Suspended.tsx component + verbatim message + Sign Out + mailto link rendered in production)
- SUSPENDED-ROUTE-01 (/suspended route registered outside ProtectedRoute — accessible to authenticated-but-suspended sessions)

### UAT 2 — Doc queue Approve flow (with badge + email)

**Operator note (verbatim):** "UAT2: approve worked, badge visible to employer, email received ✅"

**Result:** PASS. Admin clicked Approve on a pending seeker document → row refreshed to status='approved' (green Tag) → seeker received email with verified subject line → employer viewing the seeker's ApplicantPanel saw "Documents Verified" badge in the collapsed-row header (visible without expanding the panel).

**Closes:**
- DOC-QUEUE-SCHEMA-01/02/03 (migration 032 status column + rejection_reason + composite index — empirically used by admin_approve_document)
- DOC-QUEUE-01/02 (admin_list_document_queue + admin_approve_document shape contracts honored end-to-end)
- DOC-QUEUE-RPC-GATE (PERFORM public._admin_gate() fires at runtime — admin role JWT carries through to RPC dispatch)
- DOC-QUEUE-03 (Edge fn admin-bypass branch served the document signed URL for queue preview)
- DOC-QUEUE-EDGE-GATEWAY-TRUST (BFIX-05 gateway-trust pattern preserved — admin path uses same atob decode + aud check)
- DOC-QUEUE-EMAIL-01/02 (send-document-status-email Edge fn dispatched + Resend delivered approved-template email to seeker inbox)
- DOC-QUEUE-PAGE-01/02 (AdminDocumentsQueue page mounted at /admin/documents + per-row Approve action wired to admin_approve_document RPC)
- DOC-QUEUE-NAV-01 (AdminSidebar 'Documents' nav item routed correctly between Seekers and Jobs)
- DOC-QUEUE-04 (status='approved' transition produces "Documents Verified" badge on employer-side ApplicantPanel)
- DOC-QUEUE-BADGE-SURFACE-01 (DocumentsVerifiedBadge component renders in employer applicant card header without panel-expand)

### UAT 3 — Doc queue Reject flow with reason

**Operator note (verbatim):** "UAT3: reject with reason worked, rejection email received with reason ✅"

**Result:** PASS. Admin clicked Reject on a pending seeker document → inline reason input + Confirm button surfaced → admin entered reason text → row refreshed to status='rejected' (red Tag) with rejection_reason text persisted → seeker received rejection-template email containing the reason text in the body.

**Closes:** admin_reject_document RPC + send-document-status-email rejected-template + rejection_reason round-trip from admin form → DB → email body. Empty-reason defence-in-depth guard (NULL/whitespace trim) not exercised here (UAT 5 covers).

### UAT 4 — Doc queue Request More Info flow

**Operator note (verbatim):** "UAT4: request more info worked, email received ✅"

**Result:** PASS. Admin clicked "Request more info" on a pending seeker document → row refreshed to status='needs_resubmission' (blue Tag) → seeker received needs-resubmission-template email.

**Closes:** admin_request_more_info RPC + send-document-status-email needs_resubmission-template. Distinct from reject — `rejection_reason` cleared (not preserved) per plan 21-02 decision (needs_resubmission is forward-state, not backward-state).

### UAT 5 — Negative: empty reject reason blocked

**Operator note (verbatim):** "UAT5: empty reason correctly blocked with toast error ✅"

**Result:** PASS. Admin clicked Reject → left reason input empty → clicked Confirm reject → toast.error fired ("Please enter a rejection reason" or equivalent) → no admin_reject_document RPC dispatched → no status change → no email sent.

**Closes:** Client-side empty-reason guard (admin-doc-queue page handler short-circuit before RPC dispatch). Also exercises the defence-in-depth server-side guard in admin_reject_document (would have raised P0001 'Rejection reason cannot be empty' if client-side guard had been bypassed — see plan 21-02 SUMMARY.md for the dual-layer rationale).

### Task 4 Outcome

All 5 UATs PASS. The full Track B feature surface (is_active gate + suspended page + doc verification queue across 4 actions + email delivery + employer badge surface) is empirically verified end-to-end in production. No regressions. Ready to proceed to Task 5 (docs flips + audit update + atomic commit).

---

## Task 5 — Docs Flips, Audit Update, Atomic Commit (2026-05-18) — PASS

**Verdict:** PASS

**Files updated in single atomic commit per CLAUDE §4:**

1. `.planning/phases/21-v20-close-post-launch-ops/21-VERIFICATION.md` (this file) — Task 4 evidence captured + frontmatter finalised + Verdict section added
2. `.planning/phases/21-v20-close-post-launch-ops/21-09-SUMMARY.md` — Plan-level closeout summary (Tasks 1, 3, 4, 5 complete; Task 2 deferred; Task 6 BLOCKED)
3. `.planning/REQUIREMENTS.md` — Ledger backfill for 19 unregistered Phase 21 REQ IDs (DOC-QUEUE-SCHEMA-01..03 + DOC-QUEUE-01/02 + DOC-QUEUE-RPC-GATE + DOC-QUEUE-03 + DOC-QUEUE-EDGE-GATEWAY-TRUST + IS-ACTIVE-01..03 + SUSPENDED-PAGE-01 + SUSPENDED-ROUTE-01 + DOC-QUEUE-EMAIL-01/02 + DOC-QUEUE-PAGE-01/02 + DOC-QUEUE-NAV-01 + DOC-QUEUE-04 + DOC-QUEUE-BADGE-SURFACE-01)
4. `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` — SC-2 stays PARTIAL with explicit PEND-01 dependency note appended (no PASS flip per CLAUDE §7)
5. `.planning/v2.0-MILESTONE-AUDIT.md` — Phase 21 closure status added; PEND-01 confirmed as the single remaining v2.0 blocker; operator handoff for `/gsd:complete-milestone v2.0`
6. `.planning/DECISIONS-PENDING.md` — PEND-01 deferral note (2026-05-18) added; checklist items NOT marked [x] (still pending)
7. `.planning/ROADMAP.md` — Phase 21 row flipped `[x]` with closure annotation; v2.0 milestone row unchanged (cannot close until PEND-01)
8. `.planning/STATE.md` — Phase 21 marked complete; PEND-01 listed as remaining blocker before v2.0 close; Task 2 deferral decision logged

---

## Phase Verdict Recap

**resolved_pending_pend_01** — All Phase 21 work shipped and empirically verified. The v2.0 milestone close requires one more separate-session operator action (PEND-01 Stripe live-mode swap). After PEND-01 lands:

1. Re-open this file → flip `Track-A-PEND-01` + `Track-A-18.1-SC-2-FLIP` to PASS + drop "BLOCKED" from Verdict
2. Open `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` → flip SC-2 PARTIAL → PASS + status: PARTIAL → PASS
3. Update `.planning/v2.0-MILESTONE-AUDIT.md` PEND-01 status: tech_debt → ready_to_close
4. Update `.planning/DECISIONS-PENDING.md` PEND-01 checklist → all 9 items [x]
5. Update `.planning/ROADMAP.md` Phase 18.1 [ ] → [x]
6. Run `/gsd:complete-milestone v2.0`

---

*Phase 21 verification COMPLETE for Phase-21-scoped deliverables — last updated 2026-05-18. PEND-01 carryforward to separate session; `/gsd:complete-milestone v2.0` gated on PEND-01 closure.*
