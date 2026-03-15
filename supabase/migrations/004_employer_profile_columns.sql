-- ============================================================
-- 004_employer_profile_columns.sql
-- TopFarms — Employer profile columns for onboarding
-- Adds missing columns needed for Phase 2 onboarding wizard
-- ============================================================

-- Culture & work environment (EONB-04)
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS culture_description text,
  ADD COLUMN IF NOT EXISTS team_size int;

-- Accommodation details (EONB-05)
-- Using structured columns rather than jsonb for easier querying
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS accommodation_available bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_type text,
  ADD COLUMN IF NOT EXISTS accommodation_pets bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_couples bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_family bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_utilities_included bool NOT NULL DEFAULT false;

-- Onboarding progress tracking (EONB-06)
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_complete bool NOT NULL DEFAULT false;

-- Property size (EONB-03)
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS property_size_ha int;
