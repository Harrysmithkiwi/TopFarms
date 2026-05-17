---
phase: 21-v20-close-post-launch-ops
plan: 02
type: execute
wave: 2
depends_on: [00, 01]
files_modified:
  - supabase/migrations/033_admin_doc_rpcs.sql
  - tests/admin-doc-queue.test.tsx
autonomous: false
requirements:
  - DOC-QUEUE-01
  - DOC-QUEUE-02
  - DOC-QUEUE-RPC-GATE
must_haves:
  truths:
    - "4 admin doc RPCs exist as SECURITY DEFINER functions: admin_list_document_queue, admin_approve_document, admin_reject_document, admin_request_more_info"
    - "Every RPC begins with PERFORM public._admin_gate() — non-admin callers get 'Forbidden: admin role required'"
    - "All 3 mutation RPCs write an admin_audit_log row before returning"
    - "admin_list_document_queue returns pending-first then newest, with seeker name joined"
    - "admin_reject_document requires non-empty p_reason; raises EXCEPTION otherwise"
  artifacts:
    - path: "supabase/migrations/033_admin_doc_rpcs.sql"
      provides: "4 SECURITY DEFINER RPCs + DO $verify$ post-state"
      contains: "CREATE OR REPLACE FUNCTION public.admin_approve_document"
    - path: "tests/admin-doc-queue.test.tsx"
      provides: "Shape-contract assertions flipped from .todo to real"
      contains: "rpcMock.mockResolvedValueOnce"
  key_links:
    - from: "supabase/migrations/033_admin_doc_rpcs.sql"
      to: "supabase/migrations/023_admin_rpcs.sql"
      via: "PERFORM public._admin_gate() helper inherited from 023"
      pattern: "PERFORM public._admin_gate\\(\\)"
    - from: "supabase/migrations/033_admin_doc_rpcs.sql"
      to: "supabase/migrations/032_doc_verification_queue.sql"
      via: "UPDATE seeker_documents SET status/rejection_reason"
      pattern: "UPDATE public.seeker_documents"
    - from: "supabase/migrations/033_admin_doc_rpcs.sql"
      to: "admin_audit_log table from 023"
      via: "INSERT into admin_audit_log inside every mutation"
      pattern: "INSERT INTO public.admin_audit_log"
---

<objective>
Wave 2 — Migration 033 adds 4 SECURITY DEFINER admin RPCs for the doc verification queue, following the canonical template from migration 023 (`PERFORM public._admin_gate()` first, then operation, then audit log write for mutations). Wave 0's admin-doc-queue test stubs get flipped from `.todo` to real shape-contract assertions.

Purpose: Wave 5's `AdminDocumentsQueue` page calls these RPCs via `supabase.rpc(... as never)` (the Phase 20-05 STATE workaround for Studio-applied RPCs not in the supabase-js type union). No direct PostgREST writes to seeker_documents — admin path is exclusively RPCs (RESEARCH §"Don't Hand-Roll" + ADMIN-RLS-NEG-1/2 baseline preservation).

Output: Migration 033 applied via Studio; 4 RPCs verified via MCP (prosecdef=true); admin-doc-queue.test.tsx GREEN.
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
@supabase/migrations/023_admin_rpcs.sql
@supabase/migrations/032_doc_verification_queue.sql
@tests/admin-doc-queue.test.tsx

<!--
LOCKED DECISION: SECURITY DEFINER RPC pattern per CONTEXT.md Constraints (admin RPCs follow 023 template)
LOCKED DECISION: Request More Info sets status='needs_resubmission' (RESEARCH §Pattern 7 — distinct status, blue Tag in queue)
LOCKED DECISION: Apply via Studio per CLAUDE §2; --read-only MCP stays ON
LOCKED DECISION: NO widening of RLS on seeker_documents — admin path is RPC-only (ADMIN-RLS-NEG-1/2 baseline must not drift)
-->

<interfaces>
From supabase/migrations/023_admin_rpcs.sql (canonical template):
- public._admin_gate() — SECURITY DEFINER, STABLE, raises 'Not authenticated' (NULL uid) or 'Forbidden: admin role required' (role != 'admin')
- admin_set_user_active(p_user_id uuid, p_active boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
  Pattern: DECLARE v_caller_id uuid := auth.uid(); BEGIN PERFORM public._admin_gate(); ... UPDATE ...; INSERT INTO public.admin_audit_log (...) VALUES (v_caller_id, action, target_table, target_id, payload); RETURN jsonb_build_object('ok', true, ...); END
- admin_audit_log columns: id, admin_id, action, target_table, target_id, payload (jsonb), created_at
- GRANT EXECUTE ON FUNCTION ... TO authenticated; (gate stops non-admins at runtime)

From supabase/migrations/032_doc_verification_queue.sql (Wave 1):
- public.seeker_documents.status text NOT NULL DEFAULT 'pending' CHECK (pending|approved|rejected|needs_resubmission)
- public.seeker_documents.rejection_reason text nullable
- seeker_documents_status_uploaded_at_idx on (status, uploaded_at DESC)

From public.seeker_documents joins (existing schema):
- seeker_documents.seeker_id → seeker_profiles.id → seeker_profiles.user_id → auth.users.id
- seeker_contacts.seeker_id → seeker_profiles.id; seeker_contacts.first_name, last_name, email exist (per admin_get_user_profile in 023 lines 512-528)

Wave 5 plan 21-07 expects these RPC shapes:
- admin_list_document_queue(p_limit int, p_offset int) → jsonb { rows: [{ document_id, seeker_user_id, seeker_name, document_type, filename, uploaded_at, status, rejection_reason }], total: int }
- admin_approve_document(p_document_id uuid) → jsonb { ok, document_id, status: 'approved' }
- admin_reject_document(p_document_id uuid, p_reason text) → jsonb { ok, document_id, status: 'rejected', reason }
- admin_request_more_info(p_document_id uuid) → jsonb { ok, document_id, status: 'needs_resubmission' }
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write migration 033 — 4 SECURITY DEFINER admin doc RPCs</name>
  <files>supabase/migrations/033_admin_doc_rpcs.sql</files>

  <read_first>
    - supabase/migrations/023_admin_rpcs.sql (full file — _admin_gate template at line 77-92; admin_set_user_active mutation template at line 544-579; admin_add_note template at line 581-end)
    - supabase/migrations/032_doc_verification_queue.sql (status column shape — must match CHECK values)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pattern 2 (exact 4-RPC template with audit log writes)
    - CLAUDE.md §3 (diagnose before fix — RPC error message wording matters; non-admin sees "Forbidden: admin role required" verbatim per _admin_gate)
  </read_first>

  <behavior>
    - 4 functions exist after apply: admin_list_document_queue, admin_approve_document, admin_reject_document, admin_request_more_info
    - All 4 have prosecdef=true (SECURITY DEFINER set)
    - All 4 start with PERFORM public._admin_gate() — non-admin callers get exception 'Forbidden: admin role required'
    - admin_list_document_queue reads with ORDER BY (CASE WHEN status='pending' THEN 0 ELSE 1 END), uploaded_at DESC and returns { rows, total }
    - admin_approve_document sets status='approved', clears rejection_reason, writes audit row
    - admin_reject_document requires p_reason IS NOT NULL AND length(trim(p_reason)) > 0 — raises EXCEPTION 'Rejection reason cannot be empty' otherwise; sets status='rejected', rejection_reason=p_reason; writes audit row
    - admin_request_more_info sets status='needs_resubmission'; writes audit row
    - All 3 mutation RPCs raise EXCEPTION 'Document not found: %' (sqlstate P0002 equivalent via IF NOT FOUND) if p_document_id doesn't exist
    - DO $verify$ block at end of migration: 4 functions present + all 4 prosecdef=true OR raise EXCEPTION
  </behavior>

  <action>
**File — supabase/migrations/033_admin_doc_rpcs.sql** (new, ~250 lines):

```sql
-- ============================================================
-- 033_admin_doc_rpcs.sql
-- TopFarms — Phase 21 Doc Verification Queue (Track B)
--
-- Four SECURITY DEFINER admin RPCs for the /admin/documents queue:
--   - admin_list_document_queue(p_limit, p_offset) — paginated list, pending-first
--   - admin_approve_document(p_document_id) — sets status='approved', clears reason
--   - admin_reject_document(p_document_id, p_reason) — sets status='rejected' + reason
--   - admin_request_more_info(p_document_id) — sets status='needs_resubmission'
--
-- All follow the canonical 023_admin_rpcs.sql template:
--   - SECURITY DEFINER + STABLE (read) or VOLATILE default (mutations)
--   - SET search_path = public
--   - PERFORM public._admin_gate() as first body statement
--   - Mutations: write admin_audit_log row BEFORE returning
--   - GRANT EXECUTE TO authenticated (gate stops non-admins at runtime)
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2). Wave 5 plan 21-07's
-- AdminDocumentsQueue page consumes these via supabase.rpc(... as never)
-- per Phase 20-05 STATE workaround (Studio-applied RPCs not in generated
-- function-name union).
-- ============================================================

BEGIN;

-- ============================================================
-- 3.1 admin_list_document_queue — paginated read
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_document_queue(
  p_limit  int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM public.seeker_documents;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      sd.id            AS document_id,
      sp.user_id       AS seeker_user_id,
      COALESCE(sc.first_name || ' ' || sc.last_name, sc.email, 'Unknown') AS seeker_name,
      sd.document_type,
      sd.filename,
      sd.uploaded_at,
      sd.status,
      sd.rejection_reason
    FROM public.seeker_documents sd
    JOIN public.seeker_profiles sp ON sp.id = sd.seeker_id
    LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
    ORDER BY
      CASE WHEN sd.status = 'pending' THEN 0 ELSE 1 END,
      sd.uploaded_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_document_queue(int, int) TO authenticated;

-- ============================================================
-- 3.2 admin_approve_document
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_document(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
BEGIN
  PERFORM public._admin_gate();

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'approved', rejection_reason = NULL
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'approve_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'approved')
  );

  RETURN jsonb_build_object('ok', true, 'document_id', p_document_id, 'status', 'approved');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_document(uuid) TO authenticated;

-- ============================================================
-- 3.3 admin_reject_document — requires non-empty reason
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_document(
  p_document_id uuid,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
  v_clean     text;
BEGIN
  PERFORM public._admin_gate();

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason cannot be empty';
  END IF;
  v_clean := trim(p_reason);

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'rejected', rejection_reason = v_clean
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'reject_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'rejected', 'reason', v_clean)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'status', 'rejected',
    'reason', v_clean
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reject_document(uuid, text) TO authenticated;

-- ============================================================
-- 3.4 admin_request_more_info — sets needs_resubmission state
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_request_more_info(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
BEGIN
  PERFORM public._admin_gate();

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'needs_resubmission', rejection_reason = NULL
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'request_more_info_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'needs_resubmission')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'status', 'needs_resubmission'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_request_more_info(uuid) TO authenticated;

-- ============================================================
-- 4. Atomic post-state verification
-- ============================================================
DO $verify$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_list_document_queue',
        'admin_approve_document',
        'admin_reject_document',
        'admin_request_more_info'
      )
      AND p.prosecdef = true;
  IF v_count != 4 THEN
    RAISE EXCEPTION 'Verify failed: expected 4 SECURITY DEFINER admin doc RPCs, got %', v_count;
  END IF;
END
$verify$;

COMMIT;
```

Operator applies via Studio (CLAUDE §2). MCP verify per acceptance criteria below.
  </action>

  <verify>
    <automated>grep -c "CREATE OR REPLACE FUNCTION public.admin_" supabase/migrations/033_admin_doc_rpcs.sql</automated>
  </verify>

  <acceptance_criteria>
    - `ls supabase/migrations/033_admin_doc_rpcs.sql` exits 0
    - `grep -c "CREATE OR REPLACE FUNCTION public.admin_" supabase/migrations/033_admin_doc_rpcs.sql` returns 4
    - `grep -c "PERFORM public._admin_gate()" supabase/migrations/033_admin_doc_rpcs.sql` returns 4 (one per RPC)
    - `grep -c "INSERT INTO public.admin_audit_log" supabase/migrations/033_admin_doc_rpcs.sql` returns 3 (one per mutation RPC)
    - `grep -c "SECURITY DEFINER" supabase/migrations/033_admin_doc_rpcs.sql` returns 4
    - `grep -c "GRANT EXECUTE ON FUNCTION public.admin_" supabase/migrations/033_admin_doc_rpcs.sql` returns 4
    - `grep "needs_resubmission" supabase/migrations/033_admin_doc_rpcs.sql` returns ≥ 2 (RPC body + DO $verify$ doesn't necessarily mention; ≥ 2 from body + COMMENT acceptable)
    - `grep "Rejection reason cannot be empty" supabase/migrations/033_admin_doc_rpcs.sql` exit 0
    - `grep "Document not found:" supabase/migrations/033_admin_doc_rpcs.sql` exit 0
    - File does NOT contain `auth.getUser` or any non-_admin_gate role check (single source of truth per §"Don't Hand-Roll")
  </acceptance_criteria>

  <done>
    Migration 033 file written. Ready for operator Studio apply in Task 2.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Apply migration 033 via Studio + MCP RPC verification</name>
  <files>(operator-only — Studio + MCP)</files>

  <read_first>
    - CLAUDE.md §1 + §2 (project ref + Studio preference)
    - supabase/migrations/033_admin_doc_rpcs.sql (paste verbatim)
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
    Migration 033 file on disk (Task 1). Apply step is operator-owned per CLAUDE §2.
  </what-built>

  <how-to-verify>
1. **Verify MCP project ref:** `mcp__supabase__list_projects` → confirm `inlagtgpynemhipnqvty`

2. **Apply via Studio:** SQL Editor → paste contents of `supabase/migrations/033_admin_doc_rpcs.sql` → Run. Expected: success; DO $verify$ block passes silently.

3. **MCP read-only verification:**

   3a. Confirm 4 RPCs exist with prosecdef=true:
   ```
   mcp__supabase__execute_sql "SELECT p.proname, p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_list_document_queue','admin_approve_document','admin_reject_document','admin_request_more_info') ORDER BY p.proname"
   ```
   Expected: 4 rows; all prosecdef=true.

   3b. Confirm GRANT EXECUTE to authenticated:
   ```
   mcp__supabase__execute_sql "SELECT routine_name, grantee, privilege_type FROM information_schema.role_routine_grants WHERE routine_schema='public' AND routine_name IN ('admin_list_document_queue','admin_approve_document','admin_reject_document','admin_request_more_info') AND grantee='authenticated' ORDER BY routine_name"
   ```
   Expected: 4 rows (one EXECUTE grant per RPC).

   3c. Smoke-test admin_list_document_queue via service role (read-only, returns empty rows on dev DB but verifies the function exists and is callable). Use:
   ```
   mcp__supabase__execute_sql "SELECT public.admin_list_document_queue(5, 0)"
   ```
   - If MCP runs as service role: function bypasses _admin_gate (auth.uid() is NULL → RAISES 'Not authenticated'). Expected output: ERROR with message 'Not authenticated'. This is GOOD — proves the gate fires. If MCP runs with elevated auth.uid() of an admin user, expected output is jsonb `{"rows": [...], "total": N}` — also fine.
   - Hard fail: ANY OTHER ERROR (e.g., function not found, type mismatch, syntax error in function body). Report verbatim and stop.

4. **Resume signal:** Paste MCP outputs from 3a-3c. Type `applied` (or `failed: <reason>`).
  </how-to-verify>

  <resume-signal>Paste MCP outputs from steps 3a-3c, then type `applied` (or describe `failed: <reason>`)</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Flip tests/admin-doc-queue.test.tsx from .todo to GREEN shape-contract</name>
  <files>tests/admin-doc-queue.test.tsx</files>

  <read_first>
    - tests/admin-doc-queue.test.tsx (Wave 0 stubs — flip in place)
    - tests/admin-suspend.test.ts (canonical shape-contract test pattern with rpcMock + lazy import)
    - supabase/migrations/033_admin_doc_rpcs.sql (Task 1 — RPC argument names + return shape; must match assertions)
  </read_first>

  <action>
Replace `it.todo(...)` assertions in `tests/admin-doc-queue.test.tsx` with real bodies that verify (a) supabase.rpc is called with the correct function name + arg shape and (b) the response shape matches what Wave 5's AdminDocumentsQueue page will consume. Keep the same describe blocks + test IDs from Wave 0.

For DOC-QUEUE-01 (admin_list_document_queue shape):

```typescript
describe('admin_list_document_queue RPC shape (DOC-QUEUE-01)', () => {
  it('DOC-QUEUE-01: admin_list_document_queue called with { p_limit, p_offset } returns { rows: [...], total }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        rows: [{
          document_id: 'doc-1',
          seeker_user_id: 'usr-1',
          seeker_name: 'Jane Doe',
          document_type: 'cv',
          filename: 'cv.pdf',
          uploaded_at: '2026-05-15T10:00:00Z',
          status: 'pending',
          rejection_reason: null,
        }],
        total: 1,
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_list_document_queue', { p_limit: 25, p_offset: 0 } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_list_document_queue', { p_limit: 25, p_offset: 0 })
    expect(result.data).toMatchObject({ rows: expect.any(Array), total: expect.any(Number) })
    expect((result.data as any).rows[0]).toMatchObject({
      document_id: expect.any(String),
      seeker_user_id: expect.any(String),
      seeker_name: expect.any(String),
      document_type: expect.any(String),
      filename: expect.any(String),
      uploaded_at: expect.any(String),
      status: expect.any(String),
    })
  })

  it('DOC-QUEUE-01: rows ordered pending first per RPC ORDER BY contract', async () => {
    // Shape-only assertion — actual ordering verified server-side in plan 21-02 migration
    rpcMock.mockResolvedValueOnce({
      data: { rows: [
        { document_id: 'd1', status: 'pending', uploaded_at: '2026-05-10T00:00:00Z' },
        { document_id: 'd2', status: 'approved', uploaded_at: '2026-05-15T00:00:00Z' },
      ], total: 2 },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_list_document_queue', { p_limit: 25, p_offset: 0 } as never)
    const rows = (result.data as any).rows
    expect(rows[0].status).toBe('pending')
  })
})
```

For DOC-QUEUE-02 (action dispatch — keep it.todo for end-to-end UI flow tests since AdminDocumentsQueue doesn't exist until Wave 5; flip ONLY the RPC contract tests):

```typescript
describe('admin doc queue action dispatch (DOC-QUEUE-02)', () => {
  it('DOC-QUEUE-02: admin_approve_document called with { p_document_id } returns { ok, status: "approved" }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'approved' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_approve_document', { p_document_id: 'doc-1' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_approve_document', { p_document_id: 'doc-1' })
    expect(result.data).toMatchObject({ ok: true, status: 'approved' })
  })

  it('DOC-QUEUE-02: admin_reject_document called with { p_document_id, p_reason } returns { ok, status: "rejected", reason }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'rejected', reason: 'illegible' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_reject_document', { p_document_id: 'doc-1', p_reason: 'illegible' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_reject_document', { p_document_id: 'doc-1', p_reason: 'illegible' })
    expect(result.data).toMatchObject({ ok: true, status: 'rejected', reason: 'illegible' })
  })

  it('DOC-QUEUE-02: admin_request_more_info called with { p_document_id } returns { ok, status: "needs_resubmission" }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: true, document_id: 'doc-1', status: 'needs_resubmission' },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_request_more_info', { p_document_id: 'doc-1' } as never)
    expect(rpcMock).toHaveBeenCalledWith('admin_request_more_info', { p_document_id: 'doc-1' })
    expect(result.data).toMatchObject({ ok: true, status: 'needs_resubmission' })
  })

  it('DOC-QUEUE-02: non-admin caller (forbidden) surfaces "Forbidden" error', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_approve_document', { p_document_id: 'doc-1' } as never)
    expect(error?.message).toContain('Forbidden')
  })

  it('DOC-QUEUE-02: rejected document with empty reason surfaces "Rejection reason cannot be empty"', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rejection reason cannot be empty' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_reject_document', { p_document_id: 'doc-1', p_reason: '' } as never)
    expect(error?.message).toContain('Rejection reason cannot be empty')
  })

  // Keep the email-side-effect as it.todo — UI flow + email dispatch is Wave 5 plan 21-07's job
  it.todo('DOC-QUEUE-02: AdminDocumentsQueue page invokes supabase.functions.invoke("send-document-status-email") after successful RPC (Wave 5)')
})
```

Update `tests/documents-verified-badge.test.tsx` — keep all 4 as `.todo` (Wave 5 plan 21-08 implements the badge).
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/admin-doc-queue.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `pnpm exec vitest run tests/admin-doc-queue.test.tsx` exits 0
    - Test summary shows ≥ 7 passing (2 list + 5 action) and 1 todo (email side-effect)
    - `grep -c "rpcMock.mockResolvedValueOnce" tests/admin-doc-queue.test.tsx` returns ≥ 7
    - `grep -c "as never" tests/admin-doc-queue.test.tsx` returns ≥ 7 (Phase 20-05 STATE convention)
    - `grep "Forbidden" tests/admin-doc-queue.test.tsx` exit 0
    - `grep "Rejection reason cannot be empty" tests/admin-doc-queue.test.tsx` exit 0
    - Full suite green: `pnpm exec vitest run` exits 0
  </acceptance_criteria>

  <done>
    admin-doc-queue.test.tsx flipped to GREEN shape-contract for all 4 RPCs (1 list + 3 mutation + 2 negative). One it.todo remains for Wave 5 email side-effect. Full suite green.
  </done>
</task>

</tasks>

<verification>
1. Migration 033 on disk + applied (MCP-verified)
2. 4 RPCs exist with prosecdef=true (MCP `pg_proc` query)
3. EXECUTE granted to authenticated (MCP `role_routine_grants`)
4. _admin_gate fires for unauthenticated/non-admin callers (smoke test in Task 2)
5. Shape-contract tests GREEN
6. No widening of seeker_documents RLS (admin path = RPC-only)
</verification>

<success_criteria>
- 4 SECURITY DEFINER admin doc RPCs live on prod DB
- shape-contract tests in tests/admin-doc-queue.test.tsx GREEN (≥ 7 passing)
- atomic commit: `feat(21-02): migration 033 — 4 admin doc verification RPCs + shape tests`
- Wave 5 plan 21-07 can call these via supabase.rpc with confidence
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-02-SUMMARY.md` capturing:
- Migration 033 file + Studio-apply confirmation
- MCP outputs from Task 2 step 3 (verbatim)
- Test flip count (X todos → Y assertions)
- Confirmation no PostgREST direct writes to seeker_documents added (admin path = RPC-only per ADMIN-RLS-NEG-1/2 baseline)
- Pointer forward to Wave 5 plan 21-07
</output>
