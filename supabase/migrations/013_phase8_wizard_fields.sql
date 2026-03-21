-- ============================================================
-- 013_phase8_wizard_fields.sql
-- TopFarms — Phase 8 Wizard Field Extensions
-- Adds all new columns for employer_profiles, jobs, seeker_profiles
-- and migrates boolean accommodation columns to text[] array
-- ============================================================

-- ============================================================
-- 1. employer_profiles: new columns
-- ============================================================
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS farm_types text[],
  ADD COLUMN IF NOT EXISTS nearest_town text,
  ADD COLUMN IF NOT EXISTS distance_from_town_km text,
  ADD COLUMN IF NOT EXISTS career_development text[],
  ADD COLUMN IF NOT EXISTS hiring_frequency text,
  ADD COLUMN IF NOT EXISTS couples_welcome bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_role text,
  ADD COLUMN IF NOT EXISTS accommodation_extras text[],
  ADD COLUMN IF NOT EXISTS vehicle_provided bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicle_types text[],
  ADD COLUMN IF NOT EXISTS broadband_available bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_min int,
  ADD COLUMN IF NOT EXISTS salary_max int,
  ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';

-- ============================================================
-- 2. Boolean-to-array migration for accommodation fields
-- ============================================================

-- Step 1: Populate accommodation_extras from existing boolean columns
UPDATE public.employer_profiles SET accommodation_extras = ARRAY[]::text[]
  || CASE WHEN accommodation_pets = true THEN ARRAY['Pets allowed'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_couples = true THEN ARRAY['Couples welcome'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_family = true THEN ARRAY['Family welcome'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_utilities_included = true THEN ARRAY['Utilities included'] ELSE ARRAY[]::text[] END
WHERE accommodation_extras IS NULL;

-- Step 2: Drop old boolean columns
ALTER TABLE public.employer_profiles
  DROP COLUMN IF EXISTS accommodation_pets,
  DROP COLUMN IF EXISTS accommodation_couples,
  DROP COLUMN IF EXISTS accommodation_family,
  DROP COLUMN IF EXISTS accommodation_utilities_included;

-- ============================================================
-- 3. jobs table: new columns
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS breed text,
  ADD COLUMN IF NOT EXISTS milking_frequency text,
  ADD COLUMN IF NOT EXISTS calving_system text,
  ADD COLUMN IF NOT EXISTS farm_area_ha int,
  ADD COLUMN IF NOT EXISTS nearest_town text,
  ADD COLUMN IF NOT EXISTS distance_from_town_km text,
  ADD COLUMN IF NOT EXISTS min_dairy_experience text,
  ADD COLUMN IF NOT EXISTS seniority_level text,
  ADD COLUMN IF NOT EXISTS qualifications text[],
  ADD COLUMN IF NOT EXISTS visa_requirements text[],
  ADD COLUMN IF NOT EXISTS pay_frequency text,
  ADD COLUMN IF NOT EXISTS on_call_allowance bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hours_min int,
  ADD COLUMN IF NOT EXISTS hours_max int,
  ADD COLUMN IF NOT EXISTS weekend_roster text,
  ADD COLUMN IF NOT EXISTS benefits text[];

-- Update jobs sector constraint to add new sectors
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_sector_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_sector_check
  CHECK (sector IN ('dairy', 'sheep_beef', 'cropping', 'deer', 'mixed', 'other'));

-- ============================================================
-- 4. seeker_profiles: new columns
-- ============================================================
ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS licence_types text[],
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS housing_sub_options text[],
  ADD COLUMN IF NOT EXISTS preferred_regions text[],
  ADD COLUMN IF NOT EXISTS notice_period_text text;
