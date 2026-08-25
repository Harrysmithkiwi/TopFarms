# Phase 17: Saved Search - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A logged-in seeker can save the current `JobSearch` filter state as a named entry, view their saved searches in a dedicated dashboard route, load a saved search to restore filters in place, and delete saved searches they no longer need. Naming is required (with auto-suggested filter-derived defaults), capped at 10 per seeker (soft cap with replace-oldest prompt), and renames are supported. Email alerts ("notify me when new jobs match") are explicitly OUT of scope for this phase — deferred to its own phase.

Closes REQ-IDs: SRCH-13 (save), SRCH-14 (load), SRCH-15 (delete).

</domain>

<decisions>
## Implementation Decisions

### Save flow & naming

- **Save button placement:** inline button next to the results count in `JobSearch.tsx` (e.g., "47 farm jobs · Save search"). Always visible when results render. Hidden when no filters are applied (saving an empty search has no value — the unfiltered job feed is the default state).
- **Name-input pattern:** inline modal composed of Phase 19 v2 primitives — `Input` + `Button` + a `StatusBanner` slot (or inline `role="alert"` div, planner discretion per Phase 20.1 RESEARCH Pitfall 3) for validation errors. Pattern matches `MarkFilledModal.tsx` already in the codebase.
- **Name policy:** required, auto-suggested, editable. The modal opens with the auto-derived name pre-filled in the Input; user can accept or edit before clicking Save. Submit is disabled if the name field is empty.
- **Auto-name derivation:** human-readable concatenation of distinctive filter values, e.g. `"Dairy in Waikato + accommodation"`. Truncate to ~50 chars. Edge case: if the user somehow opens save with no filters set (Save button is hidden in that state, but defence-in-depth), fall back to `"Saved search 2026-05-05"` ISO-style. Planner can refine the exact concatenation algorithm — minimum bar is "shed_type, region(s), accommodation toggle" if those filters are set.

### Where saved searches live

- **Primary surface:** new dashboard route `/dashboard/seeker/saved-searches`. Parallels `/dashboard/seeker/my-applications` (`MyApplications.tsx`). Adds a nav item to the seeker dashboard sidebar.
- **List item layout:** card rows. Each row shows: name (heading), filter summary as inline chips (e.g., `Dairy · Waikato · Accommodation`), Load button (primary), Delete button (ghost / icon button). Mirror `MyApplications.tsx` "application card" structure for visual consistency.
- **Empty state:** prompt-style. Copy: `"You haven't saved any searches yet. Save your filters on the job search page to come back to them later."` + a primary `Button` link to `/jobs`. Mirrors empty-state pattern already used in `MyApplications.tsx`.
- **Quick-access from JobSearch:** dropdown affordance next to the inline Save button — `"Load saved search ▾"`. Shows the 5 most-recent saved searches with name + filter summary chips. Click loads in-place. Includes a `"View all"` link at the bottom that routes to `/dashboard/seeker/saved-searches`.

### Limits, deletion UX, alerts scope

- **Per-seeker limit:** soft cap at 10. When the seeker tries to save an 11th, show a modal: `"You've reached 10 saved searches. Replace the oldest one (\"<oldest-name>\") or delete one first?"` with two buttons: `Replace oldest` and `Cancel`. Clicking Replace deletes the oldest and saves the new one in the same modal flow.
- **Delete UX:** click-delete with 5-second undo toast. Soft-delete pattern: row hidden client-side immediately on click, hard DELETE fired only after the toast dismisses (or immediately if user clicks "Undo" within 5s, which restores the row and cancels the DELETE). Lowest friction, recoverable. Pattern matches Gmail/Slack delete UX.
- **Alerts (notifications):** OUT of scope for Phase 17. Deferred to its own phase. Capture as a deferred idea — rationale: alerts need a cron schedule (Edge Function or pg_cron), email template, dedupe vs "already seen since last load" logic, and unsubscribe flow — substantial scope on top of basic CRUD. Plus the `RESEND_API_KEY` pre-launch carryforward must close before alerts can ship.
- **Rename:** in scope. Inline rename in the saved-searches list — click on the name to enter edit mode (or click a small pencil icon, planner discretion). Filters CANNOT be edited in place — to update filters, the seeker loads the saved search, modifies filters in JobSearch, and saves as new (or, if the existing entry has the same name, the save flow could detect the collision and offer "Update existing" — planner discretion / nice-to-have).

### Claude's Discretion

- **Load behavior:** `navigate('/jobs?<params>', { replace: false })` to push (so the back button takes the user to wherever they came from). Scroll to top of results on load (refreshes mental model). Snapshot scope = all `URLSearchParams` filter keys EXCEPT `page` (start at page 1 on every load — saved searches are filter snapshots, not pagination snapshots).
- Exact filter chip rendering in the list item card (which 3-5 filter values get summarized; planner picks based on filter density and visual hierarchy).
- Toast component choice for delete-undo (sonner is already in the project per `package.json`).
- Migration filename and SQL details (`024_saved_searches.sql` is the natural next slot).
- Whether to pre-flight a "name already in use" collision check at save time (planner discretion).
- React Hook Form + Zod schema for the save modal's name field (use existing pattern from `Login.tsx` / `AdminLoginPage.tsx`).
- Accessibility details: focus management on modal open/close, ARIA labels, keyboard shortcuts (Esc to close).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements + scope
- `.planning/REQUIREMENTS.md` §SRCH-13/14/15 (lines 29-31, 131-133) — minimal acceptance criteria for save / load / delete
- `.planning/ROADMAP.md` §"Phase 17: Saved Search" (lines 120-129) — goal, success criteria, ROADMAP-level dependencies note ("Plan this phase right before execution")

### Auth + ownership patterns
- `src/contexts/AuthContext.tsx` — `useAuth()` provides `session`, `signIn`, `signOut`. Saved-searches RLS uses `auth.uid()` from session
- `src/hooks/useAuth.ts` — single subscription point
- `supabase/migrations/001_initial_schema.sql` — `user_roles` precedent for RLS-by-auth.uid() ownership pattern
- `supabase/migrations/019_seeker_documents.sql` — most recent seeker-owned data table; same RLS shape Phase 17 will mirror

### Job search filter state (integration point)
- `src/pages/jobs/JobSearch.tsx` — load-bearing. `useSearchParams()` from `react-router` (v7) is the URL-state authority. Phase 17 saves a snapshot of these params and restores them on load.
- `src/components/ui/SearchHero.tsx` — top of JobSearch; potential location for the Save button affordance

### Existing UI primitives (Phase 19 v2 — DO NOT add new variants)
- `src/components/ui/Input.tsx` — form input (forwardRef + Radix Label, error/helperText API)
- `src/components/ui/Button.tsx` — variants `'primary' | 'outline' | 'ghost' | 'warn'`; sizes `'sm' | 'md' | 'lg'`
- `src/components/ui/StatusBanner.tsx` — **CRITICAL: variant enum is FIXED** `'shortlisted' | 'interview' | 'offer' | 'declined'`. NO `'error'` variant. Do NOT use it for save-modal error display. Use inline `role="alert"` div with `--color-danger` tokens (Phase 20-05 ProfileDrawer pattern; Phase 20.1 AdminLoginPage precedent).

### Reference implementations (mirror these)
- `src/pages/dashboard/seeker/MyApplications.tsx` — canonical seeker-owned data list page. Card-row layout, filter chips, empty state pattern. Phase 17's `SavedSearches.tsx` mirrors this structure.
- `src/pages/jobs/MarkFilledModal.tsx` — canonical inline modal pattern composed of v2 primitives. Phase 17's "Save search" name-input modal mirrors this.
- `src/pages/auth/Login.tsx` — canonical React Hook Form + Zod pattern for form validation. Phase 17's name-input form follows the same shape.
- `src/components/layout/Sidebar.tsx` — seeker dashboard nav. Phase 17 adds a `"Saved searches"` item alongside the existing nav entries.
- `src/main.tsx` — route registration. New route `/dashboard/seeker/saved-searches` registers here, wrapped in `<ProtectedRoute requiredRole="seeker">`.

### Project rules
- `CLAUDE.md` §1 — project-scoped Supabase MCP only (project ref `inlagtgpynemhipnqvty`)
- `CLAUDE.md` §2 — Studio SQL Editor preferred for one-off DB writes; for the new table migration, use `apply_migration` via project MCP (full migration is in-repo + tracked) OR Studio SQL Editor depending on whether MCP `--read-only` is currently ON (most sessions: yes, so Studio is the default)
- `CLAUDE.md` §4 — atomic commits per plan
- `CLAUDE.md` §7 — partial-close discipline (VERIFICATION.md must enumerate any unclosed gaps)

### Design system (locked)
- `.planning/v2-migration/TopFarms_Brand_Spec_v2.md` — v2 token palette, typography, hex values
- `src/index.css` — `@theme` block with `--color-brand`, `--color-warn`, `--color-danger`, `--color-bg`, etc. Use these directly via Tailwind utilities or CSS vars; no new tokens

### Notification pipeline reference (for the deferred alerts phase)
- `supabase/functions/notify-job-filled/` — Edge Function pattern that future Saved Search Alerts phase would mirror
- `supabase/migrations/017_notify_job_filled_webhook.sql` — pg_net + database webhook pattern
- `.planning/v2.0-MILESTONE-AUDIT.md` §"Carryforward: RESEND_API_KEY" — must close before email alerts can ship

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useSearchParams` from `react-router` (v7)** — already used as the filter-state authority in `JobSearch.tsx`. Saved-search "save" reads `searchParams.toString()`; "load" calls `navigate('/jobs?<saved-string>', { replace: false })`. No new state management needed.
- **`useAuth()` hook** — provides `session.user.id` for RLS ownership. SavedSearches CRUD uses `supabase.from('saved_searches').select()` (RLS filters by `auth.uid()` automatically — no manual `.eq('user_id', userId)` needed if RLS is configured correctly).
- **Phase 19 v2 primitives** — `Input` + `Button` + sonner (existing, already in package.json) cover save modal, list buttons, undo toast.
- **`MyApplications.tsx`** — canonical card-row list pattern; copy structure for `SavedSearches.tsx`.
- **`MarkFilledModal.tsx`** — canonical inline-modal pattern; copy structure for save-search modal.
- **React Hook Form + Zod** — already used in `Login.tsx`, `AdminLoginPage.tsx`. Use the same pattern for the save-modal name field (zod schema: `z.string().min(1, 'Name required').max(50, 'Name too long')`).
- **sonner toast library** — already in `package.json`. Use for the delete-undo toast.

### Established Patterns

- **URL-state via react-router v7** — `useSearchParams()` is the source of truth for filter state in JobSearch. Saved searches are URLSearchParams snapshots.
- **RLS-by-auth.uid() ownership** — every seeker-owned table (`user_roles`, `applications`, `seeker_documents`) uses `auth.uid() = user_id` RLS policies. Phase 17 saved_searches table follows the same pattern: `CREATE POLICY ... USING (auth.uid() = user_id)` for SELECT/INSERT/UPDATE/DELETE.
- **Atomic commits per plan (CLAUDE §4)** — Phase 17 likely splits into 4 plans (migration + RLS, save flow + modal, list page + dashboard nav, quick-load dropdown + integration tests). Each plan = one atomic commit.
- **TDD for refactor + new feature work** — write tests/scaffolds first; vitest 3.1.1 + @testing-library/react 16.3.0 + jsdom infrastructure already present.
- **No new design primitives** — compose existing v2 components only. Phase 19 + 19b are locked.

### Integration Points

- `src/main.tsx` — register new route `/dashboard/seeker/saved-searches` (wrap in `<ProtectedRoute requiredRole="seeker">`)
- `src/pages/jobs/JobSearch.tsx` — add Save button + Load dropdown next to results count. Will need to pass `searchParams` to the modal/dropdown. Be careful not to disturb the existing URL-state machinery (commit `7401116`-style stale match-scores fix is already in place).
- `src/components/layout/Sidebar.tsx` — add `"Saved searches"` nav item under the existing seeker dashboard items.
- `supabase/migrations/024_saved_searches.sql` (new) — table + RLS policies + indexes
- `src/types/domain.ts` — likely add a `SavedSearch` interface (parallels existing `Application`, `SeekerDocument` types)

</code_context>

<specifics>
## Specific Ideas

- **"Card-row pattern from MyApplications"** — visual consistency target. Same vertical density, same Load/Delete button placement style.
- **"Inline modal compose Input + Button — pattern matches MarkFilledModal"** — visual + structural consistency target for the save modal.
- **"Soft delete with undo toast — pattern matches Gmail/Slack"** — UX target for delete; lowest friction, recoverable, no double-click confirmation.
- **"Quick-access dropdown — top 5 most-recent + 'View all' link"** — matches the quick-access dropdowns in well-designed product UIs (Linear, Notion). Discoverability over completeness.
- Auto-name pattern aspires to filter values like `"Dairy in Waikato + accommodation"` — needs to handle the small set of high-cardinality filters (shed_type, region, accommodation) to produce readable summaries.

</specifics>

<deferred>
## Deferred Ideas

- **Email alerts ("notify me when new jobs match this saved search")** — full alerts scope. Needs cron schedule, email template, dedupe vs last-loaded timestamp, unsubscribe flow. Substantial scope on top of basic CRUD; gated by the RESEND_API_KEY pre-launch carryforward. Capture as a future phase (post-launch is fine; alerts add value once seekers have habituated to saved searches).
- **"New matches since you last loaded this" badge** — compromise version of alerts (no email, just a UI badge on the saved-searches list). Could ship without the email pipeline. Alternative path; lighter scope; could be the alerts phase's Plan 1 Wave 1.
- **In-place filter editing on existing saved searches** — currently out of scope. Workflow is "load → modify filters → save as new (or replace existing)". Add an `Edit filters` modal later if seekers complain.
- **Saved-search sharing** (e.g., URL share, send to friend) — out of scope; not in any current REQ-ID.
- **Pagination / search-within-saved-searches** — only relevant if seekers accumulate many. The 10-search soft cap means this isn't needed at MVP. Revisit if cap is raised.
- **Default sort on saved-searches list (newest-first vs alphabetical vs pinned)** — minor; planner discretion. Newest-first is the obvious default; pinned-favorites could be a future polish item.
- **"Save changes to current saved search" affordance** — when filters drift after loading a saved search, offer to update the existing entry. Nice-to-have; tied to the in-place editing question above.
- **Cross-device sync subtleties** — saved_searches table is per-seeker via auth.uid(); cross-device sync is automatic via Supabase auth. No special design needed. (Captured here only because someone might think it's a feature to design — it isn't.)

</deferred>

---

*Phase: 17-saved-search*
*Context gathered: 2026-05-05*
