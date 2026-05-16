---
phase: 21
slug: v20-close-post-launch-ops
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (frontend) + Supabase MCP execute_sql (DB) + Browser UAT (visual + auth flow) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run --reporter=verbose <pattern>` |
| **Full suite command** | `pnpm exec vitest run --reporter=verbose` |
| **Estimated runtime** | ~15s (full suite, 260 passing baseline as of 2026-05-16) |

---

## Sampling Rate

- **After every task commit:** Run quick `pnpm exec vitest run <pattern>` for files modified
- **After every plan wave:** Run full `pnpm exec vitest run` (must pass: 260 + new tests, 0 failures)
- **Before `/gsd:verify-work`:** Full suite must be green + Track A UAT evidence captured
- **Max feedback latency:** 15s (vitest full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Concern | Test Type | Automated Command | File Exists | Status |
|---------|------|------|---------|-----------|-------------------|-------------|--------|
| 21-00-01 | 00 | 0 | Test stubs scaffold | infra | `pnpm exec vitest run src/__tests__/suspended.test.tsx src/__tests__/AdminDocumentsQueue.test.tsx src/__tests__/loadRole-isActive.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-01 | 01 | 1 | Migration 032 schema | DB | `mcp__supabase__execute_sql "SELECT column_name FROM information_schema.columns WHERE table_name='seeker_documents' AND column_name IN ('status','rejection_reason')"` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | Migration 032 default | DB | `mcp__supabase__execute_sql "SELECT status FROM seeker_documents LIMIT 5"` returns `pending` | ❌ W0 | ⬜ pending |
| 21-01-03 | 01 | 1 | Composite queue index | DB | `mcp__supabase__execute_sql "SELECT indexname FROM pg_indexes WHERE tablename='seeker_documents'"` includes new idx | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | 4 admin RPCs exist | DB | `mcp__supabase__execute_sql "SELECT proname FROM pg_proc WHERE proname IN ('admin_approve_document','admin_reject_document','admin_request_more_info','admin_list_document_queue')"` returns 4 rows | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 2 | SECURITY DEFINER set | DB | All 4 RPCs have `prosecdef=true` | ❌ W0 | ⬜ pending |
| 21-02-03 | 02 | 2 | Admin gate enforced | DB | Non-admin role JWT → `admin_list_document_queue()` returns permission denied | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 2 | get-applicant-document-url admin bypass | Edge | curl with admin JWT to function returns 200 + signed URL for seeker doc | ✅ exists | ⬜ pending |
| 21-03-02 | 03 | 2 | Gateway-trust JWT pattern preserved | Code | grep `payload.aud !== 'authenticated'` in supabase/functions/get-applicant-document-url/index.ts | ✅ exists | ⬜ pending |
| 21-04-01 | 04 | 3 | loadRole returns is_active | Test | `pnpm exec vitest run src/__tests__/loadRole-isActive.test.ts` | ❌ W0 | ⬜ pending |
| 21-04-02 | 04 | 3 | ProtectedRoute redirects suspended | Test | `pnpm exec vitest run src/__tests__/ProtectedRoute-suspended.test.tsx` | ❌ W0 | ⬜ pending |
| 21-04-03 | 04 | 3 | Order in guard chain | Code | Read ProtectedRoute.tsx; isActive check between role-null guard and role-allowed guard | ✅ exists | ⬜ pending |
| 21-05-01 | 05 | 3 | /suspended route registered | Code | grep `/suspended` in src/main.tsx | ✅ exists | ⬜ pending |
| 21-05-02 | 05 | 3 | SuspendedPage renders message | Test | `pnpm exec vitest run src/__tests__/suspended.test.tsx` | ❌ W0 | ⬜ pending |
| 21-06-01 | 06 | 4 | send-document-status-email function exists | Edge | `ls supabase/functions/send-document-status-email/index.ts` | ❌ W0 | ⬜ pending |
| 21-06-02 | 06 | 4 | Function deploys + invokes | Edge | curl returns 200 for approve/reject/request_more_info templates | ❌ W0 | ⬜ pending |
| 21-07-01 | 07 | 5 | AdminDocumentsQueue page renders | Test | `pnpm exec vitest run src/__tests__/AdminDocumentsQueue.test.tsx` | ❌ W0 | ⬜ pending |
| 21-07-02 | 07 | 5 | Three actions trigger correct RPC | Test | Approve/Reject/RequestMoreInfo buttons → mock RPC called with right args | ❌ W0 | ⬜ pending |
| 21-07-03 | 07 | 5 | Admin nav link added | Code | grep `Documents` in src/components/admin/AdminSidebar.tsx | ✅ exists | ⬜ pending |
| 21-08-01 | 08 | 5 | "Documents Verified" badge surfaces in employer cards | Test | Component test renders badge when all docs approved | ❌ W0 | ⬜ pending |
| 21-09-01 | 09 | 6 (Track A) | PEND-01 9-item checklist evidence | UAT | All 9 items in DECISIONS-PENDING.md §PEND-01 checked + dated | n/a | ⬜ pending |
| 21-09-02 | 09 | 6 (Track A) | 5 visual smoke tests evidence | UAT | Each smoke test (a)-(e) confirmed in browser with screenshot or note | n/a | ⬜ pending |
| 21-09-03 | 09 | 6 (Track A) | 18.1 SC-2 flipped PARTIAL→PASS | Doc | grep `SC-2` block in 18.1-VERIFICATION.md flipped to PASS with date | ✅ exists | ⬜ pending |
| 21-10-01 | 10 | 6 (close) | Full vitest suite green | Test | `pnpm exec vitest run` exits 0; ≥260 + new tests passing | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/suspended.test.tsx` — stubs for SuspendedPage render + redirect
- [ ] `src/__tests__/loadRole-isActive.test.ts` — stubs for AuthContext.loadRole `is_active` extension
- [ ] `src/__tests__/ProtectedRoute-suspended.test.tsx` — stubs for `is_active=false → /suspended` guard
- [ ] `src/__tests__/AdminDocumentsQueue.test.tsx` — stubs for queue render + 3 action buttons
- [ ] `src/__tests__/DocumentsVerifiedBadge.test.tsx` — stubs for badge visibility logic

*Existing infra: vitest config + 260 passing tests confirm framework is operational.*

---

## Manual-Only Verifications

| Behavior | Concern | Why Manual | Test Instructions |
|----------|---------|------------|-------------------|
| Stripe live-mode keys swapped + first real charge succeeds | PEND-01 | Requires real Stripe dashboard access + test payment | Follow `.planning/DECISIONS-PENDING.md` §PEND-01 9-item checklist verbatim |
| Smoke test (a) — My Documents link in seeker nav | 18.2 gate | Visual + interaction | Login as seeker → sidebar visible → click "My Documents" → lands on `/dashboard/seeker/documents` |
| Smoke test (b) — MarkFilledModal shows applicant names | 18.2 gate | Visual | Login as employer → open job with applicants → "Mark filled" → confirm names + status + points, no UUIDs |
| Smoke test (c) — Salary preset chips in onboarding | 18.2 gate | Visual + interaction | New seeker onboarding step 5 → confirm preset chips render (not raw number input) |
| Smoke test (d) — AUTH-FIX-02 console.time in DevTools | 18.2 gate | DevTools observation | Login any role → open DevTools console → confirm `console.time('loadRole')` timing output |
| Smoke test (e) — admin fresh-session login no AccessDenied | 20.1 gate | Multi-step browser flow | Sign out → clear all site data → sign in as admin → navigate `/admin` → confirm no AccessDenied flicker |
| Suspended user UAT | Track B feature | Multi-session flow | Admin suspends user in ProfileDrawer → user refreshes → redirected to `/suspended` page; admin reactivates → user can refresh and access dashboard |
| Admin doc queue UAT — approve flow | Track B feature | Multi-actor + email side-effect | Seeker uploads doc → admin sees in `/admin/documents` queue → click Approve → email arrives in seeker inbox → "Documents Verified" badge visible on profile |
| Admin doc queue UAT — reject flow | Track B feature | Multi-actor + email side-effect | Admin opens pending doc → click Reject → enters reason → email arrives in seeker inbox with reason |
| Admin doc queue UAT — request more info flow | Track B feature | Multi-actor + email side-effect | Admin clicks Request More Info → email arrives in seeker inbox asking for resubmission |
| "Documents Verified" badge in employer applicant card | Track B feature | Visual cross-actor | Employer views applicant card for seeker with all docs approved → badge visible |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
