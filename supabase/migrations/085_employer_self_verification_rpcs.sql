-- 085 — Employer self-verification RPCs (audit finding F-11)
--
-- Migration 073 revoked `status` and `verified_at` from `authenticated` so the browser
-- could not declare itself verified. Four of the five client writers were never updated
-- to match, so every one of them has been returning 42501 ever since:
--
--   EmployerVerification.tsx  status + verified_at   → denied, and retried on EVERY mount
--   PhoneVerification.tsx     status + verified_at   → denied, then toast.success() anyway
--   FarmPhotoUpload.tsx       status + verified_at   → denied
--   NzbnVerification.tsx      status                 → denied (no value is grantable)
--   DocumentUpload.tsx        correct shape          → works
--
-- `basic`, the first rung of the trust ladder, IS email-verified (useVerifications.ts:19),
-- so the ladder has been unclimbable from the bottom for every employer. Confirmed against
-- live column ACLs 2026-08-17: authenticated holds INSERT on
-- (employer_id, method, nzbn_number, document_url) and UPDATE on (document_url, nzbn_number).
--
-- Dropping the columns from the payloads is necessary but NOT sufficient, because two
-- methods must not go to 'pending':
--
--   email / phone  — the truth already lives in auth.users.{email,phone}_confirmed_at.
--                    GoTrue confirmed it; asking an admin to re-approve it is theatre.
--   farm_photo     — a "here's my place" richness signal, not an identity claim. The
--                    identity rung (nzbn OR document) stays admin-reviewed, so
--                    fully_verified still cannot be self-asserted. Operator decision,
--                    2026-08-17.
--
-- Both functions derive the employer from auth.uid() rather than taking an id, so a caller
-- can only ever act on their own row. SECURITY DEFINER also sidesteps the column grants
-- above entirely for these three methods; nzbn and document keep writing directly, with
-- `status` omitted so the DEFAULT 'pending' stands and the admin queue decides.

BEGIN;

-- ── email + phone ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.employer_sync_self_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id     uuid;
  v_email_confirmed timestamptz;
  v_phone_confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_employer_id
    FROM public.employer_profiles
   WHERE user_id = auth.uid();

  -- No employer profile yet (the hub can mount mid-onboarding). Nothing to sync, and
  -- this is not an error the employer can act on.
  IF v_employer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT email_confirmed_at, phone_confirmed_at
    INTO v_email_confirmed, v_phone_confirmed
    FROM auth.users
   WHERE id = auth.uid();

  IF v_email_confirmed IS NOT NULL THEN
    INSERT INTO public.employer_verifications (employer_id, method, status, verified_at)
    VALUES (v_employer_id, 'email', 'verified', v_email_confirmed)
    ON CONFLICT (employer_id, method) DO UPDATE
       SET status      = 'verified',
           verified_at = EXCLUDED.verified_at
     -- Re-calling is a no-op rather than churning verified_at on every hub mount.
     WHERE public.employer_verifications.status IS DISTINCT FROM 'verified';
  END IF;

  IF v_phone_confirmed IS NOT NULL THEN
    INSERT INTO public.employer_verifications (employer_id, method, status, verified_at)
    VALUES (v_employer_id, 'phone', 'verified', v_phone_confirmed)
    ON CONFLICT (employer_id, method) DO UPDATE
       SET status      = 'verified',
           verified_at = EXCLUDED.verified_at
     WHERE public.employer_verifications.status IS DISTINCT FROM 'verified';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.employer_sync_self_verifications() IS
  'Mirrors auth.users.{email,phone}_confirmed_at into employer_verifications for the calling employer (audit F-11). The browser cannot write `status` since 073; without this the trust ladder is unclimbable, because its first rung is email-verified.';

-- ── farm photo ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.employer_record_farm_photo(p_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'A photo URL is required';
  END IF;

  SELECT id INTO v_employer_id
    FROM public.employer_profiles
   WHERE user_id = auth.uid();

  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'No employer profile';
  END IF;

  INSERT INTO public.employer_verifications
         (employer_id, method, status, document_url, verified_at)
  VALUES (v_employer_id, 'farm_photo', 'verified', p_url, now())
  ON CONFLICT (employer_id, method) DO UPDATE
     SET document_url = EXCLUDED.document_url,
         status       = 'verified',
         verified_at  = now();
END;
$$;

COMMENT ON FUNCTION public.employer_record_farm_photo(text) IS
  'Records a farm photo as self-verified for the calling employer (audit F-11). Deliberately not admin-reviewed: the identity rung (nzbn OR document) stays gated, so fully_verified cannot be self-asserted. Scoped by auth.uid() — an employer can only verify their own row.';

REVOKE ALL ON FUNCTION public.employer_sync_self_verifications()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.employer_record_farm_photo(text)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.employer_sync_self_verifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_record_farm_photo(text)   TO authenticated;

COMMIT;
