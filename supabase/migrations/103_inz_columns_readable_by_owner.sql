-- 103 — the onboarding wizard could write accreditation but not read it back
--
-- The defect: migration 059 replaced the table-level SELECT grant on `employer_profiles` with an
-- explicit per-column list. Migration 091 then added `inz_accredited`,
-- `inz_accreditation_expires` and `inz_accredited_verified_at` with a plain ALTER TABLE ADD
-- COLUMN, which inherits nothing from that list. **Every column added after 059 lands
-- unreadable by `authenticated` unless a migration says otherwise**, and 091 did not.
--
-- INSERT and UPDATE were untouched by 059, so the asymmetry is: the wizard SAVES an accreditation
-- claim successfully, and then cannot read it back. `EmployerOnboarding.tsx:96` names both
-- columns in its explicit select list, so a returning employer's resume-load raises 42501, the
-- Phase 5.6 guard correctly refuses to treat a failed fetch as "no profile", and the wizard stops
-- on an error screen. It is invisible today only because prod has zero employer profiles — there
-- is no row to fail on. The first real employer who closes the tab and comes back hits it.
--
-- Surfaced by Sentry issue TOPFARMS-WEB-7, 2026-08-18, which reported it as
-- `Error loading profile: [object Object]` — the console.error at line 103 hands Sentry a
-- PostgrestError it cannot stringify, so the alert names the symptom and destroys the cause.
-- That line moves to `reportError()` in the same change set; this file fixes the schema half.
--
-- `inz_accredited_verified_at` is deliberately NOT granted. `AdminDocumentsQueue` reaches it
-- through the `admin_list_document_queue` RPC, which is SECURITY DEFINER behind `_admin_gate()`
-- and so does not consult these grants at all. D4 Stage 1 ruled that nothing renders verified
-- accreditation to a seeker yet; granting the timestamp now would widen the read surface for a
-- reader that does not exist. It lands with the badge or not at all.
--
-- `anon` is likewise untouched. Public accreditation is projected by
-- `marketplace_employer_profiles` as the computed `accredited_employer` boolean, which recomputes
-- against the expiry on every read. Anonymous visitors read the verdict, never the claim.

GRANT SELECT (
  inz_accredited, inz_accreditation_expires
) ON public.employer_profiles TO authenticated;

COMMENT ON TABLE public.employer_profiles IS
  'Employer farm profile. SELECT is granted PER COLUMN (migration 059) — a new column added by ALTER TABLE is unreadable by anon and authenticated until a migration grants it explicitly. Extend the grant in the same migration that adds the column, or the client select that names it will 42501. Precedent: 091 added the inz columns and 103 had to repair them.';
