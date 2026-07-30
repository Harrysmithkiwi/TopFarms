# Migration ledger manifest

Machine-checked by `tests/migration-ledger-drift.test.ts`. **Every `.sql` file in this directory must
have a row here.** CI fails otherwise.

Why this file exists: production migrations are applied through Supabase Studio / the claude.ai
connector (pooler auth is blocked — see `README.md`), and neither writes
`supabase_migrations.schema_migrations`. Between 2026-06 and 2026-07 that silently produced a ledger
holding 45 rows against 64 files. This manifest is the repo-side record that CI can enforce; the
database ledger is the runtime record.

**Reconciled 2026-07-30 (post-Phase-2):** 68 files · 70 ledger rows · 2 documented duplicates. Balanced.

| File | Ledger version | Notes |
|---|---|---|
| 001_initial_schema | `001` | |
| 002_rls_policies | `002` | |
| 003_skills_seed | `003` | |
| 004_employer_profile_columns | `004` | |
| 005_employer_verifications | `005` | |
| 006_jobs_status_and_benefits | `006` | |
| 007_storage_buckets | `007` | |
| 008_job_expiry_cron | `008` | |
| 009_seeker_onboarding | `009` | |
| 010_match_scores_precompute | `010` | |
| 011_placement_fee_followups | `011` | |
| 012_platform_stats_rpc | `012` | |
| 013_phase8_wizard_fields | `013` | |
| 014_ownership_type_array | `014` | |
| 015_phase9_schema | `015` | |
| 016_phase11_backend_features | `016` | |
| 017_notify_job_filled_webhook | `017` | |
| 018_set_user_role_rpc | `20260428043338` | CLI-applied, timestamp version |
| 019_seeker_documents | `20260428053314` | CLI-applied, timestamp version |
| 020_seeker_documents_employer_policy | `20260429031148` | CLI-applied, timestamp version |
| 021_rls_auto_enable_capture | `20260503000000` | timestamp version, name carries `021_` prefix |
| 022_fix_pg_net_http_post_signature | `20260503210000` | timestamp version, name carries `022_` prefix |
| 023_admin_rpcs | `023` | |
| 024_saved_searches | `024` | |
| 025_phase_18_1_fk_indexes | `025` | |
| 026_mark_job_filled_rpc | `026` | |
| 027_match_scores_cleanup_trigger | `027` | |
| 028_pg_net_webhook_secret_headers | `028` | |
| 029_pg_net_webhook_secret_vault | `029` | |
| 030_rls_get_applicants_for_job_rpc | `030` | superseded at runtime by 058 |
| 031_rls_initplan_performance | `031` | |
| 032_doc_verification_queue | `032` | |
| 033_admin_doc_rpcs | `033` | |
| 034_skills_taxonomy_v2 | `034` | |
| 035_admin_rpc_jsonb_fix | `035` | |
| 036_employer_photos_listing_policy | `036` | backfilled 2026-07-30 |
| 037_definer_function_hardening | `037` | backfilled 2026-07-30 |
| 038_marketplace_employer_profiles_view | `038` | backfilled 2026-07-30 |
| 039_admin_analytics_rpcs | `039` | backfilled 2026-07-30 |
| 040_drop_seeker_employer_profiles_policy | `040` | backfilled 2026-07-30 |
| 041_leads_pipeline | `041` | backfilled 2026-07-30 |
| 042_leads_funnel_wiring | `042` | backfilled 2026-07-30 |
| 043_lead_harvest_cron | `043` | backfilled 2026-07-30 |
| 044_leads_rich_fields | `044` | backfilled 2026-07-30 |
| 045_lead_harvest_runs | `045` | backfilled 2026-07-30 |
| 046_leads_keep_categorise | `046` | backfilled 2026-07-30 |
| 047_lead_triage_outreach | `047` | backfilled 2026-07-30 |
| 048_staging_search_broaden | `048` | backfilled 2026-07-30 |
| 049_seed_outreach_config | `049` | backfilled 2026-07-30 |
| 050_briefing_prior_day_counts | `050` | backfilled 2026-07-30 |
| 051_signups_trend_rpc | `051` | backfilled 2026-07-30 |
| 052_placements_summary_rpc | `052` | backfilled 2026-07-30 |
| 053_staging_sortable | `053` | backfilled 2026-07-30 |
| 054_staging_source_filter | `054` | backfilled 2026-07-30 |
| 055_outreach_sortable | `055` | backfilled 2026-07-30 |
| 056_lead_harvest_notify | `056` | backfilled 2026-07-30 |
| 057_fix_admin_list_seekers_contact_join | `20260722232550` | |
| 058_fix_admin_profile_doc_queue_applicants | `20260722232803` | ledger name differs: `fix_admin_profile_and_doc_queue_joins` |
| 059_security_hardening_o4 | `20260723032451` | |
| 060_fix_marketplace_policy_recursion | `20260723032721` | |
| 061_leads_segmentation | `20260723062011` | |
| 062_manual_paste_source | `20260723062752` | |
| 063_leads_bulk_actions | `20260729091412` | |
| 064_lane_a_outreach_worklist | `20260729094845` | |
| 065_revoke_staging_list_public_grant | `20260730010822` | connector-applied, timestamp version |
| 066_phase1_rls_gaps | `20260730024306` | connector-applied, timestamp version |
| 067_employer_verifications_column_grants | `20260730031536` | connector-applied; found by probe P10, not by review |
| 068_phase2_revenue_schema | `20260730051318` | Phase 2 — entitlement ledger, placements, collectibility columns; connector-applied |
| 069_phase2_cv_gate | `20260730051345` | Phase 2 — Option C contact gate + get_applicants_for_job P0-5 fix; connector-applied |
| 070_phase2_revenue_reconciliation | `20260730051408` | Phase 2 — admin_revenue_reconciliation RPC; connector-applied |
| 071_phase2_followup_cron | `20260730051412` | Phase 2 — wires send-followup-emails via pg_cron+pg_net; connector-applied |

## Ledger rows with no dedicated file (documented duplicates)

Both are the "apply a delta, then amend the source file" pattern. **The content is on disk** — these
are not missing migrations. Verified 2026-07-30 by comparing the live function against the disk file.

| Ledger version | Name | Content lives in | Verification |
|---|---|---|---|
| `20260722232729` | `fix_get_applicants_for_job_joins` | `058_fix_admin_profile_doc_queue_applicants.sql:6-45` | live `get_applicants_for_job` carries `LEFT(a.id::text, 8)` + `v_employer_user_id`, matching 058 |
| `20260729095445` | `leads_list_expose_draft` | `064_lane_a_outreach_worklist.sql` (`admin_leads_list`) | live function exposes `drafted_email/draft_model/contacted_at`, has `follow_up_date`, orders by `status_changed_at DESC` — matching 064 |

This corrects audit finding **P0-8**, which claimed production schema existed outside version
control. It does not. The defect was ledger bookkeeping only — reclassified **P1**.
