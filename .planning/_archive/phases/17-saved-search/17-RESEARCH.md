# Phase 17: Saved Search — Research

**Researched:** 2026-05-05
**Domain:** Authenticated CRUD on a per-seeker `saved_searches` table, integrated into the existing `JobSearch.tsx` URL-state machinery. UI composed entirely of Phase 19 v2 primitives (Input + Button + sonner toasts) with zero new design primitives.
**Confidence:** HIGH (all patterns have direct in-repo precedent; nothing speculative)

---

<user_constraints>
## User Constraints (from CONTEXT.md + gate brief)

### Locked Decisions

**Save flow & naming**
- Save button: inline next to results count in `JobSearch.tsx` (e.g., "47 farm jobs · Save search"). Visible only when filters are applied.
- Save modal: inline modal composed of Phase 19 v2 `Input` + `Button` (mirror `MarkFilledModal.tsx` pattern). Validation errors surfaced via inline `role="alert"` div with `--color-danger` tokens (NOT `StatusBanner` — variant enum is FIXED, no `'error'` member).
- Name policy: required, auto-suggested, editable. Modal pre-fills auto-derived name; submit disabled when empty.
- Auto-name derivation: human-readable concatenation of distinctive filter values (e.g., `"Dairy in Waikato + accommodation"`). Truncate ~50 chars. Defence-in-depth fallback: `"Saved search 2026-05-05"` ISO-style.

**Where saved searches live**
- Primary surface: new dashboard route `/dashboard/seeker/saved-searches` (parallels `/dashboard/seeker/applications`). Sidebar nav addition.
- List item: card-row layout mirroring `MyApplications.tsx`. Each row: name (heading), filter chips, Load button (primary), Delete button (ghost/icon).
- Empty state: prompt-style with link to `/jobs`, mirroring `MyApplications.tsx` empty state.
- Quick-access from JobSearch: dropdown next to Save button (`Load saved search ▾`). Top 5 most-recent + `View all` link to dashboard.

**Limits, deletion, alerts**
- Per-seeker soft cap: 10. 11th save shows modal: `"Replace oldest"` or `"Cancel"`.
- Delete UX: 5-second sonner undo toast. Soft-delete client-side; hard DELETE on toast dismiss; cancellable via Undo click.
- Alerts (notifications): OUT of scope. Deferred phase — depends on RESEND_API_KEY runtime + cron + dedupe logic.
- Rename: in scope. Inline rename in list; click name (or pencil icon) to enter edit mode. Filters NOT editable — workflow is "load → modify → save as new (or replace)".

### Claude's Discretion

- Load behavior: `navigate('/jobs?<params>', { replace: false })`. Strip `page` (always page 1 on load); preserve sort. Scroll to top.
- Filter chip selection: which 3-5 filter values to summarize in card row.
- Migration filename: `024_saved_searches.sql` (next slot after 023_admin_rpcs.sql).
- "Name already in use" pre-flight check: planner discretion (nice-to-have).
- React Hook Form + Zod schema for save modal: `Login.tsx` / `AdminLoginPage.tsx` pattern.
- Accessibility: focus management on modal open/close, ARIA labels, Esc to close.

### User-Explicit Constraints (from gate brief)

- DO NOT propose new design primitives. Compose Phase 19 v2 only: `Input`, `Button`, `StatusBanner` (NO `'error'` variant; use inline `role="alert"` div), sonner toasts.
- Mirror reference implementations directly: `MyApplications.tsx`, `MarkFilledModal.tsx`, `Login.tsx` / `AdminLoginPage.tsx`, `Sidebar.tsx`.
- Brand: `#16A34A` green, Inter font, `--color-brand` / `--color-warn` / `--color-danger` / `--color-bg` Tailwind tokens (already in `src/index.css` `@theme` block).

### Deferred Ideas (OUT OF SCOPE)

- Email alerts ("notify me when new jobs match")
- "New matches since last load" badge
- In-place filter editing on existing saved searches
- Saved-search sharing
- Pagination / search-within-saved-searches
- Default sort variants (newest-first chosen by default; pinned-favorites future)
- "Save changes to current saved search" affordance
- Cross-device sync subtleties (auto-handled by Supabase auth — no design needed)
- Email pipeline / cron / pg_net references (alerts is a future phase; STAY SCOPE-PURE)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-13 | Seeker can save current filter combination as a named saved search | §1 (DB migration shape), §2 (URL filter snapshot API), §3 (auto-name derivation), §6 (10-cap UX), §8 (test strategy) |
| SRCH-14 | Seeker can load a previously saved search to restore all filter state | §2 (URL filter snapshot API + load behavior), §5 (quick-load dropdown placement), Pitfall 1 (stale-match-scores fix preservation) |
| SRCH-15 | Seeker can delete saved searches they no longer need | §4 (soft-delete with undo toast), §7 (inline rename — adjacent surface) |

</phase_requirements>

---

## Executive Summary

Phase 17 is a near-pure CRUD layer on top of the existing Phase 19 v2 design system and Phase 14 RLS-by-`auth.uid()` ownership pattern. **All eight technical questions in the gate brief have direct in-repo precedent** — `015_phase9_schema.sql` (saved_jobs table with the same RLS shape), `019_seeker_documents.sql` (granular per-operation policies), `MyApplications.tsx` (card-row list page), `MarkFilledModal.tsx` (inline modal with v2 primitives), `Login.tsx` / `AdminLoginPage.tsx` (RHF+Zod with inline `role="alert"` errors), and `MarkFilledModal` again for the bigger 11th-save replace modal. The integration point in `JobSearch.tsx` is `searchParams.toString()` (already the URL-state authority) — no new state machinery is needed; the stale-match-scores `!inner` fix at line 202 stays untouched because saved-search load goes through `navigate()` which simply re-sets `searchParams`, triggering the existing `fetchJobs` useEffect cleanly.

**Primary recommendation:** Plan as 4 atomic commits (CLAUDE.md §4): (1) migration + RLS + types + Wave 0 test stubs; (2) save flow (modal + auto-name + 10-cap modal); (3) list page (`SavedSearches.tsx` + sidebar nav + load + delete-with-undo + inline rename); (4) quick-load dropdown integration in `JobSearch.tsx`. Apply migration via Supabase Studio SQL Editor (CLAUDE.md §2 — `--read-only` ON by default; `pg_net` not used here so any path works, but Studio matches recent precedent). Verify post-apply via read-only MCP (`pg_constraint` / `pg_indexes` / `pg_policies`).

---

## 1. DB Migration Shape

**Confidence: HIGH** (direct precedent: `015_phase9_schema.sql:16-29` for `saved_jobs` + `019_seeker_documents.sql:39-92` for granular policies)

### Ready-to-paste SQL skeleton (planner refines)

```sql
-- ============================================================
-- 024_saved_searches.sql
-- TopFarms — Phase 17 SRCH-13/14/15 — saved searches CRUD
--
-- Sections:
--   1. saved_searches table (per-seeker, name + URL params snapshot)
--   2. RLS — seeker-only access via auth.uid() = user_id
--   3. Indexes (user_id for RLS perf; user_id + created_at desc for list query)
--   4. (No backfill — net-new feature)
--
-- Notes:
--   - Uses public.user_roles RLS-by-auth.uid() pattern (see 001/015/019).
--   - Per-operation policies (not FOR ALL) following 019_seeker_documents
--     precedent — granular SELECT/INSERT/UPDATE/DELETE makes audit easier
--     and matches the "diagnose before fix" CLAUDE §3 discipline.
--   - 10-search soft cap NOT enforced at DB layer — see RESEARCH §6 for
--     the client-side count check rationale (race tradeoff documented).
-- ============================================================

BEGIN;

-- 1. Table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  search_params text NOT NULL,  -- URLSearchParams.toString() output, e.g. "shed_type=rotary&region=Waikato"
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seekers select own saved_searches"
ON public.saved_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "seekers insert own saved_searches"
ON public.saved_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seekers update own saved_searches"
ON public.saved_searches FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seekers delete own saved_searches"
ON public.saved_searches FOR DELETE
USING (auth.uid() = user_id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx
  ON public.saved_searches(user_id);

-- For "list newest-first" query: WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS saved_searches_user_id_created_at_idx
  ON public.saved_searches(user_id, created_at DESC);

COMMIT;
```

### Design notes for planner

| Decision | Rationale |
|----------|-----------|
| `user_id` references `auth.users(id)` directly (not `seeker_profiles.id`) | Matches `saved_jobs` (015) precedent. RLS via `auth.uid() = user_id` is the canonical "ownership" pattern (`saved_jobs`, `user_roles`, `applications`). Avoids the join-through-profile pattern that `seeker_documents` uses (which exists because document-level RLS needs role-gating beyond ownership; saved searches don't). |
| `search_params` stored as `text` (raw URLSearchParams output) | Schemaless. Round-trips losslessly via `new URLSearchParams(row.search_params)`. Future-proof against filter additions (param keys we don't know about today work tomorrow). Trade: no SQL-level introspection of filter contents — fine for v1, alerts phase will revisit if needed. |
| `name` CHECK length 1-100 | Defence-in-depth alongside Zod client validation. Trim guard prevents `"   "`. |
| Per-operation policies (not `FOR ALL`) | Mirrors 019 (most-recent seeker-owned table). `FOR ALL` (used in 015 saved_jobs) is shorter but conflates 4 audit surfaces. Granular policies are easier to read/diagnose. |
| Soft cap NOT in DB layer | See §6 — race tradeoff documented; client check is sufficient and simpler. |
| `updated_at` column | Supports the inline rename surface (§7). Trigger to auto-update is overkill for v1 — application code sets it via `.update({ name, updated_at: new Date().toISOString() })`. |

### Pitfall avoidance baked into the skeleton

- **`auth_rls_initplan` perf lint (Phase 18 carryforward):** v2.0 audit flagged 33 instances of bare `auth.uid()` in RLS. Phase 18 will rewrite these to `(SELECT auth.uid())` pattern in bulk. Planner should write the new policies in BARE form to match the existing 33 (don't preempt the bulk fix; keep migration consistent with what's there). Phase 18 will sweep all of them at once.
- **`unindexed_foreign_keys` perf lint:** 14 instances flagged. The `saved_searches_user_id_idx` index above pre-empts the lint hit on `user_id` FK. Good citizen.
- **`NOT NULL` + indexed `user_id`:** policy `auth.uid() = user_id` requires `user_id NOT NULL`; the skeleton has both. (See Pitfall 2.)

### Application path (CLAUDE §1, §2, §3)

1. **Studio SQL Editor preferred** (§2) — paste the migration body inline. No `pg_net` here so it's not strictly required, but Studio matches recent precedent (Phase 20-02, 20-08) and avoids the `--read-only` MCP restart cycle.
2. **Verify via read-only MCP:** `list_tables` (note MCP-QUIRK-01 — `schemas: ['public']` array bug; fall back to `pg_constraint` / `pg_indexes` / `pg_policies` SELECTs); `pg_policies WHERE tablename = 'saved_searches'` should return 4 rows.
3. **Registry note:** Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows (CLAUDE.md §2 sub-finding). After Studio apply, run a Studio INSERT into the registry to keep it current — or accept the registry-rowless state and document in `NAMING.md` lookup table per the established convention.

---

## 2. URL Filter Snapshot API

**Confidence: HIGH** (verified via direct read of `JobSearch.tsx` and `FilterSidebar.tsx`)

### What `searchParams.toString()` returns

Standard URLSearchParams serialization. For a filter set `{shed_type: ['rotary', 'herringbone'], region: ['Waikato'], accommodation_type: ['couples'], salary_min: '60000'}`, `toString()` returns:

```
shed_type=rotary&shed_type=herringbone&region=Waikato&accommodation_type=couples&salary_min=60000
```

Round-trips losslessly via `new URLSearchParams(savedString)`. `getAll(key)` recovers multi-valued params; `get(key)` for single-valued.

### Filter param keys actually in play (from `JobSearch.tsx` + `FilterSidebar.tsx`)

| Key | Cardinality | Source (FilterSidebar) | Used in JobSearch query? |
|-----|-------------|------------------------|--------------------------|
| `role_type` | multi | ROLE_TYPES checkboxes | YES (line 256-258) |
| `mentorship` | toggle | EXTRAS_FILTERS | (read but not bound to query in JobSearch.tsx — UX lint) |
| `vehicle` | toggle | EXTRAS_FILTERS | (read but not bound) |
| `dairynz_pathway` | toggle | EXTRAS_FILTERS | (read but not bound) |
| `posted_recent` | toggle | EXTRAS_FILTERS | YES (line 269-273) |
| `shed_type` | multi | SHED_TYPES checkboxes | YES (line 207-210) |
| `region` | multi | NZ_REGIONS checkboxes | YES (line 212-217) |
| `contract_type` | multi | CONTRACT_TYPES checkboxes | YES (line 219-224) |
| `herd_size` | multi | HERD_SIZE_BUCKETS checkboxes | YES (line 238-253) |
| `salary_min` | single | Slider (atomic update via `__salary__`) | YES (line 226-230) |
| `salary_max` | single | Slider | YES (line 232-236) |
| `accommodation_type` | multi | ACCOMMODATION_OPTIONS checkboxes | YES (line 263-266) |
| `visa` | toggle | Toggle | YES (line 275-278) |
| `dairynz_level` | single | Select | (read but not bound to query) |
| `sort` | single | Sort selector in ResultsArea | YES (line 281-285) |
| `page` | single | Pagination | YES (line 197 — pageParam) |

**Authoritative list for `handleClearAll`** (JobSearch.tsx:170-176): `role_type, mentorship, vehicle, dairynz_pathway, posted_recent, shed_type, region, contract_type, herd_size, salary_min, salary_max, accommodation_type, visa, dairynz_level, page`. **Saved-search snapshot must use this same allowlist** (single source of truth — extract a constant if planner wants to share).

### Snapshot strategy (planner-actionable)

```typescript
// SAVE: snapshot all known filter keys EXCEPT page
const FILTER_KEYS = [
  'role_type', 'mentorship', 'vehicle', 'dairynz_pathway', 'posted_recent',
  'shed_type', 'region', 'contract_type', 'herd_size',
  'salary_min', 'salary_max', 'accommodation_type',
  'visa', 'dairynz_level', 'sort',  // sort is preserved (user-meaningful)
  // 'page' EXCLUDED — saved searches always start at page 1 on load
] as const

function snapshotFilters(searchParams: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    for (const value of searchParams.getAll(key)) {
      next.append(key, value)
    }
  }
  return next.toString()
}

// LOAD: round-trip via navigate
import { useNavigate } from 'react-router'
const navigate = useNavigate()
navigate(`/jobs?${row.search_params}`, { replace: false })
```

### "Filters applied" predicate (Save button visibility)

Mirror `FilterSidebar.tsx:117-131` `hasActiveFilters` predicate — Save button hidden when `searchParams` is empty / has only `page` and `sort=match` (default). Unifying the predicate as a shared helper (planner discretion) avoids drift.

### Gotchas

- **`page` MUST be excluded from the snapshot.** Locked decision. A user saving on page 3 of a 5-page result loads back to page 1 (refresh of mental model). Fits the "save filter STATE, not pagination state" mental model.
- **`sort` is INCLUDED** — recommended. A seeker who saved "Dairy in Waikato sorted by salary high-to-low" expects that on load. Planner can flip if they prefer "always default match sort" — minor.
- **Transient/UI-only params NOT in URL** — there are none in `JobSearch.tsx` worth excluding. `expandedId`, `drawerOpen` are component-local state, not URL params.
- **Filter-key drift over time** — see Pitfall 6 (filter snapshot drift).

---

## 3. Auto-Name Derivation

**Confidence: HIGH** (filter values + labels are all defined in `src/types/domain.ts` + `FilterSidebar.tsx`)

### Algorithm (planner-implementable)

Goal: produce readable strings like `"Dairy in Waikato + accommodation"`, `"Farm Manager · Canterbury"`, `"Saved search 2026-05-05"` (fallback).

```typescript
function deriveAutoName(searchParams: URLSearchParams): string {
  const parts: string[] = []

  // 1. Shed type (highest signal — defines the farming domain)
  const shedTypes = searchParams.getAll('shed_type')
  if (shedTypes.length === 1) {
    // Map 'rotary' → 'Rotary' via SHED_TYPES label lookup
    const label = SHED_TYPES.find(s => s.value === shedTypes[0])?.label
    if (label) parts.push(label)
  } else if (shedTypes.length > 1) {
    parts.push(`${shedTypes.length} shed types`)
  }

  // 2. Role type (alternative primary axis if no shed_type)
  if (parts.length === 0) {
    const roleTypes = searchParams.getAll('role_type')
    if (roleTypes.length === 1) {
      const label = ROLE_TYPE_LABELS[roleTypes[0]]  // (planner: extract this map)
      if (label) parts.push(label)
    } else if (roleTypes.length > 1) {
      parts.push(`${roleTypes.length} roles`)
    }
  }

  // 3. Region (location qualifier — joined with "in")
  const regions = searchParams.getAll('region')
  if (regions.length === 1) {
    parts.push(`in ${regions[0]}`)
  } else if (regions.length > 1) {
    parts.push(`in ${regions.length} regions`)
  }

  // 4. Accommodation flag (boolean-ish add-on)
  const accom = searchParams.getAll('accommodation_type')
  if (accom.length > 0) parts.push('+ accommodation')

  // 5. Visa flag
  if (searchParams.get('visa') === 'true') parts.push('+ visa sponsorship')

  // Fallback: ISO date
  if (parts.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return `Saved search ${today}`
  }

  // Truncate to ~50 chars
  const name = parts.join(' ')
  return name.length > 50 ? `${name.slice(0, 47).trimEnd()}…` : name
}
```

### Recommended priority axes (gate brief explicitly says "shed_type, region, accommodation toggle if those filters are set")

1. **shed_type** — domain (Dairy via Rotary, Sheep & Beef proxy via others)
2. **role_type** — fallback primary if no shed_type
3. **region** — location qualifier
4. **accommodation_type** — high-signal seeker preference
5. **visa** — important for non-NZ seekers
6. **salary** — skip; band names are noisy ("$60k-$120k Dairy in Waikato" is too dense)

### Edge cases

- **No filters set** — Save button is hidden in this state (locked decision), but defence-in-depth fallback is `"Saved search YYYY-MM-DD"` ISO-style.
- **Two saved searches in same session with same filters** — auto-name collides. Locked decision says "name policy: required, auto-suggested, editable" — user can edit before save. Optional pre-flight collision check (Claude's discretion item) — if planner adds it, surface inline `role="alert"` warning, don't block save (let user keep duplicates if they want).

---

## 4. Soft-Delete with Undo Toast

**Confidence: HIGH** (sonner v2.0.3 in `package.json`; `Action` interface confirmed via `node_modules/sonner/dist/index.d.ts`)

### sonner API surface (verified)

```typescript
// from node_modules/sonner/dist/index.d.ts
interface Action {
  label: React.ReactNode
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  actionButtonStyle?: React.CSSProperties
}

// ToastT (and so toast() options) supports:
// - duration?: number  (ms; default 4000)
// - action?: Action | React.ReactNode
// - onAutoClose?: (toast: ToastT) => void  (fires when toast dismisses naturally)
// - onDismiss?: (toast: ToastT) => void   (fires when user dismisses or action clicked)
```

The undo pattern uses a ref-tracked "cancellation flag" plus `onAutoClose` for the deferred hard-DELETE.

### Reference snippet (planner-actionable)

```typescript
import { toast } from 'sonner'

async function handleDelete(searchId: string, searchName: string) {
  // 1. Optimistic UI: hide row immediately
  setSavedSearches(prev => prev.filter(s => s.id !== searchId))

  // 2. Sentinel — flipped if user clicks Undo
  let cancelled = false

  toast.success(`"${searchName}" deleted`, {
    duration: 5000,
    action: {
      label: 'Undo',
      onClick: () => {
        cancelled = true
        // Restore the row optimistically; refetch on next mount for safety
        setSavedSearches(prev => /* re-add the deleted row */)
      },
    },
    onAutoClose: async () => {
      if (cancelled) return
      // Hard DELETE fires after 5s if user didn't undo
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
      if (error) {
        toast.error('Failed to delete saved search')
        // Restore the row — DELETE failed
        setSavedSearches(prev => /* re-add */)
      }
    },
  })
}
```

### Existing project toast usage (sanity-check baseline)

- `MyApplications.tsx:141` — `toast.success('Application withdrawn')` (no action)
- `useSavedJobs.ts:43` — `toast.error('Could not save job — please try again')` (no action)
- `ProfileDrawer.tsx:172` — `toast.success(next ? 'Account reactivated' : 'Account suspended')` (no action)
- **No existing `action`-bearing toast in the project** — Phase 17 introduces the first.

### Pitfall: action firing after component unmount

If the user navigates away from `/dashboard/seeker/saved-searches` within 5s, `onAutoClose` may still fire. The DELETE fires (correct behavior — the user did click delete). The `setSavedSearches(prev => …)` restoration on undo would update unmounted-component state — React 19 just warns, doesn't crash, but is noisy.

**Mitigation:** Hold the deleted-row data in a `useRef` keyed by `searchId` rather than calling `setSavedSearches` from inside `onClick` — only the DELETE itself runs in `onAutoClose`. Planner can refine.

### Multi-delete tabs / concurrency

Two tabs both deleting different rows is fine (independent `searchId`s). Same-row delete in two tabs: the second tab's optimistic hide already shows nothing for that row; both onAutoClose fire DELETE; second DELETE is a no-op. Acceptable.

### Why NOT a soft-delete column (e.g., `deleted_at`)?

Locked decision says "row hidden client-side, hard DELETE fires after 5s OR cancels on undo click." The "soft-delete" framing in CONTEXT.md is UX-level (Gmail/Slack pattern), not DB-level. Adding a `deleted_at` column would (a) require a periodic cleanup cron (out of scope per "no pg_cron / pg_net for alerts"), (b) complicate RLS, (c) add no user value. **Stick with hard DELETE on auto-close.**

---

## 5. Quick-Load Dropdown Placement

**Confidence: HIGH** (verified via direct read of `JobSearch.tsx` + `ResultsArea` sub-component)

### Where the affordance sits

In the **`ResultsArea` header** of `JobSearch.tsx` (line 552-578), next to the result count and Sort selector. **Not** in `SearchHero.tsx` (the green hero is for the marketing-funnel search box; saving filters is a logged-in seeker flow that belongs in the results area).

### DOM/JSX shape (planner refines)

```tsx
// JobSearch.tsx:552-578 currently has:
<div className="flex items-center justify-between mb-4">
  <p className="text-[14px] font-body text-text-muted">
    {/* result count */}
  </p>
  <div className="flex items-center gap-2">
    {/* sort selector */}
  </div>
</div>

// PROPOSED Phase 17 addition:
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <p className="text-[14px] font-body text-text-muted">
      <strong>{jobs.length}</strong> jobs found
    </p>
    {hasFilters && isLoggedIn && (
      <>
        <span className="text-text-subtle">·</span>
        <button onClick={() => setSaveModalOpen(true)} className="text-brand text-[13px] hover:underline">
          Save search
        </button>
        <SavedSearchesDropdown
          onLoad={(params) => navigate(`/jobs?${params}`, { replace: false })}
        />
      </>
    )}
  </div>
  <div className="flex items-center gap-2">{/* sort selector */}</div>
</div>
```

### `SavedSearchesDropdown` skeleton

```tsx
function SavedSearchesDropdown({ onLoad }: { onLoad: (params: string) => void }) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<SavedSearch[]>([])
  const { session } = useAuth()

  useEffect(() => {
    if (!open || !session?.user) return
    supabase.from('saved_searches')
      .select('id, name, search_params, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecent((data ?? []) as SavedSearch[]))
  }, [open, session?.user?.id])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-brand text-[13px] hover:underline flex items-center gap-1"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Load saved search <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 bg-surface border border-border rounded-[10px] shadow-lg w-[280px] z-30">
          {recent.length === 0
            ? <p className="p-3 text-text-subtle text-[13px]">No saved searches yet.</p>
            : recent.map(s => (
                <button key={s.id} onClick={() => { onLoad(s.search_params); setOpen(false) }} className="…">
                  <div>{s.name}</div>
                  <div className="text-text-subtle text-[12px]">{summarizeFilters(s.search_params)}</div>
                </button>
              ))}
          <Link to="/dashboard/seeker/saved-searches" className="border-t …">View all</Link>
        </div>
      )}
    </div>
  )
}
```

### Why this doesn't disturb URL-state machinery (commit `7401116`)

Commit `7401116` added the `jobs!inner` join to `match_scores` queries in `SeekerStep7Complete.tsx` (NOT in `JobSearch.tsx` — re-read confirms). The corresponding fix-shape for `JobSearch.tsx` was JOBS-01 (commit `c6066ea`) which gated `fetchJobs` on `authLoading` so the effect fires once.

The saved-search load flow does:
1. `navigate('/jobs?<params>', { replace: false })`
2. react-router updates `searchParams`
3. `JobSearch.tsx:366-370` `useEffect` re-fires `fetchJobs` (gate `if (authLoading) return` already passes — auth resolved)
4. Existing query reconstruction logic runs (including the `match_scores` fetch which uses `seeker_profiles.id` — seeker is already authenticated, no race)

**No new state machinery, no useEffect deps changes, no race surfaces.** Verify by writing a `tests/saved-search-load.test.tsx` that asserts: (a) `navigate('/jobs?…')` triggers ONE fetchJobs call, (b) match-scores re-render shows correct values not stale ones.

### Accessibility

- `aria-haspopup="menu"`, `aria-expanded` on trigger button
- Click-outside-to-close (use a ref + `useEffect` mousedown listener, or the existing `Dialog` pattern from `JobSearch.tsx:407-436` if planner wants belt-and-braces)
- Esc to close
- Focus first item on open (optional polish)

---

## 6. 10-Search Soft Cap UX

**Confidence: MEDIUM-HIGH** (recommendation is grounded; tradeoffs documented)

### Path comparison

| Path | Pros | Cons |
|------|------|------|
| **Client-side count check before insert** (RECOMMENDED) | Simplest. UX-first. Replace-modal flow is intuitive. No DB-layer surface to coordinate. | Race: two tabs both at 9 saving simultaneously — both see count=9, both insert, user ends with 11. Acceptable: drift is +1, not security-critical. |
| RLS / CHECK constraint at row count | Bulletproof against race | CHECK can't reference COUNT (subquery in CHECK is restricted). Would need a trigger BEFORE INSERT that raises if count >= 10 — extra complexity for tiny edge case. |
| BEFORE INSERT trigger | Bulletproof; clean error code path | Requires `RAISE EXCEPTION` with a specific code; client must catch and show modal. Same UX flow as client-check, more wiring. |

### Recommendation: **Client-side count check** with replace-modal flow

```typescript
async function handleSaveAttempt(name: string, params: string) {
  // 1. Count existing
  const { count } = await supabase
    .from('saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)

  if ((count ?? 0) >= 10) {
    // Open replace modal — fetch oldest by created_at asc, name only
    const { data: oldest } = await supabase
      .from('saved_searches')
      .select('id, name')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    setReplaceModal({ oldestId: oldest.id, oldestName: oldest.name, pendingName: name, pendingParams: params })
    return
  }

  // 2. Normal insert
  await supabase.from('saved_searches').insert({ user_id: session.user.id, name, search_params: params })
  toast.success(`Saved "${name}"`)
}

async function handleReplaceConfirm() {
  // Atomic-ish: delete oldest, then insert new. Edge: if delete succeeds and insert fails,
  // user is at count=9. Acceptable (next save retry will work).
  await supabase.from('saved_searches').delete().eq('id', replaceModal.oldestId)
  await supabase.from('saved_searches').insert({
    user_id: session.user.id,
    name: replaceModal.pendingName,
    search_params: replaceModal.pendingParams,
  })
  toast.success(`Replaced "${replaceModal.oldestName}" with "${replaceModal.pendingName}"`)
  setReplaceModal(null)
}
```

### Replace modal — uses MarkFilledModal pattern

CONTEXT.md says: `"You've reached 10 saved searches. Replace the oldest one (\"<oldest-name>\") or delete one first?"` with two buttons: `Replace oldest` and `Cancel`.

This is the same modal shape as `MarkFilledModal.tsx` (Cancel + primary action) — copy that structure verbatim. No new primitives.

### Race-condition tradeoff (acceptable)

Two tabs at count=9 both try save simultaneously: race window is ~50ms (count query → insert). User ends at 11. **Acceptable** — they'll see 11 in the list, confused but not broken. Next save would trip the cap normally. The cost of preventing this race (DB trigger) outweighs the benefit (one user, one extra row, no security implication).

If the planner wants belt-and-braces: add a deferred database constraint as a future-phase polish (not v2.0 launch blocker).

---

## 7. Inline Rename

**Confidence: HIGH** (no exact precedent in repo, but pattern is straightforward composition)

### Existing precedent search

```bash
grep -rn "click.*edit\|inline.*rename\|contentEditable" src/  # zero hits
```

There is **no inline-rename precedent** in the codebase. Phase 17 introduces it. Planner builds from primitives.

### Minimal pattern

```tsx
function SavedSearchRow({ search, onRename, onDelete, onLoad }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(search.name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function commit() {
    const trimmed = draft.trim()
    if (trimmed.length === 0 || trimmed.length > 100) {
      // surface error inline; mirror MarkFilledModal's role="alert" pattern
      return
    }
    if (trimmed === search.name) { setEditing(false); return }  // no-op
    setSaving(true)
    const { error } = await supabase
      .from('saved_searches')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', search.id)
    setSaving(false)
    if (error) {
      toast.error('Failed to rename')
      return
    }
    onRename(search.id, trimmed)
    setEditing(false)
  }

  return (
    <div className="card-row …">
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(search.name); setEditing(false) }
          }}
          onBlur={commit}
          aria-label="Edit saved search name"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-left text-[15px] font-body font-semibold hover:underline"
          aria-label={`Rename ${search.name}`}
        >
          {search.name}
        </button>
      )}
      {/* Load / Delete buttons */}
    </div>
  )
}
```

### React Hook Form vs local state for rename

**Recommendation: Local state.** RHF is overkill for a single-field inline edit. RHF shines on multi-field forms with cross-field validation (Login, AdminLoginPage). Single field with min-1/max-100 character validation is fine as plain state + Zod-`safeParse` on commit (or manual length check).

**Caveat:** the **save modal** (which IS a form with a name field + auto-name pre-fill) SHOULD use RHF + Zod, mirroring `Login.tsx` / `AdminLoginPage.tsx`. Pre-fill via RHF's `defaultValues: { name: deriveAutoName(searchParams) }`. Don't use `reset()` after mount — the auto-name is computed once at modal-open time.

### `defaultValues` vs `reset()` timing pitfall (RHF gotcha)

If the user opens the save modal twice in one session, RHF's `defaultValues` only applies on first mount. To re-derive the auto-name each open: either (a) remount the modal (`{isOpen && <Modal …/>}` pattern that `MarkFilledModal.tsx` uses — line 103: `if (!isOpen) return null`), or (b) call `reset({ name: deriveAutoName(...) })` in a `useEffect` keyed on `isOpen`.

**Recommendation: option (a)**, mirroring MarkFilledModal precedent. Cleaner.

---

## 8. Test Coverage Strategy

**Confidence: HIGH** (vitest 3.1.1 + RTL 16.3.0 + jsdom; 36 existing test files; mock patterns established)

### Existing infrastructure

- **Vitest 3.1.1** + **@testing-library/react 16.3.0** + **jsdom 29.0.0** (`package.json`)
- **Setup:** `tests/setup.ts` (jest-dom + cleanup)
- **Config:** `vitest.config.ts` (mergeConfig with vite.config; include `tests/**/*.test.{ts,tsx}`)
- **Run command:** `pnpm test` (one-shot via `vitest`)
- **Existing supabase-client mock pattern:** `tests/admin-employer-list.test.ts` (lines 1-11) — `vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))` with hoisted `vi.fn()`. For non-RPC table access, swap `rpc` for `from` chain: `{ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ ... }) }) }`.
- **vi.hoisted pattern** (Phase 20-06 precedent): for tests that statically import the SUT, use `const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))`. Lazy-import via `await import('@/lib/supabase')` dodges this.
- **Migration / RLS test approach:** No live-DB integration tests in the repo. Phase 20 admin RLS tests deferred live integration to Plan 20-08 manual UAT (`admin-rls-not-widened.test.ts` is a placeholder). Phase 17 should follow this pattern: shape-contract tests for client→DB calls, deferred manual UAT for actual RLS enforcement.

### Phase 17 test suite proposal

Files to create:

| File | Purpose | Tests |
|------|---------|-------|
| `tests/saved-search-modal.test.tsx` | Save flow modal renders + validates | name required, max 100 chars, auto-name pre-fill, Esc closes, submit calls supabase |
| `tests/saved-search-list.test.tsx` | `SavedSearches.tsx` page | empty state, list renders, load button calls navigate, delete shows undo toast, rename in-place |
| `tests/saved-search-quick-load.test.tsx` | Quick-load dropdown in JobSearch | dropdown opens, top-5 fetched, click loads + closes, "View all" link |
| `tests/saved-search-cap.test.tsx` | 10-cap replace flow | 10 saved → 11th opens replace modal, replace deletes oldest + inserts new |
| `tests/saved-search-snapshot.test.ts` | Pure-function tests for `snapshotFilters` + `deriveAutoName` | round-trip lossless, page excluded, 50-char truncation, fallback ISO date |
| `tests/saved-search-load-integration.test.tsx` | Stale-match-scores regression guard | navigate('/jobs?<params>') with stale-job state — verify match scores not crashed (mirrors commit 7401116 fix) |

### Mock shape sample

```typescript
// For tests that exercise the from(...).select(...).eq(...).order(...).limit(...) chain
const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  fromMock.mockReset()
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [/* ... */], error: null }),
        }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  })
})
```

### Manual UAT scope (Wave 4 / verification)

1. **Save → load round-trip:** sign in as seeker, set 3 filters, save with auto-name, reload page, navigate to dashboard list, click Load — verify URL params restored exactly (compare `searchParams.toString()` pre/post).
2. **Delete with undo:** delete a saved search, click Undo within 5s — row restored, no DB DELETE (verify via Supabase Studio `select count(*) where id = ...` shows row still present).
3. **Delete without undo:** delete, wait 6s — row gone from DB.
4. **10-cap replace:** save 10 searches, attempt 11th — modal appears, click Replace — oldest deleted, new saved.
5. **Cross-session persistence:** sign out, sign back in — saved searches still present.
6. **Multi-tab race (low priority):** open two tabs at count=9, save simultaneously in both — verify the +1 drift is acceptable (count=11) and no error toast fires.

---

## Validation Architecture

> Per project config (`workflow.nyquist_validation` not set in `.planning/config.json`; treat as enabled per RESEARCH.md default).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + @testing-library/react 16.3.0 + jsdom 29.0.0 |
| Config file | `vitest.config.ts` (mergeConfig with vite.config; include `tests/**/*.test.{ts,tsx}`) |
| Quick run command | `pnpm test -- --run tests/saved-search-snapshot.test.ts` (single file) |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-13 | Save modal renders and accepts auto-name | unit (RTL) | `pnpm test -- --run tests/saved-search-modal.test.tsx` | ❌ Wave 0 |
| SRCH-13 | `snapshotFilters` round-trips lossless | unit (pure) | `pnpm test -- --run tests/saved-search-snapshot.test.ts` | ❌ Wave 0 |
| SRCH-13 | 10-cap triggers replace modal | unit (RTL) | `pnpm test -- --run tests/saved-search-cap.test.tsx` | ❌ Wave 0 |
| SRCH-14 | Quick-load dropdown lists top 5 + navigates | unit (RTL) | `pnpm test -- --run tests/saved-search-quick-load.test.tsx` | ❌ Wave 0 |
| SRCH-14 | Load preserves filter state (no stale match-scores crash) | unit (RTL) | `pnpm test -- --run tests/saved-search-load-integration.test.tsx` | ❌ Wave 0 |
| SRCH-15 | Delete shows undo toast; auto-close fires DELETE | unit (RTL) | `pnpm test -- --run tests/saved-search-list.test.tsx` | ❌ Wave 0 |
| Cross-cutting | RLS prevents seeker A from reading seeker B's saved_searches | manual UAT | (browser console — sign in as seeker A, query saved_searches table for seeker B's user_id, expect empty) | manual-only |
| Cross-cutting | RLS prevents anonymous users from any access | manual UAT | (incognito → query `select * from saved_searches` returns 0 rows even with valid user_ids) | manual-only |

### Sampling Rate (Nyquist)

- **Per task commit:** `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` (all phase-related files)
- **Per wave merge:** `pnpm test -- --run` (full suite — guards against regression in JobSearch / Sidebar)
- **Phase gate:** Full suite green + 6 manual UAT items above passed before `/gsd:verify-work`

### Wave 0 Gaps (must scaffold before implementation)

- [ ] `tests/saved-search-modal.test.tsx` — covers SRCH-13 modal render + Zod validation
- [ ] `tests/saved-search-list.test.tsx` — covers SRCH-15 (delete + undo) and rename
- [ ] `tests/saved-search-quick-load.test.tsx` — covers SRCH-14 dropdown
- [ ] `tests/saved-search-cap.test.tsx` — covers 10-cap replace modal
- [ ] `tests/saved-search-snapshot.test.ts` — covers `snapshotFilters` + `deriveAutoName` pure functions
- [ ] `tests/saved-search-load-integration.test.tsx` — guards against stale-match-scores regression on saved-search load
- [ ] `tests/saved-search-UAT.md` — manual UAT script for the 6 items above

*Existing test infrastructure (vitest + RTL + jsdom + supabase mock pattern) covers all phase requirements. No framework install needed.*

---

## Pitfalls

### Pitfall 1: Saved-search load breaks the stale-match-scores fix (commit `7401116`)

**Severity:** Medium — would only surface if the planner restructures `JobSearch.tsx`'s `useEffect` deps.

**Root cause:** Commit `7401116` fixed `SeekerStep7Complete.tsx` (NOT JobSearch.tsx) — the `match_scores → jobs` PostgREST embedded join now uses `jobs!inner` to drop null-joined rows server-side. JobSearch.tsx's analogous fix was JOBS-01 (`c6066ea`) — `authLoading` gate so `fetchJobs` fires once.

**Why Phase 17 is at risk:** The quick-load dropdown sits inside `ResultsArea`, which is inside `JobSearch`. If a planner inadvertently adds `searchParams` or `recentSavedSearches` to the `fetchJobs` useEffect deps, they could trigger multi-fire (re-introducing JOBS-01 lock contention).

**Prevention:** The dropdown's data fetch lives in its own `useEffect` (keyed on `open` + `session?.user?.id`), NOT on `searchParams`. Saved-search load via `navigate('/jobs?…')` updates `searchParams` which the EXISTING `fetchJobs` useEffect (line 366-370) handles — no new effect needed in JobSearch.tsx. **Add a regression test** (`tests/saved-search-load-integration.test.tsx`) that asserts: load triggers ONE fetchJobs call, match-scores re-rendered correctly.

### Pitfall 2: RLS policy gotcha — `auth.uid() = user_id` requires NOT NULL + indexed `user_id`

**Severity:** Low (the skeleton handles both).

**Root cause:** `auth.uid() = NULL` evaluates to NULL (not false), so a row with NULL `user_id` would silently be inaccessible (NULL != true). And without an index on `user_id`, Supabase's `auth_rls_initplan` advisor will lint the table.

**Prevention (already in skeleton):** `user_id uuid NOT NULL` + `CREATE INDEX saved_searches_user_id_idx`.

### Pitfall 3: React Hook Form `defaultValues` vs `reset()` timing on modal re-open

**Severity:** Medium — would manifest as "auto-name doesn't refresh when user opens save modal a second time with different filters."

**Root cause:** RHF's `defaultValues` only applies on first mount. Reusing the same modal component instance keeps the stale name field.

**Prevention:** Mirror MarkFilledModal.tsx's `if (!isOpen) return null` pattern (line 103) — modal fully unmounts on close, remounts on open with fresh `defaultValues`. Cleaner than `reset()` in `useEffect`.

### Pitfall 4: sonner undo toast firing after component unmount

**Severity:** Low — React 19 warns but doesn't crash.

**Root cause:** User clicks delete on `/dashboard/seeker/saved-searches`, navigates to `/jobs`, the 5s timer fires `onAutoClose` → setSavedSearches on unmounted component → React warning.

**Prevention:** Hold the deleted-row data in a `useRef` keyed by `searchId`. `onAutoClose` only fires the DELETE; restoration on undo can be a `useState` setter (page is mounted at that point — user is interacting with the toast on the page). Or guard with a `mountedRef` pattern. Planner discretion — both work.

### Pitfall 5: 10-cap race in two tabs

**Severity:** Very low — graceful drift only.

**Root cause:** Two tabs both at count=9 save simultaneously; both see count=9, both insert, end state count=11.

**Prevention:** Documented as acceptable tradeoff (§6). DB-level enforcement (BEFORE INSERT trigger) is overkill for this edge case. If alerts phase needs strict 10-max for cron schedule planning, revisit then.

### Pitfall 6: Filter snapshot drift over time

**Severity:** Medium-future — silent breakage if filter param keys are renamed/removed.

**Root cause:** A saved search from 2026-05-05 with `accommodation_type=couples` would silently break in 2027 if `JobSearch.tsx` renames the param to `housing_type`. URLSearchParams round-trip is lossless, but query reconstruction in `fetchJobs` is per-key — unrecognized keys are silently dropped.

**Prevention strategy options:**

1. **Document the risk, accept it** (recommended for v2.0 launch). Add a comment in the migration: `"search_params is a URLSearchParams snapshot; filter key renames in JobSearch.tsx will silently invalidate old saved searches. Future-phase: add a schema_version column."`
2. **Add `schema_version` column** (over-engineering for v1).
3. **Add a "load failed — try resaving" toast** when a load produces zero results (false-positive risk on legitimately empty results).

**Recommendation:** Option 1 — document and move on. v2.0 launch isn't worth the schema-versioning complexity.

### Pitfall 7: Save button visibility predicate drift

**Severity:** Low.

**Root cause:** `FilterSidebar.tsx:117-131` defines `hasActiveFilters` inline. `JobSearch.tsx`'s Save button visibility uses the same check. If two implementations drift (e.g., Phase 18 adds a new filter to FilterSidebar but not to the Save predicate), Save button would show on filters that aren't actually applied.

**Prevention:** Extract `hasActiveFilters(searchParams)` as a shared helper in `src/lib/filterState.ts` (or similar) — both consumers import it. Light refactor; planner can scope into Phase 17 or defer to Phase 18 cleanup.

### Pitfall 8: Navigation away during in-flight rename inputs

**Severity:** Very low.

**Root cause:** User clicks rename → types → navigates away (Cmd+L typed URL). The `onBlur` commit fires AFTER navigation; if mid-flight rename promise rejects post-unmount, React 19 warning.

**Prevention:** Either (a) drop the commit-on-blur — make commit explicit on Enter only (slightly worse UX), or (b) use a try/catch + ignored-rejection guard. Low-priority polish; planner discretion.

---

## Open Questions for Planner

1. **Filter chip rendering for the saved-searches list rows** — gate brief leaves chip selection to planner discretion. Recommend: top 3-5 filter values by signal density (shed_type → role_type → region → accommodation_type → visa). Re-use `ActiveFilterPills.tsx` if its API permits read-only mode (currently has `onRemove`; pass `() => {}` no-op). Open: should chips be clickable to navigate-and-load with that single filter? Out of v1 scope; document for future polish.

2. **`hasActiveFilters` helper extraction** — Phase 17 internal scope or Phase 18 carryforward? Lightweight refactor; recommend in-scope (10 lines moved).

3. **Wave granularity** — proposed 4 waves (migration / save / list / quick-load) align with CLAUDE §4 atomic-commit-per-plan. Could collapse list + quick-load into one wave if planner wants 3 commits. Tradeoff: 4 waves = lower per-commit risk + more granular bisect; 3 waves = less ceremony.

4. **Pre-flight collision check on duplicate names** — Claude's discretion. Recommend: skip for v1, capture as polish todo.

5. **Sort handling on saved-search snapshot** — recommended INCLUDE `sort` in snapshot (§2). Planner can flip if "saved searches always sort by match" is more intuitive. Either is defensible.

6. **Test coverage on Wave 0** — if planner wants to mirror Phase 20-01 Wave 0 scaffolding pattern (`it.todo()` for unimplemented assertions), proposed 6 test files seed cleanly into that workflow.

---

## Sources

### Primary (HIGH confidence)
- `src/pages/jobs/JobSearch.tsx` — direct read; URL state machinery, fetchJobs effect (line 366-370), filter param keys (line 170-176)
- `src/pages/jobs/MarkFilledModal.tsx` — direct read; inline modal pattern, `if (!isOpen) return null` (line 103)
- `src/pages/dashboard/seeker/MyApplications.tsx` — direct read; card-row layout, empty state pattern
- `src/components/ui/Input.tsx`, `src/components/ui/Button.tsx` — direct read; v2 primitive APIs
- `src/components/layout/Sidebar.tsx` — direct read; nav addition pattern (Sign Out footer slot Phase 20.1 precedent)
- `src/pages/auth/Login.tsx` — direct read; RHF + Zod pattern with inline `role="alert"`-style errors
- `src/types/domain.ts` — direct read; SHED_TYPES, NZ_REGIONS, etc. (label lookup for auto-name)
- `src/main.tsx` — direct read; route registration pattern with `<ProtectedRoute requiredRole="seeker">`
- `supabase/migrations/015_phase9_schema.sql` — direct read; `saved_jobs` precedent (FOR ALL policy + UNIQUE constraint)
- `supabase/migrations/019_seeker_documents.sql` — direct read; granular per-operation policies precedent
- `supabase/migrations/023_admin_rpcs.sql` — direct read; `auth.uid()` usage in current migration era
- `node_modules/sonner/dist/index.d.ts` — direct read; `Action` interface confirmed (label + onClick + actionButtonStyle)
- `tests/admin-employer-list.test.ts`, `tests/admin-suspend.test.ts` — direct read; supabase-rpc mock pattern + vi.hoisted precedent
- `vitest.config.ts`, `tests/setup.ts` — direct read; vitest 3.1.1 + RTL 16.3.0 + jsdom 29.0.0 confirmed
- `package.json` — direct read; sonner ^2.0.3, @hookform/resolvers ^5.0.1, zod ^3.24.2, react-router ^7.5.0
- `.planning/REQUIREMENTS.md` — SRCH-13/14/15 acceptance criteria
- `.planning/STATE.md` — phase boundary + Phase 19/19b/20.1 design system + auth context
- `.planning/ROADMAP.md` — Phase 17 success criteria
- `CLAUDE.md` — §1 MCP scoping, §2 Studio SQL preference, §3 diagnose-before-fix, §4 atomic commits, §7 partial-close

### Secondary (MEDIUM confidence)
- Git log inspection of commit `7401116` — fix scope confirmed (SeekerStep7Complete, not JobSearch); JobSearch's analogous fix is JOBS-01 (`c6066ea`)

### Not used
- Context7 — no Context7 lookups needed; all relevant APIs verified locally (sonner via node_modules, react-router via in-repo usage, RHF via in-repo Login.tsx pattern). Project's training-data-staleness mitigation is "verify in-repo first," and the in-repo evidence is comprehensive.
- WebSearch / WebFetch — no external research needed; phase is pure CRUD over established patterns. Email-pipeline / cron / pg_net research explicitly EXCLUDED per gate brief (alerts deferred).
- Hook-injected skill suggestions (Next.js, vercel-storage, shadcn, react-best-practices) — pattern-matched on directory names but irrelevant to actual stack (Vite + React Router v7 SPA on Supabase, hand-rolled v2 primitives). Documented for transparency; not consulted.

---

## Metadata

**Confidence breakdown:**
- DB migration shape: HIGH — direct precedent in 015 + 019 + RLS pattern in 4 other migrations
- URL filter snapshot API: HIGH — direct read of JobSearch.tsx + FilterSidebar.tsx; URLSearchParams is web standard
- Auto-name derivation: HIGH — all label maps in src/types/domain.ts; algorithm is pure function
- Soft-delete with undo: HIGH — sonner Action interface verified in node_modules; pattern is composition of existing toast + setState idioms
- Quick-load dropdown placement: HIGH — direct read of JobSearch.tsx ResultsArea structure; load flow is single-line `navigate()`
- 10-cap UX: MEDIUM-HIGH — recommendation grounded; race tradeoff documented
- Inline rename: HIGH (no precedent but composition is straightforward)
- Test strategy: HIGH — vitest infra + 36 existing tests + established mock patterns
- Pitfalls: HIGH — surfaced from direct read of git history (`7401116`, JOBS-01) and CLAUDE.md / STATE.md

**Research date:** 2026-05-05
**Valid until:** ~2026-06-05 (30 days for stable; in-repo references are stable, sonner v2.0.3 unlikely to break, Supabase RLS pattern stable)
