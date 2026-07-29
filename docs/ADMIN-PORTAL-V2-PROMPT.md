# Admin Portal v2 — polish + leverage (74 → 90/95)

**Goal:** take the TopFarms admin portal from a UI/UX/usability score of **74/100** to **≥90 (stretch 95)** by closing named consistency, state, accessibility, and mobile gaps, and by adding the process + AI leverage that the leads engine is missing. **Plan → execute → verify. Do not report done until you can evidence the score lift against the rubric below.**

Read first: `CLAUDE.md` (house rules), the memory index, and this file. Verify the Supabase project ref (`inlagtgpynemhipnqvty`) before any MCP call.

---

## Scoring rubric — what ≥90 means (measure against this, no vibes)

| Dimension | Now | Target | Bar to hit |
|---|---|---|---|
| IA / navigation | 16/20 | 19 | Admin is fully navigable on mobile (drawer/hamburger); no dead-ends. |
| Visual consistency | 14/20 | 19 | Every admin page uses `AdminPageHeader`, `DrawerShell`, `Button`, `Tag`. Zero emoji-as-UI, zero inline detail panels, one drawer implementation. |
| Interaction design | 16/20 | 18 | Bulk select + bulk approve/reject in staging. Consistent row/detail patterns. |
| Feedback & states | 13/20 | 18 | Skeletons for table/detail loads; single error signal; optimistic where safe. |
| Accessibility | 12/20 | 18 | One shared focus-trap hook on all drawers (focus in on open, trap Tab, restore on close). Keyboard path verified. |
| Leads pipeline UX | 13/15 | 14 | Real drag-drop + multi/clipboard-image capture. |
| **Total** | **74** | **~106→cap 90+** | Over-cap dimensions absorb any shortfall; ship the whole list. |

A gap left open = points not banked. Partial-close discipline applies (§7): don't claim a dimension unless its bar is empirically met.

---

## Workstreams (each: concrete files + acceptance)

### A. Mobile navigation (unblocks IA — highest structural fix)
`src/components/layout/AdminSidebar.tsx` is `hidden md:flex` — **below 768px an admin has no navigation.** Add a mobile top bar + slide-in nav drawer reusing `DrawerShell` (or a lean variant) and the existing `NavLink` groups. Trap focus, close on route change.
**Accept:** on a 375px viewport, an admin can reach every `/admin/*` section and back-to-app. Verify via chrome-devtools at 375px.

### B. Design-system reunification (biggest look/feel win)
1. `src/pages/admin/AdminLeads.tsx` — the outlier. Replace the inline `border-2 border-brand` detail panel with `DrawerShell`; kill emoji signals (`🌏 overseas` → grey `intl` Tag, `💰` → salary field, `↻` → follow-up Tag); swap bare `<button>`s for `Button`; return **cells only** from `renderRow` (stop self-wrapping `<tr>`); wrap the table `inCard`; use `AdminPageHeader`.
2. Add `AdminPageHeader` to `JobsManagement.tsx` and `AdminSkillCoverage.tsx` (currently bare `<h1>`).
3. Collapse the two drawer chromes: make `ProfileDrawer.tsx` consume `DrawerShell` (drop its private copy + the 400px/420px mismatch). One width, one implementation.
4. Remove the redundant "Active" `✓/—` column in `EmployerList.tsx` (Status Tag already carries it).
**Accept:** grep shows zero emoji in admin `renderRow`s; every admin page imports `AdminPageHeader`; one drawer component.

### C. States + feedback
1. Add a `TableSkeleton` (rows) and `DetailSkeleton` (drawer) to `src/components/admin/`; use them in `AdminTable.tsx` and drawers in place of "Loading…" text.
2. `AdminTable.tsx` currently double-signals errors (inline red **and** a toast) — keep the inline block, drop the toast (or vice-versa; pick one and apply everywhere).
**Accept:** no plain "Loading…" string remains in admin; one error signal per failure.

### D. Accessibility — shared focus management
Write one `useFocusTrap(ref, isOpen)` hook: move focus to the drawer on open, trap Tab within, restore focus to the trigger on close. Wire into `DrawerShell` so `StagingDrawer`, `OutreachDrawer`, `ProfileDrawer`, and the new mobile nav all inherit it.
**Accept:** keyboard-only path (Tab/Shift-Tab/Escape) verified in a drawer; focus cannot reach background content.

### E. Leads process leverage (the cold-start payoff)
1. **Bulk actions** in `AdminLeadsStaging.tsx`: row checkboxes + a sticky action bar → "Approve selected" / "Reject selected" / "Reject + suppress selected". Needs a set-based RPC — add `admin_lead_bulk_approve(ids uuid[])` / `admin_lead_bulk_reject(ids uuid[], p_suppress bool)` as SECURITY DEFINER, `_admin_gate()`-first, looping the existing single-row logic in one transaction. Apply via the claude.ai Supabase connector (see `project-db-write-path`); save SQL to `supabase/migrations/`.
2. **Retention-cron gap** (flagged in `047:15-19`): the weekly `lead-staging-purge` deletes pending rows >30d **regardless of active outreach**. Patch the cron's WHERE to exclude `outreach_status IN ('drafted','approved','sent')`. Migration + verify the cron body via `pg_get_functiondef`/cron.job.
**Accept:** select 5 rows → one click approves all 5 (verify counts via read-only SELECT); purge SQL no longer matches active-outreach rows.

### F. Harvest ↔ intake parity (stops flying blind on ~half the queue)
The harvester (`supabase/functions/lead-harvest/index.ts`) writes neither `geo_scope` nor `applications_close`, and canonicalizes region as `'Manawatu-Whanganui'` (no macron) vs intake's `'Manawatū-Whanganui'` — same region, two buckets.
1. Extract a shared region-normalizer + `classifyGeo` (currently duplicated in `lead-intake/index.ts` and migration 061) and call it from harvest too.
2. Have harvest set `geo_scope` and best-effort `applications_close` so harvested rows respond to the expired/geo filters.
Deploy edge functions via the connector or `gh workflow run supabase-deploy.yml` (see `project-edge-fn-deploy-path`); bump the function version note in the handoff.
**Accept:** a fresh harvested row carries `geo_scope`; region spelling matches intake's; existing 061 filter still passes.

### G. Capture leverage (client-side, Haiku vision already supports it)
In `AdminLeadsStaging.tsx` `PasteCapture`: replace the file-picker-labelled-as-dropzone with the existing unused `FileDropzone`; support **multiple screenshots** and **clipboard image paste** (`onPaste` → `DataTransfer.items`). Send as a batch of `{image, image_media_type}` items to `lead-intake` (already caps at 50).
**Accept:** drop/paste 3 images at once → 3 staged rows, toast reports the batch.

### H. (Stretch, only if A–G land clean) Auto-promote + enrichment
1. Behind a config flag: auto-approve harvested Lane-A rows at confidence ≥0.9 with a valid NZ contact; surface them under an "auto-approved" filter for review-anytime. Never auto-approve Lane B or intl/unknown geo.
2. On approve, one Claude call drafts the personalized outreach email (from `docs/OUTREACH-EMAIL.md`) for Lane A — the missing half of the Lane-B draft leverage.

---

## Constraints (house rules — non-negotiable)
- **Typecheck gate:** `tsc -b`, never `tsc --noEmit` (project references mask errors — see `feedback_tsc_b_gate`).
- **DB writes:** claude.ai Supabase connector `apply_migration` (records `schema_migrations`); always save SQL to `supabase/migrations/` and verify via `pg_catalog`/read-only SELECT. New `get_user_role`-touching policies `TO authenticated`; no `select('*')` on `employer_profiles`; cross-table policy predicates via definer helpers (§ `project-rls-hardening-regime`).
- **Diagnose before fix (§3):** show the SQL/code/diff before writing. No silent edits.
- **Atomic commits (§4):** one workstream per commit/PR. No history-rewriting commands without explicit operator instruction.
- **Verify admin-gated surfaces** without the operator password via the temp-admin recipe (`project-verify-with-temp-admin`): seed → test over REST → delete.
- Reuse before building: `Button`, `Tag`, `DrawerShell`, `SegmentedControl`, `FileDropzone`, `AdminPageHeader` already exist. Don't re-implement them.

## Verification (before claiming done)
1. `tsc -b` clean; build passes.
2. Each workstream's **Accept** line evidenced (screenshot at 375px + 1200px, a read-only SELECT, or a REST round-trip).
3. Live-verify bulk approve, drag/paste capture, and a drawer keyboard path with a temp admin, then delete it.
4. Re-score against the rubric; write the per-dimension result. Only flip a dimension to target if its bar is empirically met.
5. Update `docs/SESSION-HANDOFF-*.md` + memory (`project_leads_triage`, `project_launch_readiness`) with what shipped and any carryforward.

## Definition of done
Every A–G **Accept** met and evidenced, rubric re-scored to ≥90, clean `tsc -b`, atomic commits/PRs merged to `main`, handoff + memory updated. Come back with the scorecard, not a promise.
