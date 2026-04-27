# Known Quirks (Not Bugs)

Things that look broken but aren't, and edge cases worth knowing about.

## QUIRK-01: herd_size filter shows multiple active values

- **Date confirmed:** 2026-04-27
- **Location:** `src/components/ui/FilterSidebar.tsx` (~line 309), `src/pages/jobs/JobSearch.tsx` (filter param handler)
- **Looks like:** URL `?herd_size=<200&herd_size=500-1000` with two filter pills active at once
- **Why it's correct:** `HERD_SIZE_BUCKETS` (`<200`, `200-500`, `500-1000`, `1000+`) are non-overlapping ranges. Multi-select with OR semantics matches the existing pattern for `region`, `shed_type`, `role_type`, `accommodation_type`, `contract_type`. A seeker filtering for "small farms" may legitimately want jobs in `<200` AND `200-500` (the small/medium boundary is arbitrary).
- **Action:** None. Do not "fix." If a future requirement demands single-select, that's a roadmap decision, not a bug fix.

## QUIRK-02: Duplicate `jobs?select=*` fetches in dev

- **Date confirmed:** 2026-04-27
- **Location:** `src/pages/jobs/JobSearch.tsx` (`useEffect` at ~line 336), `src/main.tsx` (StrictMode wrapper, line 181)
- **Looks like:** 2× identical `jobs?select=...` fetches on `/jobs` cold load when dev tools Network tab is open
- **Why it's correct:** React 18 `<StrictMode>` intentionally double-invokes effects in dev only, to catch impure ones. The second fetch is the StrictMode probe.
- **Confirmed absent in prod:** prod build smoke (`localhost:4173/jobs`, 2026-04-27) showed exactly 1 fetch. Cold-load DCL 274ms, warm-load DCL 570ms — both healthy.
- **Action:** None. AbortController hardening (defends against rapid filter-change races, not StrictMode) is tracked separately as `PERF-01` in `REQUIREMENTS.md` Future Requirements.

---

*Last updated: 2026-04-27*
