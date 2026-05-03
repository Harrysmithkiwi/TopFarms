---
phase: 12-oauth-authentication
test: UAT-04
type: partial-closure-evidence
date: 2026-05-04
verdict: PARTIAL — sign-in / account-linking sub-test PASS; new-user round-trip still pending
sub_tests:
  - name: "Google OAuth sign-in for existing email-provider account (account auto-linking)"
    status: PASS
    date: 2026-05-04
  - name: "Google OAuth sign-up for brand-new user (handle_new_user trigger + SelectRole + profiles auto-creation)"
    status: PENDING
    blocker: requires fresh Google account whose email is not already in auth.users
closes:
  - "v2.0-MILESTONE-AUDIT.md tech_debt: 'Account-linking UAT (same email across providers) deferred' — empirically verified PASS this session"
carryforward:
  - "UAT-04 stays [ ] in REQUIREMENTS / milestone tracking until new-user round-trip sub-test completes with a fresh Google account"
---

# UAT-04 — Google OAuth Round-Trip (Partial Closure)

**Status:** PARTIAL — sign-in / account-linking sub-test PASS. New-user round-trip still pending.
**Date:** 2026-05-04 morning
**Test URL:** `https://top-farms.vercel.app`
**Test account:** `harry.moonshot@gmail.com` (existing email-provider seeker, `auth.users.id = e89983d5-8efa-48f1-baa2-741033a6b9dd`)

---

## Sign-in / account-linking sub-test — PASS

Existing email-provider account signed in via Google OAuth. Supabase auto-linked the Google identity to the existing email-provider auth.users record. No manual link prompt required.

### Pre/post auth state diff

| Field | Pre-test (recon) | Post-test | Diff |
|---|---|---|---|
| `auth.users.providers` | `["email"]` | `["email", "google"]` | **+google** |
| `auth.users.last_sign_in_at` | 2026-04-28 23:24:52 | 2026-05-03 22:16:10 | updated |
| `auth.users.raw_user_meta_data.iss` | (not set) | `https://accounts.google.com` | populated |
| `auth.users.raw_user_meta_data.name` | (not set) | `Harry Smith` | populated from Google profile |
| `auth.identities` rows | 1 (email) | 2 (email + google) | **+1 google identity** |
| Google identity `sub` | n/a | `107628481048968421669` | new link |
| `user_roles` rows | 1 (seeker) | 1 (seeker) | unchanged (existing user, no new role) |
| `seeker_profiles` rows | 1 | 1 | unchanged |

### What this empirically proves

- Supabase Google OAuth provider config in production (client_id / client_secret / callback URL whitelisting)
- Account auto-linking — same-email cross-provider linkage works without manual intervention
- Session establishment + redirect through `/auth/select-role` (skipped for existing role) → `/dashboard/seeker`
- AuthContext role detection works in time to route correctly post-callback

User-visible flow: clicked "Sign In" → Google consent → landed on `/dashboard/seeker`. Clean. No errors.

---

## New-user round-trip sub-test — PENDING

What this sub-test would exercise (none of which the sign-in test touches):

- `handle_new_user` trigger firing for a brand-new auth.users insert with provider=google
- `SelectRole.tsx` UI rendering for a user with no role → role pick → `set_user_role` RPC invocation
- `seeker_profiles` or `employer_profiles` auto-creation on first role selection
- Onboarding wizard entry on first sign-up

**Blocker:** requires a fresh Google account whose email is not already in `auth.users`. Harry's primary Google (`harry.symmans.smith`) and `harry.moonshot` are both already in the table.

**Carryforward:** UAT-04 stays `[ ]` until new-user sub-test runs successfully. Estimated effort: ~10 min including fresh Gmail signup if no spare account is handy.

---

## Adjacent finding (closes a separate Phase 12 deferral)

`v2.0-MILESTONE-AUDIT.md` Phase 12 tech_debt listed two separate deferrals:

1. UAT-04 (this file)
2. **"Account-linking UAT (same email across providers) deferred — manual-only verification"**

Item 2 is empirically closed by the sign-in sub-test above — Supabase's auto-linking behavior is now documented with pre/post state diff. The "manual-only verification" caveat no longer applies; we have data-layer proof.

---

## References

- pre-test recon queries + post-test state diff captured 2026-05-04 morning via `mcp__supabase__execute_sql` (read-only)
- `src/contexts/AuthContext.tsx:195-200` — `signInWithOAuth` wiring, `redirectTo: ${origin}/auth/select-role`
- `src/pages/auth/SelectRole.tsx:34` — `set_user_role` RPC call (skipped for existing-role users)
- `supabase/migrations/001_initial_schema.sql` — `handle_new_user` trigger (only inserts user_roles row)
