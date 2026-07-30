-- ============================================================
-- 078_audit_log_outlives_the_actor.sql
-- TopFarms — Phase 3 Task 3.5 follow-up
--
-- admin_audit_log.admin_id was declared (023:36) as:
--
--   admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
--
-- Those two clauses contradict each other. Deleting an admin makes Postgres
-- attempt `SET admin_id = NULL`, which the NOT NULL rejects:
--
--   23502: null value in column "admin_id" of relation "admin_audit_log"
--          violates not-null constraint
--   CONTEXT: SQL statement "UPDATE ONLY admin_audit_log SET admin_id = NULL ..."
--
-- So an admin account could never be deleted once it had done anything — which
-- includes the brand-new admin_delete_account RPC being unable to delete a
-- fellow admin. Found while cleaning up the Phase 3 probes; the constraint has
-- been wrong since 023 and was simply never exercised, because until this phase
-- nothing deleted users at all.
--
-- THE FIX, and why this direction. An audit log must OUTLIVE its actor: "who
-- approved this passport" has to remain answerable after that admin leaves. So
-- drop the foreign key and keep the NOT NULL uuid. Losing referential integrity
-- is the point, not a compromise — an audit row that mutates when history
-- changes is not an audit row. The id stays resolvable against auth.users while
-- the account exists, and remains a permanent record of who acted once it does
-- not.
-- ============================================================

BEGIN;

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;

COMMENT ON COLUMN public.admin_audit_log.admin_id IS
  'The admin who performed the action. Deliberately NOT a foreign key (078): an audit trail must survive the deletion of the actor it names, and the original ON DELETE SET NULL + NOT NULL pair made deleting any admin impossible. Join to auth.users opportunistically; expect misses for departed admins.';

COMMIT;
