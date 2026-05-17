---
phase: 21-v20-close-post-launch-ops
plan: 01
type: execute
wave: 1
depends_on: [00]
files_modified:
  - supabase/migrations/032_doc_verification_queue.sql
  - src/types/domain.ts
autonomous: false
requirements:
  - DOC-QUEUE-SCHEMA-01
  - DOC-QUEUE-SCHEMA-02
  - DOC-QUEUE-SCHEMA-03
must_haves:
  truths:
    - "seeker_documents has status text NOT NULL DEFAULT 'pending' CHECK column"
    - "seeker_documents has rejection_reason text nullable column"
    - "Composite index (status, uploaded_at DESC) supports queue ordering"
    - "All existing seeker_documents rows have status='pending' after migration (explicit-review default per RESEARCH Open Q1)"
    - "TS SeekerDocument interface mirrors the new column shape"
  artifacts:
    - path: "supabase/migrations/032_doc_verification_queue.sql"
      provides: "Schema columns + index + DO $verify$ block"
      contains: "ALTER TABLE public.seeker_documents"
    - path: "src/types/domain.ts"
      provides: "SeekerDocument interface extension (status + rejection_reason)"
      contains: "status:"
  key_links:
    - from: "src/types/domain.ts"
      to: "supabase/migrations/032_doc_verification_queue.sql"
      via: "type union mirrors CHECK constraint"
      pattern: "'pending' \\| 'approved' \\| 'rejected' \\| 'needs_resubmission'"
    - from: "supabase/migrations/032_doc_verification_queue.sql"
      to: "supabase/migrations/019_seeker_documents.sql"
      via: "ALTER TABLE on table created in 019"
      pattern: "ALTER TABLE public.seeker_documents"
---

<objective>
Wave 1 — Migration 032 adds `status` + `rejection_reason` columns to `seeker_documents`, plus a composite `(status, uploaded_at DESC)` index to support the admin queue's "pending first, then newest" ordering. TS `SeekerDocument` interface is extended in lockstep.

Purpose: DB foundation for Wave 2 admin RPCs and Wave 5 admin queue page. Without these columns the queue has nothing to filter/sort on.

Output: Migration 032 applied via Supabase Studio (per CLAUDE §2 — preferred path for one-off DB writes; avoids `--read-only` flag-flip restart cycle). MCP read-only verification confirms columns + index + row defaults.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@.planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md
@CLAUDE.md
@supabase/migrations/NAMING.md

<!--
LOCKED DECISION: DB change = status + rejection_reason on seeker_documents (CONTEXT.md "Doc verification queue")
LOCKED DECISION: status values pending | approved | rejected | needs_resubmission (RESEARCH §Pattern 7 — needs_resubmission for "Request More Info")
LOCKED DECISION: Only seeker_documents queued; employer docs auto-verify (deferred)
LOCKED DECISION: Apply via Supabase Studio SQL Editor per CLAUDE §2 (read-only MCP remains ON throughout this plan)
RESEARCH §Open Q1: existing rows default to 'pending' — explicit-review default (safer); operator can backfill 'approved' for pre-migration rows if volume becomes painful
-->

<interfaces>
From supabase/migrations/019_seeker_documents.sql (existing, current schema):
- Table public.seeker_documents columns: id, seeker_id, storage_path, document_type, filename, uploaded_at, file_size_bytes
- document_type CHECK constraint: ('cv', 'certificate', 'reference', 'identity', 'other')
- RLS enabled; SELECT/INSERT/UPDATE/DELETE policies use auth.uid() = (SELECT user_id FROM seeker_profiles WHERE id = seeker_id)

From src/types/domain.ts (current — lines 202-210):
```typescript
export interface SeekerDocument {
  id: string
  seeker_id: string
  storage_path: string
  document_type: DocumentType
  filename: string
  uploaded_at: string
  file_size_bytes: number | null
}
```

From supabase/migrations/022_fix_pg_net_http_post_signature.sql (precedent for DO $verify$ post-condition block):
```sql
DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ... WHERE ...) THEN
    RAISE EXCEPTION 'Verify failed: ...';
  END IF;
END
$verify$;
```

Next migration number: 032 (current highest: 031_rls_initplan_performance.sql per `ls supabase/migrations/`)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write migration 032 SQL + extend SeekerDocument TS interface</name>
  <files>supabase/migrations/032_doc_verification_queue.sql, src/types/domain.ts</files>

  <read_first>
    - supabase/migrations/019_seeker_documents.sql (current seeker_documents schema; document_type CHECK pattern; RLS policy shape)
    - supabase/migrations/022_fix_pg_net_http_post_signature.sql (DO $verify$ EXCEPTION-rollback pattern — atomic post-state guard)
    - supabase/migrations/025_phase_18_1_fk_indexes.sql (CREATE INDEX IF NOT EXISTS idempotent pattern; Studio-apply note)
    - supabase/migrations/NAMING.md (sequence-prefix disk convention)
    - src/types/domain.ts (lines 180-211 — SeekerDocument + DocumentType + DOCUMENT_TYPE_LABELS)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §"Migration 032 Schema" + §"Pitfall 2"
  </read_first>

  <behavior>
    - Column status: text NOT NULL DEFAULT 'pending' with CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission'))
    - Column rejection_reason: text nullable, no default
    - Index seeker_documents_status_uploaded_at_idx ON (status, uploaded_at DESC) — supports queue ordering with pending-first sort
    - All existing rows: status defaults to 'pending' (explicit-review per RESEARCH Open Q1 default)
    - Migration is idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
    - DO $verify$ block at end raises EXCEPTION if status column missing OR if any row has status NOT IN the 4 allowed values
    - TS SeekerDocument interface gains `status: 'pending' | 'approved' | 'rejected' | 'needs_resubmission'` and `rejection_reason: string | null`
  </behavior>

  <action>
**File 1 — supabase/migrations/032_doc_verification_queue.sql** (new file, ~50 lines):

```sql
-- ============================================================
-- 032_doc_verification_queue.sql
-- TopFarms — Phase 21 Doc Verification Queue (Track B)
--
-- Adds review-state columns to seeker_documents so admin can approve/reject/
-- request-more-info on seeker uploads:
--   - status text NOT NULL DEFAULT 'pending' CHECK (4 values)
--   - rejection_reason text nullable
--   - composite index (status, uploaded_at DESC) — supports admin queue ordering
--
-- Existing rows default to 'pending' (RESEARCH §Pitfall 2 + Open Q1 — safer
-- default; operator can backfill 'approved' post-migration if volume is large).
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2 — preferred path; avoids
-- the --read-only MCP flag-flip restart cycle). Studio-applied migrations
-- don't write supabase_migrations.schema_migrations rows — verify via the
-- DO $verify$ block below and information_schema queries post-apply.
--
-- Wave 2 plan 21-02 will add 4 SECURITY DEFINER RPCs that read/write these
-- columns through the admin_* gateway pattern.
-- ============================================================

BEGIN;

-- 1. Add status column with CHECK constraint
ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CONSTRAINT seeker_documents_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission'));

COMMENT ON CONSTRAINT seeker_documents_status_check ON public.seeker_documents IS
  'Document review workflow states. pending=awaiting review; approved=verified (employer-visible badge); rejected=rejected with reason; needs_resubmission=admin requested seeker re-upload.';

-- 2. Add rejection_reason column (nullable; populated only when status='rejected')
ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.seeker_documents.rejection_reason IS
  'Admin-supplied reason when status=rejected. NULL otherwise. Surfaced to seeker via send-document-status-email Edge Function.';

-- 3. Composite index for admin queue ordering (pending first, then newest)
--    Used by admin_list_document_queue RPC (wave 2 plan 21-02). Plain CREATE
--    INDEX (not CONCURRENTLY) — Studio wraps DDL in implicit transaction;
--    CONCURRENTLY cannot run inside a transaction. Pre-launch volume makes
--    millisecond build time acceptable (mirrors plan 18.1-01 SC-6 decision).
CREATE INDEX IF NOT EXISTS seeker_documents_status_uploaded_at_idx
  ON public.seeker_documents (status, uploaded_at DESC);

-- 4. Atomic post-state verification — rollback BEGIN/COMMIT on drift
DO $verify$
DECLARE
  v_status_col_count int;
  v_reason_col_count int;
  v_index_count int;
  v_bad_status_count int;
BEGIN
  -- 4a. Column 'status' exists with NOT NULL + DEFAULT
  SELECT count(*) INTO v_status_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seeker_documents'
      AND column_name = 'status'
      AND is_nullable = 'NO'
      AND column_default = '''pending''::text';
  IF v_status_col_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents.status column missing or wrong shape (count=%)', v_status_col_count;
  END IF;

  -- 4b. Column 'rejection_reason' exists nullable
  SELECT count(*) INTO v_reason_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seeker_documents'
      AND column_name = 'rejection_reason';
  IF v_reason_col_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents.rejection_reason missing (count=%)', v_reason_col_count;
  END IF;

  -- 4c. Composite index present
  SELECT count(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'seeker_documents'
      AND indexname = 'seeker_documents_status_uploaded_at_idx';
  IF v_index_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents_status_uploaded_at_idx missing (count=%)', v_index_count;
  END IF;

  -- 4d. All existing rows respect the CHECK constraint
  SELECT count(*) INTO v_bad_status_count
    FROM public.seeker_documents
    WHERE status NOT IN ('pending', 'approved', 'rejected', 'needs_resubmission');
  IF v_bad_status_count > 0 THEN
    RAISE EXCEPTION 'Verify failed: % rows have invalid status', v_bad_status_count;
  END IF;
END
$verify$;

COMMIT;
```

**File 2 — src/types/domain.ts** (modify SeekerDocument interface — lines 202-210):

Find the existing `SeekerDocument` interface:
```typescript
export interface SeekerDocument {
  id: string
  seeker_id: string
  storage_path: string
  document_type: DocumentType
  filename: string
  uploaded_at: string
  file_size_bytes: number | null
}
```

Replace with:
```typescript
/**
 * Phase 21 — adds review-state columns matching migration 032.
 * status: pending=awaiting admin review; approved=verified (Documents Verified badge);
 *         rejected=rejected with rejection_reason text; needs_resubmission=admin asked
 *         seeker to re-upload (RESEARCH §Pattern 7).
 * Mirrors the CHECK constraint on seeker_documents.status — if you add a value here,
 * also update migration 032's CHECK and all admin_* RPCs in plan 21-02's migration 033.
 */
export type SeekerDocumentStatus = 'pending' | 'approved' | 'rejected' | 'needs_resubmission'

export interface SeekerDocument {
  id: string
  seeker_id: string
  storage_path: string
  document_type: DocumentType
  filename: string
  uploaded_at: string
  file_size_bytes: number | null
  status: SeekerDocumentStatus
  rejection_reason: string | null
}
```

Do NOT modify any other interfaces in domain.ts. Do NOT touch DocumentUploader.tsx — new uploads will default to 'pending' via DB column default (no client change needed for Wave 1).

After both file writes, regenerate code: `pnpm exec tsc -b` must exit 0 (existing consumers of SeekerDocument don't read `status`/`rejection_reason` yet — TS additive change). If any TS error surfaces in unrelated files, it is out of scope (Rule 1 — known pre-existing per Phase 18.1-02 STATE).
  </action>

  <verify>
    <automated>pnpm exec tsc -b 2>&1 | tee /tmp/tsc-21-01.log; grep -c "error TS" /tmp/tsc-21-01.log || echo "0 tsc errors"</automated>
  </verify>

  <acceptance_criteria>
    - `ls supabase/migrations/032_doc_verification_queue.sql` exits 0
    - `grep -c "ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'" supabase/migrations/032_doc_verification_queue.sql` returns 1
    - `grep -c "needs_resubmission" supabase/migrations/032_doc_verification_queue.sql` returns ≥ 2 (CHECK + DO verify)
    - `grep -c "CREATE INDEX IF NOT EXISTS seeker_documents_status_uploaded_at_idx" supabase/migrations/032_doc_verification_queue.sql` returns 1
    - `grep -c "DO \\\$verify\\\$" supabase/migrations/032_doc_verification_queue.sql` returns 1
    - `grep -c "SeekerDocumentStatus" src/types/domain.ts` returns ≥ 2 (type def + interface field)
    - `grep -E "status: SeekerDocumentStatus" src/types/domain.ts` exit 0
    - `grep -E "rejection_reason: string \\| null" src/types/domain.ts` exit 0
    - `pnpm exec tsc -b` exits 0 OR only reports pre-existing errors documented in Phase 18.1-02 STATE (PlacementPipeline/SeekerList/MyApplications/JobDetail/EmployerOnboarding)
    - No changes to DocumentUploader.tsx (Wave 1 is schema-only): `git diff --name-only HEAD | grep -v -E "032_doc_verification_queue.sql|domain.ts"` returns empty
  </acceptance_criteria>

  <done>
    Migration 032 file written on disk; SeekerDocument interface extended with status + rejection_reason; tsc clean (or only pre-existing errors); ready for Studio apply in Task 2.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Apply migration 032 via Supabase Studio + MCP verification</name>
  <files>(no source files — operator runs Studio SQL Editor + MCP read-only verify)</files>

  <read_first>
    - CLAUDE.md §1 (project ref `inlagtgpynemhipnqvty` — verify before any Supabase MCP call)
    - CLAUDE.md §2 (Studio SQL Editor preferred for one-off DB writes; --read-only MCP stays ON)
    - supabase/migrations/032_doc_verification_queue.sql (just written by Task 1 — operator pastes this verbatim)
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
    Migration 032 file on disk; ready for production apply. Executor (claude side) has NOT touched the DB — operator owns the apply step.
  </what-built>

  <how-to-verify>
1. **Operator step 1: Verify MCP project ref** (CLAUDE §1):
   ```
   mcp__supabase__list_projects
   ```
   Confirm `inlagtgpynemhipnqvty` is listed and current.

2. **Operator step 2: Apply via Studio**
   - Open Supabase Studio for project `inlagtgpynemhipnqvty`
   - Navigate to SQL Editor → New query
   - Paste entire contents of `supabase/migrations/032_doc_verification_queue.sql`
   - Run
   - Expected: success with no notices (DO $verify$ block silently passes when all 4 sub-checks pass)
   - If `RAISE EXCEPTION` fires, the entire BEGIN/COMMIT rolls back — fix the underlying issue and re-run

3. **Operator step 3: MCP read-only verification** (after Studio apply succeeds):

   3a. Confirm status column shape:
   ```
   mcp__supabase__execute_sql "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='seeker_documents' AND column_name IN ('status','rejection_reason') ORDER BY column_name"
   ```
   Expected: 2 rows. `rejection_reason: text/YES/NULL`. `status: text/NO/'pending'::text`.

   3b. Confirm CHECK constraint:
   ```
   mcp__supabase__execute_sql "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='seeker_documents_status_check'"
   ```
   Expected: 1 row. Definition contains `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'needs_resubmission'::text]))` (or equivalent ANY-expansion form).

   3c. Confirm composite index:
   ```
   mcp__supabase__execute_sql "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='seeker_documents_status_uploaded_at_idx'"
   ```
   Expected: 1 row. Definition contains both `status` and `uploaded_at DESC`.

   3d. Confirm existing rows defaulted correctly:
   ```
   mcp__supabase__execute_sql "SELECT status, count(*) FROM public.seeker_documents GROUP BY status"
   ```
   Expected: all rows show `status='pending'` (RESEARCH §Open Q1 default).

4. **Resume signal:** Reply with the actual MCP outputs for steps 3a-3d, then `applied` (or `failed: <reason>`).
  </how-to-verify>

  <resume-signal>Paste MCP outputs from steps 3a-3d, then type `applied` (or describe `failed: <reason>`)</resume-signal>
</task>

</tasks>

<verification>
After Task 2 operator-confirms apply + MCP verification:

1. Migration 032 file committed (atomic per CLAUDE §4)
2. DB has both columns + index + correct defaults (MCP-verified)
3. TS interface mirrors the schema (tsc clean or only pre-existing errors)
4. No unrelated files modified

If MCP verification fails any sub-check, executor must STOP and surface — do NOT proceed to Wave 2.
</verification>

<success_criteria>
- supabase/migrations/032_doc_verification_queue.sql on disk + applied to live DB via Studio
- MCP `information_schema.columns` confirms `status` + `rejection_reason` columns exist with correct attributes
- MCP `pg_indexes` confirms `seeker_documents_status_uploaded_at_idx` exists
- MCP `pg_constraint` confirms `seeker_documents_status_check` CHECK constraint exists
- src/types/domain.ts SeekerDocument interface has `status` + `rejection_reason` fields
- Atomic commit: `feat(21-01): migration 032 — seeker_documents status + rejection_reason + queue index`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-01-SUMMARY.md` capturing:
- Migration file written + applied
- MCP verification outputs (verbatim, all 4 sub-checks)
- TS interface diff (lines changed)
- Studio-apply convention note (CLAUDE §2 — registry-rowless deployment per phase 17-01/18.1-06 precedent)
- Pointer forward to Wave 2 plan 21-02 (admin RPCs that read/write these columns)
</output>
