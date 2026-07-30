-- ============================================================
-- 068_phase2_revenue_schema.sql
-- TopFarms — Phase 2 (revenue enforcement) Tasks 2.2 + 2.4 schema
--
-- 1. employer_entitlements — the free-listing ledger.
--    Free-listing eligibility was count(listing_fees) === 0, and those rows
--    CASCADE on job delete (001:214), so deleting a job reset the allowance:
--    unlimited free listings. An entitlement is a fact about an ACCOUNT; a
--    count is a value derived from another table's lifecycle. The PRIMARY KEY
--    (employer_id, kind) is the enforcement — consuming twice is a constraint
--    violation, not a count that can drift.
--    Known limit (stated in the PR): delete-account-and-resignup still
--    bypasses this. Universal to free tiers; the defence is at signup.
--
-- 2. placements — the hire EVENT, split from the money.
--    placement_fees conflated "a hire happened" with "a fee is owed" — a
--    waived fee and a missing fee looked identical, and "how many placements
--    have we facilitated?" (the marketplace story) was not answerable
--    separately from "how much have we billed?".
--
-- 3. placement_fees collectibility columns — paid_at is what makes an
--    aged-debtors list answerable from SQL (confirmed_at only means "invoice
--    created"). discount_pct / waived_reason are ADMIN-APPLIED ONLY — locked
--    decision 2026-07-30: discounting is a capability, not a policy; there is
--    no automatic first-placement rule.
--
-- Apply via claude.ai Supabase connector apply_migration (project
-- inlagtgpynemhipnqvty). Verify via pg_catalog read-back, not the banner.
-- ============================================================

BEGIN;

-- ─── 1. Free-listing entitlement ledger ─────────────────────────────────────

CREATE TABLE public.employer_entitlements (
  employer_id    uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('free_listing')),
  consumed_at    timestamptz NOT NULL DEFAULT now(),
  -- provenance ONLY. SET NULL, never CASCADE: deleting the job must not erase the fact.
  job_id         uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  PRIMARY KEY (employer_id, kind)
);

COMMENT ON TABLE public.employer_entitlements IS
  'Account-level entitlement ledger (Phase 2 Task 2.2). PK (employer_id, kind) makes double-consumption a constraint violation. kind CHECK has one value so free_placement can never appear by accident — adding a value is a deliberate migration.';

CREATE INDEX employer_entitlements_job_id_idx ON public.employer_entitlements (job_id);

-- Deny-all client access: written exclusively by service-role Edge Functions.
ALTER TABLE public.employer_entitlements ENABLE ROW LEVEL SECURITY;

-- Backfill: every employer whose surviving listing_fees include a free ($0) row
-- has already consumed the entitlement. Employers whose free row was cascade-
-- deleted regain one free listing — those facts were destroyed and cannot be
-- recovered; the ledger prevents recurrence.
INSERT INTO public.employer_entitlements (employer_id, kind, consumed_at, job_id)
SELECT DISTINCT ON (employer_id)
  employer_id, 'free_listing', COALESCE(paid_at, now()), job_id
FROM public.listing_fees
WHERE amount_nzd = 0
ORDER BY employer_id, paid_at ASC NULLS LAST
ON CONFLICT DO NOTHING;

-- Free-path idempotency under retry: one listing fee per job.
ALTER TABLE public.listing_fees
  ADD CONSTRAINT listing_fees_job_id_key UNIQUE (job_id);

-- ─── 2. placements — the hire event ─────────────────────────────────────────

CREATE TABLE public.placements (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  started_on            date,
  employer_confirmed_at timestamptz,
  seeker_confirmed_at   timestamptz,   -- schema now; nudge mechanism is a later phase
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.placements IS
  'The hire EVENT, separate from the fee (Phase 2 Task 2.4). seeker_confirmed_at is schema-ahead: the seeker-side confirmation mechanism (nudge/email/admin queue) is a later phase — locked decision 2026-07-30.';

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

-- Backfill: every confirmed placement_fee represents a hire that happened.
INSERT INTO public.placements (application_id, employer_confirmed_at)
SELECT application_id, confirmed_at
FROM public.placement_fees
WHERE confirmed_at IS NOT NULL
ON CONFLICT (application_id) DO NOTHING;

-- ─── 3. placement_fees collectibility columns ───────────────────────────────

ALTER TABLE public.placement_fees
  ADD COLUMN paid_at               timestamptz,
  ADD COLUMN stripe_invoice_status text
    CHECK (stripe_invoice_status IN ('open', 'paid', 'payment_failed', 'uncollectible')),
  ADD COLUMN discount_pct          numeric(5,2) NOT NULL DEFAULT 0
    CHECK (discount_pct >= 0 AND discount_pct <= 100),
  ADD COLUMN waived_reason         text,
  ADD COLUMN placement_id          uuid REFERENCES public.placements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.placement_fees.paid_at IS
  'Set by stripe-webhook on invoice.payment_succeeded. confirmed_at = invoice created; paid_at = money arrived. The aged-debtors question keys on this.';
COMMENT ON COLUMN public.placement_fees.discount_pct IS
  'ADMIN-APPLIED ONLY. No automatic discount rule exists (locked decision 2026-07-30). Applied by create-placement-invoice at invoice time.';

CREATE INDEX placement_fees_placement_id_idx ON public.placement_fees (placement_id);

-- One fee row per application — the Edge Functions already assume this
-- (.maybeSingle()), now the schema enforces it and upserts can key on it.
ALTER TABLE public.placement_fees
  ADD CONSTRAINT placement_fees_application_id_key UNIQUE (application_id);

-- Link backfilled placements to their fee rows.
UPDATE public.placement_fees pf
SET placement_id = p.id
FROM public.placements p
WHERE p.application_id = pf.application_id
  AND pf.placement_id IS NULL;

-- Historical paid-state: none recoverable — no invoice has ever been paid in
-- test or live mode (Stripe live keys are Phase 7). Nothing to backfill.

COMMIT;
