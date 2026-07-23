# Session handoff — 2026-07-23

End-of-day state so the next session (or a fresh `/clear`) lands cleanly. Source of truth stays `LAUNCH.md` + the memory index; this is the "where we are, what's next" pointer.

## Prod state (all green)
- `origin/main` @ `4793213`. Vercel auto-deploys `main` → https://www.topfarms.co.nz.
- Supabase project `inlagtgpynemhipnqvty`. Migrations **057–062 applied** to prod. Edge function **`lead-intake` at v20**.
- DB: **6 users, 0 jobs** (deliberate clean cold-start — 0 active on the public board), **54 pending leads** in staging.
- All engineering-owned launch blockers closed. Launch readiness **93/100**.

## Two bodies of work shipped today

**A. Launch gate closed (PRs #48–#53).**
- O4 security hardening (migrations 059/060): `get_user_role` revoked from anon; `marketplace_employer_profiles` → `security_invoker` (+ column grants — `stripe_customer_id` no longer client-selectable); `pg_trgm` → `extensions` schema. Bug E8 (42P17 policy recursion) found by post-migration authed probes and fixed same session (060).
- O6 Duplicate job, O7 lazy-chunk auto-reload, O9 past-start-date guard — all shipped + verified live.
- O1 legal accepted as-is (contact `hello@topfarms.co.nz`, already sitewide). O2 test-data purge done (UAT accounts + legacy "Test Farm (UAT)" + test jobs deleted).
- O5 leaked-password protection **deferred** — the toggle is Pro-plan-only, operator declined Pro for MVP; app-level policy (min-10 + letter + number) is the control. Revisit ~Oct 2026.

**B. Leads pipeline v2 + cold-start enablement (PRs #54–#55, migrations 061/062).**
- Outreach email: `docs/OUTREACH-EMAIL.md` (founder→farmer, human-sent).
- Staging-queue segmentation: `applications_close` → "Likely expired" badge + "Hide expired" toggle; `geo_scope` → "International" badge + NZ/International/All filter (default hides intl). Backfill: 44 nz / 1 intl / 11 unknown, 2 expired.
- Manual drop-in: text paste (pre-existing) + **new screenshot lane** (base64 → Claude vision) + `manual_paste` source. Forward extraction of both fields for every lane.
- Reusable prompt: `docs/LEADS-PIPELINE-V2-PROMPT.md`. All verified live (text + screenshot round-trip, RPC filters) via a throwaway admin (seeded, tested, deleted — see memory `project-verify-with-temp-admin`).

## Open threads (nothing engineering-blocking)

**Human-owned:**
1. **O3 cold-start (Option A chosen).** Approve the ~19 contactable-farm shortlist in `/admin/leads/staging` and send the personalised outreach from `docs/OUTREACH-EMAIL.md`, in small batches, by hand. This is the live path to real listings before marketing.
2. **O5** — revisit Pro upgrade + leaked-password toggle at the ~Oct 2026 review.

**Optional engineering (not blocking):**
- `lead-harvest` geo/close-date parity at extraction (queue filters already degrade safely without it; re-run the 061 backfill any time).
- Lane B reply drafts still seed `[Draft pending]` until the operator sets `lead_outreach_config` via `admin_outreach_set_config`.
- O8: applicant AI summary renders empty (low priority).
- Optional: delete the bare `at-seeker-b@topfarms.test` account.

## To resume
Read (in order): `CLAUDE.md` (house rules), `LAUNCH.md`, the memory index, then `docs/LEADS-PIPELINE-V2-PROMPT.md` / `docs/OUTREACH-EMAIL.md`. Verify the Supabase project ref before the first MCP call. Key memory: `project-db-write-path` (apply migrations via the claude.ai Supabase connector), `project-rls-hardening-regime` (no `select('*')` on `employer_profiles`; new `get_user_role` policies must be `TO authenticated`), `project-verify-with-temp-admin`.
