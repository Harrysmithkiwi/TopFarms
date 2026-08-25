---
phase: 21-v20-close-post-launch-ops
plan: 03
type: execute
wave: 2
depends_on: [00, 01]
files_modified:
  - supabase/functions/get-applicant-document-url/index.ts
  - tests/get-applicant-document-url-admin-bypass.test.ts
autonomous: false
requirements:
  - DOC-QUEUE-03
  - DOC-QUEUE-EDGE-GATEWAY-TRUST
must_haves:
  truths:
    - "Admin caller (user_roles.role='admin') receives signed URL for ANY seeker document (including identity)"
    - "Employer caller path is unchanged (5-layer gate still active for non-admin callers)"
    - "BFIX-05 gateway-trust JWT pattern preserved — no adminClient.auth.getUser(token) added"
    - "Admin bypass branch evaluates EXACTLY ONCE after role lookup, before employer-only check"
  artifacts:
    - path: "supabase/functions/get-applicant-document-url/index.ts"
      provides: "Admin role early-exit branch"
      contains: "roleRow?.role === 'admin'"
    - path: "tests/get-applicant-document-url-admin-bypass.test.ts"
      provides: "Static-source guard that admin branch + gateway-trust both present"
  key_links:
    - from: "supabase/functions/get-applicant-document-url/index.ts admin branch"
      to: "supabase/migrations/032_doc_verification_queue.sql (status column queryable for admin queue context)"
      via: "Edge fn fetches document by id; admin sees any document_type including identity"
      pattern: "roleRow\\?.role === 'admin'"
---

<objective>
Wave 2 — Add admin role bypass branch to existing `get-applicant-document-url` Edge Function. Admin (`user_roles.role='admin'`) callers skip the employer relationship check + identity exclusion check, and proceed directly to document lookup + signed URL mint. Non-admin paths are byte-frozen.

Purpose: Wave 5 plan 21-07's `AdminDocumentsQueue` page uses this Edge Function to preview seeker documents. Without the bypass, admin would 403 at the existing employer-only gate (layer 4 line 108). RESEARCH §Pattern 3 chose this over a new RPC because PL/pgSQL can't call Supabase Storage's `createSignedUrl`.

Output: Edge Function source modified (≤ 20 line addition). Static-source guard test ensures (a) admin branch present, (b) BFIX-05 gateway-trust pattern preserved (no `adminClient.auth.getUser(token)` regression), (c) identity exclusion still applies for non-admin path.

**CRITICAL constraint (CLAUDE §5):** Do NOT add `adminClient.auth.getUser(token)` for the admin role check. The role check uses the existing `user_roles` lookup (lines 99-110) — admin status is `roleRow?.role === 'admin'` after that lookup, no extra auth call needed.
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
LOCKED DECISION: Admin doc URL path = bypass branch in existing Edge fn (NOT new RPC) — CONTEXT.md "Admin doc bypass" + RESEARCH §Pattern 3 (PL/pgSQL can't call Supabase Storage)
LOCKED DECISION: Gateway-trust JWT pattern preserved per CLAUDE §5 (verify_jwt:true is enough; do NOT call adminClient.auth.getUser)
LOCKED DECISION: Admin sees ALL document types including identity (RESEARCH §Pattern 3 "Identity exclusion for admin: admin should see all")
-->

<interfaces>
From supabase/functions/get-applicant-document-url/index.ts (current — load-bearing line numbers):
- L33-36: corsHeaders
- L44-46: EMPLOYER_VISIBLE_DOCUMENT_TYPES, SIGNED_URL_TTL_SECONDS, BUCKET_NAME
- L62-64: method check (POST only)
- L67: createClient with service-role key
- L70-95: BFIX-05 gateway-trust JWT decode (extract callerUserId from payload.sub; validate payload.aud === 'authenticated')
- L99-110: user_roles role lookup; rejects non-employer at L108
- L112-128: employer_profiles lookup; sets callerEmployerId
- L130-141: body validation (application_id, document_id required)
- L143-160: application+job ownership check (relationship layer 4)
- L162-177: document lookup + seeker_id match
- L179-185: identity equality reject
- L187-193: whitelist check (EMPLOYER_VISIBLE_DOCUMENT_TYPES)
- L195-205: signed URL mint + return

Required behaviour after change:
- Decode JWT (unchanged)
- Lookup user_roles.role (unchanged)
- IF role === 'admin': skip employer_profiles + application+job ownership + identity equality + whitelist — go directly to document lookup (skip seeker_id match; admin sees any seeker's docs) + signed URL mint
- ELSE: existing 5-layer gate (unchanged)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add admin bypass branch to get-applicant-document-url Edge Function</name>
  <files>supabase/functions/get-applicant-document-url/index.ts</files>

  <read_first>
    - supabase/functions/get-applicant-document-url/index.ts (ENTIRE current file — 211 lines)
    - CLAUDE.md §5 (gateway-trust pattern — NO adminClient.auth.getUser(token))
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pattern 3 + §Pitfall 3 (admin bypass + Pitfall: don't re-introduce BFIX-05 anti-pattern)
    - .planning/retros/AUTH-RETRO.md Arc 3 (background on why gateway-trust is load-bearing)
  </read_first>

  <behavior>
    - Admin caller: 200 + signed URL for ANY seeker document (any document_type, any seeker)
    - Employer caller: existing behaviour byte-frozen (5-layer gate intact)
    - Non-employer non-admin caller: 403 'Caller is not an employer' (current behaviour preserved)
    - No new auth.getUser/getUserById calls anywhere in the file
    - Admin path requires application_id NOT to be provided OR ignored — admin queue passes document_id only (NO application context exists for arbitrary admin reviews)
  </behavior>

  <action>
**File — supabase/functions/get-applicant-document-url/index.ts**:

After the comment block at lines 1-29, update the comment to add a 6th layer description for admin bypass. Then modify the role check section (currently lines 99-110) to branch on admin.

**Specifically replace this current block (lines 97-110):**

```typescript
    // 4. Role check — must be 'employer' (project convention: user_roles is the
    //    canonical role gate, mirroring 002_rls_policies.sql `get_user_role` usage).
    const { data: roleRow, error: roleErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .maybeSingle()
    if (roleErr) {
      console.error('get-applicant-document-url: user_roles lookup failed', roleErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
    if (roleRow?.role !== 'employer') {
      return jsonResponse({ error: 'Caller is not an employer' }, 403)
    }
```

**With this:**

```typescript
    // 4. Role check — caller must be 'employer' OR 'admin' (Phase 21 doc queue bypass).
    //    user_roles is the canonical role gate (mirrors 002_rls_policies.sql get_user_role usage).
    //    ADMIN BYPASS (Phase 21): admins skip employer_profiles + application ownership +
    //    identity exclusion checks and can fetch ANY seeker_documents row, including
    //    identity docs. This powers the /admin/documents queue. The bypass uses the
    //    already-fetched roleRow value — NO additional auth.getUser call (CLAUDE §5
    //    gateway-trust; BFIX-05 regression guard).
    const { data: roleRow, error: roleErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .maybeSingle()
    if (roleErr) {
      console.error('get-applicant-document-url: user_roles lookup failed', roleErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }

    // ADMIN BYPASS — early-exit branch
    if (roleRow?.role === 'admin') {
      // Parse body — admin path expects { document_id } only (application_id ignored).
      let adminBody: { document_id?: string } = {}
      try {
        adminBody = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }
      const adminDocId = adminBody.document_id
      if (!adminDocId) {
        return jsonResponse({ error: 'document_id is required' }, 400)
      }

      const { data: adminDocRow, error: adminDocErr } = await adminClient
        .from('seeker_documents')
        .select('id, storage_path')
        .eq('id', adminDocId)
        .maybeSingle()
      if (adminDocErr) {
        console.error('get-applicant-document-url: admin seeker_documents lookup failed', adminDocErr)
        return jsonResponse({ error: 'Internal error' }, 500)
      }
      if (!adminDocRow) {
        return jsonResponse({ error: 'Document not found' }, 404)
      }

      const { data: adminUrlData, error: adminUrlErr } = await adminClient
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(adminDocRow.storage_path, SIGNED_URL_TTL_SECONDS)
      if (adminUrlErr || !adminUrlData?.signedUrl) {
        console.error('get-applicant-document-url: admin signed URL mint failed', adminUrlErr)
        return jsonResponse({ error: 'Failed to generate signed URL' }, 500)
      }
      return jsonResponse({ url: adminUrlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS }, 200)
    }

    // Non-admin: must be 'employer'
    if (roleRow?.role !== 'employer') {
      return jsonResponse({ error: 'Caller is not an employer' }, 403)
    }
```

Also update the docblock at the top (lines 1-29) — replace the "FIVE layers" wording with "FIVE layers (non-admin) / admin bypass after layer 3" and add an entry to the layer list at line 5:

Find line:
```
//   3. Role check           — user_roles.role must be 'employer' → 403.
```

Replace with:
```
//   3. Role check           — user_roles.role must be 'employer' OR 'admin'.
//                              Admin: early-exit, mints signed URL for any document
//                              (powers Phase 21 /admin/documents queue).
//                              Non-employer non-admin: 403.
```

Do NOT touch any other line. Specifically: leave the BFIX-05 docblock at line 8-12 intact. Leave the JWT decode block (76-95) intact. Leave the existing employer path (lines 112-205) byte-frozen.

After save: `pnpm exec deno check supabase/functions/get-applicant-document-url/index.ts` if Deno installed locally (per Phase 20-03 STATE; optional — Supabase CLI handles types at deploy). Acceptable to skip if Deno not available; rely on Wave 5 deploy.
  </action>

  <verify>
    <automated>grep -c "roleRow?.role === 'admin'" supabase/functions/get-applicant-document-url/index.ts</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "roleRow?.role === 'admin'" supabase/functions/get-applicant-document-url/index.ts` returns 1
    - `grep -c "Trust the gateway, decode locally\\|gateway-trust" supabase/functions/get-applicant-document-url/index.ts` returns ≥ 1 (BFIX-05 docblock preserved)
    - `grep -c "adminClient.auth.getUser" supabase/functions/get-applicant-document-url/index.ts` returns 0 (gateway-trust enforced; no regression)
    - `grep -c "auth.getUserById" supabase/functions/get-applicant-document-url/index.ts` returns 0
    - `grep -c "payload.aud !== 'authenticated'" supabase/functions/get-applicant-document-url/index.ts` returns 1 (gateway-trust JWT decode preserved)
    - `grep -c "Identity documents are not accessible to employers" supabase/functions/get-applicant-document-url/index.ts` returns 1 (PRIV-02 employer-path identity reject preserved)
    - `grep -c "Caller is not an employer" supabase/functions/get-applicant-document-url/index.ts` returns 1 (non-admin non-employer 403 preserved)
    - Diff size: `git diff --numstat supabase/functions/get-applicant-document-url/index.ts` shows ≤ 60 line additions, ≤ 5 deletions
  </acceptance_criteria>

  <done>
    Admin bypass branch added; BFIX-05 gateway-trust + employer identity-exclusion both preserved. Ready for deploy in Wave 5 plan 21-09 operator script (NOT this plan — deploys are batched into the Track A operator session).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Static-source regression-guard test for Edge Function admin bypass + gateway-trust</name>
  <files>tests/get-applicant-document-url-admin-bypass.test.ts</files>

  <read_first>
    - tests/employer-visible-document-types-drift.test.ts (canonical static-source readFileSync + regex guard pattern, Phase 18.1 SC-1; pure-Node 8ms runtime)
    - supabase/functions/get-applicant-document-url/index.ts (post Task 1)
  </read_first>

  <action>
**File — tests/get-applicant-document-url-admin-bypass.test.ts** (new file, ~50 lines):

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Static-source guard — Phase 21 Track B regression protection.
// Pattern: Phase 18.1 SC-1 employer-visible-document-types-drift.test.ts + saved-search-load-integration.test.tsx.
// Verifies the get-applicant-document-url Edge Function has:
//   (a) Phase 21 admin bypass branch — `roleRow?.role === 'admin'` early-exit
//   (b) BFIX-05 gateway-trust JWT pattern preserved — `payload.aud !== 'authenticated'` decode; NO auth.getUser call
//   (c) PRIV-02 identity exclusion preserved on the non-admin path
//   (d) Employer 403 reject preserved on non-admin non-employer callers
// Runs in <10ms; no Deno required.

const FN_PATH = resolve(__dirname, '../supabase/functions/get-applicant-document-url/index.ts')

describe('get-applicant-document-url admin bypass + gateway-trust (Phase 21 DOC-QUEUE-03)', () => {
  const source = readFileSync(FN_PATH, 'utf-8')

  it('DOC-QUEUE-03: contains admin role bypass branch', () => {
    expect(source).toMatch(/roleRow\?\.role === 'admin'/)
  })

  it('DOC-QUEUE-03: admin branch mints signed URL via createSignedUrl', () => {
    // Find admin branch start; verify createSignedUrl exists within 2000 chars of the branch
    const idx = source.indexOf("roleRow?.role === 'admin'")
    expect(idx).toBeGreaterThan(-1)
    const adminBranchWindow = source.slice(idx, idx + 2500)
    expect(adminBranchWindow).toMatch(/createSignedUrl/)
  })

  it('CLAUDE §5 gateway-trust preserved: no adminClient.auth.getUser(token) call', () => {
    expect(source).not.toMatch(/adminClient\.auth\.getUser/)
    expect(source).not.toMatch(/auth\.getUserById/)
  })

  it('CLAUDE §5 gateway-trust preserved: payload.aud check present', () => {
    expect(source).toMatch(/payload\.aud !== 'authenticated'/)
  })

  it('PRIV-02 identity exclusion preserved on non-admin path', () => {
    expect(source).toMatch(/Identity documents are not accessible to employers/)
  })

  it('non-admin non-employer reject preserved', () => {
    expect(source).toMatch(/Caller is not an employer/)
  })

  it('EMPLOYER_VISIBLE_DOCUMENT_TYPES whitelist preserved on non-admin path', () => {
    expect(source).toMatch(/EMPLOYER_VISIBLE_DOCUMENT_TYPES/)
  })
})
```

This file is pure-Node (readFileSync — no jsdom, no mocks). Runs in <10ms. Reusable pattern from Phase 18.1 SC-1 employer-visible-document-types-drift + Phase 17-04 saved-search-load-integration.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/get-applicant-document-url-admin-bypass.test.ts --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `ls tests/get-applicant-document-url-admin-bypass.test.ts` exits 0
    - `pnpm exec vitest run tests/get-applicant-document-url-admin-bypass.test.ts` exits 0
    - Test summary shows 7 passing assertions
    - File uses readFileSync (no jsdom): `grep -c "readFileSync" tests/get-applicant-document-url-admin-bypass.test.ts` returns 1
    - Test runtime <50ms per vitest output (pure-Node)
    - Full suite green: `pnpm exec vitest run` exits 0
  </acceptance_criteria>

  <done>
    Static-source guard test GREEN. Regression protects admin bypass + gateway-trust + identity exclusion in a single sub-10ms check. Atomic commit with Task 1.
  </done>
</task>

</tasks>

<verification>
1. `grep -c "roleRow?.role === 'admin'" supabase/functions/get-applicant-document-url/index.ts` returns 1
2. `grep -c "auth.getUser" supabase/functions/get-applicant-document-url/index.ts` returns 0 (BFIX-05 enforced)
3. Static-source guard test 7/7 GREEN
4. Full suite green
5. Edge Function NOT yet redeployed — deploy step batched into Wave 6 operator script (plan 21-09)

Manual UAT for DOC-QUEUE-03 is part of Wave 6 Track A (operator confirms admin-as-caller curl returns signed URL).
</verification>

<success_criteria>
- Admin bypass branch in get-applicant-document-url shipped
- BFIX-05 gateway-trust JWT pattern preserved (verified by static-source test + grep)
- Identity exclusion preserved on non-admin path (verified)
- Static-source regression guard test GREEN
- Atomic commit: `feat(21-03): get-applicant-document-url admin bypass + regression guard`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-03-SUMMARY.md` capturing:
- Edge Function diff (lines added/changed)
- Grep proofs (4 key strings)
- Test file + 7-assertion confirmation
- Note that deploy is deferred to Wave 6 operator script (plan 21-09)
- Confirmation BFIX-05 docblock + gateway-trust JWT decode block both unchanged
</output>
