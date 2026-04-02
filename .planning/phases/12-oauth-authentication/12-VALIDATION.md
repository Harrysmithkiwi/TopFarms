---
phase: 12
slug: oauth-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 + @testing-library/react 16.3.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/oauth-buttons.test.tsx tests/select-role.test.tsx tests/protected-route-oauth.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/oauth-buttons.test.tsx tests/select-role.test.tsx tests/protected-route-oauth.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | AUTH-06/07/08 | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | AUTH-08 | unit | `npx vitest run tests/select-role.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 0 | AUTH-08 | unit | `npx vitest run tests/protected-route-oauth.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | AUTH-06/07 | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 1 | AUTH-08 | unit | `npx vitest run tests/select-role.test.tsx` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 1 | AUTH-08 | unit | `npx vitest run tests/protected-route-oauth.test.tsx` | ❌ W0 | ⬜ pending |
| 12-XX-XX | — | — | AUTH-06/07 | manual | — | N/A | ⬜ pending |
| 12-XX-XX | — | — | AUTH-08 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/oauth-buttons.test.tsx` — stubs for AUTH-06, AUTH-07 (button render + click behavior on Login and SignUp)
- [ ] `tests/select-role.test.tsx` — stubs for AUTH-08 (SelectRole page render, redirect, role insert)
- [ ] `tests/protected-route-oauth.test.tsx` — stubs for AUTH-08 (ProtectedRoute role-null redirect)

*Existing `tests/setup.ts` and `tests/signup-role-preselect.test.tsx` patterns are directly reusable as templates.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full Google OAuth redirect → consent → return → role selection | AUTH-06 | Requires live Google consent screen + Supabase project | Click "Sign in with Google" on Login page, complete Google flow, verify landing on SelectRole page |
| Full Facebook OAuth redirect → consent → return → role selection | AUTH-07 | Requires live Facebook consent screen + Supabase project | Click "Continue with Facebook" on Login page, complete Facebook flow, verify landing on SelectRole page |
| Returning OAuth user with existing role skips SelectRole | AUTH-08 | Requires real Supabase session with existing user_roles record | Log in with previously-registered OAuth account, verify direct routing to dashboard |
| Account linking: same email across providers | AUTH-06/07 | Requires two provider accounts with same email | Sign in with Google, then sign in with Facebook using same email, verify single Supabase user |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
