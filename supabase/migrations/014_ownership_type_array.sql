-- ============================================================
-- 014_ownership_type_array.sql
-- Fix ownership_type column: text -> text[] to support ChipSelector multi-select
-- ============================================================

ALTER TABLE public.employer_profiles
  ALTER COLUMN ownership_type TYPE text[]
  USING CASE
    WHEN ownership_type IS NULL THEN NULL
    ELSE ARRAY[ownership_type]
  END;
