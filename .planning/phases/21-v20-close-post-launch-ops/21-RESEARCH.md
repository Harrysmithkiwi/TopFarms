# Phase 21: v2.0 Close + Post-Launch Ops — Research

**Researched:** 2026-05-16
**Domain:** Supabase Auth extension, SECURITY DEFINER admin RPCs, Edge Function signed-URL admin bypass, Resend email patterns, React route guarding
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**is_active blocking:**
- Enforcement layer: `ProtectedRoute` — AuthContext's `loadRole` fetches `is_active` alongside `role` from `user_roles`. If `is_active = false`, `ProtectedRoute` redirects to `/suspended` instead of the dashboard.
- Gate page route: `/suspended` — new unauthenticated-accessible route (user has a session but is blocked).
- Gate page message: "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz." Simple, no links into the app.
- Full gate: No access to any authenticated content while suspended. No partial views.
- Re-activation: Manual only — admin flips `is_active` back to `true` via the existing ProfileDrawer toggle. No self-service path.
- Existing infrastructure: `admin_set_user_active` RPC and ProfileDrawer toggle already exist and work. Only the client-side enforcement is missing.

**Doc verification queue:**
- Admin page: New route at `/admin/documents`.
- Queue displays per document: seeker name, document type, upload date, current status.
- Document preview: Link using `get-applicant-document-url` Edge Function — needs an admin bypass path.
- Three actions: Approve / Reject (with reason) / Request More Info.
- Seeker-visible outcome: "Documents Verified" badge visible to employers on applicant cards/panels.
- DB change required: Migration adds `status: 'pending' | 'approved' | 'rejected'` and `rejection_reason: text` to `seeker_documents`.
- Only seeker documents queued — employer docs continue to auto-verify.

**Smoke tests + PEND-01:**
- Five smoke tests (browser UAT) per CONTEXT.md §"Smoke tests + PEND-01".
- PEND-01: follow the 9-item checklist in `.planning/DECISIONS-PENDING.md` §PEND-01 exactly.
- "Done" definition for v2.0 close: all 5 smoke tests pass + SC-2 in 18.1-VERIFICATION.md flips to PASS. Then run `/gsd:complete-milestone v2.0`.

### Claude's Discretion

- Exact shape of `loadRole` return type extension (add `is_active` to existing outcome type vs separate fetch)
- Whether "Request More Info" sets a `needs_resubmission` status or leaves status as `pending`
- Styling and layout of the `/suspended` gate page (simple, consistent with existing auth pages)
- Admin document queue pagination and sort order (newest pending first recommended)
- Whether "Documents Verified" badge on seeker profile is a new component or reuses `VerificationBadge`

### Deferred Ideas (OUT OF SCOPE)

- Employer document review queue — employer docs currently auto-verify on upload
- Broadcast comms (bulk messaging to employers/seekers) — v2.1 candidate
- Moderation queue — deferred from MVP
- Advanced analytics — deferred from MVP
- JWT HS256→ES256 migration — recommend Phase 22
</user_constraints>

---

## Summary

Phase 21 has two concurrent tracks. Track A is a pure operator/UAT track — no new product code — covering the PEND-01 Stripe live-mode swap, five browser smoke tests, and a docs update to flip 18.1 SC-2 PARTIAL → PASS and run `/gsd:complete-milestone v2.0`. Track B adds two post-launch product features in code: an `is_active` login-blocking gate wired through `AuthContext` + `ProtectedRoute`, and an admin doc verification queue at `/admin/documents`.

The research confirms all the infrastructure needed for Track B already exists and is well-established in the codebase. `user_roles.is_active` is already a column (added in migration 023); `admin_set_user_active` already toggles it; the `_admin_gate()` + SECURITY DEFINER pattern from migration 023 is the model for the four new admin doc RPCs; the `send-followup-emails` Edge Function pattern is the correct model for a new `send-document-status-email` Edge Function (not reuse of the existing one — parameterisation cost vs a clean new function). The next migration number is 032.

The main open implementation choices (all within Claude's Discretion) are resolved below with recommendations: extend `loadRole` to return `is_active` within the existing `LoadRoleOutcome` type rather than a separate fetch; introduce a `needs_resubmission` status string for "Request More Info" (clear semantics, avoids ambiguity at the admin queue level); use a new admin-check branch inside the existing `get-applicant-document-url` Edge Function rather than a new RPC for signed URL generation; and use `VerificationBadge` as the visual model but implement a distinct `DocumentsVerifiedBadge` (different data — seeker doc status vs employer verification tier).

**Primary recommendation:** Implement Track B in three waves — (1) migration 032 for schema + admin doc RPCs, (2) `is_active` gate + `/suspended` page + `AuthContext` extension, (3) `/admin/documents` queue page + email Edge Function + employer-facing badge. Track A runs in parallel as a standalone operator-action plan.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | `@supabase/supabase-js@2` | DB queries, auth, RPC calls | Project-wide; already wired |
| React Router | v7 (createBrowserRouter) | Route registration, navigation | Project-wide; main.tsx |
| Vite + React | vite@5/react@18 | Build + component model | Established project stack |
| Vitest + RTL | vitest + @testing-library/react | Unit + component tests | Established Wave 0 pattern |
| Sonner | `sonner` | Toasts for admin actions | Already used in ProfileDrawer, MarkFilledModal |
| Lucide React | `lucide-react` | Icons (FileCheck2 candidate for badge) | Already used throughout; AdminSidebar imports from it |
| Resend (via fetch) | — | Transactional email | `send-followup-emails` pattern — fetch to api.resend.com |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Deno (Edge Fn runtime) | Deno 2.x | New Edge Function runtime | `send-document-status-email` follows `send-followup-emails` pattern |
| Supabase Studio SQL Editor | — | Migration apply | All migration applies per CLAUDE.md §2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `send-document-status-email` Edge Function | Extend `send-followup-emails` | `send-followup-emails` is tightly coupled to `placement_fees` query pattern; parameterising it adds complexity with no reuse benefit — a new ~80-line function is cleaner |
| Admin bypass inside existing `get-applicant-document-url` | New `admin-get-document-url` RPC returning signed URL | Modifying the existing function keeps the signed-URL logic in one place; the gateway-trust bypass pattern already handles role checks; adding an admin branch is 15 lines |

**Installation:** No new packages required. All dependencies are already in the project.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contexts/AuthContext.tsx           # extend loadRole to return is_active
├── components/layout/ProtectedRoute.tsx  # add is_active === false → /suspended
├── pages/
│   ├── auth/Suspended.tsx             # NEW gate page (unauthenticated-accessible)
│   └── admin/DocumentQueue.tsx        # NEW /admin/documents list page
├── components/
│   └── ui/DocumentsVerifiedBadge.tsx  # NEW simple badge for employer-facing surfaces
supabase/
├── migrations/032_doc_verification_queue.sql  # NEW status + rejection_reason + admin RPCs
└── functions/send-document-status-email/index.ts  # NEW Deno Edge Function
```

### Pattern 1: Extending `loadRole` to include `is_active`

**What:** Add `is_active: boolean` to the DB query inside `loadRole()` in `AuthContext.tsx`. Propagate through the existing `LoadRoleOutcome` type and the `AuthHookReturn` interface.

**When to use:** Every call to `loadRole` already goes to `user_roles`. Adding `.select('role, is_active')` is a zero-cost addition (same query, one extra column).

**Recommendation:** Extend the existing `LoadRoleOutcome` type to carry `is_active` alongside `role`:

```typescript
// In AuthContext.tsx — extend LoadRoleOutcome
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null; isActive: boolean }
  | { ok: false; reason: 'timeout' }

// loadRole change:
async function loadRole(userId: string): Promise<{ role: UserRole | null; isActive: boolean }> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', userId)
    .single()
  if (error || !data) return { role: null, isActive: true } // default true on error
  return { role: data.role as UserRole, isActive: data.is_active ?? true }
}
```

**Why `isActive: true` on error:** Defaulting to true on DB error means a transient failure does NOT incorrectly block a valid user. The only time `isActive` is false is when the DB row explicitly says so.

**AuthHookReturn extension:**
```typescript
export interface AuthHookReturn {
  // ...existing...
  isActive: boolean  // ADD: mirrors user_roles.is_active
}
```

**ProtectedRoute change (no requiredRole path must also check):**
```typescript
// After the existing role===null spinner guard:
if (session && isActive === false) {
  return <Navigate to="/suspended" replace />
}
```

**Race safety:** The `is_active` check must come AFTER the existing `loading` and `role===null` spinner guards, not before. This prevents a timing window where `isActive` is false during the `loadRoleWithTimeout` resolution before the session is fully established.

### Pattern 2: SECURITY DEFINER admin doc RPCs (migration 032)

**What:** Four new RPCs following the exact pattern from migration 023: `PERFORM public._admin_gate()` first, then operation, then audit log write for mutations.

**When to use:** All admin mutations to `seeker_documents` — approve, reject, request-more-info.

```sql
-- Source: supabase/migrations/023_admin_rpcs.sql pattern
-- Exact template used by admin_set_user_active (lines 544-579)

CREATE OR REPLACE FUNCTION public.admin_approve_document(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  PERFORM public._admin_gate();

  UPDATE public.seeker_documents
    SET status = 'approved', rejection_reason = NULL
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'approve_document', 'seeker_documents', p_document_id,
          jsonb_build_object('status_after', 'approved'));

  RETURN jsonb_build_object('ok', true, 'document_id', p_document_id, 'status', 'approved');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_document(uuid) TO authenticated;
```

**Four RPCs needed:**
1. `admin_list_pending_documents(p_limit, p_offset)` — returns paginated queue (seeker name, doc type, upload date, status) ordered by `uploaded_at DESC` with pending first
2. `admin_approve_document(p_document_id)` — sets `status='approved'`, clears `rejection_reason`, writes audit log
3. `admin_reject_document(p_document_id, p_reason)` — sets `status='rejected'`, sets `rejection_reason`, writes audit log
4. `admin_request_document_resubmission(p_document_id)` — sets `status='needs_resubmission'` (see open question 2 resolved below), writes audit log

### Pattern 3: Admin bypass in `get-applicant-document-url`

**What:** Add an admin check branch inside the existing Edge Function before the employer-only gate (layer 4). If the caller has `role='admin'`, skip all employer relationship checks and mint the signed URL directly.

**Why this approach over a new RPC:** The Edge Function already handles storage signed-URL generation and the BFIX-05 gateway-trust JWT pattern. An admin-only RPC returning a signed URL would need to call `supabase.storage.createSignedUrl()` — which is a Supabase client operation — inside a PL/pgSQL function, which is not possible. A separate `admin-get-document-url` Edge Function would just duplicate the JWT decode + storage client boilerplate.

**Implementation (add after layer 3 JWT decode, before layer 4 role check):**
```typescript
// Check admin early-exit — admin can view any document
if (roleRow?.role === 'admin') {
  // No relationship check needed for admin
  // Jump directly to document lookup + URL mint (steps 6-11)
  // Optionally skip identity exclusion check for admin (admin needs to see all types)
}
```

**Critical:** The BFIX-05 gateway-trust pattern (CLAUDE.md §5) applies here exactly as before — `verify_jwt: true`, decode JWT locally, do NOT call `adminClient.auth.getUser(token)`. The admin check is purely `roleRow?.role === 'admin'` after the existing `user_roles` lookup at layer 4.

**Identity exclusion for admin:** Admin should be able to see ALL document types including identity documents — this is the point of the admin queue. Remove the identity exclusion check for the admin code path.

### Pattern 4: `send-document-status-email` Edge Function

**What:** New Deno Edge Function following the `send-followup-emails` pattern. Takes `{ document_id, action: 'approved' | 'rejected' | 'needs_resubmission', rejection_reason?: string }` in the request body. Fetches seeker email, sends appropriate Resend email.

**Security posture:** Uses `WEBHOOK_SECRET` (already in Vault) validation, matching the `send-followup-emails` + `notify-job-filled` precedent. Invoked server-side from admin RPCs via `pg_net.http_post` OR directly from the `/admin/documents` page via `supabase.functions.invoke` from the admin browser session (the latter is simpler given admin is already authenticated). Recommendation: call from the React client via `supabase.functions.invoke` after the RPC call succeeds — simpler than wiring pg_net, consistent with how other admin actions work.

**verify_jwt setting:** `verify_jwt: true` (admin has a valid JWT). Use gateway-trust pattern (CLAUDE.md §5).

**Email templates needed (3):**
- Approved: "Your document has been verified on TopFarms"
- Rejected: "Action required: your document needs attention" + rejection_reason
- Needs resubmission: "Please re-upload your document on TopFarms"

### Pattern 5: `/suspended` gate page

**What:** Simple page consistent with existing `/login` shell. AuthLayout + centered card. No nav, no links into the app.

**Route registration:** Add BEFORE the `ProtectedRoute`-wrapped routes in `main.tsx`. The suspended route is intentionally accessible to authenticated users with sessions (they have a JWT, just `is_active=false`).

```typescript
// main.tsx — add as unauthenticated-accessible route (like /login)
{ path: '/suspended', element: <Suspended /> }
```

**Component pattern:** Mirrors `/login` shell. Use `AuthLayout` if it exists or the same centered-card CSS as login. No `ProtectedRoute` wrapper.

### Pattern 6: DocumentsVerifiedBadge component

**Recommendation:** New `DocumentsVerifiedBadge` component rather than extending `VerificationBadge`.

**Why separate:** `VerificationBadge` (in `src/components/ui/VerificationBadge.tsx`) is specifically about employer verification tiers (`TrustLevel` — unverified/basic/verified/fully_verified) backed by `employer_verifications` rows. The "Documents Verified" badge is about seeker document status — different data domain, different visual semantics. Reusing `VerificationBadge` by passing fake `verifications` data would be a semantic mismatch.

**Shape:**
```typescript
// src/components/ui/DocumentsVerifiedBadge.tsx
interface DocumentsVerifiedBadgeProps {
  hasVerifiedDocuments: boolean  // true when any seeker_document.status='approved'
  className?: string
}
```

**Visual:** `Tag variant="green"` with a `FileCheck` icon — consistent with the Tag system already used in admin list views and applicant cards. Compose Tag directly or render a Tag-styled span inline.

### Pattern 7: `needs_resubmission` status (Open Question 2 resolved)

**Recommendation:** Add `needs_resubmission` as a valid status value.

**Rationale:** Leaving `status='pending'` for "Request More Info" creates ambiguity at the admin queue level — the admin cannot distinguish "never reviewed" from "reviewed and waiting for seeker action". A distinct status lets the queue show a third colour (Tag `variant="blue"` — informational/in-progress) separate from pending (warn) and rejected (red). The migration CHECK constraint must include all four values:

```sql
CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission'))
```

### Migration 032 Schema

**Next migration number:** 032 (current highest is 031 `rls_initplan_performance.sql`)

**Full schema additions for migration 032:**

```sql
-- 1. Add status + rejection_reason to seeker_documents
ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission')),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Index for queue ordering (newest pending first)
CREATE INDEX IF NOT EXISTS seeker_documents_status_uploaded_at_idx
  ON public.seeker_documents (status, uploaded_at DESC);

-- 3. New admin RPCs (4 functions following 023 pattern)
-- admin_list_pending_documents, admin_approve_document,
-- admin_reject_document, admin_request_document_resubmission
```

**Existing documents:** All existing `seeker_documents` rows will default to `status='pending'` — this is correct. They were never reviewed and should appear in the queue. If the volume is large, add a one-time UPDATE to set `status='approved'` for rows uploaded before this migration as a cleanup step (operator decision at plan time).

### Anti-Patterns to Avoid

- **Calling `adminClient.auth.getUser(token)` in any verify_jwt-enabled Edge Function:** Always use the gateway-trust pattern (CLAUDE.md §5). This applies to the admin bypass in `get-applicant-document-url` and to the new `send-document-status-email`.
- **Checking `isActive` before `loading` is false:** The `is_active` check in `ProtectedRoute` must come after the `loading` spinner guard and the `role===null` spinner guard. Order matters to avoid flashing `/suspended` during loadRole resolution.
- **Adding `is_active` to `loadRole` as a separate Supabase call:** Always fetch alongside `role` in a single query. Two round-trips create a race window.
- **Widening RLS to give admin direct PostgREST access to `seeker_documents`:** Admin accesses seeker_documents exclusively through SECURITY DEFINER RPCs, not via widened RLS. The Phase 20-02 ADMIN-RLS-NEG-1/2 baseline must not be drifted.
- **Forgetting the `as never` pattern for admin RPCs:** New `admin_approve_document`, `admin_reject_document`, etc. are not in the supabase-js generated function-name union (applied via Studio, not CLI). Use `supabase.rpc('admin_approve_document', {...} as never)` — same workaround as Phase 20-05.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin gate check in RPCs | Custom role check SQL | `PERFORM public._admin_gate()` from migration 023 | DRY, single source of truth, already handles NULL uid |
| Signed URL generation for admin | New Storage client in PL/pgSQL | Admin bypass branch in `get-applicant-document-url` Edge Function | PL/pgSQL can't call Supabase Storage; Edge Function already has service role client |
| JWT validation in Edge Functions | `adminClient.auth.getUser()` | Gateway-trust + local `atob` decode (CLAUDE.md §5) | Service-role client route rejects valid ES256 tokens on `verify_jwt:true` functions |
| Suspension enforcement | Middleware or route loaders | `ProtectedRoute` + `isActive` from `AuthContext` | Locked decision; matches existing auth-state propagation pattern |
| Transactional email | Raw fetch to Resend in admin RPC | `supabase.functions.invoke('send-document-status-email')` from admin client | Keeps email logic in Deno (where RESEND_API_KEY is available); avoids pg_net for optional email |
| Audit logging for doc actions | Direct INSERT in component | `admin_audit_log` write inside SECURITY DEFINER RPC | Consistent with all existing admin mutations (023 pattern) |

**Key insight:** The 023 migration already provides the admin gate, audit log, and mutation pattern. Phase 21 admin doc RPCs are additive rows in an established contract — zero new architecture needed.

---

## Common Pitfalls

### Pitfall 1: `isActive` check ordering in ProtectedRoute

**What goes wrong:** Placing the `is_active === false → /suspended` redirect before the `requiredRole && role === null` spinner guard causes suspended users with slow `loadRole` to flash `/suspended` before `loadRole` resolves, then redirect again once it does.

**Why it happens:** `isActive` defaults to `true` in state until `loadRole` resolves. If `loadRole` times out (AUTH-FIX-02 scenario), `isActive` stays `true` — good. But if the state is initialised incorrectly as `false`, a flash occurs.

**How to avoid:** State initialise `isActive` as `true` (not `false`, not `null`). The check order in `ProtectedRoute` must be:
1. `if (loading)` → spinner
2. `if (!session)` → /login
3. `if (requiredRole && role === null)` → spinner (AUTH-FIX-02 guard)
4. `if (isActive === false)` → /suspended  ← NEW, AFTER step 3
5. `if (!role)` → /auth/select-role
6. `if (requiredRole && role !== requiredRole)` → dashboardPathFor(role)

**Warning signs:** "Suspended" flash on dashboard load for non-suspended users.

### Pitfall 2: Existing seeker_documents rows flooding the queue

**What goes wrong:** The migration adds `status DEFAULT 'pending'` to all existing rows. If many rows exist, the admin queue shows a large backlog of "old" documents that were never the subject of the new verification workflow.

**Why it happens:** The column default applies retroactively to all rows.

**How to avoid:** At migration apply time, consider `UPDATE public.seeker_documents SET status = 'approved' WHERE uploaded_at < '<migration_date>'` as a one-time backfill to mark pre-existing docs as implicitly approved. Decision should be explicit in the plan. Research finding: the UAT database has a small number of documents (Test Farm UAT only), so retroactive backfill is low-risk at this stage.

**Warning signs:** Admin opens `/admin/documents` and sees documents from months ago at the top.

### Pitfall 3: Admin bypass in Edge Function re-introducing BFIX-05 pattern

**What goes wrong:** When adding the admin bypass to `get-applicant-document-url`, a developer calls `adminClient.auth.getUser(token)` to check if the caller is admin, re-introducing the exact pattern that BFIX-05 fixed.

**Why it happens:** The admin check logic looks at `user_roles.role === 'admin'`, which requires a DB lookup. The temptation is to validate the token first via `auth.getUser`.

**How to avoid:** The token is already validated by the gateway (`verify_jwt: true`). After the existing `user_roles` lookup (layer 4, lines 99-110 in the current function), the `roleRow?.role` value is already available. Admin check = `if (roleRow?.role === 'admin')` with no additional token validation.

**Warning signs:** `401 Invalid auth token` for admin users calling the document URL endpoint.

### Pitfall 4: `as never` omission on new admin RPCs

**What goes wrong:** TypeScript compile error `Argument of type '"admin_approve_document"' is not assignable to parameter of type ...` when calling `supabase.rpc('admin_approve_document', ...)`.

**Why it happens:** Admin RPCs were applied via Studio SQL Editor, which doesn't update the generated supabase-js type definitions. The function-name union doesn't include the new RPCs.

**How to avoid:** Use `supabase.rpc('admin_approve_document', { p_document_id: id } as never)` — same `as never` pattern established in Phase 20-05 and documented in STATE.md.

**Warning signs:** TypeScript errors on `.rpc()` calls for the new admin doc functions.

### Pitfall 5: Overriding `refreshRole` to skip `is_active` re-fetch

**What goes wrong:** The `refreshRole()` function in `AuthContext` calls `loadRole` directly (not `loadRoleWithTimeout`). If `loadRole` is updated to return `{ role, isActive }` but `refreshRole` only extracts `role`, `isActive` state can go stale after a role refresh.

**Why it happens:** `refreshRole` was written before `is_active` existed and only sets `setRole(userRole)`.

**How to avoid:** Update `refreshRole` to also call `setIsActive(isActive)` after the `loadRole` call. Both state values must be co-updated.

### Pitfall 6: Track A smoke tests failing due to stale deployment

**What goes wrong:** Smoke test (e) — Phase 20.1 admin fresh-session login — fails because the Vercel deployment doesn't have the latest Phase 20.1 code if no `git push` has been done since the last session.

**Why it happens:** Vercel auto-deploys on push to main. If local commits haven't been pushed, the live deployment is behind.

**How to avoid:** Before running smoke tests, verify the Vercel deployment hash matches the latest local commit (`vercel deployments list` or check the Vercel dashboard). Push if behind.

---

## Code Examples

### loadRole extension (AuthContext.tsx)

```typescript
// Source: src/contexts/AuthContext.tsx (current implementation, Phase 18.2 SC-7)
// Extend to return is_active alongside role

async function loadRole(
  userId: string
): Promise<{ role: UserRole | null; isActive: boolean }> {
  console.time('[AUTH-FIX-02] loadRole:db-query')
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')   // ADD is_active
    .eq('user_id', userId)
    .single()
  console.timeEnd('[AUTH-FIX-02] loadRole:db-query')
  if (error || !data) return { role: null, isActive: true }
  return { role: data.role as UserRole, isActive: data.is_active ?? true }
}

type LoadRoleOutcome =
  | { ok: true; role: UserRole | null; isActive: boolean }   // EXTEND
  | { ok: false; reason: 'timeout' }
```

### ProtectedRoute is_active check (positioning)

```typescript
// Source: src/components/layout/ProtectedRoute.tsx (current, Phase 20.1)
// Insert after line 56 (requiredRole && role === null spinner), before line 59 (!role redirect)

// After existing spinner guards:
if (isActive === false) {
  return <Navigate to="/suspended" replace />
}
```

### Admin RPC call pattern (from Phase 20-05 STATE.md)

```typescript
// Source: STATE.md [Phase 20-05] note — canonical as never pattern
const { data, error } = await supabase.rpc(
  'admin_approve_document',
  { p_document_id: documentId } as never
)
```

### Admin bypass in get-applicant-document-url (gateway-trust pattern)

```typescript
// Source: supabase/functions/get-applicant-document-url/index.ts lines 99-110
// Admin early-exit — insert after the existing role lookup, before the employer check

const { data: roleRow } = await adminClient
  .from('user_roles')
  .select('role')
  .eq('user_id', callerUserId)
  .maybeSingle()

// Admin bypass: skip all employer relationship + identity exclusion checks
if (roleRow?.role === 'admin') {
  // Proceed directly to document lookup + signed URL mint
  // (admin can see all document types including identity)
  // ... document lookup and createSignedUrl ...
}

// Existing employer gate continues below for non-admin callers
if (roleRow?.role !== 'employer') {
  return jsonResponse({ error: 'Caller is not an employer' }, 403)
}
```

### Migration 032 column addition template

```sql
-- Source: pattern from 023_admin_rpcs.sql, 019_seeker_documents.sql
BEGIN;

ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CONSTRAINT seeker_documents_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission')),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON CONSTRAINT seeker_documents_status_check ON public.seeker_documents IS
  'Document review workflow states. pending=awaiting review; approved=verified; rejected=rejected with reason; needs_resubmission=admin requested re-upload.';

CREATE INDEX IF NOT EXISTS seeker_documents_status_uploaded_at_idx
  ON public.seeker_documents (status, uploaded_at DESC);

COMMIT;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `adminClient.auth.getUser(token)` in Edge Functions | Gateway-trust + local `atob` JWT decode | Phase 14 BFIX-05 (2026-04-29) | All new Edge Functions MUST follow gateway-trust (CLAUDE.md §5) |
| Inline ternary `role === 'admin' ? '/admin' : ...` | `dashboardPathFor(role)` helper | Phase 20.1 (2026-05-05) | All new redirect logic uses `dashboardPathFor` |
| Direct `.from().select()` for admin queries | SECURITY DEFINER `admin_*` RPCs | Phase 20 (2026-05-05) | Admin doc RPCs must follow the 023 RPC pattern, not PostgREST |
| `auth.uid()` in RLS policies | `(select auth.uid())` form | Phase 18.2-03 migration 031 | All new RLS policies written in 032 must use `(select auth.uid() AS uid)` form |

**Deprecated/outdated:**
- Direct role check in admin components via `useAuth().role === 'admin'`: deprecated for DB operations; use SECURITY DEFINER RPCs which call `_admin_gate()` server-side.

---

## Open Questions

1. **Existing seeker_documents rows — retroactive approval or leave as pending?**
   - What we know: Migration 032 adds `status DEFAULT 'pending'` to all existing rows. UAT DB has only a few rows. Production may have more.
   - What's unclear: Whether operator wants pre-existing docs to appear in the queue (forces a review pass) or be silently approved.
   - Recommendation: Add a migration option block — leave the decision to the executor plan comment, but default to leaving as `'pending'` (forces explicit admin review, which is the safer default for a new verification workflow).

2. **RESOLVED: `needs_resubmission` status vs leave as `pending`**
   - Decision: Use `needs_resubmission`. Rationale in Architecture Patterns §Pattern 7.

3. **`send-document-status-email` invocation path — `supabase.functions.invoke` from client vs pg_net from RPC**
   - What we know: `notify-job-filled` uses pg_net (triggered by DB event); `get-resend-stats` is called from client. Admin doc actions are user-triggered from the browser.
   - What's unclear: Whether to invoke the email function from within the SECURITY DEFINER RPC via pg_net, or from the React component after the RPC succeeds.
   - Recommendation: Invoke from the React component via `supabase.functions.invoke` after a successful RPC call. Email failure then doesn't roll back the status change (which is correct — the admin action succeeded even if email delivery failed). This avoids the pg_net plumbing overhead and keeps the email as a best-effort notification.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + @testing-library/react |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm exec vitest run --reporter=dot` |
| Full suite command | `pnpm exec vitest run` |
| Current baseline | 260 passed, 113 todo, 0 failures (41 test files, 47 total) |

### Phase Requirements → Test Map

Phase 21 has no public REQ-IDs. Test coverage maps to the two Track B features:

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| IS-ACTIVE-01 | `ProtectedRoute` redirects to `/suspended` when `isActive=false` | unit/component | `pnpm exec vitest run tests/protected-route-oauth.test.tsx` | ✅ (extend existing) |
| IS-ACTIVE-02 | `AuthContext.loadRole` fetches `is_active` alongside `role` in a single query | static-source | `pnpm exec vitest run tests/auth-context-is-active.test.ts` | ❌ Wave 0 |
| IS-ACTIVE-03 | `isActive` defaults to `true` on loadRole timeout (no false-positive suspension) | unit | `pnpm exec vitest run tests/auth-context-is-active.test.ts` | ❌ Wave 0 |
| DOC-QUEUE-01 | `admin_list_pending_documents` RPC shape matches queue component expectations | shape-contract | `pnpm exec vitest run tests/admin-doc-queue.test.ts` | ❌ Wave 0 |
| DOC-QUEUE-02 | Approve/Reject/RequestMoreInfo actions call correct admin RPC | shape-contract | `pnpm exec vitest run tests/admin-doc-queue.test.ts` | ❌ Wave 0 |
| DOC-QUEUE-03 | `get-applicant-document-url` admin bypass: admin role skips employer checks | manual UAT | (browser UAT) | n/a |
| DOC-QUEUE-04 | `DocumentsVerifiedBadge` renders "Documents Verified" when `hasVerifiedDocuments=true` | component | `pnpm exec vitest run tests/documents-verified-badge.test.tsx` | ❌ Wave 0 |
| SMOKE-01..05 | Five visual smoke tests (Track A) | manual UAT | (browser UAT per CONTEXT.md) | n/a |
| PEND-01 | Stripe live-mode posture | manual UAT | (operator checklist) | n/a |

### Sampling Rate
- **Per task commit:** `pnpm exec vitest run --reporter=dot`
- **Per wave merge:** `pnpm exec vitest run`
- **Phase gate:** Full suite green (no regressions vs 260/113/0 baseline) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/auth-context-is-active.test.ts` — covers IS-ACTIVE-02, IS-ACTIVE-03 (loadRole shape + timeout default)
- [ ] `tests/admin-doc-queue.test.ts` — covers DOC-QUEUE-01, DOC-QUEUE-02 (RPC shape + action dispatch)
- [ ] `tests/documents-verified-badge.test.tsx` — covers DOC-QUEUE-04 (DocumentsVerifiedBadge render)
- [ ] `tests/is-active-gate.test.tsx` — covers IS-ACTIVE-01 (ProtectedRoute suspended redirect); can extend `tests/protected-route-oauth.test.tsx` or be a new file

No new framework installation needed — vitest + RTL already installed and configured.

---

## Sources

### Primary (HIGH confidence)

- `src/contexts/AuthContext.tsx` — current `loadRole` implementation; `LoadRoleOutcome` type; `loadRoleWithTimeout` race wrapper; `AuthHookReturn` interface
- `src/components/layout/ProtectedRoute.tsx` — current guard order; AUTH-FIX-02 spinner guard at line 42-56
- `supabase/migrations/023_admin_rpcs.sql` — canonical SECURITY DEFINER RPC pattern; `_admin_gate()` helper; `admin_set_user_active` mutation template (lines 544-579); `admin_audit_log` write pattern
- `supabase/migrations/019_seeker_documents.sql` — current `seeker_documents` schema (no `status` column confirmed); document_type CHECK constraint; seeker-only RLS policies
- `supabase/functions/get-applicant-document-url/index.ts` — BFIX-05 gateway-trust pattern (lines 75-95); 5-layer auth structure; admin bypass insertion point after line 108
- `supabase/functions/send-followup-emails/index.ts` — email function pattern: `WEBHOOK_SECRET` validation, `sendEmail` helper, `emailWrapper` template
- `src/components/layout/AdminSidebar.tsx` — current nav items array; "Documents" nav item not yet present
- `src/main.tsx` — admin route registrations (lines 215-261); admin routes pattern
- `.planning/DECISIONS-PENDING.md` §PEND-01 — 9-item Stripe live-mode checklist (verified current)
- `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` — SC-2 PARTIAL verdict; exact flip target
- `.planning/v2.0-MILESTONE-AUDIT.md` — carryforward context; 5 human-verification items confirmed open

### Secondary (MEDIUM confidence)

- `STATE.md` [Phase 20-05] — `as never` pattern for admin RPCs; confirmed project-wide workaround
- `STATE.md` [Phase 20-02] — Studio SQL Editor apply precedent; `is_active` column addition confirmed applied
- `tests/` baseline — 260 passed | 113 todo | 0 failures confirmed by running `pnpm exec vitest run`

### Tertiary (LOW confidence)

- None — all research findings backed by direct code reading or empirical test run.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in-repo; no new libraries needed
- Architecture: HIGH — all patterns read directly from existing production code
- Pitfalls: HIGH — drawn from documented incidents in STATE.md and CLAUDE.md, not speculation
- Migration number: HIGH — `ls supabase/migrations/` confirmed 031 is current highest; 032 is correct next

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (stable infrastructure; patterns won't change unless a migration lands between now and planning)
