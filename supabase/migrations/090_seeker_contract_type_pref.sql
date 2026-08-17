-- 090 — A seeker can say what kind of work they want (audit gap G-1)
--
-- Found by reading six real job-seeker posts the operator saved from NZ farming Facebook
-- groups. **Four of the six want relief or part-time work, not a permanent full-time job:**
--
--   "I have been relief milking for a couple weeks now and will continue to do so"
--   "looking for a part time farm assistant role" … "relief milking and other jobs"
--   "looking for long term may consider relief milking services"
--   "Relief Milking Job wanted"
--
-- That is the shape of this labour market. It was not the shape the schema assumed.
--
-- `jobs` already carries `contract_type` (permanent/contract/casual), `hours_min`,
-- `hours_max` and `weekend_roster`, and `/jobs` already filters on contract_type. The
-- asymmetry was on the other side: **`seeker_profiles` had no employment-type field at all**,
-- so a seeker could state the role they want but never the terms. Someone who only wants
-- relief had to present as though they wanted a permanent job.
--
-- `role_type_pref` partly covered this because 'Relief Milker' is a role — but a role is not
-- a term. Three of these posts say some version of "a permanent job OR relief", which the
-- role list cannot express, and relief work exists outside milking (Alex offers relief plus
-- "other jobs around the farm"; one partner is a dietician "available for relief work").
--
-- Values mirror `jobs_contract_type_check` exactly, so a preference and a listing are
-- comparable without a mapping layer — the same fork that made every role filter on /jobs
-- return zero results until F-22 (087..089 session). Nullable and no default, matching
-- `sector_pref` / `role_type_pref` / `licence_types` on this table: absent means "not stated",
-- which is different from "wants nothing".
--
-- NOT wired into `compute_match_score`. Worth stating plainly: that function reads neither
-- `role_type` nor `contract_type` today, so this sharpens the profile and gives the seeker
-- somewhere honest to put the truth — it does not yet change ranking. Making terms a scoring
-- dimension is a separate decision with its own weight budget.

BEGIN;

ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS contract_type_pref text[];

-- Same allowlist as jobs.contract_type. A NULL array is "not stated"; an empty array is the
-- same thing and is allowed rather than special-cased.
ALTER TABLE public.seeker_profiles
  DROP CONSTRAINT IF EXISTS seeker_profiles_contract_type_pref_check;

ALTER TABLE public.seeker_profiles
  ADD CONSTRAINT seeker_profiles_contract_type_pref_check
  CHECK (
    contract_type_pref IS NULL
    OR contract_type_pref <@ ARRAY['permanent', 'contract', 'casual']::text[]
  );

COMMENT ON COLUMN public.seeker_profiles.contract_type_pref IS
  'What kind of engagement this seeker wants, mirroring jobs.contract_type exactly (audit gap G-1). Added 2026-08-17 after four of six real Facebook seeker posts turned out to want relief or part-time work with nowhere to say so. NULL means not stated, not "wants nothing".';

COMMIT;
