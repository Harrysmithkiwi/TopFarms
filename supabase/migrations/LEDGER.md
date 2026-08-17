# Migration ledger manifest

Machine-checked by `tests/migration-ledger-drift.test.ts`. **Every `.sql` file in this directory must
have a row here.** CI fails otherwise.

Why this file exists: production migrations are applied through Supabase Studio / the claude.ai
connector (pooler auth is blocked — see `README.md`), and neither writes
`supabase_migrations.schema_migrations`. Between 2026-06 and 2026-07 that silently produced a ledger
holding 45 rows against 64 files. This manifest is the repo-side record that CI can enforce; the
database ledger is the runtime record.

**Reconciled 2026-07-30 (post-Phase-3):** 75 files · 78 ledger rows · 3 documented duplicates. Balanced.

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
| 072_match_scoring_v2 | `20260730055440` | Phase 3 — sector-aware normalisation, recency removed, CHECK + algorithm_version; connector-applied |
| 073_verification_trust | `20260730060339` | Phase 3 — employer self-verification closed + admin queue RPCs + document-view audit; connector-applied |
| 074_fix_verification_queue_jsonb | `20260730060952` | Phase 3 — row_to_jsonb→to_jsonb in 073's queue RPC (same defect 058 fixed in 033); connector-applied |
| 075_privacy_retention | `20260730063159` | Phase 3 — lead retention windows, identity-doc purge, admin_delete_account; connector-applied |
| 076_storage_purge_via_api | `20260730063416` | Phase 3 — 075's SQL storage deletes were inert (storage.protect_delete); split to Edge Fn + ordering guard. Also carries `list_user_storage_objects` (`20260730063632`) |
| 077_seeker_contacts_truth | `20260730064300` | Phase 3 — the paywalled table was empty for 3 of 4 seekers; trigger + backfill + first/last name; connector-applied |
| 078_audit_log_outlives_the_actor | `20260730065000` | Phase 3 — admin_id was NOT NULL + ON DELETE SET NULL, so no admin could ever be deleted; FK dropped |
| 079_training_demand | `20260807032652` | Go-live S1 — training demand capture keyed to the skills taxonomy; own-row RLS + `admin_training_demand_summary` behind `_admin_gate()`; connector-applied, verified via pg_catalog |
| 080_revoke_compute_match_score_from_authenticated | `20260810220505` | go-live M4 — the two SECURITY DEFINER match functions took an arbitrary seeker_id with EXECUTE granted to `authenticated` and no auth.uid() check, exposing the §1.4 breakdown to any signed-in user. Grant was vestigial (blanket re-grant in 037). No caller in src/ or supabase/functions/; all 5 internal callers are definer-owned by postgres. service_role retained; connector-applied |
| 081_dedupe_sees_staging | `20260811013748` | Leads — the "Possible duplicate" badge had never fired: the fuzzy pass searched `leads` (2 rows) not `lead_staging` (93), and the exact fingerprint keyed on `region`, which the harvester nulls ~1 row in 11. Two-tier match (>=0.9 region-blind, 0.6–0.9 region-tolerant) + backfill; 13 rows flagged across 7 genuine pairs; connector-applied |
| 082_staging_type_filter_and_signup_attribution | `20260811022630` | Leads — `p_type` filter so the employer and seeker queues can share `lead_staging` without sharing a screen, plus a `signed_up` flag per row joining `auth.users.raw_user_meta_data->>'ref'` (the `?ref=` attribution loop). DROP+CREATE, not OR REPLACE: a new signature would have created an overload and PostgREST refuses to choose. Grants re-applied; connector-applied |
| 083_seeker_documents_employer_policy_to_authenticated | `20260812103059` | go-live S1/S2 batch — the employer read policy on `seeker_documents` was the only policy on that table without a TO clause, so it was TO PUBLIC and evaluated for `anon` on every anonymous request. Not exploitable: the predicate opens with `get_user_role(auth.uid()) = 'employer'`, which is NULL for anon. `ALTER POLICY … TO authenticated` only — the USING expression is not restated, since retyping a predicate that gates CVs is a chance to get it wrong; connector-applied |
| 084_notify_job_matches_webhook | `20260813120337` | go-live — operator match-alert closing the waitlist promise gap's first half: `on_job_activated_notify_matches` fires on INSERT-as-active or transition-to-active, pg_net → `notify-job-matches` Edge Fn, which emails the operator the matched-seeker list (name/email/phone/region/score from `seeker_contacts` + `match_scores`). Vault triple (supabase_url/service_role_key/WEBHOOK_SECRET) reused from 029 — no new secret. Seeker-facing sends stay manual by design (NEXT-SESSION.md: "discovering the copy beats automating it"); connector-applied |
| 085_employer_self_verification_rpcs | `studio-applied-20260817` | audit F-11 — the trust ladder was unclimbable: 073 revoked `status`/`verified_at` from `authenticated` and four of five client writers still sent them, so every write returned 42501 and no employer ever reached `basic` (which IS email-verified). Adds two SECURITY DEFINER RPCs scoped by `auth.uid()`: `employer_sync_self_verifications` mirrors `auth.users.{email,phone}_confirmed_at`, and `employer_record_farm_photo` self-verifies a farm photo (operator decision — the identity rung stays admin-reviewed, so `fully_verified` cannot be self-asserted). `nzbn`/`document` keep writing directly with `status` omitted so the DEFAULT `pending` stands; Studio-applied because both write-capable connectors had lapsed auth on 2026-08-17 |
| 086_employer_submit_verification_rpc | `20260816223150` | audit F-11 **reopened** — 085 was necessary but not sufficient. Driving the employer flow on live prod 2026-08-17 showed `nzbn` AND `document` both returning 42501 on the **first** submit, not just a resubmit: the payload was fine, the **upsert form** was denied. PostgREST renders `onConflict` as `ON CONFLICT (employer_id, method) DO UPDATE SET …` with the conflict keys in the SET list, and Postgres checks UPDATE privilege at PLAN time, while `authenticated` holds INSERT-only on both (`pg_attribute.attacl`). Proven on prod: identical payload → plain INSERT 201, upsert 42501. Both identity rungs were dead, so `fully_verified` was unreachable from the UI, and 085's claim that `DocumentUpload` "already worked" was wrong. Adds `employer_submit_verification(method, nzbn, document_url)` SECURITY DEFINER, scoped by `auth.uid()`, `status` hard-coded to `'pending'` so the admin queue still rules — the review step is preserved by denying the CALLER a say in `status`, not by keeping the write client-side. Also fixes a stale-verdict bug the direct write could not: a resubmission now clears `verified_at`/`verified_by`/`reviewed_at`/`rejection_reason` and reopens the row, where before a **rejected** employer resubmitting kept `status='rejected'` attached to brand-new evidence. Connector-applied |
| 087_lead_opt_out | `20260817002052` | audit F-21 (Tier 0, **compliance**) — an opt-out could not be recorded for anyone you email. `lead_suppression` had one writer, `admin_lead_reject`, which needs a *staging* row; once a lead was promoted there was no control at all, so `docs/OUTREACH-EMAIL.md:52` documented a procedure that could not be executed. Adds `admin_lead_suppress(lead_id, reason)` — admin-gated, writes the suppression, marks the lead dead, audit-logged. **Also fixes the half an RPC alone would not:** suppression was keyed on `_lead_fingerprint` = name\|region\|type, but `region` is null ~1 row in 11 (081:13), so a farm suppressed with a region sailed through `_lead_intake` when re-harvested without one. New `_lead_suppression_key(name, type)` — dedupe keeps its region-bearing fingerprint, since dedupe wants the opposite bias. Accepted trade-off: same-named farms in different regions now suppress together (false positive beats emailing someone who opted out). Timing deliberate — applied at 0 leads contacted, so the gap cost nothing. Proven on prod: suppressed+region → suppressed, **suppressed+region NULL → suppressed** (the leak), punctuation/case variant → suppressed, different name → inserted, different type → inserted. Connector-applied |

## Ledger rows with no dedicated file (documented duplicates)

Both are the "apply a delta, then amend the source file" pattern. **The content is on disk** — these
are not missing migrations. Verified 2026-07-30 by comparing the live function against the disk file.

| Ledger version | Name | Content lives in | Verification |
|---|---|---|---|
| `20260722232729` | `fix_get_applicants_for_job_joins` | `058_fix_admin_profile_doc_queue_applicants.sql:6-45` | live `get_applicants_for_job` carries `LEFT(a.id::text, 8)` + `v_employer_user_id`, matching 058 |
| `20260730063632` | `list_user_storage_objects` | `076_storage_purge_via_api.sql` §4 | applied as a separate connector call while probing admin-purge, then folded into 076 on disk |
| `20260811034524` | `signed_up_matches_short_ref` | `082_staging_type_filter_and_signup_attribution.sql` (the `signed_up` EXISTS clause) | live function compares `left(raw_user_meta_data->>'ref',8) = left(id::text,8)`, matching 082 on disk |
| `20260729095445` | `leads_list_expose_draft` | `064_lane_a_outreach_worklist.sql` (`admin_leads_list`) | live function exposes `drafted_email/draft_model/contacted_at`, has `follow_up_date`, orders by `status_changed_at DESC` — matching 064 |

This corrects audit finding **P0-8**, which claimed production schema existed outside version
control. It does not. The defect was ledger bookkeeping only — reclassified **P1**.
