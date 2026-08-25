---
phase: 21-v20-close-post-launch-ops
plan: 07
type: execute
wave: 5
depends_on: [00, 02, 03, 06]
files_modified:
  - src/pages/admin/AdminDocumentsQueue.tsx
  - src/main.tsx
  - src/components/layout/AdminSidebar.tsx
  - tests/admin-doc-queue.test.tsx
autonomous: true
requirements:
  - DOC-QUEUE-PAGE-01
  - DOC-QUEUE-PAGE-02
  - DOC-QUEUE-NAV-01
must_haves:
  truths:
    - "/admin/documents route registered under ProtectedRoute requiredRole='admin' + AdminLayout"
    - "AdminDocumentsQueue calls admin_list_document_queue RPC and renders rows in an AdminTable"
    - "Approve / Reject / Request More Info buttons appear on each row"
    - "Reject opens an inline modal/row prompting for a reason (non-empty required)"
    - "Successful RPC dispatch triggers supabase.functions.invoke('send-document-status-email') with action + reason (best-effort)"
    - "AdminSidebar shows a 'Documents' nav item with FileText icon, between 'Seekers' and 'Jobs'"
    - "Page reuses Tag variants: pending=warn, approved=green, rejected=red, needs_resubmission=blue"
    - "Page reuses ProfileDrawer pattern absent (different concern — drawer is per-user; queue is per-document)"
  artifacts:
    - path: "src/pages/admin/AdminDocumentsQueue.tsx"
      provides: "Queue page composing AdminTable + 3 action buttons + reject-reason form"
      contains: "admin_list_document_queue"
    - path: "src/main.tsx"
      provides: "/admin/documents route entry"
      contains: "/admin/documents"
    - path: "src/components/layout/AdminSidebar.tsx"
      provides: "Documents nav item"
      contains: "Documents"
  key_links:
    - from: "src/pages/admin/AdminDocumentsQueue.tsx"
      to: "supabase/migrations/033_admin_doc_rpcs.sql (4 RPCs)"
      via: "supabase.rpc(... as never)"
      pattern: "admin_(list_document_queue|approve_document|reject_document|request_more_info)"
    - from: "src/pages/admin/AdminDocumentsQueue.tsx"
      to: "supabase/functions/send-document-status-email"
      via: "supabase.functions.invoke after RPC success"
      pattern: "send-document-status-email"
---

<objective>
Wave 5 — Build the admin-facing doc queue page at `/admin/documents`. Composes AdminTable + three action buttons + an inline reject-reason form. Wires to the 4 RPCs from plan 21-02 and the email Edge Function from plan 21-06. Adds "Documents" nav item to AdminSidebar.

Purpose: Delivers the operator-facing surface for the doc verification workflow. Admin sees pending uploads, can approve them (clears flag, fires email), reject them (captures reason, fires email), or request more info (fires resubmission email).

Output: One new page, one new nav item, one main.tsx route entry, flipped tests for the action-dispatch path.

Note: AdminTable is currently typed against an `AdminListRpc` union of 4 existing RPCs (`admin_list_employers|seekers|jobs|placements`). We will widen the union by adding `'admin_list_document_queue'` and `'admin_list_pending_documents'` — Wave 2 chose `admin_list_document_queue` as the name; only that one is needed.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@CLAUDE.md

<!--
LOCKED DECISION: New admin page at /admin/documents (CONTEXT.md "Doc verification queue")
LOCKED DECISION: 3 actions per doc: Approve / Reject (with reason) / Request More Info (CONTEXT.md)
LOCKED DECISION: Reuse AdminTable / Tag / Button — no new primitives (CONTEXT.md Constraints)
LOCKED DECISION: Newest pending first (RESEARCH §"Admin RPCs Pattern 2" + ORDER BY in migration 033)
LOCKED DECISION: Email is best-effort — RPC succeeds even if email fails (RESEARCH §Open Q3)
-->

<interfaces>
From src/components/admin/AdminTable.tsx (lines 7-12):
```typescript
type AdminListRpc =
  | 'admin_list_employers'
  | 'admin_list_seekers'
  | 'admin_list_jobs'
  | 'admin_list_placements'
```
**Update needed:** widen to include `'admin_list_document_queue'`.

From src/pages/admin/EmployerList.tsx (composition model):
- Uses AdminTable<TRow> with rpc, searchable, columns, renderRow, emptyHeading, emptyBody, errorCopy props
- Maintains drawer state at page level
- Maps row.* to Tag/text/anchor cells

From migration 033 (RPC return shapes — locked by plan 21-02):
- admin_list_document_queue: { rows: [{ document_id, seeker_user_id, seeker_name, document_type, filename, uploaded_at, status, rejection_reason }], total }
- admin_approve_document: { ok, document_id, status: 'approved' }
- admin_reject_document: { ok, document_id, status: 'rejected', reason }
- admin_request_more_info: { ok, document_id, status: 'needs_resubmission' }

From supabase/functions/send-document-status-email (plan 21-06):
- Body: { document_id, action: 'approved'|'rejected'|'needs_resubmission', rejection_reason? }
- Headers: must include `X-Webhook-Secret` — invoked via `supabase.functions.invoke` which (per Supabase JS) passes the user's Authorization JWT automatically. The X-Webhook-Secret must be added via `headers: { 'X-Webhook-Secret': ??? }` option. **CRITICAL:** the secret is server-only and CANNOT be exposed to the browser. The plan must use a different invocation path — see Action notes.
- Returns 200 on success or skipped:true

From src/components/layout/AdminSidebar.tsx (lines 18-24):
```typescript
const adminItems: NavItem[] = [
  { to: '/admin', label: 'Daily Briefing', icon: LayoutDashboard },
  { to: '/admin/employers', label: 'Employers', icon: Building2 },
  { to: '/admin/seekers', label: 'Seekers', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/placements', label: 'Placement Pipeline', icon: DollarSign },
]
```

From src/main.tsx lines 222-264 (admin routes pattern — ProtectedRoute requiredRole="admin" wrapping AdminLayout).
</interfaces>
</context>

<critical_constraints>
**WEBHOOK_SECRET cannot live in the browser.** Plan 21-06 requires X-Webhook-Secret on the email function. The admin browser session cannot send that secret. Two valid approaches:

**Option A (recommended for this plan):** Drop X-Webhook-Secret requirement from `send-document-status-email`. Rely on:
- `verify_jwt: true` (gateway validates upstream)
- Admin role check inside the function (gate 3 — `roleRow?.role !== 'admin'`)

The admin role check is the load-bearing gate. WEBHOOK_SECRET was added in plan 21-06 by symmetry with send-followup-emails, but send-followup-emails has `verify_jwt: false` (cron-invoked); send-document-status-email has `verify_jwt: true` (admin-invoked) — different threat model.

**Action:** Update plan 21-06's Edge Function source in this plan as a sibling edit: remove the X-Webhook-Secret gate (lines for `headerSecret !== WEBHOOK_SECRET` in `Deno.serve`). Keep the admin role check + JWT decode + verify_jwt:true. Update the static-source guard tests in `tests/send-document-status-email.test.ts` accordingly: change `expect(source).toMatch(/X-Webhook-Secret/)` to `expect(source).not.toMatch(/X-Webhook-Secret/)`. Note in this plan's SUMMARY that the sibling edit was Rule 1 — protocol prevention.

**Option B:** Keep WEBHOOK_SECRET; invoke via pg_net from inside the admin RPC. Rejected by RESEARCH §Open Q3 because best-effort + rollback semantics matter.

**Locked:** Option A. Update plan 21-06's source as a sibling edit in Task 1 of this plan.
</critical_constraints>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build AdminDocumentsQueue page + sibling Edge Function header tweak</name>
  <files>src/pages/admin/AdminDocumentsQueue.tsx, src/components/admin/AdminTable.tsx, supabase/functions/send-document-status-email/index.ts, tests/send-document-status-email.test.ts</files>

  <read_first>
    - src/components/admin/AdminTable.tsx (full file — for AdminListRpc union widening + props shape)
    - src/pages/admin/EmployerList.tsx (full file — composition model + Tag mapping pattern)
    - src/components/ui/Tag.tsx (variant union: green|warn|blue|grey|orange|purple|red)
    - src/components/ui/Button.tsx (variant union — verify primary/ghost variants exist)
    - src/components/ui/Input.tsx (for the reject-reason input)
    - supabase/migrations/033_admin_doc_rpcs.sql (locks RPC shapes)
    - supabase/functions/send-document-status-email/index.ts (Task 1 of plan 21-06 — currently has X-Webhook-Secret gate; will be removed in this plan's sibling edit)
    - tests/send-document-status-email.test.ts (plan 21-06 — assertions will be updated in this plan's sibling edit)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pitfall 4 (as never pattern for admin RPCs)
  </read_first>

  <behavior>
    - AdminDocumentsQueue renders an AdminTable wrapping admin_list_document_queue
    - Rows display: Seeker Name (with subtext = document type label) | Filename | Uploaded (date) | Status (Tag with variant) | Actions (3 buttons)
    - Status → Tag variant: pending=warn, approved=green, rejected=red, needs_resubmission=blue (per Tag.tsx variants)
    - Approve button: calls admin_approve_document → on success: invoke email fn with action='approved' → refresh table → toast.success
    - Reject button: expands inline reason input + Confirm button; Confirm calls admin_reject_document with p_reason → email with rejection_reason → refresh → toast.success
    - Request More Info button: calls admin_request_more_info → email with action='needs_resubmission' → refresh → toast.success
    - On RPC error: toast.error with the error.message; do NOT call email function
    - On email function error: toast.warning('Email failed') but proceed (the RPC succeeded)
    - The 3 action buttons disable while their async op is in flight
    - AdminTable is widened to accept the new RPC name in its union
  </behavior>

  <action>
**File 1 — src/components/admin/AdminTable.tsx**:

Edit the AdminListRpc union at line 7-12 to add the new RPC name:

```typescript
type AdminListRpc =
  | 'admin_list_employers'
  | 'admin_list_seekers'
  | 'admin_list_jobs'
  | 'admin_list_placements'
  | 'admin_list_document_queue'
```

No other change to AdminTable — the new RPC honours the same `{ rows, total }` contract per migration 033.

**File 2 — src/pages/admin/AdminDocumentsQueue.tsx** (new):

```typescript
import { useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { AdminTable } from '@/components/admin/AdminTable'
import { Tag } from '@/components/ui/Tag'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { DOCUMENT_TYPE_LABELS, type SeekerDocumentStatus } from '@/types/domain'

interface DocumentRow {
  document_id: string
  seeker_user_id: string
  seeker_name: string
  document_type: keyof typeof DOCUMENT_TYPE_LABELS
  filename: string
  uploaded_at: string
  status: SeekerDocumentStatus
  rejection_reason: string | null
}

const STATUS_DISPLAY: Record<SeekerDocumentStatus, { label: string; variant: 'warn' | 'green' | 'red' | 'blue' }> = {
  pending:             { label: 'Pending',          variant: 'warn' },
  approved:            { label: 'Approved',         variant: 'green' },
  rejected:            { label: 'Rejected',         variant: 'red' },
  needs_resubmission:  { label: 'Needs Resubmission', variant: 'blue' },
}

/**
 * Phase 21 Track B — admin doc verification queue at /admin/documents.
 *
 * Composes <AdminTable rpc="admin_list_document_queue"> for the paginated table.
 * Each row exposes Approve / Reject (with reason) / Request More Info actions
 * that call the matching SECURITY DEFINER RPCs from migration 033, then invoke
 * send-document-status-email best-effort (failure doesn't roll back the action).
 *
 * Uses the Phase 20-05 `as never` workaround for Studio-applied admin_* RPCs
 * not in the supabase-js generated function-name union.
 */
export function AdminDocumentsQueue() {
  // State for the row currently being rejected — holds doc_id + draft reason.
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Forces AdminTable to refetch after a mutation. Bumping refreshKey via prop is
  // the cheapest signal AdminTable accepts; since AdminTable doesn't expose
  // a refetch handle, we remount via key (small page; ~ms-level rerender).
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  async function notifyEmail(documentId: string, action: 'approved' | 'rejected' | 'needs_resubmission', reason?: string) {
    try {
      const { error } = await supabase.functions.invoke('send-document-status-email', {
        body: { document_id: documentId, action, ...(reason ? { rejection_reason: reason } : {}) },
      })
      if (error) {
        console.warn('[AdminDocumentsQueue] email send failed', error)
        toast.warning('Email notification failed — action succeeded.')
      }
    } catch (e) {
      console.warn('[AdminDocumentsQueue] email invoke threw', e)
      toast.warning('Email notification failed — action succeeded.')
    }
  }

  async function handleApprove(row: DocumentRow) {
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_approve_document',
        { p_document_id: row.document_id } as never,
      )
      if (error) {
        toast.error(error.message || 'Approve failed')
        return
      }
      toast.success('Document approved')
      bumpRefresh()
      await notifyEmail(row.document_id, 'approved')
    } finally {
      setBusyId(null)
    }
  }

  async function handleConfirmReject(row: DocumentRow) {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason.')
      return
    }
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_reject_document',
        { p_document_id: row.document_id, p_reason: reason } as never,
      )
      if (error) {
        toast.error(error.message || 'Reject failed')
        return
      }
      toast.success('Document rejected')
      setRejectingId(null)
      setRejectReason('')
      bumpRefresh()
      await notifyEmail(row.document_id, 'rejected', reason)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRequestMoreInfo(row: DocumentRow) {
    setBusyId(row.document_id)
    try {
      const { error } = await supabase.rpc(
        'admin_request_more_info',
        { p_document_id: row.document_id } as never,
      )
      if (error) {
        toast.error(error.message || 'Request more info failed')
        return
      }
      toast.success('Resubmission requested')
      bumpRefresh()
      await notifyEmail(row.document_id, 'needs_resubmission')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Document Queue
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
        Review seeker-uploaded documents. Approve to grant the "Documents Verified" badge; reject with a reason or request a resubmission.
      </p>

      <AdminTable<DocumentRow>
        key={refreshKey}
        rpc="admin_list_document_queue"
        searchable={false}
        emptyHeading="Queue is empty"
        emptyBody="No documents waiting for review."
        errorCopy="Failed to load the queue. Refresh the page or check your connection."
        columns={[
          { key: 'seeker', label: 'Seeker' },
          { key: 'filename', label: 'File' },
          { key: 'uploaded', label: 'Uploaded' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ]}
        renderRow={(row) => {
          const status = STATUS_DISPLAY[row.status]
          const busy = busyId === row.document_id
          const rejecting = rejectingId === row.document_id
          return (
            <>
              <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                <div className="text-[15px]">{row.seeker_name}</div>
                <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  {DOCUMENT_TYPE_LABELS[row.document_type] ?? row.document_type}
                </div>
              </td>
              <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text)' }}>
                {row.filename}
              </td>
              <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(row.uploaded_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <Tag variant={status.variant}>{status.label}</Tag>
                {row.status === 'rejected' && row.rejection_reason && (
                  <div className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.rejection_reason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {rejecting ? (
                  <div className="flex flex-col gap-2 w-[280px]">
                    <Input
                      placeholder="Reason (required, e.g. 'illegible')"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                      disabled={busy}
                      aria-label="Rejection reason"
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" onClick={() => handleConfirmReject(row)} disabled={busy}>
                        {busy ? 'Submitting…' : 'Confirm reject'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason('') }} disabled={busy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleApprove(row)}
                      disabled={busy || row.status === 'approved'}
                      aria-label="Approve document"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setRejectingId(row.document_id); setRejectReason('') }}
                      disabled={busy}
                      aria-label="Reject document"
                    >
                      <XCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRequestMoreInfo(row)}
                      disabled={busy}
                      aria-label="Request more info"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
                      Request more info
                    </Button>
                  </div>
                )}
              </td>
            </>
          )
        }}
      />
    </div>
  )
}
```

If Button variant 'ghost' doesn't exist, use the closest neutral variant (verify by reading src/components/ui/Button.tsx). Fall back to 'secondary' or default per the project's brand.

**File 3 — supabase/functions/send-document-status-email/index.ts** (sibling Rule 1 edit per critical_constraints above):

Remove the X-Webhook-Secret block (the gate that checks `headerSecret !== WEBHOOK_SECRET`). Keep all other gates (verify_jwt:true, JWT decode, admin role check). Update the docblock to remove the "Auth gates" line 2 reference to X-Webhook-Secret.

Concretely:
- Delete the block:
  ```typescript
  // Gate 1: X-Webhook-Secret defence-in-depth (Phase 18.1 SC-3 pattern)
  const headerSecret = req.headers.get('X-Webhook-Secret') ?? ''
  if (!WEBHOOK_SECRET || headerSecret !== WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Webhook secret missing or invalid' }, 403)
  }
  ```
- Renumber comments: Gate 2 → Gate 1 (JWT), Gate 3 → Gate 2 (admin role).
- Remove the `const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''` line at the top.
- Update the corsHeaders Allow-Headers to remove `x-webhook-secret`.
- Update the docblock at the top: remove "(2) X-Webhook-Secret header (Phase 18.1 SC-3 — ...)" and renumber.

**File 4 — tests/send-document-status-email.test.ts** (sibling — update assertions to match):

Find these two assertions:
```typescript
it('Phase 18.1 SC-3: X-Webhook-Secret header validated', () => {
  expect(source).toMatch(/X-Webhook-Secret/)
  expect(source).toMatch(/WEBHOOK_SECRET/)
})
```

Replace with:
```typescript
it('Phase 21 plan 21-07 decision: no X-Webhook-Secret in this fn (verify_jwt:true + admin role gate suffice; secret cannot live in admin browser)', () => {
  expect(source).not.toMatch(/X-Webhook-Secret/)
  expect(source).not.toMatch(/WEBHOOK_SECRET/)
})
```

All other assertions remain.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/send-document-status-email.test.ts --reporter=verbose; ls src/pages/admin/AdminDocumentsQueue.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `ls src/pages/admin/AdminDocumentsQueue.tsx` exits 0
    - `grep -c "admin_list_document_queue" src/components/admin/AdminTable.tsx` returns 1 (union widened)
    - `grep -c "admin_approve_document\|admin_reject_document\|admin_request_more_info" src/pages/admin/AdminDocumentsQueue.tsx` returns ≥ 3
    - `grep -c "as never" src/pages/admin/AdminDocumentsQueue.tsx` returns ≥ 3 (per RPC call, Phase 20-05 pattern)
    - `grep -c "send-document-status-email" src/pages/admin/AdminDocumentsQueue.tsx` returns 1
    - `grep -c "X-Webhook-Secret" supabase/functions/send-document-status-email/index.ts` returns 0 (sibling edit applied)
    - `grep -c "WEBHOOK_SECRET" supabase/functions/send-document-status-email/index.ts` returns 0
    - `grep -c "payload.aud !== 'authenticated'" supabase/functions/send-document-status-email/index.ts` returns 1 (gateway-trust preserved)
    - `grep -c "roleRow?.role !== 'admin'" supabase/functions/send-document-status-email/index.ts` returns 1 (admin gate preserved)
    - `pnpm exec vitest run tests/send-document-status-email.test.ts` exits 0
    - `pnpm exec tsc -b` exits 0 OR only pre-existing Phase 18.1-02 errors
  </acceptance_criteria>

  <done>
    Queue page exists; AdminTable union widened; sibling Edge Function header gate removed with matching test update. Ready for nav + route registration in Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Register /admin/documents route + AdminSidebar "Documents" nav item</name>
  <files>src/main.tsx, src/components/layout/AdminSidebar.tsx</files>

  <read_first>
    - src/main.tsx (admin routes lines 215-264)
    - src/components/layout/AdminSidebar.tsx (adminItems array lines 18-24)
  </read_first>

  <action>
**File 1 — src/main.tsx**:

Edit 1: Import AdminDocumentsQueue alongside other admin page imports (after line 38 `import { PlacementPipeline }`):
```typescript
import { AdminDocumentsQueue } from '@/pages/admin/AdminDocumentsQueue'
```

Edit 2: Add the route. Insert AFTER `/admin/placements` (line 256-264 block), still inside the router array:
```typescript
  {
    path: '/admin/documents',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout>
          <AdminDocumentsQueue />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
```

DO NOT modify the AdminGate at /admin (Phase 20.1 hybrid pattern). Order doesn't matter for /admin/documents vs sibling routes since none are prefix-conflicting.

**File 2 — src/components/layout/AdminSidebar.tsx**:

Edit 1: Add `FileText` to the lucide-react import (line 2-9):
```typescript
import {
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  FileText,
} from 'lucide-react'
```

Edit 2: Add the nav item to the `adminItems` array (lines 18-24), inserting between Seekers and Jobs (so the nav reads: Daily Briefing | Employers | Seekers | Documents | Jobs | Placement Pipeline):
```typescript
const adminItems: NavItem[] = [
  { to: '/admin', label: 'Daily Briefing', icon: LayoutDashboard },
  { to: '/admin/employers', label: 'Employers', icon: Building2 },
  { to: '/admin/seekers', label: 'Seekers', icon: Users },
  { to: '/admin/documents', label: 'Documents', icon: FileText },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/placements', label: 'Placement Pipeline', icon: DollarSign },
]
```

No styling change needed — the map at line 65-86 picks up the new item automatically.
  </action>

  <verify>
    <automated>grep -n "/admin/documents" src/main.tsx src/components/layout/AdminSidebar.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "/admin/documents" src/main.tsx` returns 1
    - `grep -c "AdminDocumentsQueue" src/main.tsx` returns ≥ 2 (import + element)
    - `grep -c "/admin/documents" src/components/layout/AdminSidebar.tsx` returns 1
    - `grep -c "Documents" src/components/layout/AdminSidebar.tsx` returns ≥ 1 (label)
    - `grep -c "FileText" src/components/layout/AdminSidebar.tsx` returns ≥ 2 (import + icon usage)
    - AdminSidebar items order: Employers → Seekers → Documents → Jobs (verified by `grep -A8 "const adminItems" src/components/layout/AdminSidebar.tsx`)
    - `pnpm exec tsc -b` exits 0 OR only pre-existing errors
  </acceptance_criteria>

  <done>
    /admin/documents reachable from sidebar + URL. Phase 20.1 AdminGate at /admin unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Flip remaining admin-doc-queue .todo (email-side-effect) to GREEN with RTL render test</name>
  <files>tests/admin-doc-queue.test.tsx</files>

  <read_first>
    - tests/admin-doc-queue.test.tsx (post plan 21-02 — has 1 remaining it.todo for email side-effect)
    - src/pages/admin/AdminDocumentsQueue.tsx (Task 1 — the SUT)
    - tests/admin-employer-list.test.ts (canonical AdminTable + vi.hoisted rpc/fn mock pattern)
  </read_first>

  <action>
**File — tests/admin-doc-queue.test.tsx**:

Add a new `describe` block at the end of the file for the RTL render-and-click test that ties together the queue page's action button → RPC → email function chain. This flips the 1 remaining `.todo` and adds an end-to-end-shape test.

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// vi.hoisted is required because AdminDocumentsQueue statically imports @/lib/supabase
// (transitively pulled before mock setup). Pattern: Phase 18.1-02 STATE.
const { rpcHoist, invokeHoist } = vi.hoisted(() => ({
  rpcHoist: vi.fn(),
  invokeHoist: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcHoist,
    functions: { invoke: invokeHoist },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

describe('AdminDocumentsQueue end-to-end action dispatch (DOC-QUEUE-02 email side-effect)', () => {
  beforeEach(() => {
    rpcHoist.mockReset()
    invokeHoist.mockReset()
    invokeHoist.mockResolvedValue({ data: { sent: true }, error: null })
  })

  it('DOC-QUEUE-02: Approve click → admin_approve_document RPC → send-document-status-email invoke', async () => {
    rpcHoist.mockImplementation((fn: string) => {
      if (fn === 'admin_list_document_queue') {
        return Promise.resolve({
          data: { rows: [{
            document_id: 'doc-1',
            seeker_user_id: 'usr-1',
            seeker_name: 'Jane Doe',
            document_type: 'cv',
            filename: 'jane-cv.pdf',
            uploaded_at: '2026-05-15T10:00:00Z',
            status: 'pending',
            rejection_reason: null,
          }], total: 1 },
          error: null,
        })
      }
      if (fn === 'admin_approve_document') {
        return Promise.resolve({ data: { ok: true, document_id: 'doc-1', status: 'approved' }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { AdminDocumentsQueue } = await import('@/pages/admin/AdminDocumentsQueue')
    render(<MemoryRouter><AdminDocumentsQueue /></MemoryRouter>)

    // Wait for table row to render
    await waitFor(() => expect(screen.getByText('jane-cv.pdf')).toBeInTheDocument())

    const approveBtn = screen.getByRole('button', { name: /approve document/i })
    fireEvent.click(approveBtn)

    await waitFor(() => {
      const approveCall = rpcHoist.mock.calls.find(c => c[0] === 'admin_approve_document')
      expect(approveCall).toBeTruthy()
      expect(approveCall![1]).toEqual({ p_document_id: 'doc-1' })
    })

    await waitFor(() => {
      expect(invokeHoist).toHaveBeenCalledWith('send-document-status-email', {
        body: { document_id: 'doc-1', action: 'approved' },
      })
    })
  })

  it('DOC-QUEUE-02: Reject flow requires reason; submitting empty shows toast.error and does NOT call RPC', async () => {
    rpcHoist.mockImplementation((fn: string) => {
      if (fn === 'admin_list_document_queue') {
        return Promise.resolve({
          data: { rows: [{
            document_id: 'doc-1', seeker_user_id: 'u1', seeker_name: 'Jane',
            document_type: 'cv', filename: 'cv.pdf', uploaded_at: '2026-05-15T10:00:00Z',
            status: 'pending', rejection_reason: null,
          }], total: 1 },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { AdminDocumentsQueue } = await import('@/pages/admin/AdminDocumentsQueue')
    render(<MemoryRouter><AdminDocumentsQueue /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('cv.pdf')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /reject document/i }))

    // Reason input + Confirm button surface
    const confirm = await screen.findByRole('button', { name: /confirm reject/i })
    fireEvent.click(confirm)

    // No admin_reject_document RPC call expected because reason was empty
    await waitFor(() => {
      const rejectCall = rpcHoist.mock.calls.find(c => c[0] === 'admin_reject_document')
      expect(rejectCall).toBeUndefined()
    })
  })
})
```

Remove the now-superseded `it.todo` from the earlier `describe('admin doc queue action dispatch (DOC-QUEUE-02)', ...)` block.

Note: `vi.hoisted` is required at top of file. If the existing file's `const rpcMock = vi.fn()` declaration outside `vi.hoisted` works for shape-contract tests (because those use `await import('@/lib/supabase')` lazy import), the new RTL render tests above need `vi.hoisted` (because AdminDocumentsQueue is statically imported into the test file before the mock is set up). Co-existence pattern from STATE Phase 17-02/18.1-02. Keep both — the lazy-imported shape tests continue to use `rpcMock`; the RTL render tests use `rpcHoist` (separately hoisted).

Alternative (cleaner): consolidate both mocks under vi.hoisted. Pick whichever passes faster; defer to executor judgement.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/admin-doc-queue.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `pnpm exec vitest run tests/admin-doc-queue.test.tsx` exits 0
    - Test summary shows ≥ 9 passing (7 from plan 21-02 + 2 new RTL render)
    - `grep -c "it.todo" tests/admin-doc-queue.test.tsx` returns 0 (all flipped)
    - `grep -c "invokeHoist\|functions.invoke" tests/admin-doc-queue.test.tsx` returns ≥ 2 (email side-effect asserted)
    - Full suite green: `pnpm exec vitest run` exits 0
  </acceptance_criteria>

  <done>
    All admin-doc-queue.test.tsx assertions GREEN. End-to-end click → RPC → email shape contract enforced. Atomic commit with Tasks 1+2.
  </done>
</task>

</tasks>

<verification>
1. AdminDocumentsQueue page renders, lists rows, dispatches 3 actions
2. /admin/documents reachable from URL + AdminSidebar
3. Sibling Rule 1 edit removed X-Webhook-Secret from email function; test updated
4. End-to-end RTL test asserts: click Approve → RPC `admin_approve_document` → invoke `send-document-status-email`
5. Full suite green; tsc clean
</verification>

<success_criteria>
- /admin/documents reachable and functional
- 3 admin actions wire to RPCs + email function
- AdminSidebar shows "Documents" between Seekers and Jobs
- ≥ 9 admin-doc-queue.test.tsx assertions GREEN
- Atomic commit: `feat(21-07): admin documents queue page + nav + email wire (Track B)`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-07-SUMMARY.md` capturing:
- AdminDocumentsQueue line count
- Sibling edits to send-document-status-email + test (Rule 1 protocol — secret cannot live in browser)
- AdminSidebar position confirmation (Seekers → Documents → Jobs)
- Test counts (≥ 9 admin-doc-queue assertions GREEN, plus 10/10 send-document-status-email static-source GREEN with updated assertion)
- Pointer forward to Wave 5 plan 21-08 (DocumentsVerifiedBadge — separate concern, independent file)
- Pointer forward to Wave 6 plan 21-09 (operator deploy + UAT for the full doc-queue flow including email side-effect with RESEND_API_KEY check)
</output>
