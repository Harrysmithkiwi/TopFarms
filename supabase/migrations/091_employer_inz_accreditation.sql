-- 091 — "Are you an accredited employer?" becomes answerable (seeker gap G-13)
--
-- Across 23 real job-seeker posts saved from NZ farming Facebook groups, 30% are visa-touched
-- and three name a specific visa product. The recurring question is NOT the one we can answer:
--
--   "looking to secure a long-term position with an ACCREDITED EMPLOYER in advance"   (vet)
--   "willing to support the visa process (such as the Accredited Employer Work Visa)"  (NC II)
--   "Do you have right to work in NZ or seeking an accredited employer?"    (public comment)
--   "LOOKING FOR A PEAK SEASONAL VISA SPONSOR"                             (calf rearer)
--
-- `jobs.visa_sponsorship` is a boolean meaning "will you sponsor". **AEWV accreditation is a
-- specific INZ status a farm either holds or does not, and without it a migrant cannot apply at
-- all** — no job check, no visa, regardless of how willing the farm is. A boolean about
-- willingness cannot answer a question about status, and no seeker can filter on it. So today
-- these people go farm by farm asking in comments, which is exactly the manual sorting the
-- product exists to remove.
--
-- ── why an expiry is required, not optional ─────────────────────────────────────────────
--
-- INZ accreditation always expires — first grant ~12 months, renewals ~24. A lapsed
-- accreditation is WORSE than none: a migrant who relies on it and applies has wasted the fee
-- and, for a seasonal visa, possibly the season. So the claim carries its own use-by date and
-- the public projection recomputes it on every read. An employer who lets it lapse silently
-- stops advertising it. Nobody has to remember to switch it off.
--
-- ── this is self-declared, and the projection says so by construction ───────────────────
--
-- Verification against the INZ accredited-employer list API (NZBN + expiry) is feasibility-
-- confirmed and NOT built. Until it is, this is an employer's own statement. That is a real
-- limitation on a surface migrants make decisions on, so:
--
--   * the view exposes a single derived boolean, not the raw date — nothing here should read
--     as an audited fact with a precise expiry,
--   * `inz_accredited_verified_at` exists now, unused and always NULL, so the day the API
--     lands there is somewhere to put the answer and the UI already has the axis to
--     distinguish "employer says" from "INZ confirms",
--   * the F-11 lesson applies: a trust claim the browser can assert is not a verified one.
--     This is deliberately NOT part of employer_verifications and does NOT feed the trust
--     ladder — it is a filterable attribute, not a badge that was earned.

BEGIN;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS inz_accredited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inz_accreditation_expires date,
  ADD COLUMN IF NOT EXISTS inz_accredited_verified_at timestamptz;

-- Claiming accreditation requires saying until when. Nothing else on this table is a claim a
-- third party will act on, so nothing else needs this treatment.
ALTER TABLE public.employer_profiles
  DROP CONSTRAINT IF EXISTS employer_profiles_inz_accreditation_expiry_check;

ALTER TABLE public.employer_profiles
  ADD CONSTRAINT employer_profiles_inz_accreditation_expiry_check
  CHECK (inz_accredited = false OR inz_accreditation_expires IS NOT NULL);

COMMENT ON COLUMN public.employer_profiles.inz_accredited IS
  'Employer states they hold INZ accredited-employer status (seeker gap G-13). SELF-DECLARED — verification against the INZ list API is not built. Requires inz_accreditation_expires. Deliberately not part of employer_verifications: this is a filterable attribute, not an earned badge.';

COMMENT ON COLUMN public.employer_profiles.inz_accreditation_expires IS
  'When the stated accreditation lapses. Required whenever inz_accredited is true — the marketplace projection recomputes against it on every read, so a lapsed claim stops advertising itself with no action from anyone.';

COMMENT ON COLUMN public.employer_profiles.inz_accredited_verified_at IS
  'Reserved for INZ list-API verification (NZBN + expiry), which is feasibility-confirmed and NOT built. Always NULL today. Exists so the day it lands there is somewhere to put the answer, and the UI can distinguish "employer says" from "INZ confirms".';

-- ── the public projection ───────────────────────────────────────────────────────────────
-- Recreated rather than altered: 089 made this view the security boundary for
-- employer_profiles (owner-rights, its own WHERE), so it is re-stated in full here so the next
-- reader sees the whole contract in one place rather than reconstructing it from two files.
-- The 10 original columns are unchanged; `accredited_employer` is derived, so no raw date and
-- no lapsed claim ever leaves the table.
CREATE OR REPLACE VIEW public.marketplace_employer_profiles AS
  SELECT
    ep.id,
    ep.farm_name,
    ep.region,
    ep.farm_type,
    ep.shed_type,
    ep.herd_size,
    ep.accommodation_available,
    ep.accommodation_type,
    ep.accommodation_extras,
    ep.culture_description,
    (ep.inz_accredited AND ep.inz_accreditation_expires > current_date) AS accredited_employer
  FROM public.employer_profiles ep
  WHERE EXISTS (
    SELECT 1 FROM public.jobs j
     WHERE j.employer_id = ep.id
       AND j.status = ANY (ARRAY['active', 'paused', 'filled', 'expired'])
  );

-- CREATE OR REPLACE VIEW drops reloptions and grants, so 089's settings are re-applied.
-- Losing security_invoker=false here would silently take the marketplace dark for anon and
-- every logged-in seeker (089's whole point), so this is not optional bookkeeping.
ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = false);

REVOKE ALL ON public.marketplace_employer_profiles FROM anon, authenticated;
GRANT SELECT ON public.marketplace_employer_profiles TO anon, authenticated;

COMMENT ON VIEW public.marketplace_employer_profiles IS
  'The ONLY public projection of employer_profiles: 10 columns plus a derived accredited_employer flag, filtered to employers with a job in active/paused/filled/expired. Owner-rights (security_invoker=false) deliberately — this WHERE is the security boundary that replaced the base-table policy dropped in 089 (audit F-02). accredited_employer is recomputed per read against the expiry, so a lapsed claim disappears on its own; the raw date never leaves the table. Flipping security_invoker back on without restoring a base-table read policy takes the marketplace dark.';

COMMIT;
