-- 096 — A paid fee cannot also be written off (audit F-06, Phase E)
--
-- AFTER F-05, as the audit records. F-05 stops a placement being invoiced twice; this stops
-- one invoice being counted two ways.
--
-- `stripe-webhook` records `paid_at` on `invoice.payment_succeeded`, and on
-- `invoice.payment_failed` / `marked_uncollectible` it wrote `stripe_invoice_status` with NO
-- check on `paid_at`. Stripe delivers events out of order and retries them, so a late or
-- replayed failure event could set `uncollectible` on an invoice that HAS been paid. The fee
-- then counted as paid (paid_at set) and as written off (status uncollectible) at the same
-- time, and `admin_revenue_reconciliation` reads both.
--
-- The webhook fix is `.is('paid_at', null)` on that update — a filter, so a stale event
-- becomes a no-op and returns 200 rather than making Stripe retry a doomed event forever.
-- This CHECK is the backstop for every OTHER writer: the admin waive path, a future refund
-- handler, a hand-run reconciliation. A filter protects one call site; a constraint protects
-- the column.
--
-- Verified before applying: 0 rows in placement_fees, 0 with paid_at, 0 that would violate.
-- NOT VALID is therefore unnecessary — nothing to grandfather.

BEGIN;

ALTER TABLE public.placement_fees
  ADD CONSTRAINT placement_fees_paid_implies_paid_status
  CHECK (paid_at IS NULL OR stripe_invoice_status = 'paid');

COMMENT ON CONSTRAINT placement_fees_paid_implies_paid_status ON public.placement_fees IS
  'Audit F-06: money arrived and written off are mutually exclusive. paid_at is what makes an aged-debtors list answerable, and a row carrying both a paid_at and an uncollectible status is counted twice by admin_revenue_reconciliation. Any writer clearing paid_at must set the status in the same statement.';

COMMIT;
