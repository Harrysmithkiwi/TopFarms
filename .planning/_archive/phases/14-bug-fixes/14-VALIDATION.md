---
phase: 14
slug: bug-fixes
status: post-hoc
nyquist_compliant: false
wave_0_complete: n/a
created: 2026-04-29
audit_run: cleanup-session post-Phase-14
---

# Phase 14 — Validation Strategy (post-hoc audit)

> Reconstructed retroactively in cleanup-session. Phase 14 was executed without a Wave 0 / VALIDATION.md gate per the explicit TEST-01 deferral in REQUIREMENTS.md ("manual UAT works at this scale; smoke specs add 75-140 LOC/plan (~30% bloat) for regression coverage we don't yet need"). This document captures the audit outcome, the repair work that landed in the same commit, and the deferral/manual-only buckets carried forward.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=basic` |
| **Full suite command** | `npm test` (alias for `vitest`) |
| **Estimated runtime** | ~5 seconds |
| **Test directory** | `tests/` (19 spec files) |

---

## Audit outcome

Baseline `npm test` immediately before this audit: **4 failed | 115 passed | 113 todo (232 total)**. Two stale spec files broke during Phase 14 work but were missed because TEST-01 deferred CI gating to post-launch. The audit repaired both and re-ran:

After repair: **0 failed | 119 passed | 113 todo (232)**. +4 tests now green (3 seeker-step3 + 1 select-role).

### Repaired (in this commit)

| File | Failure cause | Repair (intent → new architecture) |
|---|---|---|
| `tests/seeker-step3-documents.test.tsx` | Asserted on `FileDropzone` + `document_urls` form-payload semantics. BFIX-03 (5a228e0) replaced `FileDropzone` with `DocumentUploader` (per-file type picker + INSERT into `seeker_documents`); documents no longer ride through the form. Mock also lacked `supabase.from()` chain that `useSeekerProfileId` (added in 14-01) requires. | Original intent kept: (1) Documents section renders, (2) the upload control is present and bucket-scoped, (3) form submission forwards qualification fields to `onComplete`. Test 3 now also asserts the architectural separation: payload does NOT contain `document_urls`. Mock expanded to cover `from(...).select(...).eq(...).maybeSingle()`. |
| `tests/select-role.test.tsx` | Asserted `mockInsert` called with `{ user_id, role }`. AUTH-02 (cdc9df7) replaced the direct `user_roles` INSERT with `set_user_role` RPC (`SECURITY DEFINER`, idempotent UPSERT, role allowlist excluding `'admin'`) because the client INSERT was being silently rejected by RLS. | Original intent kept: clicking a role card persists the choice. Test 4 now asserts `supabase.rpc('set_user_role', { p_role: 'employer' })`. Used `vi.hoisted` for the rpc mock to avoid TDZ in the hoisted vi.mock factory (rpc is referenced eagerly, unlike the original `from: () => ({ insert })` lazy reference). |

---

## Per-Requirement Coverage Map

Built post-hoc against Phase 14 deliverables (BFIX-01/02/03 + bundled BFIX-04/05/NAV-02 + AUTH-FIX-02 mitigation).

| Requirement | Sub-phase | Coverage | Test file (or rationale) |
|---|---|---|---|
| **BFIX-01** Applied badge + Apply-tab gating | 14-01 | MISSING (deferred) | No Vitest spec. Manual UAT covered (commit body c6066ea + verification). Pure component logic — easy unit-test target if needed; deferred per TEST-01 spirit. |
| **BFIX-02** Edge Function 5-layer privacy gate | 14-03 | MANUAL-ONLY | Deno runtime — Vitest can't import the function. UAT B.4–B.6 PASS; B.9 (identity-bypass empirical) tracked as **PRIV-02** (public-launch blocker). |
| **BFIX-02** ApplicantDocuments sectioned UI | 14-03 | MISSING (deferred) | No Vitest spec. Architectural separation is straightforward; defer per TEST-01. |
| **BFIX-03** seeker_documents schema + RLS | 14-02 | MANUAL-ONLY | DB schema; verified via `mcp__supabase__list_tables` + employer-context query simulation. |
| **BFIX-03** DocumentUploader per-file type picker + INSERT | 14-02 | PARTIAL | Indirectly covered by repaired `seeker-step3-documents.test.tsx` Test 2 (DocumentUploader renders). Direct unit-test of the per-file commit + retry semantics deferred. |
| **BFIX-03** SeekerDocuments page (instant-save type, delete with storage cleanup) | 14-02 | MISSING (deferred) | Manual UAT B.2.11/12/13 PASS. |
| **BFIX-03** SeekerStep3Qualifications form separation (no document_urls coupling) | 14-02 | COVERED | `seeker-step3-documents.test.tsx` Test 3 (regression guard against re-coupling). |
| **BFIX-04** ApplicantDashboard query without first_name | 14-03 | MISSING (deferred) | Single-line removal; manual UAT covered. |
| **BFIX-05** Gateway-trust JWT decode | 14-03 | MANUAL-ONLY | Deno-runtime constraint. Pattern codified in `CLAUDE.md` item 5 + `.planning/retros/AUTH-RETRO.md` Arc 3 to prevent recurrence by future Claudes. |
| **NAV-02** Nav/Sidebar route fixes | 14-03 | MISSING (deferred) | Trivial visual smoke; manual UAT covered. |
| **AUTH-FIX-02** ProtectedRoute role-null guard | 14-02 (bundled) | COVERED | `tests/protected-route-oauth.test.tsx` ("redirects to /auth/select-role when session exists but role is null"). |
| **AUTH-02** set_user_role RPC | (out of phase, but bundled in 14-02 era) | COVERED | `tests/select-role.test.tsx` Test 4 (repaired in this commit). |

---

## Sampling Rate (going forward — recommendation, not retroactive contract)

- **After every task commit:** `npx vitest run --reporter=basic`
- **After every plan wave:** full `npm test` green
- **Before `/gsd:verify-work`:** full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Coverage |
|---|---|---|---|
| Edge Function 5-layer privacy gate | BFIX-02 | Deno runtime; Vitest can't import the function | UAT B.4–B.6 PASS; B.9 → **PRIV-02** (public-launch blocker) |
| Gateway-trust JWT decode pattern | BFIX-05 | Deno runtime | Pattern codified in `CLAUDE.md` + `AUTH-RETRO.md` |
| `seeker_documents` table schema + 4 RLS policies | BFIX-03 | DB schema | Verified via `mcp__supabase__list_tables` + simulated employer query |
| Migration 020 employer SELECT RLS policy | BFIX-02 | DB schema | Verified via `pg_policies` query during UAT |
| Identity-bypass empirical attack | PRIV-02 | Requires authenticated employer JWT + deployed function + DB attack vector | **DEFERRED — public-launch blocker.** Test snippet, expected response, hard-fail criterion in REQUIREMENTS.md |

---

## Deferred (row B — new spec generation)

Per TEST-01 reasoning carried forward: pre-launch with ~15 active screens, manual UAT works at this scale; new Vitest spec generation reactively when there's a proven need (regression observed, multi-dev contention, CI-gate requirement). The audit identified candidate gaps but did NOT generate new specs:

- BFIX-01 Applied badge + status-suffixed copy + Apply-tab gating → suggested file `tests/applied-status-badge.test.tsx`
- BFIX-03 SeekerDocuments page → suggested file `tests/seeker-documents-page.test.tsx`
- BFIX-04 first_name regression guard → suggested addition to existing or new applicant-dashboard test
- BFIX-02 ApplicantDocuments sectioned UI → suggested file `tests/applicant-documents-sectioned.test.tsx`

Reactive trigger for any of the above: a regression observed in production OR a multi-dev contention OR addition of a CI gate.

---

## Validation Sign-Off

- [x] Test infrastructure detected (Vitest 3.1.1, `vitest.config.ts`)
- [x] Coverage map built post-hoc against all Phase 14 requirements
- [x] Stale tests repaired (2 files; 4 prior failures now pass)
- [x] Manual-only bucket explicit (Deno-runtime + DB-schema + empirical-attack reasons)
- [x] Deferred new-spec bucket explicit with reactive triggers
- [ ] `nyquist_compliant: true` — **NOT SET.** Phase 14 was executed without a Wave 0 gate, by explicit pre-launch decision (TEST-01). Setting to `true` retroactively would misrepresent the contract that was actually in force.

**Approval:** post-hoc audit completed 2026-04-29. Future phases may or may not adopt full Nyquist gating — that's a per-phase contract decision.
