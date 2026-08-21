-- 106 — the twelve deny-by-default tables: write the intent down, and make it two layers
--
-- UPLIFT-95 Phase 3 item 2. The audit asked for the intent to be recorded, because "nobody
-- has written down that it is intentional, which is how a real gap hides among twelve
-- deliberate ones". Recording it required checking it, and checking it found the gap.
--
-- ── what the check found ────────────────────────────────────────────────────────────────
--
-- Intent confirmed for all twelve: `grep -rn "from('<table>')" src/` returns **0 hits** for
-- every one. No client code touches any of them; every read and write goes through a
-- SECURITY DEFINER RPC behind `_admin_gate()`, or through an Edge Function on the
-- service-role key. Deny-by-default is deliberate.
--
-- But ten of the twelve carry **full table grants to `anon` and `authenticated`** —
-- SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. Read off
-- `pg_class.relacl` 2026-08-21, seven privileges per role per table. That includes `leads`
-- and `lead_staging`, which hold **132 real farmers' names and contact details**, and
-- `admin_audit_log`, which is the record of who did what.
--
-- So RLS-enabled-no-policy is not the second layer here. **It is the only layer.** Add one
-- permissive policy for an unrelated feature, or disable RLS during a debugging session, and
-- anon can read and WRITE the lead list. That is a single revocable mistake away, and it is
-- exactly the shape the audit warned twelve identical-looking INFO lints would hide.
--
-- Migration 041's own header claims otherwise — "grants per the CORRECTED 037 pattern
-- (REVOKE ALL FROM PUBLIC, anon; explicit grants only)" — for `leads`, `lead_staging` and
-- `lead_suppression`. The live catalog disagrees. Same class of finding as 059 §3 in
-- migration 104: **a migration's stated intent was never achieved, and nothing checked.**
-- Two of these tables did it right and prove the pattern works —
-- `application_status_transitions` (097) and `notification_sends` (102) hold no client
-- grants at all.
--
-- ── why revoking is safe ────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER functions execute as their owner, so they do not consult the caller's
-- table grants; and Edge Functions authenticate with the service-role key, whose privileges
-- are granted separately and are untouched here. Proven on prod in a rolled-back
-- transaction rather than reasoned about:
--
--   anon grants on `leads`                    7 -> 0
--   definer RPC reading `leads` as anon        still returns all rows
--   anon direct `SELECT FROM leads`            blocked (42501)
--
-- The 42501 arrives at the GRANT layer, before RLS is consulted at all. That is the point:
-- after this migration the lead list is behind two independent controls instead of one.

BEGIN;

-- ── layer two: take back the grants nothing uses ────────────────────────────────────────
REVOKE ALL ON public.admin_audit_log        FROM anon, authenticated;
REVOKE ALL ON public.admin_metrics_cache    FROM anon, authenticated;
REVOKE ALL ON public.admin_notes            FROM anon, authenticated;
REVOKE ALL ON public.employer_entitlements  FROM anon, authenticated;
REVOKE ALL ON public.lead_harvest_runs      FROM anon, authenticated;
REVOKE ALL ON public.lead_outreach_config   FROM anon, authenticated;
REVOKE ALL ON public.lead_staging           FROM anon, authenticated;
REVOKE ALL ON public.lead_suppression       FROM anon, authenticated;
REVOKE ALL ON public.leads                  FROM anon, authenticated;
REVOKE ALL ON public.placements             FROM anon, authenticated;
-- application_status_transitions and notification_sends already hold none.

-- ── the record: why each of these has no policy ─────────────────────────────────────────
COMMENT ON TABLE public.admin_audit_log IS
  'DENY-BY-DEFAULT, INTENTIONAL (audit 2026-08-21, migration 106). RLS on, zero policies, and no client grants. Written only by SECURITY DEFINER admin RPCs; read only through admin_* RPCs behind _admin_gate(). A policy here would let the audited read their own audit trail.';

COMMENT ON TABLE public.admin_metrics_cache IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, no client grants. Populated and read by admin analytics RPCs only; it aggregates across every employer and seeker, so no per-user policy could be correct.';

COMMENT ON TABLE public.admin_notes IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, no client grants. Operator notes ABOUT users — the subject of a note must never be able to read it, so there is no policy that would be safe to add.';

COMMENT ON TABLE public.application_status_transitions IS
  'DENY-BY-DEFAULT, INTENTIONAL (097, reconfirmed migration 106). RLS on, zero policies, and it already held no client grants. This is the state machine as DATA, read by the BEFORE UPDATE trigger which runs as owner. A client that could edit it could approve its own transition to hired.';

COMMENT ON TABLE public.employer_entitlements IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, no client grants. Billing entitlements are derived server-side from Stripe webhooks; an employer who could write this row could grant themselves what they have not paid for.';

COMMENT ON TABLE public.lead_harvest_runs IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, no client grants. Harvest telemetry written by the lead-harvest Edge Function on the service-role key; no client has any reason to read it.';

COMMENT ON TABLE public.lead_outreach_config IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, no client grants. Holds the outreach prompt and sending configuration — operator-only, and reachable solely through admin RPCs.';

COMMENT ON TABLE public.lead_staging IS
  'DENY-BY-DEFAULT, INTENTIONAL (041 intent, ACHIEVED in migration 106). RLS on, zero policies, and client grants now revoked — 041''s header claimed the 037 REVOKE pattern but the live catalog showed anon holding all seven privileges. Holds unreviewed third-party contact details harvested from public ads. Single intake door is _lead_intake(); review is admin-gated.';

COMMENT ON TABLE public.lead_suppression IS
  'DENY-BY-DEFAULT, INTENTIONAL (041 intent, ACHIEVED in migration 106). RLS on, zero policies, client grants revoked. This is the durable opt-out record keyed by _lead_suppression_key(name, type); a client able to delete a row here could resurrect a lead who asked never to be contacted again.';

COMMENT ON TABLE public.leads IS
  'DENY-BY-DEFAULT, INTENTIONAL (041 intent, ACHIEVED in migration 106). RLS on, zero policies, and client grants now revoked — anon previously held all seven privileges on 132 real farmers'' names and contact details, with RLS as the only control. Reached exclusively through admin_leads_* RPCs behind _admin_gate().';

COMMENT ON TABLE public.notification_sends IS
  'DENY-BY-DEFAULT, INTENTIONAL (102, reconfirmed migration 106). RLS on, zero policies, and it already held no client grants. A seeker must not be able to read who else was emailed about a job. Claim-by-insert from senders on the service-role key.';

COMMENT ON TABLE public.placements IS
  'DENY-BY-DEFAULT, INTENTIONAL (migration 106). RLS on, zero policies, client grants revoked. The placement-fee record: written by the hire trigger (098) and by create-placement-invoice on the service-role key. A party to a placement must not be able to edit the fee they owe.';

COMMIT;
