-- Phase 0 Task 0.2 — migration ledger backfill (ONE-OFF OPERATIONAL REPAIR)
--
-- NOT a schema migration. This file lives in supabase/maintenance/ deliberately: it
-- changes no schema object, only the bookkeeping table that records which migrations
-- have run. A replay from zero must NOT execute this — the replay writes those rows
-- itself.
--
-- WHY THIS EXISTS
-- Migrations 036-056 were applied to production through Supabase Studio and the
-- claude.ai connector. Neither writes supabase_migrations.schema_migrations. The
-- result (audit finding P0-8, downgraded to P1 on 2026-07-30) was a ledger holding
-- 45 rows against 64 files on disk, so no tool could reason about migration state.
--
-- EVIDENCE — every one of the 21 was verified APPLIED on 2026-07-30 by checking its
-- runtime artefact in pg_catalog before this backfill was written. Full evidence table
-- in docs/PHASE-0-PROMPT.md Task 0.2. Summary:
--   036 photo policies present · 037 65 definer fns with proconfig pinned
--   038 marketplace_employer_profiles view · 039 admin_analytics_funnel
--   040 dropped policy absent (count 0) · 041 leads/lead_staging/lead_suppression
--   042 admin_analytics_leads · 043 2 harvest cron jobs · 044 admin_lead_approve
--   045 lead_harvest_runs · 046 admin_lead_categorise · 047+055 admin_outreach_list
--   048+053+054 admin_leads_staging_list · 049 lead_outreach_config seeded
--   050 admin_get_daily_briefing · 051 admin_get_signups_trend
--   052 admin_get_placements_summary · 056 lead_harvest_notify_check
--
-- `statements` is left NULL on purpose. The exact executed text is not recoverable,
-- and fabricating it would make the ledger lie in a new way. The .sql file on disk is
-- the source of truth for CONTENT; this row records only THAT it was applied.

INSERT INTO supabase_migrations.schema_migrations (version, name, created_by)
VALUES
  ('036', 'employer_photos_listing_policy',       'phase0-ledger-backfill'),
  ('037', 'definer_function_hardening',           'phase0-ledger-backfill'),
  ('038', 'marketplace_employer_profiles_view',   'phase0-ledger-backfill'),
  ('039', 'admin_analytics_rpcs',                 'phase0-ledger-backfill'),
  ('040', 'drop_seeker_employer_profiles_policy', 'phase0-ledger-backfill'),
  ('041', 'leads_pipeline',                       'phase0-ledger-backfill'),
  ('042', 'leads_funnel_wiring',                  'phase0-ledger-backfill'),
  ('043', 'lead_harvest_cron',                    'phase0-ledger-backfill'),
  ('044', 'leads_rich_fields',                    'phase0-ledger-backfill'),
  ('045', 'lead_harvest_runs',                    'phase0-ledger-backfill'),
  ('046', 'leads_keep_categorise',                'phase0-ledger-backfill'),
  ('047', 'lead_triage_outreach',                 'phase0-ledger-backfill'),
  ('048', 'staging_search_broaden',               'phase0-ledger-backfill'),
  ('049', 'seed_outreach_config',                 'phase0-ledger-backfill'),
  ('050', 'briefing_prior_day_counts',            'phase0-ledger-backfill'),
  ('051', 'signups_trend_rpc',                    'phase0-ledger-backfill'),
  ('052', 'placements_summary_rpc',               'phase0-ledger-backfill'),
  ('053', 'staging_sortable',                     'phase0-ledger-backfill'),
  ('054', 'staging_source_filter',                'phase0-ledger-backfill'),
  ('055', 'outreach_sortable',                    'phase0-ledger-backfill'),
  ('056', 'lead_harvest_notify',                  'phase0-ledger-backfill')
ON CONFLICT (version) DO NOTHING;
