# Codebase Concerns

**Analysis Date:** 2026-05-29

## Overview

TopFarms v2.0 is functionally complete and launch-ready. However, several infrastructure issues, security workarounds, and migration hygiene problems have been identified that require resolution before full production stability. This document synthesizes findings from `.planning/v2.0-MILESTONE-AUDIT.md`, `.planning/REQUIREMENTS.md`, and `.planning/DECISIONS-PENDING.md`.

---

## Critical Blockers (Pre-Launch)

### PEND-01: Stripe Live-Mode Key Swap

**Severity:** BLOCKER — prevents any real paid placement charges

**What's affected:**
- `supabase/functions/stripe-webhook/index.ts` — Edge Function configured for webhook signature validation
- `stripe-webhook` Edge Function deployment in production
- Stripe payment flow: `create-payment-intent` → `stripe-webhook` → `placement_fees` row creation
- PEND-01 is the single blocker preventing `/gsd:complete-milestone v2.0` completion

**Current state:**
- `STRIPE_SECRET_KEY` in Supabase secrets: `sk_test_*` (sandbox mode)
- `STRIPE_WEBHOOK_SECRET` in Supabase secrets: sandbox webhook signing secret
- `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel env: `pk_test_*` (sandbox mode)
- Live-mode webhook endpoint NOT registered in Stripe dashboard
- Phase 18.1 SC-2 PARTIAL (all 6 configuration checks pass in test mode only)

**Mitigation in place:**
- None — awaiting deliberate operator action before first real charge attempt

**Resolution path:**
See `.planning/DECISIONS-PENDING.md § PEND-01` for the 9-item verbatim checklist. Core steps:
1. Rotate `STRIPE_SECRET_KEY` to `sk_live_*` in Supabase secrets
2. Register webhook endpoint `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook` in Stripe live-mode dashboard
3. Copy live-mode webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`
4. Rotate `VITE_STRIPE_PUBLISHABLE_KEY` to `pk_live_*` in Vercel env + trigger redeploy
5. Run smoke test: $0.50 PaymentIntent live → webhook fires → `placement_fees` row updated → immediate refund
6. Flip 18.1-VERIFICATION.md SC-2 PARTIAL → PASS

**Reference:** `.planning/v2.0-MILESTONE-AUDIT.md` § "PEND-01 — Stripe live-mode key swap" (lines 505–528)

---

## Infrastructure Debt (Blocked on Platform-Side Issues)

### §6 Pooler Auth — Database Password Not Persisting Server-Side

**Severity:** BLOCKS CI/CD migrations — indefinite deferral acceptable (working mitigation in place)

**What's affected:**
- GitHub Actions migrations CI job (`migrations` job in `.github/workflows/supabase-deploy.yml`)
- Supabase CLI `db push --linked` against Session pooler (connection pooling proxy at `aws-1-ap-northeast-2.pooler.supabase.com:5432`)
- All `supabase/migrations/*.sql` file deployments via CI

**Current state:**
- 10 consecutive CI migrations jobs have failed since 2026-05-02 at the "Dry-run migration preview" step
- Root cause: `SUPABASE_DB_PASSWORD` secret (pooler auth) returns `FATAL: password authentication failed for user "postgres"` (SQLSTATE 28P01)
- Supabase Studio password reset ACCEPTED in UI but NOT persisting server-side to `pg_authid` (confirmed twice: 2026-05-03 and 2026-05-29)
- Enumeration sweep per CLAUDE §6 ruled out all client-side misconfiguration: repo default set, secrets enumerated clean, workflow consumption correct, DB-side role status confirmed healthy

**Mitigation in place:**
- `.github/workflows/supabase-deploy.yml` migrations job gated to `if: github.event_name == 'workflow_dispatch'` (commit c30a867)
- Migrations applied via Supabase Studio SQL Editor per CLAUDE §2 (bypasses pooler)
- Functions deploy independently via `--use-api` (uses PAT, not pooler)
- Indefinite workaround sustainable; costs zero (functions still ship on-demand)

**Why not rotating again:**
Per CLAUDE §6 diagnostic protocol: "after two identical auth failures, switch from retry to enumeration." Two distinct reset-and-fail cycles documented (2026-05-03T00:30:39Z and 2026-05-29T**:***), both showing identical SCRAM auth failure immediately after Studio accept. This conclusively signals platform-side issue, not credential mismatch.

**Resolution path:**
1. File/amend Supabase support ticket (template in `.planning/v2.0-MILESTONE-AUDIT.md` lines 639–667)
2. Await Supabase confirmation of root cause + fix
3. Validate password locally with `psql` against Session pooler
4. Update GH secret: `gh secret set SUPABASE_DB_PASSWORD=<new-validated-value> --repo Harrysmithkiwi/TopFarms`
5. Trigger one `workflow_dispatch` run to verify migrations job passes
6. Pair with registry cleanup carryforward (next section) + revert the c30a867 gate (re-add migrations to path filter, remove `if:` gate, restore `needs: migrations`)

**Reference:** `.planning/v2.0-MILESTONE-AUDIT.md` § "Carryforward: §6 pooler auth" (lines 587–677)

---

### Migration Registry 018-022 Timestamp/Filename Drift

**Severity:** BLOCKS migrations CI re-enable — safe to defer indefinitely while gated

**What's affected:**
- `supabase/migrations/018_set_user_role_rpc.sql` through `022_fix_pg_net_http_post_signature.sql`
- `supabase_migrations.schema_migrations` registry table in production
- Supabase CLI `db push --linked` validation (expects registry version to match filename prefix)

**Current state:**
5 rows in the `schema_migrations` registry have timestamp-style versions that do NOT match on-disk filenames:

| Registry version | On-disk file | Mismatch |
|---|---|---|
| `20260428043338` | `018_set_user_role_rpc.sql` | timestamp ≠ `018` |
| `20260428053314` | `019_seeker_documents.sql` | timestamp ≠ `019` |
| `20260429031148` | `020_seeker_documents_employer_policy.sql` | timestamp ≠ `020` |
| `20260503000000` | `021_rls_auto_enable_capture.sql` | timestamp ≠ `021` |
| `20260503210000` | `022_fix_pg_net_http_post_signature.sql` | timestamp ≠ `022` |

**Why this blocks CI:**
Supabase CLI `GetMigrationFile()` globs `migrations/<version>_*.sql` — expects registry version to match filename prefix exactly. The 5 timestamp-style versions don't match any on-disk file, so `db push --linked` errors with "Remote migration versions not found in local migrations directory."

**Mitigation in place:**
Drift remains present but harmless while migrations CI is gated to `workflow_dispatch` only (commit c30a867).

**Resolution path:**
Execute in Supabase Studio SQL Editor (bypasses pooler; safe one-off):
```sql
BEGIN;
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260428043338', '20260428053314', '20260429031148',
  '20260503000000', '20260503210000'
);
INSERT INTO supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
VALUES
  ('018', 'set_user_role_rpc',                NULL, NULL, NULL, NULL),
  ('019', 'seeker_documents',                 NULL, NULL, NULL, NULL),
  ('020', 'seeker_documents_employer_policy', NULL, NULL, NULL, NULL),
  ('021', 'rls_auto_enable_capture',          NULL, NULL, NULL, NULL),
  ('022', 'fix_pg_net_http_post_signature',   NULL, NULL, NULL, NULL);
COMMIT;
```

Then update `.github/workflows/supabase-deploy.yml` header comment to remove the obsolete "REQUIRED ONE-TIME ACTION" block.

**Reference:** `.planning/v2.0-MILESTONE-AUDIT.md` § "Carryforward: Migration registry 018-022 timestamp/filename drift" (lines 680–752)

---

## Security Workarounds (Legacy HS256 JWT Limitation)

### X-Webhook-Secret Defence-In-Depth (notify-job-filled + send-followup-emails)

**Severity:** WORKAROUND — handles legacy platform limitation; plan for migration

**What's affected:**
- `supabase/functions/notify-job-filled/index.ts` — validates `X-Webhook-Secret` header (lines 12–15, 118–130)
- `supabase/functions/send-followup-emails/index.ts` — validates `X-Webhook-Secret` header (same pattern)
- Both functions configured with `verify_jwt: false` (not `verify_jwt: true`) due to gateway JWT limitation
- `on_job_filled` trigger (migration 028) injects `X-Webhook-Secret` header via `vault.decrypted_secrets.webhook_secret` read (migration 029)

**Root cause:**
Supabase Auth gateway uses legacy HS256 signing for service-role JWTs. When an Edge Function is configured with `verify_jwt: true`, the gateway validates the JWT signature upstream. However, the v2.0 codebase attempted to use service-role JWTs with `verify_jwt: true`, which the gateway rejects with 401 "Invalid auth token" due to the HS256/ES256 asymmetry (see BFIX-05 incident). 

**Current mitigation:**
- Both `notify-job-filled` and `send-followup-emails` run with `verify_jwt: false`
- Instead, they validate a shared secret passed via custom `X-Webhook-Secret` header
- Secret stored in `vault.decrypted_secrets.webhook_secret` table (migration 029)
- Trigger reads vault and injects the header before calling Edge Function

**Why this is a workaround:**
- Shared secret is weaker than asymmetric JWT signing (no audit trail of which trigger sent which invocation)
- Adds operational overhead: must track and rotate the secret separately from JWT keys
- Blocks restoring `verify_jwt: true` on these two functions (which would be architecturally cleaner)

**Plan for removal (Item #16):**
Migrate Supabase project from legacy HS256 JWT signing to asymmetric ES256/JWKS:
1. Navigate to Supabase Project Settings → JWT Signing Keys
2. Migrate from legacy HS256 to ES256/JWKS
3. Once migrated, service-role JWTs will be ES256-signed and accepted by the gateway
4. Flip `notify-job-filled` and `send-followup-emails` to `verify_jwt: true`
5. Remove `X-Webhook-Secret` header validation and injection chain
6. Decommission `vault.decrypted_secrets.webhook_secret` logic

**Effort:** Dedicated phase (recommended Phase 22+) due to wide blast radius (affects all service-role usage)

**Reference:** 
- `.planning/v2.0-MILESTONE-AUDIT.md` lines 550–556 (Item #16 carryforward description)
- `.planning/REQUIREMENTS.md` line 84 (BFIX-05 gateway-trust pattern requirement)
- `supabase/functions/notify-job-filled/index.ts` lines 12–15, 118–130

---

### Gateway-Trust JWT Pattern (verify_jwt=true Edge Functions)

**Severity:** PATTERN/BEST-PRACTICE — not a bug, but critical to prevent regressions

**What's affected:**
- `supabase/functions/get-applicant-document-url/index.ts` — uses gateway-trust pattern (lines 79–98)
- Any future Edge Function with `verify_jwt: true`
- Pattern codified in `CLAUDE.md § 5` for all future work

**Current implementation:**
When an Edge Function has `verify_jwt: true`, the Supabase gateway validates the JWT signature upstream. Do NOT re-validate by calling `adminClient.auth.getUser(token)` on a service-role-keyed client — that call routes differently and rejects valid ES256 tokens (BFIX-05 incident).

Instead:
1. Trust the gateway's signature validation (which is the whole point of `verify_jwt: true`)
2. Decode the JWT payload locally for `sub` and role claims
3. Validate `aud === 'authenticated'` to confirm user-scoped token (not service-role)

```typescript
const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
if (payload.aud !== 'authenticated') return 401
const callerUserId = payload.sub
```

**Why critical:**
- Every new `verify_jwt: true` function that copies the rejected pattern (`adminClient.auth.getUser(token)`) will break identically
- Pattern validation requires explicit regression guard (see next section)

**Current adoption:**
- `get-applicant-document-url/index.ts` (lines 79–98) ✓ uses pattern correctly
- `send-document-status-email/index.ts` (Phase 21) — verified to use gateway-trust (no re-validation call)

**Reference:** 
- `CLAUDE.md § 5` (codified pattern + rationale)
- `supabase/functions/get-applicant-document-url/index.ts` lines 79–98
- `.planning/REQUIREMENTS.md` line 84 (BFIX-05 closure note)

---

## Security Hardening Gaps

### CORS-01: Wildcard Allow-Origin on Privacy-Critical Edge Functions

**Severity:** LOW — principle of least exposure; browser still sends Authorization headers cross-origin

**What's affected:**
- `supabase/functions/get-applicant-document-url/index.ts` (lines 36–38)
- `supabase/functions/notify-job-filled/index.ts` (lines 3–6)
- `supabase/functions/send-followup-emails/index.ts` (same pattern)
- All return `Access-Control-Allow-Origin: '*'` for consistency with existing functions

**Current state:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Risk analysis:**
- Scope down to `https://top-farms.vercel.app` (production) + `http://localhost:5173` (dev) once domain names are stable
- Browser will still send Authorization headers cross-origin, so this is principle-of-least-exposure hardening rather than a security boundary
- Current wildcard is safe because authorization checks (role validation, relationship verification, identity exclusion) are performed in the handler — the CORS header doesn't grant access, only signals that cross-origin requests are accepted

**Resolution path:**
Post-launch follow-up (no urgency):
1. Confirm production domain is stable (`top-farms.vercel.app` or custom domain)
2. Update CORS headers to enumerate allowed origins
3. Test from production domain → confirm signed URLs still mint
4. Test from unauthorized origin → confirm 403/401 still returned

**Reference:**
- `.planning/REQUIREMENTS.md` lines 104–105 (CORS-01 logged as post-launch item)
- `supabase/functions/get-applicant-document-url/index.ts` lines 36–38

---

### PRIV-01: 404 vs 403 Existence Leak

**Severity:** LOW — information disclosure; application UUIDs are not enumerable

**What's affected:**
- `supabase/functions/get-applicant-document-url/index.ts` lines 152 ("Application not found" → 404) and 158 ("Application does not belong to a job you own" → 403)
- A UUID that exists but is not owned by the caller produces status 404
- A UUID that doesn't exist also produces status 404 (this is the ideal)

**Current gap:**
The split (404 vs 403) technically leaks application/document existence. A UUID that exists but is not accessible produces different HTTP status than a UUID that never existed.

**Risk analysis:**
Low severity because:
- Application UUIDs are not enumerable (the caller cannot iterate to probe the space)
- The information leaked ("this document existed") is low-value without enumeration capability
- Employer can only learn about documents they legitimately own

**Resolution path:**
Post-launch hardening (low priority):
1. Unify both cases to return `403 "Document not accessible"` regardless of existence
2. Test that legitimate-employer requests still succeed
3. Test that non-owned and non-existent UUIDs both return 403 with identical message

**Reference:** `.planning/REQUIREMENTS.md` lines 105–106 (PRIV-01 logged as post-launch item)

---

## Navigation & UX Gaps

### NAV-01: /jobs Route Missing Navigation Wrapper

**Severity:** UX DEFECT — cosmetic, not blocking

**What's affected:**
- `src/pages/jobs/JobSearch.tsx` routed directly without `DashboardLayout` or `Nav` wrapper
- Route scaffolded as bare `<JobSearch />` in `src/main.tsx` (commit a5f56b2 from phase 03-03)
- Users navigating to `/jobs` see no top-level nav (logo, role-aware links visible on `/dashboard/seeker` are absent)

**Current state:**
```typescript
// src/main.tsx — missing wrapper
<Route path="/jobs" element={<JobSearch />} />

// Expected fix: either wrap in DashboardLayout OR render Nav directly inside JobSearch.tsx
// Matches the public marketing-page pattern used elsewhere
```

**Effort:** 1-line fix — wrap with `<DashboardLayout hideSidebar>` or add `<Nav />` render at top of JobSearch component

**Reference:** `.planning/REQUIREMENTS.md` line 102 (NAV-01 logged as post-launch item, Phase 22 pre-launch closure)

---

### DOC-TAB-01: ApplicantDocuments Rendered Inline

**Severity:** UX POLISH — post-launch refinement

**What's affected:**
- `src/components/applicant/ApplicantDocuments.tsx` currently rendered inline within the applicant CV tab in `ApplicantPanel.tsx`
- Inline placement matches Phase 14-03 plan and ships with launch
- Promotion to a dedicated "Documents" tab (alongside CV / Status & Notes / Match) is post-launch polish

**Current state:**
ApplicantDocuments appears inline within the CV tab content, not as a separate tab.

**Resolution path:**
Post-launch refinement:
1. Add "Documents" tab entry to the ApplicantPanel tab group (alongside existing CV, Notes, Match tabs)
2. Move ApplicantDocuments render to the Documents tab panel
3. Test employer navigation through all tabs
4. Verify document access continues to work from the new tab position

**Reference:** `.planning/REQUIREMENTS.md` line 106–107 (DOC-TAB-01 logged as post-launch item)

---

## Migration Hygiene Issues

### Phantom-Applied Migrations 011–014 (Item #9)

**Severity:** ROOT CAUSE UNRESOLVED — awaiting Supabase platform diagnosis

**What's affected:**
- Migrations 011, 012, 013, 014 exist in `supabase_migrations.schema_migrations` registry but not in production schema
- Symptoms surfaced as UXBUG-01 (accommodation fields missing), HOMEBUG-01 (get_platform_stats RPC missing), HOMEBUG-02 (featured listings 400 error)
- All symptoms fixed via BLOCK 1/2/3 Studio SQL applies 2026-05-03

**Current state:**
- Registry rows exist for 011–014 (marked as applied)
- Schema missing the actual function/table/column definitions those migrations should have created
- Remediated for v2.0 launch (all functions + tables re-applied via BLOCK 1/2/3)
- Root cause unconfirmed — pattern consistent with DB restore from snapshot pre-dating 015 commit (2026-03-22), with registry rows preserved separately

**Investigation:**
- Consecutive registry-as-applied + schema-not-applied range (011–014) committed 2026-03-17 to 2026-03-21
- Event window 2026-03-22 to 2026-05-03 (~6 weeks) suggests a platform-side state inconsistency
- Open Supabase support ticket (amended 2026-05-03 with the four-consecutive-phantom-migrations finding)

**Resolution path:**
1. Await Supabase support response on the open ticket (see `.planning/SUPABASE-TICKET-UPDATE-2026-05-03.md`)
2. Document confirmed cause in DRIFT-AUDIT or successor doc
3. Identify prevention measures if applicable (e.g., registry validation in CI, snapshot restore hygiene)

**Why deferred:**
Blocked on Supabase platform diagnosis. Prevention measures depend on understanding the root cause (restore bug, sync issue, etc.).

**Reference:** 
- `.planning/v2.0-MILESTONE-AUDIT.md` lines 538–542 (Item #9 carryforward)
- `.planning/DRIFT-AUDIT-2026-05-03.md` (full forensic investigation)

---

## Post-Launch Verification Gaps

### Live UAT Re-Verification with Real Data

**Severity:** OBSERVABILITY — code-side fixes verified with test data only

**What's affected:**
- HOMEBUG-02 (featured listings rendering) — verified with 0 featured/premium jobs (fallback path only)
- HOMEBUG-03 (accommodation filter) — verified with 1 UAT job behind RLS
- UXBUG-01 (accommodation chips rendering) — verified on pre-existing employer profile, not fresh onboarding

**Current state:**
All code-side defects closed with empirical proof against available test data. However, several flows need re-verification once real employer/seeker data populates production.

**4 items requiring post-launch re-verification:**

1. **Accommodation filter end-to-end with real employer jobs** (HOMEBUG-03 follow-up)
   - Re-verify after first ~5 real employer profiles exist with varied `accommodation_extras` arrays
   - Confirm: filter toggling produces correct row counts; case-mismatch regression absent; multi-option semantics work

2. **Home page featured listings with real featured/premium jobs** (HOMEBUG-02 follow-up)
   - Re-verify after first ~3 employers purchase featured/premium tier upgrades
   - Confirm: `FeaturedListings` renders actual featured cards (Title, Region, Salary, badge); ordering by `created_at desc` honoured

3. **Cold-start / empty-state UX for seekers** (new observability)
   - Verify: no-results states show graceful messaging (not blank/broken)
   - Verify: cold-start (first session, no seeker profile) renders helpful defaults
   - Verify: low-job-count (1–5 jobs) doesn't trigger pagination bugs or infinite skeleton states

4. **Employer onboarding accommodation flow (Step 4 → Step 7)** (UXBUG-01 follow-up)
   - Re-verify after first ~3 real employers sign up
   - Confirm: accommodation_extras values persist across steps; chips render with live-form values
   - Confirm: no employer hits 400 or silent-empty state during onboarding

**Resolution path:**
Execute against first batch of real signups (ops/QA-driven). Record findings in `.planning/POST-LAUNCH-UAT.md`. If any regression surfaces, treat as new bug (HOMEBUG-04, etc.) rather than re-opening closed items.

**Reference:** `.planning/v2.0-MILESTONE-AUDIT.md` lines 755–832 (4-item post-launch UAT carryforward)

---

## Summary Table

| Concern | Type | Severity | Blocks Launch | Resolution |
|---------|------|----------|---------------|------------|
| PEND-01 Stripe live-mode | Operator action | BLOCKER | YES | Run 9-item checklist from DECISIONS-PENDING.md |
| §6 Pooler auth | Platform-side | High | NO (gated CI) | Await Supabase support + reset cycle |
| 018-022 Registry drift | Migration hygiene | Medium | NO (gated CI) | Execute Studio SQL drift cleanup |
| X-Webhook-Secret workaround | Legacy JWT limitation | Medium | NO | Item #16: JWT HS256→ES256 migration |
| Gateway-trust JWT pattern | Best-practice | Low | NO | Pattern locked in CLAUDE.md §5; guard against regressions |
| CORS-01 wildcard | Least-exposure principle | Low | NO | Post-launch: scope to prod + dev origins |
| PRIV-01 404 vs 403 leak | Information disclosure | Low | NO | Post-launch: unify to 403 "not accessible" |
| NAV-01 /jobs nav missing | UX defect | Low | NO | 1-line fix: wrap with DashboardLayout |
| DOC-TAB-01 inline docs | UX polish | Low | NO | Post-launch: promote to dedicated Documents tab |
| Item #9 phantom migrations | Root-cause unresolved | Low | NO | Await Supabase diagnosis + prevention measures |
| Post-launch live UAT gaps | Observability | Low | NO | Re-verify with real data once organic signups appear |

---

*Codebase concerns audit: 2026-05-29*
*Sources: v2.0-MILESTONE-AUDIT.md, REQUIREMENTS.md, DECISIONS-PENDING.md, CLAUDE.md*
