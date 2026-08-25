---
phase: 12-oauth-authentication
test: UAT-04
type: closure-evidence
date: 2026-05-04
verdict: PASS — both sub-tests empirically verified
sub_tests:
  - name: "Google OAuth sign-in for existing email-provider account (account auto-linking)"
    status: PASS
    date: 2026-05-04 morning
    test_account: harry.moonshot@gmail.com
  - name: "Google OAuth sign-up for brand-new user (handle_new_user trigger + auto-default role + profiles auto-creation + onboarding wizard E2E)"
    status: PASS
    date: 2026-05-04 afternoon
    test_account: harry.properprivacy@gmail.com
closes:
  - "v2.0-MILESTONE-AUDIT.md tech_debt: 'Account-linking UAT (same email across providers) deferred' — empirically verified PASS this session"
  - "v2.0-MILESTONE-AUDIT.md Public-Launch Blocker #5 (UAT-04 Google OAuth full round-trip smoke) — fully closed"
references:
  - "src/contexts/AuthContext.tsx, src/pages/auth/SelectRole.tsx, src/pages/onboarding/SeekerOnboarding.tsx"
  - "supabase/migrations/001_initial_schema.sql (handle_new_user trigger)"
---

# UAT-04 — Google OAuth Round-Trip (Closure Evidence)

**Status:** PASS — both sub-tests empirically verified.
**Test URL:** `https://top-farms.vercel.app` (production)

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

## New-user round-trip sub-test — PASS *(closed 2026-05-04 afternoon)*

Brand-new Google account `harry.properprivacy@gmail.com` (verified absent from `auth.users` pre-test, count=0) signed up via Google OAuth. Full chain executed end-to-end: Google consent → callback → `handle_new_user` trigger → seeker_profiles auto-created via onboarding wizard → all 7 onboarding steps completed → match scores computed → landed on job search.

### Post-test state snapshot (via MCP read-only)

| Field | Value |
|---|---|
| `auth.users.id` | `645e6975-9556-4813-ac5a-7d9ce934c21f` |
| `auth.users.created_at` | 2026-05-04 00:27:30 UTC |
| `auth.users.last_sign_in_at` | 2026-05-04 00:34:38 UTC |
| `auth.users.providers` | `["email", "google"]` |
| `auth.users.raw_user_meta_data.iss` | `https://accounts.google.com` |
| `auth.users.raw_user_meta_data.name` | `Harry Smith` (from Google profile) |
| `auth.identities` rows | **2** (1 email + 1 google) |
| `user_roles.role` | **`seeker`** ✅ (handle_new_user fired with `COALESCE(metadata.role, 'seeker')` default) |
| `seeker_profiles.id` | `becfec19-de0a-4dde-a828-dc1e32e92da9` ✅ created |
| `seeker_profiles.region` | `Waikato` (entered during wizard) |
| `match_scores` rows | **1** ✅ (computed for the new seeker) |

### What this empirically proves

- **`handle_new_user` trigger fires for OAuth path** — first-time empirical proof. Previous users (harry.symmans.smith, harry.moonshot) were both pre-existing email-provider, so their auth.users INSERT predated migration 001's trigger or fired without Google metadata.
- **Default role assignment works** — Google OAuth doesn't pass role in metadata; `COALESCE(metadata.role, 'seeker')` correctly defaults to `'seeker'`.
- **Two identity rows created** — Supabase's auto-linking creates an implicit email identity alongside the google identity, even for OAuth-only signup.
- **seeker_profiles auto-creation via onboarding upsert path** — wizard's `handleStepComplete` upsert (`onConflict: 'user_id'`) creates the row on first save.
- **Match scores computed for a brand-new seeker** — match_scores trigger / cron picks up the new seeker_profiles row and computes scores against active jobs. End-to-end matching pipeline empirically functional for new signups.

### SelectRole UI bypass — confirmed (not a bug, but a Phase 18 design call)

OAuth signups do NOT see the SelectRole role-picker UI: `handle_new_user` defaults role to `'seeker'`, AuthContext refreshRole detects role exists, and `SelectRole.tsx:29` (`if (role) <Navigate>`) redirects past the picker. Logged as Phase 18 entry 21 — design call: leave (default-seeker is fine for marketing funnel) OR null out role for OAuth so SelectRole renders.

### Onboarding completion bug discovered + fixed during this test

The new-user round-trip surfaced BUG-03 — SeekerStep7Complete had no completion handler, so `onboarding_complete` stayed `false` even after wizard finished. harry.properprivacy's `seeker_profiles.onboarding_complete` is currently `false` in DB; will self-heal on next visit via the fix in commit `eb7e2f1`. See SESSION-HANDOFF-2026-05-04.md for details.

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
