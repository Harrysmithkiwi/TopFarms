# TopFarms — Leads Pipeline v2 + Cold-Start Enablement

You are the acting technical co-founder who OWNS this outcome. **Plan → execute → verify.** Do not return until every item below is built, deployed to prod, and independently verified live — and you are genuinely confident in the result.

## Read first (these override your defaults)
- `CLAUDE.md` (house rules: MCP project ref `inlagtgpynemhipnqvty`, `--read-only` default, diagnose-before-fix, atomic commits, NO history-rewriting git without a typed instruction).
- `LAUNCH.md`; the memory index — especially `project_leads_triage`, `project_lead_harvest_deferred`, `project_db_write_path`, `project_rls_hardening_regime`, `feedback_matched_not_sorted`, `feedback_tsc_b_gate`.
- Code: `supabase/functions/lead-intake` + `lead-harvest`; admin leads pages (`AdminLeads*`); `lead_staging` / `leads` schema.

Summarise the current state back before you build anything.

## Constraints
- DB writes: apply via the claude.ai Supabase connector `apply_migration` (confirm only ONE project exists first), AND save the full SQL to `supabase/migrations/NNN_*.sql`. Verify via pg_catalog read-backs, never a Studio "success" banner.
- Gate every change: `tsc -b` (never `--noEmit`), lint (no new failures vs main), prod `build`, prettier. Branch off main; atomic commit → PR → merge → confirm the new bundle is live.
- Brand voice "matched, not sorted"; never fabricate data or stats. RLS: any new `get_user_role` policy is `TO authenticated`; `employer_profiles` has no client `select('*')`.

## Work (in this order)

**1. Outreach email (no code).** Draft a founder→farmer invite per the cold-email rubric: their-ad-first, one low-friction ask, contractions, zero AI tells, signed by Harry, honest (free = free). Template with `[role]/[farm]/[region]/[detail]` slots. Save to `docs/`. Do NOT send — human-owned.

**2. Expired segment.** Extract an `applications_close` date in lead-intake; derive a `likely_expired` flag (close < today). Admin UI: amber badge + a "Hide expired" toggle. Backfill existing rows by regex-parsing their excerpts.

**3. International segment.** Add `geo_scope` (`nz`/`intl`/`unknown`), detected from non-NZ region / phone prefix / TLD / country mentions. KEEP the rows (future expansion); add an "International (future)" filter that excludes them from the NZ action queue. Backfill the existing ~56 staged rows.

**4. Manual drop-in.** New admin "Add lead" form: paste text OR a screenshot dropzone → route through `lead-intake` (Claude extraction; image via a vision block, no separate OCR) → `lead_staging` with `source='manual_paste'` (add it to the source CHECK on both tables). Build the text path first, then the screenshot path.

## Verify (per feature)
On live prod: DB read-backs of new columns/flags; admin UI walked in a real browser (badge renders, filters work, and both a pasted listing and a screenshot land in staging correctly extracted); migration recorded. Tick `LAUNCH.md` and update memory as you go.

## Stop only when
All four are built, deployed, verified live, and docs/memory are updated — and you are confident. The cold-start outreach itself is human: your job is to ENABLE it, not to email real farms. Final report: what shipped (by PR), what was verified and how, and the ready-to-send email template.
