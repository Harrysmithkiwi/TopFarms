-- 057_constrain_visa_status_vocab.sql
-- Pin seeker_profiles.visa_status to the vocabulary compute_match_score reads,
-- so a typo / off-vocabulary value can't silently zero the visa dimension.
--
-- Consumed by compute_match_score (migration 009, the "Visa (5 pts)" block):
--   visa_status IN ('nz_citizen','permanent_resident')                       -> visa = 5
--   visa_status IN ('working_holiday','needs_sponsorship') AND job.visa_sponsorship -> visa = 5
-- 'student' is a valid onboarding UI value (VISA_OPTIONS in src/types/domain.ts)
--   that scoring treats as 0 (unscored) — allowed here so the constraint does not
--   break the form. NULL is allowed: seeker_profiles rows persist mid-onboarding.
--
-- Scope note: this constrains ONLY the one column with a live scoring dependency.
-- jobs.role_type and jobs.visa_requirements are NOT read by compute_match_score
-- (verified against the live function 2026-07-08) — their vocab is a cross-surface
-- matchability concern, routed to roadmap items EM-1 / EM-3, not this migration.
--
-- Correctness gaps NOT fixed here (tracked in .planning/DECISIONS-PENDING.md PEND-02):
--   (1) NULL visa_status scores 0 even for an actual citizen/PR who left it blank.
--   (2) Visa is a soft 5-pt weight, not the hard gate the demand-signal study wants (MA-1).

-- 1. CLEANUP: none required as of 2026-07-08. Live distinct values are
--    nz_citizen (2) and NULL (1); no off-vocabulary strings exist, so VALIDATE
--    will not fail on legacy data. The NULL row is retained deliberately — do NOT
--    fabricate a visa status. If applied later, re-run the distinct-value check and
--    backfill any new off-vocab value to its intended term before step 2, e.g.:
--      -- update public.seeker_profiles set visa_status = '<intended_term>'
--      --   where visa_status is not null
--      --     and visa_status not in ('nz_citizen','permanent_resident','working_holiday','student','needs_sponsorship');

-- 2. CONSTRAINT: add NOT VALID then VALIDATE (safe pattern; table is tiny now, grows later).
alter table public.seeker_profiles
  add constraint seeker_profiles_visa_status_check
  check (
    visa_status is null
    or visa_status in ('nz_citizen','permanent_resident','working_holiday','student','needs_sponsorship')
  ) not valid;

alter table public.seeker_profiles
  validate constraint seeker_profiles_visa_status_check;
