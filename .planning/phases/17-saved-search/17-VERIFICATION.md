---
phase: 17-saved-search
verified: 2026-05-05T18:08:00Z
status: human_needed
score: 3/4 ROADMAP success criteria empirically closed in code; 1 (cross-session persistence) needs operator UAT
re_verification: null  # initial verification

requirement_status:
  SRCH-13:
    classification: partially-closed-pending-UAT
    code_gaps_closed:
      - DB foundation (table + RLS + helpers + types) — 17-01 (commit 1c6a0fc)
      - Save modal UI + 10-cap replace flow + JobSearch wiring — 17-02 (commit 171d49e)
    open_gaps:
      - "tests/saved-search-UAT.md item 1 (save → load round-trip) — operator run pending"
      - "tests/saved-search-UAT.md item 4 (10-cap replace) — operator run pending; cap-test mock-validates UI shape but DB-level multi-row state not exercised"
      - "tests/saved-search-UAT.md item 5 (cross-session persistence) — operator run pending; cross-session is a DB durability guarantee, un-testable in jsdom"
    flippable: false  # CLAUDE §7 — UAT items 1, 4, 5 are SRCH-13 gates
  SRCH-14:
    classification: partially-closed-pending-UAT
    code_gaps_closed:
      - DB foundation (auto-scoped SELECT via RLS) — 17-01
      - List-page Load button (navigate('/jobs?<params>', { replace: false })) — 17-03 (commit 33a590b)
      - Quick-load dropdown (top-5 most-recent + click-to-navigate + View all link) — 17-04 (commit e349655)
      - JOBS-01 regression guard via static-source assertion — 17-04
    open_gaps:
      - "tests/saved-search-UAT.md item 1 (save → load round-trip) — operator run pending"
    flippable: false  # CLAUDE §7
  SRCH-15:
    classification: partially-closed-pending-UAT
    code_gaps_closed:
      - DB foundation (DELETE policy auth.uid() = user_id) — 17-01
      - List-page Delete with sonner Undo + sentinel cancellation flag + onAutoClose hard-DELETE + inline rename — 17-03
    open_gaps:
      - "tests/saved-search-UAT.md item 2 (delete with undo) — operator run pending; sonner timer-bound DELETE is jsdom-fragile, only mock-validated"
      - "tests/saved-search-UAT.md item 3 (delete without undo) — operator run pending"
      - "tests/saved-search-UAT.md item 7+8 (RLS isolation seeker-vs-seeker + anonymous) — CRITICAL CLAUDE §1 verification, cannot mock; pending"
    flippable: false  # CLAUDE §7

human_verification:
  - test: "UAT 1 — Save → load round-trip"
    expected: "After save → reload tab → list page → click Load, URL is /jobs?shed_type=rotary&region=Waikato&accommodation_type=couples and result list reflects those filters"
    why_human: "E2E URL-state restoration via real react-router navigate + searchParams subscription chain is jsdom-fragile (component-tests mock-validate insert + navigate shape but cannot exercise the full browser round-trip)"
  - test: "UAT 2 — Delete with undo"
    expected: "Click Delete → click Undo within 5s → row reappears AND select count(*) where id = X returns 1"
    why_human: "Sonner toast 5s timer + DOM unmount-during-toast timing is not deterministic in jsdom; existing list-page test mocks toast.success and verifies action shape but cannot exercise real timer"
  - test: "UAT 3 — Delete without undo"
    expected: "Click Delete → wait 6s → row gone AND select count(*) where id = X returns 0 (RLS-scoped + onAutoClose hard DELETE fired)"
    why_human: "Real DB DELETE under RLS needs Supabase connection; mock validates handler shape only"
  - test: "UAT 4 — 10-cap replace"
    expected: "Save 10 distinct searches; 11th attempt opens ReplaceOldestModal showing OLDEST name; click Replace; oldest deleted, new saved, count remains 10"
    why_human: "Multi-step modal flow + DB count assertion needs real DB state; cap-test mock-validates branch logic only"
  - test: "UAT 5 — Cross-session persistence (ROADMAP success criterion 4)"
    expected: "Save 2-3 searches; sign out; sign back in; saved searches still listed at /dashboard/seeker/saved-searches"
    why_human: "Cross-session auth state + DB durability guarantee is empirically un-testable in jsdom; this is a DB-level property (FK CASCADE only on user delete; rows persist across sessions by design)"
  - test: "UAT 6 — Multi-tab race (low priority)"
    expected: "Save 9 → open two tabs at filtered /jobs → click Save in both as close to simultaneously as possible → final count = 11 (acceptable +1 drift); no error toast"
    why_human: "Cross-tab race condition cannot be simulated in jsdom; documented acceptable per RESEARCH §6 / Pitfall 5"
  - test: "UAT 7 — RLS isolation seeker A vs seeker B (CRITICAL CLAUDE §1)"
    expected: "Signed in as seeker A, querying saved_searches WHERE user_id = '<seeker B uuid>' returns empty array (RLS filters cross-user reads server-side)"
    why_human: "Cannot mock RLS — needs two distinct authed users with different auth.uid() values; load-bearing for ownership pattern verification"
  - test: "UAT 8 — RLS isolation anonymous (CRITICAL CLAUDE §1)"
    expected: "In incognito (signed out), querying saved_searches.select('*') returns empty array regardless of any user_id"
    why_human: "Cannot mock RLS — needs real anonymous Supabase client session"
---

# Phase 17: Saved Search Verification Report

**Phase Goal:** A seeker can save their current filter state as a named search, reload it later, and delete searches they no longer need.
**Verified:** 2026-05-05T18:08:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Mapped from ROADMAP Success Criteria)

| #  | Truth (ROADMAP success criterion)                                                                           | Status            | Evidence                                                                                                                                                                                                                                                                                                       |
| -- | ----------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | A logged-in seeker with active filters can click "Save search", enter a name, and have the current filter combination persisted to the DB | ✓ VERIFIED (code) | JobSearch.tsx:620 `canSave = isLoggedIn && hasActiveFilters(searchParams)`; SaveSearchModal.tsx:74-98 onSubmit calls `supabase.from('saved_searches').insert({user_id, name, search_params})`; tests/saved-search-modal.test.tsx 9/9 GREEN; tests/saved-search-cap.test.tsx 5/5 GREEN; UAT 1 still required for E2E |
| 2  | A seeker can view their list of saved searches and click one to restore all filter state — URL updates and results refresh | ✓ VERIFIED (code) | SavedSearches.tsx:195-201 handleLoad → `navigate('/jobs?${params}', { replace: false })`; SavedSearchesDropdown.tsx:106-110 same shape; existing fetchJobs useEffect (JobSearch.tsx:379-383) deps `[searchParams, authLoading]` UNCHANGED (regression-guarded by tests/saved-search-load-integration.test.tsx 3/3 GREEN); tests/saved-search-list.test.tsx + saved-search-quick-load.test.tsx all GREEN; UAT 1 still required for E2E URL restoration |
| 3  | A seeker can delete a saved search from their list — removed from DB and no longer appears                  | ✓ VERIFIED (code) | SavedSearches.tsx:203-248 handleDelete: optimistic hide + sonner toast (duration 5000) + Action onClick sentinel + onAutoClose `supabase.from('saved_searches').delete().eq('id', row.id)`; tests/saved-search-list.test.tsx 9/9 GREEN; UAT 2+3 still required for real-timer + RLS-bound DB delete            |
| 4  | Saved searches persist across sessions — sign out + sign back in still shows saved searches                 | ? UNCERTAIN       | DB-level guarantee from migration 024 (no expiry; FK CASCADE only on user delete). Cannot verify in jsdom. UAT item 5 covers this empirically. RLS shape verified at code+migration layer; durability is a DB property                                                                                       |

**Score:** 3/4 truths empirically VERIFIED in code; 1 needs human UAT (cross-session persistence)

---

### Required Artifacts

All 7 must-have artifacts pass Levels 1 (exists), 2 (substantive), and 3 (wired).

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/024_saved_searches.sql` | Table + 4 RLS policies + 2 indexes + FK CASCADE | ✓ VERIFIED | 75 lines on disk; `CREATE TABLE public.saved_searches` + `ENABLE ROW LEVEL SECURITY` + 4 `CREATE POLICY` blocks (SELECT/INSERT/UPDATE/DELETE all `auth.uid() = user_id`) + 2 `CREATE INDEX` + `REFERENCES auth.users(id) ON DELETE CASCADE`. Applied to remote DB via Studio (17-01-SUMMARY runtime artefacts table reproduced via `pg_class`/`pg_policy`/`pg_indexes`). Wired by SaveSearchModal/SavedSearches/SavedSearchesDropdown (3 importers via `supabase.from('saved_searches')`) |
| `src/types/domain.ts` `SavedSearch` interface | 6-field shape (id, user_id, name, search_params, created_at, updated_at) | ✓ VERIFIED | domain.ts:217-224; imported as `type SavedSearch` in SavedSearches.tsx, SavedSearchesDropdown.tsx |
| `src/lib/savedSearch.ts` | FILTER_KEYS, snapshotFilters, deriveAutoName, hasActiveFilters | ✓ VERIFIED | 122 lines; all 4 named exports present; FILTER_KEYS excludes `'page'` (locked decision); imported by JobSearch.tsx:16 + SaveSearchModal.tsx:11 |
| `src/components/saved-search/SaveSearchModal.tsx` | RHF + Zod + Input/Button v2 primitives + inline `role="alert"` (NOT StatusBanner) + `if (!isOpen) return null` | ✓ VERIFIED | 187 lines; zodResolver imported, schema `z.string().min(1).max(100)`, `Input` + `Button` from `@/components/ui/`, NO `StatusBanner` import (only inline role="alert" div), `if (!isOpen) return null` at line 69, `from('saved_searches').insert` at line 76. Wired into JobSearch.tsx:543-550 |
| `src/components/saved-search/ReplaceOldestModal.tsx` | 10-cap modal — fetches oldest by created_at ASC + Cancel/Replace CTAs + delete-then-insert | ✓ VERIFIED | 178 lines; `order('created_at', { ascending: true })` + `.limit(1).single()` for oldest; handleReplace does delete-then-insert with toast.error fallbacks; Esc handler + backdrop close. Wired into JobSearch.tsx:553-560 + handleSaveClick:415-431 |
| `src/components/saved-search/SavedSearchesDropdown.tsx` | Top-5 fetch on open + click navigate + View all link + aria-haspopup + Esc + click-outside | ✓ VERIFIED | 184 lines; `.limit(5)` + `order('created_at', { ascending: false })`; navigate(`/jobs?${...}`, { replace: false }); Link to /dashboard/seeker/saved-searches; addEventListener('mousedown') for click-outside; aria-haspopup="menu" + aria-expanded. Self-guards on session.user.id. Wired into JobSearch.tsx:662 |
| `src/pages/dashboard/seeker/SavedSearches.tsx` | List + load + delete with sonner Undo + inline rename | ✓ VERIFIED | 337 lines; supabase.from('saved_searches').select/delete/update; navigate(`/jobs?${params}`, { replace: false }); toast with `duration: 5000` + Action label='Undo' + onAutoClose hard-DELETE; sentinel `cancelled` flag + pendingDeletes useRef-Map; inline rename Enter/Escape/onBlur handlers. Wired into main.tsx:172-179 (route) + Sidebar.tsx:30 (nav) |
| `src/components/layout/Sidebar.tsx` | "Saved searches" nav item with Bookmark icon | ✓ VERIFIED | Line 8 imports Bookmark; line 30 NavItem `{ to: '/dashboard/seeker/saved-searches', label: 'Saved searches', icon: Bookmark }` between My Applications and Edit Profile |
| `src/main.tsx` route registration | /dashboard/seeker/saved-searches wrapped in ProtectedRoute requiredRole="seeker" | ✓ VERIFIED | Line 30 imports SavedSearches; lines 172-179 register the route at correct sub-path-first ordering (before /dashboard/seeker parent at line 188); ProtectedRoute requiredRole="seeker" |
| 6 Phase 17 vitest test files | 47 GREEN tests covering snapshot/modal/cap/list/quick-load/load-integration | ✓ VERIFIED | Re-ran at HEAD: 6 files, 47 passed, 0 failures (1.89s) |

---

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| SaveSearchModal.tsx | supabase.from('saved_searches').insert | onSubmit handler | ✓ WIRED | line 76; round-trips id via `.select('id').single()`; success path calls onSaved + toast.success |
| SavedSearches.tsx (list page) | supabase.from('saved_searches').select | useEffect on session.user.id | ✓ WIRED | line 176-189; eq('user_id', ...) defence-in-depth + RLS auto-scope |
| SavedSearches.tsx | supabase.from('saved_searches').delete | onAutoClose closure (sentinel-gated) | ✓ WIRED | line 232-235; only fires when sentinel `cancelled` is false |
| SavedSearches.tsx | supabase.from('saved_searches').update | handleRename | ✓ WIRED | line 252-255; sets `name` + `updated_at` |
| SavedSearches.tsx (Load) | react-router useNavigate | handleLoad | ✓ WIRED | line 197 `navigate(`/jobs?${params}`, { replace: false })` |
| SavedSearchesDropdown.tsx (row click) | react-router useNavigate | handleSelect | ✓ WIRED | line 107 `navigate(`/jobs?${searchParams}`, { replace: false })` |
| JobSearch.tsx ResultsArea Save button | handleSaveClick | onClick (passed via onSaveClick prop) | ✓ WIRED | line 620 canSave gate; line 657-664 handleSaveClick + dropdown render gated by isLoggedIn |
| JobSearch.tsx fetchJobs useEffect | searchParams + authLoading deps | (NOT MODIFIED — regression guard) | ✓ WIRED | line 383 reads `[searchParams, authLoading]` UNCHANGED; static-source asserted by tests/saved-search-load-integration.test.tsx 3/3 GREEN |
| Sidebar.tsx NavLink to /dashboard/seeker/saved-searches | main.tsx route | router.path === Sidebar.to | ✓ WIRED | both files reference `/dashboard/seeker/saved-searches` exactly |
| main.tsx ProtectedRoute requiredRole="seeker" | SavedSearches component | element prop | ✓ WIRED | line 175-176 `<ProtectedRoute requiredRole="seeker"><SavedSearches /></ProtectedRoute>` |
| SaveSearchModal | Phase 19 v2 primitives (Input, Button only — NOT StatusBanner) | imports | ✓ WIRED | imports `Input` + `Button` from `@/components/ui/`; `grep StatusBanner` → only comments (regression-guard documentation), NO import |
| SavedSearches.tsx | Phase 19 v2 primitives | imports | ✓ WIRED | Input + Button + DashboardLayout; no StatusBanner import |

**All 12 key links VERIFIED.** Wiring is complete with no orphans, partials, or stubs.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SRCH-13 | 17-01, 17-02 | Seeker can save current filter combination as a named saved search | PARTIALLY SATISFIED — code closed; UAT pending | DB foundation + Save modal + 10-cap flow shipped (commits 1c6a0fc + 171d49e); UAT items 1, 4, 5 needed before flipping `[ ]` per CLAUDE §7 |
| SRCH-14 | 17-01, 17-03, 17-04 | Seeker can load a previously saved search to restore all filter state | PARTIALLY SATISFIED — code closed; UAT pending | List-page Load button + Quick-load dropdown both shipped (commits 33a590b + e349655); JOBS-01 regression guarded by static-source test; UAT item 1 needed |
| SRCH-15 | 17-01, 17-03 | Seeker can delete saved searches they no longer need | PARTIALLY SATISFIED — code closed; UAT pending | Delete-with-undo + onAutoClose hard-DELETE shipped (commit 33a590b); UAT items 2+3 needed for timer-bound real DB delete; UAT items 7+8 (CRITICAL RLS isolation per CLAUDE §1) needed |

**Orphaned requirements:** None. REQUIREMENTS.md lines 131-133 map exactly SRCH-13/14/15 → Phase 17, all three appear in plan frontmatter (17-01 SRCH-13; 17-02 SRCH-13; 17-03 SRCH-14 + SRCH-15; 17-04 SRCH-14; 17-00 all three for scaffold).

**Per CLAUDE §7 partial-close discipline:** All three requirements are in `[ ]` state in REQUIREMENTS.md (lines 29-31). DO NOT FLIP yet. The implementation half is empirically closed; the UAT half (8 items in tests/saved-search-UAT.md) is the remaining gate. Items 1, 2, 3, 4, 5, 7, 8 each map to load-bearing requirement gaps. After successful operator UAT, requirement IDs may be flipped to `[x]`. If any item fails, enumerate as carryforward in v2.0-MILESTONE-AUDIT.md.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | No TODO/FIXME/XXX/HACK/PLACEHOLDER strings in any of: SaveSearchModal.tsx, ReplaceOldestModal.tsx, SavedSearchesDropdown.tsx, SavedSearches.tsx, savedSearch.ts, 024_saved_searches.sql |
| (none) | — | StatusBanner import | — | Verified absent: `grep -E "^import.*StatusBanner" src/components/saved-search/* src/pages/dashboard/seeker/SavedSearches.tsx` returns no matches. Three matches in SaveSearchModal.tsx are in code COMMENTS documenting the regression guard (lines 38, 88, 147), not imports |
| (none) | — | Email/alerts deferred-scope leakage (RESEND_API_KEY, pg_net, pg_cron, resend) | — | Verified absent across all Phase 17 files |

**Result:** Zero anti-patterns blocker, warning, or info severity.

---

### Manual Verification Required

The 8 items in `tests/saved-search-UAT.md` are load-bearing for closing the UAT gap on SRCH-13/14/15 per CLAUDE §7 partial-close discipline. Items 7 and 8 (RLS isolation seeker-A-vs-B + anonymous) are CRITICAL per CLAUDE §1 — they verify the ownership pattern that the entire saved-search feature relies on for data isolation.

See `human_verification:` block in frontmatter for the structured operator checklist.

---

### Gaps Summary

**Implementation gaps:** None. All 4 implementation waves shipped empirically GREEN at code + test layers (47 phase-17 tests passing; 0 failures; tsc clean; JOBS-01 regression statically guarded).

**UAT gaps (load-bearing for REQUIREMENTS.md flip per CLAUDE §7):** 8 items in tests/saved-search-UAT.md. Five items map to ROADMAP success criteria 1-3 (save, load, delete behaviour at the empirical browser+DB layer); item 5 maps directly to ROADMAP success criterion 4 (cross-session persistence — empirically un-testable in jsdom); items 7+8 are CLAUDE §1 RLS-isolation gates.

**Recommended next step:** Operator runs the manual UAT script. If all 8 items PASS empirically, flip SRCH-13/14/15 to `[x]` in REQUIREMENTS.md and close Phase 17. If any item fails, enumerate the gap as carryforward in `.planning/v2.0-MILESTONE-AUDIT.md` per CLAUDE §7 and KEEP the `[ ]` markers.

**Status `human_needed` (not `passed`)** because ROADMAP success criterion 4 (cross-session persistence) is a DB durability property that no automated test in this stack can prove. The verifier escalates to operator per CLAUDE §7 and the project's RLS-isolation precedent (mirrors Phase 15 `RESEND_API_KEY` carryforward shape — implementation can be code-complete while a runtime/UAT gap remains open).

---

_Verified: 2026-05-05T18:08:00Z_
_Verifier: Claude (gsd-verifier)_
