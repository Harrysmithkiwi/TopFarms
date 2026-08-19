-- 102 — a record that an email was sent (audit F-19)
--
-- The finding: **no notification, email or outbox table existed anywhere.** Every sender decides
-- whether to send from DERIVED STATE — a status transition, a due flag — rather than from
-- whether it already sent. Derived state repeats; a send does not un-happen.
--
-- Two live paths repeat, and they are not equally bad:
--
--   * `handle_job_filled` fires on `OLD.status IS DISTINCT FROM 'filled' AND NEW.status =
--     'filled'`, and `notify-job-filled` then emails **every unresolved applicant**. An employer
--     who marks a job filled, reopens it because the hire fell through, and fills it again sends
--     every one of those people "this job has been filled" a second time. That is the one with a
--     blast radius, and it lands on seekers who did nothing.
--   * `handle_job_activated` fires on `OLD.status IS DISTINCT FROM 'active'`, and `paused` is
--     employer-reachable, so pause → resume re-sends the match digest. That one goes to the
--     operator only, so it is noise rather than harm — but it is the same defect.
--
-- Two paths deliberately NOT changed, because they already hold a record:
--
--   * `send-followup-emails` guards on `followup_7d_sent` / `followup_14d_sent` and clears the
--     due flag in the same update. That IS a delivery record, just on `placement_fees`.
--   * `send-document-status-email` is invoked by an admin pressing a button, and
--     `AdminDocumentsQueue` documents re-sending as the operator's retry path when the invoke
--     fails. A claim there would break a deliberate affordance, not a defect.
--
-- ── why claim-by-insert, and why the unique index is PARTIAL ────────────────────────────
--
-- The claim is the INSERT. `ON CONFLICT DO NOTHING RETURNING id` returns a row to exactly one
-- caller; everyone else gets nothing and skips. That is atomic in Postgres and needs no lock,
-- no advisory key and no read-then-write race — which matters because pg_net can deliver the
-- same webhook twice and two Edge invocations can overlap.
--
-- `WHERE failed_at IS NULL` is the whole design:
--
--   claimed (failed_at NULL)  -> in the index -> blocks a duplicate. Correct: a send is in flight.
--   sent    (failed_at NULL)  -> in the index -> blocks forever.     Correct: it went.
--   failed  (failed_at SET)   -> LEAVES the index -> a retry may claim again.
--
-- A plain unique index would have forced a choice between losing the failure record (delete the
-- claim to allow a retry) and never retrying (keep it and block). The partial index keeps both:
-- the failure stays on the table as history, and the next attempt inserts a fresh row. The audit
-- flagged "Resend failure returns 200" in the same breath as the missing table, and this is why
-- those are one problem — nothing anywhere knew a send had failed.
--
-- Retention: one row per email, at a scale of tens. No purge cron. Add one if this ever reaches
-- a size where it matters, which it will not before it has taught us what to keep.

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_sends (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of message, e.g. 'job_filled', 'job_match_digest'. Free text on purpose: a CHECK
  -- here would mean a migration every time a new email exists, and the value is only ever
  -- compared for equality against a literal in the function that writes it.
  kind        text        NOT NULL,
  -- What it was about — a job id today. Not a foreign key: the record of having emailed someone
  -- must outlive the thing it was about, and ON DELETE CASCADE would erase exactly the history
  -- this table exists to keep.
  subject_id  uuid        NOT NULL,
  recipient   text        NOT NULL,
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  failed_at   timestamptz,
  provider_id text,
  error       text,
  CONSTRAINT notification_sends_outcome_check
    CHECK (sent_at IS NULL OR failed_at IS NULL)
);

-- The claim. lower(recipient) because an address differing only in case is the same inbox, and
-- a duplicate that slips through on capitalisation is the exact failure this prevents.
CREATE UNIQUE INDEX IF NOT EXISTS notification_sends_claim_key
  ON public.notification_sends (kind, subject_id, lower(recipient))
  WHERE failed_at IS NULL;

-- For reading the history of one subject: "did this job's applicants already hear from us?"
CREATE INDEX IF NOT EXISTS notification_sends_subject_idx
  ON public.notification_sends (subject_id, kind, claimed_at DESC);

-- Deny-all: RLS on with no policies. Only the service role writes this, from Edge Functions.
-- A seeker must not be able to read who else was emailed about a job, and an employer must not
-- be able to read the applicant list by another route.
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notification_sends FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_sends TO service_role;

COMMENT ON TABLE public.notification_sends IS
  'Delivery record for outbound email (audit F-19). Claim-by-insert: a sender INSERTs ... ON CONFLICT DO NOTHING RETURNING id and sends only if it got a row, so a repeated trigger cannot repeat the email. The unique index is PARTIAL on failed_at IS NULL — a claimed or sent row blocks duplicates, a failed row leaves the index so a retry can claim again while the failure stays as history. Not a foreign key to jobs: the record of having emailed someone must outlive the thing it was about. RLS deny-all; service_role only.';

COMMENT ON COLUMN public.notification_sends.failed_at IS
  'Set when the provider rejected the send. Setting it REMOVES the row from notification_sends_claim_key, which is what permits a retry — so never set it on a send that actually went out, and never clear it to "tidy up" a row.';

COMMIT;
