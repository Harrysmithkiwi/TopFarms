-- 100 — One spelling of Manawatū-Whanganui (unfiled defect, found during Phase E)
--
-- Not in the DSA audit. Found while closing F-17 and confirmed against prod data.
--
-- ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
--
-- The same region was spelled two ways across the system, and BOTH were in production data:
--
--   lead_staging.structured->>'region' = 'Manawatū-Whanganui'   6 rows   (macron)
--   lead_staging.structured->>'region' = 'Manawatu-Whanganui'   6 rows   (no macron)
--
-- A 50/50 split of one region into two buckets. That is precisely the defect
-- `supabase/functions/_shared/leadGeo.ts` describes fixing BETWEEN the two edge functions —
-- and it fixed it by canonicalising to the macron form, while nobody noticed the APP used the
-- other one. Five sources were in disagreement:
--
--   src/lib/constants.ts              NZ_REGIONS          no macron   <- the app's canon
--   src/pages/jobs/steps/JobStep1Basics.tsx               no macron   <- its OWN copy
--   src/pages/onboarding/steps/Step2FarmDetails.tsx       no macron   <- its OWN copy
--   supabase/functions/_shared/leadGeo.ts                 MACRON
--   migration 061 (leads segmentation)                    MACRON
--   get_adjacent_regions (migration 009)                  no macron   <- this file
--
-- It matters because `compute_match_score` compares regions by EXACT STRING EQUALITY, and
-- `get_adjacent_regions` returns strings compared the same way. A seeker in one spelling never
-- matches a job in the other, and nothing anywhere reports the contradiction.
--
-- ── WHICH SPELLING WINS ────────────────────────────────────────────────────────────────
--
-- The macron. It is correct te reo in a New Zealand farming product, it is what leadGeo
-- already canonicalises TO (so the extractor produces it today), and it is what 061 uses. The
-- app moves to meet the data rather than the reverse. Cost is trivial: 1 seeker profile (in
-- Waikato), 0 jobs, and the 6 no-macron staging rows normalised below.
--
-- The two hand-written copies in the app are DELETED in the same commit and now import
-- NZ_REGIONS. Two copies of a list is how this diverged; a third would do it again.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_adjacent_regions(p_region text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE p_region
    WHEN 'Waikato'             THEN ARRAY['Bay of Plenty', 'Taranaki', 'Manawatū-Whanganui']
    WHEN 'Bay of Plenty'       THEN ARRAY['Waikato', 'Gisborne']
    WHEN 'Taranaki'            THEN ARRAY['Waikato', 'Manawatū-Whanganui']
    WHEN 'Manawatū-Whanganui'  THEN ARRAY['Taranaki', 'Waikato', 'Hawke''s Bay', 'Wellington']
    WHEN 'Canterbury'          THEN ARRAY['Otago', 'West Coast', 'Marlborough']
    WHEN 'Otago'               THEN ARRAY['Canterbury', 'Southland']
    WHEN 'Southland'           THEN ARRAY['Otago']
    WHEN 'West Coast'          THEN ARRAY['Canterbury', 'Nelson', 'Tasman']
    WHEN 'Hawke''s Bay'        THEN ARRAY['Manawatū-Whanganui', 'Gisborne']
    WHEN 'Gisborne'            THEN ARRAY['Hawke''s Bay', 'Bay of Plenty']
    WHEN 'Northland'           THEN ARRAY['Auckland']
    WHEN 'Auckland'            THEN ARRAY['Northland', 'Waikato']
    WHEN 'Nelson'              THEN ARRAY['Tasman', 'Marlborough', 'West Coast']
    WHEN 'Tasman'              THEN ARRAY['Nelson', 'Marlborough', 'West Coast']
    WHEN 'Marlborough'         THEN ARRAY['Nelson', 'Tasman', 'Canterbury']
    WHEN 'Wellington'          THEN ARRAY['Manawatū-Whanganui']
    -- Transitional: a row still carrying the no-macron form resolves to the same neighbours
    -- rather than silently returning an empty array and scoring 0 on location. Remove once
    -- nothing can write the old spelling.
    WHEN 'Manawatu-Whanganui'  THEN ARRAY['Taranaki', 'Waikato', 'Hawke''s Bay', 'Wellington']
    ELSE ARRAY[]::text[]
  END;
END;
$function$;

-- Normalise what is already stored. Measured before writing: 6 staging rows, 0 jobs,
-- 0 seeker profiles and 0 leads carry the no-macron form.
UPDATE public.lead_staging
   SET structured = jsonb_set(structured, '{region}', '"Manawatū-Whanganui"')
 WHERE structured->>'region' = 'Manawatu-Whanganui';

UPDATE public.leads            SET region = 'Manawatū-Whanganui' WHERE region = 'Manawatu-Whanganui';
UPDATE public.jobs             SET region = 'Manawatū-Whanganui' WHERE region = 'Manawatu-Whanganui';
UPDATE public.seeker_profiles  SET region = 'Manawatū-Whanganui' WHERE region = 'Manawatu-Whanganui';
UPDATE public.employer_profiles SET region = 'Manawatū-Whanganui' WHERE region = 'Manawatu-Whanganui';

COMMIT;
