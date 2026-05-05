/**
 * Phase 17 Wave 0 RED stub — SRCH-14 quick-load dropdown.
 *
 * Covers the dropdown attached to the JobsPage filter bar (Wave 4 lands
 * the implementation). Visible only when:
 *
 *   - user is signed in (seeker), AND
 *   - at least one filter is applied
 *
 * Top 5 saved searches by created_at desc; "View all" routes to the
 * SRCH-15 list page.
 *
 * Critical: clicking a row triggers the same navigate("/jobs?<params>")
 * shape as SRCH-15 list-page Load — single integration test
 * (saved-search-load-integration) guards both against the JOBS-01
 * fetchJobs-loop regression.
 *
 * Source: 17-VALIDATION.md per-task map.
 */
import { describe, it } from 'vitest'

describe('Quick-load dropdown (SRCH-14)', () => {
  it.todo('button hidden when user is not signed in')
  it.todo('button hidden when no filters applied')
  it.todo('opening dropdown fetches top 5 saved searches ordered by created_at desc')
  it.todo('renders name + filter summary chips per row')
  it.todo('clicking row calls navigate("/jobs?<params>", { replace: false }) and closes dropdown')
  it.todo('"View all" link routes to /dashboard/seeker/saved-searches')
  it.todo('Esc key closes dropdown')
  it.todo('aria-haspopup="menu" and aria-expanded reflect open state')
})
