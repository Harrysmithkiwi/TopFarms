-- ============================================================
-- 021_rls_auto_enable_capture.sql
-- TopFarms — drift capture (2026-05-03)
--
-- Captures two production objects that were never declared in any
-- migration file (discovered during the 2026-05-03 comprehensive
-- drift audit, alongside the four phantom-applied 011/012/013/014
-- remediation):
--
--   1. public.rls_auto_enable() — SECURITY DEFINER plpgsql function,
--      iterates DDL-end commands and enables RLS on newly-created
--      public-schema tables.
--   2. ensure_rls — event trigger on ddl_command_end, fires for
--      CREATE TABLE / CREATE TABLE AS / SELECT INTO, calls (1).
--
-- Both objects already exist in production. This migration is fully
-- idempotent (CREATE OR REPLACE for the function; DROP IF EXISTS +
-- CREATE for the event trigger, since CREATE EVENT TRIGGER has no
-- OR REPLACE form). Re-running it in any environment leaves DB state
-- unchanged.
--
-- Function body captured verbatim from production via
-- pg_get_functiondef() on 2026-05-03. The three RAISE LOG branches
-- (success / exception fallback / skip) are intentional, not formatting
-- artefacts.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- CREATE EVENT TRIGGER has no OR REPLACE form; drop-and-recreate is the idempotent pattern.
DROP EVENT TRIGGER IF EXISTS ensure_rls;

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- Post-verify: both objects must be in expected post-state, else rollback.
DO $verify$
DECLARE
  fn_count int;
  trg_count int;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';

  SELECT COUNT(*) INTO trg_count
  FROM pg_event_trigger WHERE evtname = 'ensure_rls' AND evtenabled IN ('O', 'R', 'A');

  IF fn_count <> 1 OR trg_count <> 1 THEN
    RAISE EXCEPTION 'Post-verify failed: rls_auto_enable count=% (want 1), ensure_rls enabled count=% (want 1)', fn_count, trg_count;
  END IF;
  RAISE NOTICE 'Post-verify OK: rls_auto_enable function (1) + ensure_rls event trigger (1, enabled).';
END;
$verify$;

COMMIT;
