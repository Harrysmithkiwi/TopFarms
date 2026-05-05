/**
 * Phase 17 Wave 0 RED stub — SRCH-14 regression guard.
 *
 * Covers the navigate("/jobs?<saved-params>") -> JobsPage URL-state
 * restoration flow, specifically guarding against:
 *
 *   - JOBS-01 fetchJobs duplication (commit 7401116) — searchParams must
 *     not introduce new useEffect deps that would cause the fetch loop
 *   - match_scores embedded join shape — the jobs!inner shape established
 *     by 7401116 must remain (no null-joined crashes when scores empty)
 *
 * Single integration test for both SRCH-14 dropdown and SRCH-15 list-page
 * Load — both call navigate() with the same shape, so one regression
 * guard covers both call sites.
 *
 * Source: 17-VALIDATION.md per-task map; pitfall analysis in
 * 17-RESEARCH.md §7.
 */
import { describe, it } from 'vitest'

describe('Saved-search load integration (SRCH-14 regression)', () => {
  it.todo('navigate("/jobs?<saved-params>") triggers ONE fetchJobs call (JOBS-01 regression guard)')
  it.todo('match_scores embedded join uses jobs!inner shape; no null-joined crashes')
  it.todo('searchParams update does NOT add new useEffect deps to fetchJobs')
})
