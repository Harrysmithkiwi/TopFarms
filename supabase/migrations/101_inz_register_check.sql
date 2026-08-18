-- 101 — an admin checks the INZ register, and the system records that they did (D4 Stage 1)
--
-- `091` shipped `inz_accredited` as a SELF-DECLARED claim and reserved
-- `inz_accredited_verified_at` against the day it could be checked. This is that day.
--
-- Why there is no Edge Function: Stage 0 opened the register in a browser and watched the
-- network panel (docs/immigration/06-inz-register-verification.md). It IS keyed on NZBN and it
-- DOES publish an expiry — and INZ's terms of use forbid "scraping… automation, or any similar
-- data gathering, extraction or monitoring method", requiring access "via standard web browsers
-- only, unless we agree otherwise". robots.txt not disallowing /list-api/ is not a permission.
-- So the lookup is a human opening a link, and the database only remembers what they found.
--
-- Why the audit log is the record and not a new column: a CONFIRMATION has a home
-- (inz_accredited_verified_at); a REFUSAL does not — clearing inz_accredited leaves the row
-- byte-identical to an employer who never claimed anything, so the admin loses the fact that
-- they looked. admin_audit_log already stores it, already has (target_table, target_id,
-- created_at DESC) indexed, and is already written by every other admin action.
--
-- What this deliberately does NOT do:
--   * it does not touch employer_verifications, so it cannot move anyone along the
--     basic -> verified -> fully_verified ladder. That ladder answers "is this a real farm run by
--     real people"; accreditation answers "has INZ licensed them to hire migrants". F-11 and
--     tests/trust-ladder.test.ts both hold by construction.
--   * it does not touch jobs. A refusal most often means the employer opted out of publication
--     (INZ's own page says so) or a digit was mistyped in 13 hand-typed ones — a miss and a typo
--     return the identical HTTP 400. The harm was the claim, so the claim is what is removed.
--   * it does not add a second derived column to marketplace_employer_profiles. Nothing renders
--     accredited_employer to a seeker yet, so a "verified" flag would have no reader. It lands in
--     the same commit as the badge.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_verification_queue(
  p_limit  integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM public.employer_verifications;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      ev.id            AS verification_id,
      ev.employer_id,
      ep.farm_name,
      ep.region,
      ev.method,
      ev.status,
      ev.nzbn_number,
      ev.document_url,
      ev.created_at,
      ev.reviewed_at,
      ev.verified_at,
      ev.rejection_reason,
      -- What the employer claims, beside the number that proves or disproves it.
      ep.inz_accredited,
      ep.inz_accreditation_expires,
      ep.inz_accredited_verified_at,
      -- What an admin last found, INCLUDING a refusal. Without these two a "not confirmed" row
      -- is indistinguishable from one nobody ever looked at, and the follow-up is lost.
      chk.checked_at   AS inz_register_checked_at,
      chk.confirmed    AS inz_register_confirmed
    FROM public.employer_verifications ev
    JOIN public.employer_profiles ep ON ep.id = ev.employer_id
    LEFT JOIN LATERAL (
      SELECT al.created_at                        AS checked_at,
             (al.payload ->> 'confirms')::boolean AS confirmed
        FROM public.admin_audit_log al
       WHERE al.action       = 'employer.inz_register_check'
         AND al.target_table = 'employer_profiles'
         AND al.target_id    = ev.employer_id
       -- ctid breaks a tie, and the tie is real: created_at defaults to now(), which is the
       -- TRANSACTION start time, so two checks written in one transaction carry the identical
       -- timestamp and `created_at DESC` alone picks between them arbitrarily. In production each
       -- button press is its own request and its own transaction, so it cannot happen — but the
       -- probe that proved this migration did exactly that and reported a refusal as "confirmed".
       ORDER BY al.created_at DESC, al.ctid DESC
       LIMIT 1
    ) chk ON true
    ORDER BY
      CASE WHEN ev.status = 'pending' THEN 0 ELSE 1 END,
      ev.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_record_inz_register_check(
  p_employer_id uuid,
  p_confirms    boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.employer_profiles;
BEGIN
  PERFORM public._admin_gate();

  -- NULL is not a third outcome. Left unguarded, CASE WHEN NULL takes the ELSE arm and silently
  -- records a refusal the admin never pressed.
  IF p_confirms IS NULL THEN
    RAISE EXCEPTION 'p_confirms must be true or false' USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_row FROM public.employer_profiles WHERE id = p_employer_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Employer profile not found: %', p_employer_id USING ERRCODE = 'P0002';
  END IF;

  -- Confirming a claim nobody made writes a verification of nothing: accredited_employer stays
  -- false while inz_accredited_verified_at says we checked. If the register lists an employer who
  -- has not claimed accreditation, the fix is to ask them to state it WITH its expiry — 091's
  -- CHECK requires the date, and we do not transcribe a date on their behalf and call it theirs.
  IF p_confirms AND NOT v_row.inz_accredited THEN
    RAISE EXCEPTION 'This employer has not claimed INZ accreditation — there is nothing to confirm'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.employer_profiles
     SET inz_accredited             = CASE WHEN p_confirms THEN inz_accredited ELSE false END,
         -- Cleared on a refusal as well as set on a confirmation: a stale "verified on" beside a
         -- withdrawn claim is the worst of the three states, because it reads as our assurance.
         inz_accredited_verified_at = CASE WHEN p_confirms THEN now() ELSE NULL END
   WHERE id = p_employer_id
  RETURNING * INTO v_row;

  -- The expiry is deliberately NOT cleared. It is what they told us, it is what the follow-up
  -- conversation is about, and 091's CHECK permits it beside a false flag.
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    auth.uid(),
    'employer.inz_register_check',
    'employer_profiles',
    p_employer_id,
    jsonb_build_object(
      'confirms',                   p_confirms,
      'inz_accredited',             v_row.inz_accredited,
      'inz_accreditation_expires',  v_row.inz_accreditation_expires,
      'inz_accredited_verified_at', v_row.inz_accredited_verified_at
    )
  );

  RETURN jsonb_build_object(
    'employer_id',                v_row.id,
    'inz_accredited',             v_row.inz_accredited,
    'inz_accreditation_expires',  v_row.inz_accreditation_expires,
    'inz_accredited_verified_at', v_row.inz_accredited_verified_at
  );
END;
$function$;

COMMENT ON FUNCTION public.admin_record_inz_register_check(uuid, boolean) IS
  'Records the outcome of an admin checking an employer''s claimed INZ accreditation against the public accredited-employer register, which they open in their own browser — INZ''s terms of use forbid scripted access (docs/immigration/06-inz-register-verification.md). Confirms sets inz_accredited_verified_at; does-not-confirm clears inz_accredited AND the timestamp, and leaves the employer''s stated expiry and their job listings alone. Never touches employer_verifications: accreditation is an INZ licence, not an identity rung, and must not make fully_verified self-assertable (F-11). Both outcomes are written to admin_audit_log as employer.inz_register_check, which is where the queue reads the last check back from.';

REVOKE ALL ON FUNCTION public.admin_record_inz_register_check(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_inz_register_check(uuid, boolean) TO authenticated;

-- 091's column comments described a world where verification did not exist — "Always NULL
-- today", "the INZ list API is not built". Both are now false, and a stale comment on a column
-- about trust is worse than no comment: the next reader takes it as the current contract.
COMMENT ON COLUMN public.employer_profiles.inz_accredited IS
  'Employer states they hold INZ accredited-employer status (seeker gap G-13). Their own claim, and it stays their claim: an admin CONFIRMS it against the public INZ register (101) but never asserts it on their behalf. Requires inz_accreditation_expires. Deliberately not part of employer_verifications — accreditation is an INZ licence, not an identity rung, and must not make fully_verified self-assertable (F-11). Cleared by admin_record_inz_register_check when the register does not confirm it.';

COMMENT ON COLUMN public.employer_profiles.inz_accredited_verified_at IS
  'When an admin last CONFIRMED this employer''s accreditation against the public INZ register, which they search in a standard web browser because INZ''s terms of use forbid scripted access (docs/immigration/06-inz-register-verification.md). Written and cleared only by admin_record_inz_register_check (101) — was reserved and always NULL under 091. NULL means unconfirmed, which is not the same as refused: a refusal also clears inz_accredited, and both outcomes are in admin_audit_log under employer.inz_register_check.';

COMMIT;
