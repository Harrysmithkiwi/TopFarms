-- ============================================================
-- 001_initial_schema.sql
-- TopFarms — Initial database schema
-- 14 tables with RLS enabled immediately after creation
-- ============================================================

-- ============================================================
-- 1. user_roles
-- ============================================================
CREATE TABLE public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('employer', 'seeker', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. employer_profiles
-- ============================================================
CREATE TABLE public.employer_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name         text,
  farm_type         text,
  ownership_type    text,
  region            text,
  shed_type         text[],
  herd_size         int,
  milking_frequency text,
  breed             text,
  calving_system    text,
  distance_from_town int,
  about_farm        text,
  verification_tier int NOT NULL DEFAULT 1,
  subscription_tier text,
  stripe_customer_id text,
  rating            float,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employer_profiles_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. seeker_profiles
-- NOTE: No phone/email columns — those live in seeker_contacts
-- ============================================================
CREATE TABLE public.seeker_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region               text,
  open_to_relocate     bool NOT NULL DEFAULT false,
  sector_pref          text[],
  role_type_pref       text[],
  years_experience     int,
  accommodation_needed bool NOT NULL DEFAULT false,
  housing_type_pref    text,
  pets                 jsonb,
  couples_seeking      bool NOT NULL DEFAULT false,
  family               jsonb,
  visa_status          text,
  min_salary           int,
  availability_date    date,
  notice_period        int,
  profile_complete_pct int NOT NULL DEFAULT 0,
  open_to_work         bool NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seeker_profiles_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.seeker_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. seeker_contacts
-- Separate table for contact masking — strict RLS
-- ============================================================
CREATE TABLE public.seeker_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      text,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seeker_contacts_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.seeker_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. skills
-- ============================================================
CREATE TABLE public.skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL,
  sector   text NOT NULL CHECK (sector IN ('dairy', 'sheep_beef', 'both'))
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. jobs
-- ============================================================
CREATE TABLE public.jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id      uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  source           text NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'scraped')),
  sector           text NOT NULL CHECK (sector IN ('dairy', 'sheep_beef')),
  role_type        text NOT NULL,
  title            text NOT NULL,
  region           text NOT NULL,
  shed_type        text[],
  herd_size_min    int,
  herd_size_max    int,
  salary_min       int,
  salary_max       int,
  contract_type    text NOT NULL CHECK (contract_type IN ('permanent', 'contract', 'casual')),
  start_date       date,
  accommodation    jsonb,
  visa_sponsorship bool NOT NULL DEFAULT false,
  couples_welcome  bool NOT NULL DEFAULT false,
  description_overview  text,
  description_daytoday  text,
  description_offer     text,
  description_ideal     text,
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'filled', 'expired', 'archived')),
  listing_tier     int NOT NULL DEFAULT 1,
  confidence_score float,
  views_count      int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  CONSTRAINT jobs_salary_check CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Indexes for jobs
CREATE INDEX jobs_region_idx ON public.jobs (region);
CREATE INDEX jobs_sector_idx ON public.jobs (sector);
CREATE INDEX jobs_shed_type_idx ON public.jobs USING GIN (shed_type);
CREATE INDEX jobs_status_idx ON public.jobs (status);
CREATE INDEX jobs_employer_id_idx ON public.jobs (employer_id);

-- ============================================================
-- 7. job_skills
-- ============================================================
CREATE TABLE public.job_skills (
  job_id            uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_id          uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  requirement_level text NOT NULL DEFAULT 'preferred' CHECK (requirement_level IN ('required', 'preferred')),
  PRIMARY KEY (job_id, skill_id)
);

ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. seeker_skills
-- ============================================================
CREATE TABLE public.seeker_skills (
  seeker_id        uuid NOT NULL REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  skill_id         uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency      text NOT NULL DEFAULT 'competent' CHECK (proficiency IN ('learning', 'competent', 'experienced', 'expert')),
  willing_to_learn bool NOT NULL DEFAULT false,
  PRIMARY KEY (seeker_id, skill_id)
);

ALTER TABLE public.seeker_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. match_scores
-- ============================================================
CREATE TABLE public.match_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id     uuid NOT NULL REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  total_score   int NOT NULL,
  breakdown     jsonb NOT NULL DEFAULT '{}',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_scores_job_seeker_key UNIQUE (job_id, seeker_id)
);

ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

-- Indexes for match_scores
CREATE INDEX match_scores_job_id_idx ON public.match_scores (job_id);
CREATE INDEX match_scores_seeker_id_idx ON public.match_scores (seeker_id);

-- ============================================================
-- 10. applications
-- ============================================================
CREATE TABLE public.applications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id  uuid NOT NULL REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  cover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_job_seeker_key UNIQUE (job_id, seeker_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Indexes for applications
CREATE INDEX applications_job_id_idx ON public.applications (job_id);
CREATE INDEX applications_seeker_id_idx ON public.applications (seeker_id);

-- ============================================================
-- 11. listing_fees
-- ============================================================
CREATE TABLE public.listing_fees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id       uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  tier              int NOT NULL,
  amount_nzd        int NOT NULL,
  stripe_payment_id text,
  paid_at           timestamptz
);

ALTER TABLE public.listing_fees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. placement_fees
-- ============================================================
CREATE TABLE public.placement_fees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id   uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id      uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  seeker_id        uuid NOT NULL REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  acknowledged_at  timestamptz,
  confirmed_at     timestamptz,
  amount_nzd       int,
  stripe_invoice_id text
);

ALTER TABLE public.placement_fees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 13. message_threads (Growth Phase — create but leave unused in MVP)
-- ============================================================
CREATE TABLE public.message_threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  employer_id      uuid REFERENCES public.employer_profiles(id) ON DELETE SET NULL,
  seeker_id        uuid REFERENCES public.seeker_profiles(id) ON DELETE SET NULL,
  contact_released bool NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 14. messages (Growth Phase — create but leave unused in MVP)
-- ============================================================
CREATE TABLE public.messages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body      text NOT NULL,
  flagged   bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
