---
phase: 21-v20-close-post-launch-ops
plan: 07
subsystem: admin-doc-verification
tags: [admin-ui, doc-queue, edge-fn-tweak, security-design, tdd]
requires:
  - 21-00-test-scaffold (Wave 0 vitest .todo placeholders for DOC-QUEUE-02 email side-effect)
  - 21-02-admin-doc-rpcs (4 SECURITY DEFINER RPCs in migration 033)
  - 21-03-edge-fn-admin-bypass (admin role flow shape on Edge fns)
  - 21-06-email-edge-fn (send-document-status-email handler — sibling Rule 1 edit here)
provides:
  - AdminDocumentsQueue page at /admin/documents
  - AdminSidebar "Documents" nav item (between Seekers and Jobs)
  - End-to-end RTL render proof (click → RPC → email-fn invoke shape)
  - Locked decision: no browser-shared secret on send-document-status-email
affects:
  - src/components/admin/AdminTable.tsx (AdminListRpc union widened)
  - supabase/functions/send-document-status-email/index.ts (3-line gate removed)
  - tests/send-document-status-email.test.ts (1 assertion flipped — TDD RED→GREEN)
tech-stack:
  added: [react-router MemoryRouter (test only)]
  patterns:
    - "vi.hoisted consolidation for RTL tests that statically import SUT (Phase 17-02/18.1-02/20-06 precedent)"
    - "Best-effort email side-effect: RPC FIRST, invoke SECOND, toast.warning on invoke failure, no rollback"
    - "Inline reject-reason form (no modal) using existing Input + Button — matches drawer-internal confirm pattern (Phase 20-05)"
    - "AdminTable rerender-via-key refresh (cheap at <=25 rows, no refetch handle needed)"
key-files:
  created:
    - src/pages/admin/AdminDocumentsQueue.tsx (305 lines)
  modified:
    - src/components/admin/AdminTable.tsx (AdminListRpc union +1 member)
    - src/main.tsx (route registration + import)
    - src/components/layout/AdminSidebar.tsx (FileText import + 1 nav item)
    - supabase/functions/send-document-status-email/index.ts (header-secret gate + env + CORS slimmed)
    - tests/send-document-status-email.test.ts (1 assertion flipped — Rule 1 sibling test edit)
    - tests/admin-doc-queue.test.tsx (273 lines — mocks hoisted, 2 RTL render tests added, .todo flipped)
decisions:
  - No X-Webhook-Secret on send-document-status-email — admin browser cannot safely carry a shared secret; verify_jwt:true gateway + admin role check on service-role client are the load-bearing gates. Distinct from send-followup-emails / notify-job-filled (verify_jwt:false cron-invoked) where header-secret is appropriate.
  - vi.hoisted consolidation in admin-doc-queue.test.tsx — both rpcMock + functionsInvokeMock + auth shim under single hoisted object; existing lazy-imported shape-contract tests continue to work against the same hoisted mock. Cleaner than co-existing two mock styles per the plan's executor-judgement note.
  - AdminTable refresh-via-key — DocumentRow has no id/user_id, so rowKey falls through to idx (cheap at ≤25 rows per page; no reordering risk within a page).
metrics:
  duration_minutes: 8
  duration_seconds: 482
  tasks_completed: 3
  files_created: 1
  files_modified: 6
  commits: 3
  completed: 2026-05-18T10:10:36Z
---

# Phase 21 Plan 07: Admin Documents Queue Page Summary

Operator-facing surface for the doc verification workflow shipped: AdminDocumentsQueue page at `/admin/documents` composing AdminTable + 3 action buttons + inline reject-reason form, wired to the 4 SECURITY DEFINER RPCs from migration 033, with best-effort `send-document-status-email` email side-effect.

## One-liner

Admin doc queue page (`/admin/documents`) with Approve / Reject (inline reason) / Request More Info actions calling 4 admin RPCs and best-effort `send-document-status-email` invoke; sibling Rule 1 edit removed the X-Webhook-Secret gate from the email Edge fn (browser secret unsafe; verify_jwt + admin role gate suffice).

## Tasks & Commits

| Task | Name                                                                          | Commit    | Files                                                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Build AdminDocumentsQueue page + sibling Edge fn header-secret removal        | `f87dad8` | src/pages/admin/AdminDocumentsQueue.tsx (new, 305 lines); src/components/admin/AdminTable.tsx (union +1); supabase/functions/send-document-status-email/index.ts (gate removed); tests/send-document-status-email.test.ts (1 assertion flipped) |
| 2    | Register /admin/documents route + AdminSidebar "Documents" nav item           | `2f580fc` | src/main.tsx (import + route); src/components/layout/AdminSidebar.tsx (FileText import + nav item between Seekers and Jobs)                                                                    |
| 3    | Flip remaining admin-doc-queue email side-effect placeholder to GREEN via RTL | `d47a323` | tests/admin-doc-queue.test.tsx (273 lines — vi.hoisted consolidation + 2 new RTL render tests)                                                                                                  |

## Sibling Rule 1 Edit — send-document-status-email Header-Secret Removal

**Why:** Plan 21-06 added an `X-Webhook-Secret` defence-in-depth gate by symmetry with `send-followup-emails` / `notify-job-filled`. But those functions have `verify_jwt = false` (pg_cron caller, no JWT context) — different threat model. `send-document-status-email` has `verify_jwt = true` and is invoked from the admin browser via `supabase.functions.invoke`. The gateway already validates the user JWT upstream, and the `user_roles.role === 'admin'` check on the service-role client is the load-bearing gate. A browser-side shared secret cannot live safely in the admin SPA without defeating its purpose.

**Edits applied:**

1. Removed the env-var `const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''` line.
2. Removed the `corsHeaders` Allow-Headers `x-webhook-secret` entry.
3. Removed the entire Gate 1 block (`headerSecret !== WEBHOOK_SECRET` check returning 403).
4. Renumbered Gate 2 → Gate 1 (JWT decode) and Gate 3 → Gate 2 (admin role check).
5. Rewrote the docblock NOTE explaining the design rationale without using the literal `WEBHOOK_SECRET` / `X-Webhook-Secret` tokens (so the regression test can `.not.toMatch` on those strings as a future-drift guard).
6. Flipped `tests/send-document-status-email.test.ts` assertion from `expect(source).toMatch(/X-Webhook-Secret/)` to `expect(source).not.toMatch(/X-Webhook-Secret/)` and `not.toMatch(/WEBHOOK_SECRET/)`. TDD RED→GREEN cycle: assertion changed first (RED — 1 failed), source edited (GREEN — 10/10 passing).

**Risk:** None at runtime. The two load-bearing gates remain (`payload.aud !== 'authenticated'` JWT decode + `roleRow?.role !== 'admin'`). Removing a redundant gate that couldn't be safely populated removes a deploy-time secret-management requirement and removes a foot-gun where a 403 would mask the true admin-gate signal.

**Carryforward to 21-09:** No `WEBHOOK_SECRET` need be set in prod secrets for this fn (only `RESEND_API_KEY` remains gating the actual email send). Plan 21-09's secret-distribution checklist for this fn is now one item shorter.

## AdminSidebar Position Confirmation

Final order (verified `grep -A8 "const adminItems" src/components/layout/AdminSidebar.tsx`):

```
Daily Briefing → Employers → Seekers → Documents → Jobs → Placement Pipeline
```

Documents lands between Seekers (Users icon) and Jobs (Briefcase icon) using the `FileText` lucide icon. Plan-specified position preserved exactly.

## Test Counts

**admin-doc-queue.test.tsx** — 9 passing, 0 todos (was: 7 passing + 1 todo = 8 entries; now: 9 passing, +1 net entry from the two new RTL render tests minus 1 flipped todo).

- 2 × DOC-QUEUE-01 RPC shape (existing)
- 5 × DOC-QUEUE-02 dispatch shape (existing)
- 2 × DOC-QUEUE-02 RTL render (NEW — click → RPC → invoke chain proof, and empty-reason short-circuit proof)

**send-document-status-email.test.ts** — 10 passing, unchanged count but 1 assertion semantics inverted (Phase 18.1 SC-3 line replaced with plan 21-07 decision line).

**Full vitest suite** — `305 passed | 113 todo` (baseline `298/118`; net +7/-5 across both my contribution AND sibling plan 21-08 running in parallel). On the touched paths alone: zero regressions, +3 net passing assertions from this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan-Anticipated Adjustment] DocumentRow type signature widened with `extends Record<string, unknown>`**

- **Found during:** Task 1 typecheck pass after writing AdminDocumentsQueue.tsx
- **Issue:** `AdminTable<TRow extends Record<string, unknown>>` constraint requires the row type to be an indexed-access type. The plan-body type `interface DocumentRow { ... }` failed this constraint with `TS2344: Type 'DocumentRow' does not satisfy the constraint 'Record<string, unknown>'. Index signature for type 'string' is missing.`
- **Fix:** Added `extends Record<string, unknown>` to the interface declaration. Same pattern would benefit the 4 sibling admin pages (EmployerRow, SeekerRow, JobRow, PlacementRow all hit the same pre-existing tsc error from STATE.md Phase 18.1-02 baseline) but those are out of scope for this plan — left alone per CLAUDE.md §3 scope discipline.
- **Files modified:** src/pages/admin/AdminDocumentsQueue.tsx (line 11)
- **Commit:** f87dad8

**2. [Rule 1 — Plan-Anticipated Adjustment] Two `as never` casts per RPC call instead of one**

- **Found during:** Task 1 typecheck pass
- **Issue:** Plan acceptance criterion read `grep -c "as never" returns ≥ 3` (one per RPC call). But the generated supabase-js type union complains at BOTH the function name argument AND the args object argument — the plan's body used only one `as never` per call but real-world contract needs two (precedent: src/components/admin/AdminTable.tsx line 87 already uses both per the comment "as never keeps tsc happy without weakening the AdminListRpc union upstream"). My new RPC names (admin_approve_document / admin_reject_document / admin_request_more_info) aren't in the union at all.
- **Fix:** Used `supabase.rpc('admin_approve_document' as never, { p_document_id: row.document_id } as never)` for all 3 mutations. Grep count goes from ≥3 (plan AC) to 6 actual — over-meets the AC.
- **Commit:** f87dad8

### Documentation-only Notes

- Vercel plugin `nextjs` Skill hooks dismissed on Read/Write of `src/pages/admin/*` and `"use client"` validation suggestions on AdminDocumentsQueue.tsx. TopFarms is Vite + React Router v7 SPA (`createBrowserRouter` in main.tsx, no `next` dep), not Next.js App Router. The directive would be inert. Matches Phase 20.1-02 / 21-00..06 STATE precedent for hook noise dismissal on non-Next.js paths.
- Vercel plugin `react-best-practices` + `shadcn` Skill hooks dismissed on Read of AdminTable.tsx / Tag.tsx. TopFarms uses bespoke `src/components/ui/*` primitives with own `cn`-based variants, no `@shadcn/ui` dep. The library docs aren't load-bearing for plan-locked edits to existing internal components.
- Vercel plugin `vercel-storage` Skill hook dismissed on Read of `supabase/functions/send-document-status-email/index.ts`. TopFarms uses Supabase Storage, not Vercel Storage. Matches Phase 17/18.1/20.1/21-00..06 STATE precedent.

## Pointers Forward

**Plan 21-08 (DocumentsVerifiedBadge — Wave 5 sibling, running in parallel):** Independent file (`src/components/ui/DocumentsVerifiedBadge.tsx` + employer-side `ApplicantPanel.tsx` surface). Lands the verified-badge display on the employer-facing applicant panel after an admin approve. Saw it land commit `bb4bc82` between my Task 2 and Task 3 — clean no-shared-file parallel execution.

**Plan 21-09 (track-a-milestone-close — Wave 6):** Operator deploy + UAT batches the full doc-queue flow:

1. `supabase functions deploy send-document-status-email` (verify `verify_jwt = true` in config.toml is honoured at deploy time)
2. Verify `RESEND_API_KEY` is set in production Edge Function secrets (Phase 15 MAIL-02 §7 carryforward — best-effort skip path covers absence with `200 { skipped: true }` but UAT should confirm at least one email actually sends)
3. **No** `WEBHOOK_SECRET` secret-set step needed for this fn (removed in Task 1 of this plan — one less item in 21-09's secret-distribution checklist)
4. Manual UAT: admin signs in, navigates to /admin/documents, sees pending docs, exercises each of Approve / Reject / Request More Info, verifies (a) Tag variant transitions, (b) toast.success, (c) email arrives in seeker inbox via Resend
5. REQUIREMENTS.md ledger backfill for `DOC-QUEUE-PAGE-01`, `DOC-QUEUE-PAGE-02`, `DOC-QUEUE-NAV-01` (this plan's 3 requirement IDs joining the existing 7-REQ-ID Phase 21 carryforward sweep)

## Self-Check: PASSED

Verifications run after writing this SUMMARY:

- [x] `src/pages/admin/AdminDocumentsQueue.tsx` exists (305 lines)
- [x] `git log --oneline | grep f87dad8` → FOUND
- [x] `git log --oneline | grep 2f580fc` → FOUND
- [x] `git log --oneline | grep d47a323` → FOUND
- [x] `grep -c "admin_list_document_queue" src/components/admin/AdminTable.tsx` → 1 (union widened)
- [x] `grep -c "admin_approve_document\|admin_reject_document\|admin_request_more_info" src/pages/admin/AdminDocumentsQueue.tsx` → ≥ 3
- [x] `grep -c "send-document-status-email" src/pages/admin/AdminDocumentsQueue.tsx` → 3 (1 functions.invoke call + 2 docblock mentions; AC was ≥ 1)
- [x] `grep -c "X-Webhook-Secret\|WEBHOOK_SECRET" supabase/functions/send-document-status-email/index.ts` → 0 (gate removed)
- [x] `grep -c "payload.aud !== 'authenticated'" supabase/functions/send-document-status-email/index.ts` → 1 (gateway-trust preserved)
- [x] `grep -c "roleRow?.role !== 'admin'" supabase/functions/send-document-status-email/index.ts` → 1 (admin gate preserved)
- [x] `grep -c "/admin/documents" src/main.tsx` → 1; `grep -c "AdminDocumentsQueue" src/main.tsx` → 2
- [x] `grep -c "/admin/documents" src/components/layout/AdminSidebar.tsx` → 1; `grep -c "FileText" src/components/layout/AdminSidebar.tsx` → 2
- [x] AdminSidebar order Employers → Seekers → Documents → Jobs (verified)
- [x] `pnpm exec vitest run tests/admin-doc-queue.test.tsx` → 9 passed, 0 todo
- [x] `pnpm exec vitest run tests/send-document-status-email.test.ts` → 10 passed
- [x] `pnpm exec vitest run` → 305 passed | 113 todo (zero regressions on touched paths)
- [x] `pnpm exec tsc -b` → only pre-existing Phase 18.1-02 errors (filtered output for my new files returns zero hits)
- [x] `grep -c "it.todo" tests/admin-doc-queue.test.tsx` → 0
