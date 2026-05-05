/**
 * Phase 17 SRCH-14 — load-integration regression guard.
 *
 * Wave 4 (17-04-quick-load) GREEN — 3 it.todo() stubs swapped for real
 * static-source assertions. Static-source approach (read JobSearch.tsx as
 * a string and assert substring patterns) is the cheapest path: no React
 * runtime, no jsdom mock surface, no @ts-expect-error gymnastics for
 * mocked supabase. The tests are pure regression guards against the
 * JOBS-01 / Pitfall 1 fetchJobs-deps drift hazard.
 *
 * Source: 17-VALIDATION.md per-task map; pitfall analysis in
 * 17-RESEARCH.md §"Pitfalls" Pitfall 1.
 *
 * What we guard:
 *   1. POSITIVE: fetchJobs useEffect deps line literally contains
 *      [searchParams, authLoading]. Saved-search load works through the
 *      EXISTING searchParams-update path; no new effect or dep change is
 *      required. (See 17-RESEARCH.md Pitfall 1 for full diagnostic chain
 *      and why JOBS-01 / commit c6066ea matters.)
 *
 *   2. NEGATIVE: explicit anti-patterns we guard against — saveModalOpen,
 *      replaceModalOpen, savedSearches, pendingSave must NOT appear inside
 *      a [searchParams, authLoading, …] tuple. Adding any of those would
 *      cause re-fetch storms and re-introduce the JOBS-01 lock-contention
 *      bug.
 *
 *   3. SIBLING GUARD: commit 7401116 fixed SeekerStep7Complete.tsx (NOT
 *      JobSearch.tsx). JobSearch's analogous resilience is JOBS-01
 *      (commit c6066ea) — fetchJobs gated on authLoading. We assert (a)
 *      the auth gate is in place, (b) the match_scores fetch shape
 *      (.from('match_scores').select(...).eq(...).in(...)) is unchanged.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const JOB_SEARCH_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobSearch.tsx')

describe('Saved-search load integration (SRCH-14 regression)', () => {
  it('navigate("/jobs?<saved-params>") triggers ONE fetchJobs call (JOBS-01 regression guard)', () => {
    // Static-source assertion: the load-bearing useEffect deps line stays
    // [searchParams, authLoading]. Saved-search load works through the
    // existing searchParams update path; NO new effect or dep change required.
    // (See 17-RESEARCH.md Pitfall 1 for the full diagnostic chain.)
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    expect(source).toContain('[searchParams, authLoading]')
  })

  it('saved-search state additions do NOT leak into fetchJobs deps', () => {
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    // Negative assertions — these are anti-patterns we explicitly guard against.
    // If a future executor adds Phase 17 state slots into the fetchJobs deps
    // (instead of leaving them as standalone state that doesn't participate
    // in the fetch loop), the JOBS-01 race surfaces re-introduce immediately.
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*saveModalOpen\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*replaceModalOpen\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*savedSearches\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*pendingSave\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*dropdownOpen\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*recentSavedSearches\]/)
  })

  it('match_scores embedded join shape preserved (commit 7401116 sibling guard)', () => {
    // The 7401116 fix targeted SeekerStep7Complete.tsx (not JobSearch.tsx).
    // JobSearch's analogous resilience is JOBS-01 (c6066ea) — fetchJobs gated
    // on authLoading. This test guards both: (a) the auth gate is in place,
    // (b) the match_scores fetch structure (single .from('match_scores')
    // .select(...).eq(...).in(...)) is unchanged.
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    expect(source).toContain('if (authLoading) return')
    expect(source).toContain(".from('match_scores')")
    // The .in('job_id', newJobIds) call is the load-bearing batch shape — guard it
    expect(source).toContain(".in('job_id'")
  })
})
