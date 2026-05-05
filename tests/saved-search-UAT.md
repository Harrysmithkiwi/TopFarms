# Phase 17 — Manual UAT Script

> Run after Wave 4 ships and before `/gsd:verify-work`. Each item must PASS empirically.

Source: 17-VALIDATION.md §Manual-Only Verifications (verbatim, reformatted as numbered steps).

## UAT Items

### 1. Save → load round-trip (SRCH-13 + SRCH-14)
**Why manual:** E2E URL-state restoration is jsdom-fragile.

Steps:
1. Sign in as seeker.
2. Navigate to `/jobs`. Set filters: `shed_type=rotary`, `region=Waikato`, `accommodation_type=couples`.
3. Click "Save search". Modal opens with auto-name pre-filled. Click Save.
4. Reload the browser tab.
5. Navigate to `/dashboard/seeker/saved-searches`. Confirm the new row exists with correct name + chips.
6. Click Load on the row. Confirm URL becomes `/jobs?shed_type=rotary&region=Waikato&accommodation_type=couples`.
7. Confirm result list reflects those filters (e.g., job count matches step 2).

**Pass:** URL params restored exactly; result list count matches step 2.

### 2. Delete with undo (SRCH-15)
**Why manual:** Sonner toast + 5s timer + DOM unmount-during-toast scenarios are timing-sensitive in jsdom.

Steps:
1. From `/dashboard/seeker/saved-searches`, click Delete on a row.
2. Click Undo within 5 seconds.
3. Open Supabase Studio SQL Editor: `select count(*) from saved_searches where id = '<id>'`.

**Pass:** Row reappears in list; SQL returns 1.

### 3. Delete without undo (SRCH-15)
**Why manual:** DB DELETE + RLS verification needs real Supabase connection.

Steps:
1. Click Delete on a row.
2. Wait 6 seconds without clicking Undo.
3. Run the same SQL count.

**Pass:** Row gone from list; SQL returns 0.

### 4. 10-cap replace (SRCH-13 UX)
**Why manual:** Multi-step modal flow + DB count assertion.

Steps:
1. Save 10 distinct searches (use varying filters or numeric suffixes).
2. Attempt 11th save.
3. Replace-oldest modal appears showing the OLDEST name.
4. Click Replace.
5. Open Supabase Studio: `select name, created_at from saved_searches where user_id = '<my_id>' order by created_at`.

**Pass:** Modal shows correct oldest name; after Replace, oldest is deleted and new is present; total count remains 10.

### 5. Cross-session persistence (SRCH-13 Roadmap criterion 4)
**Why manual:** Auth state + cross-session DB read.

Steps:
1. Save 2-3 searches as seeker A.
2. Sign out via Sidebar Sign Out button.
3. Sign back in as seeker A.
4. Navigate to `/dashboard/seeker/saved-searches`.

**Pass:** All saved searches still present.

### 6. Multi-tab race (SRCH-13 edge case, low priority)
**Why manual:** Cross-tab race condition cannot be simulated in jsdom.

Steps:
1. Sign in as seeker; ensure count = 9 saved.
2. Open two tabs both showing `/jobs` with filters applied.
3. Click Save in tab A and tab B as close to simultaneously as possible.

**Pass (acceptable):** Final count = 11 (acceptable +1 drift); no error toast fires.

### 7. RLS isolation seeker A vs seeker B (CLAUDE §1, ownership)
**Why manual:** Cannot mock RLS — needs two distinct authed users.

Steps:
1. Sign in as seeker A.
2. Open DevTools console: `await (await import('/src/lib/supabase')).supabase.from('saved_searches').select('*').eq('user_id', '<seeker_B_uuid>')`.

**Pass:** Returns empty array (RLS filters cross-user reads server-side).

### 8. RLS isolation anonymous (CLAUDE §1)
**Why manual:** Cannot mock RLS.

Steps:
1. Open incognito window (signed out).
2. Visit any TopFarms page so supabase client loads.
3. DevTools console: `await supabase.from('saved_searches').select('*')`.

**Pass:** Returns empty array regardless of seeker_id.

---

## Sign-off

- [ ] All 8 items PASS empirically
- [ ] Evidence captured (screenshots / SQL output) under `.planning/phases/17-saved-search/17-UAT-EVIDENCE/` if Item 7/8 surfaces drift
- [ ] If any item fails, ENUMERATE the gap as carryforward in v2.0-MILESTONE-AUDIT.md per CLAUDE §7 — do NOT flip REQUIREMENTS.md `[ ]` to `[x]` until ALL gaps closed.
