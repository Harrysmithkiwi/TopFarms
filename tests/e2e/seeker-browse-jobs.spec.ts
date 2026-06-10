import { test, expect } from '@playwright/test'
import { hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Flow 1 (written first, per audit follow-up session 2026-06-10): the
// marketplace must not be empty. This is the flow that would have caught
// RLS-MKT-01 — the bug where /jobs renders "0 jobs found" for visitors.

test.describe('visitor (anonymous) marketplace', () => {
  // KNOWN BUG — RLS-MKT-01 (diagnosed 2026-06-10, fix pending operator review):
  // employer_profiles has no anon SELECT policy, so the employer_profiles!inner
  // join in JobSearch.tsx prunes every job for anonymous visitors. test.fail()
  // keeps the suite green while the bug exists AND forces this annotation to be
  // removed when the RLS fix lands (an unexpected pass fails the run).
  test('visitor sees a non-empty marketplace on /jobs', async ({ page }) => {
    test.fail(true, 'RLS-MKT-01: anon cannot read employer_profiles; !inner join hides all jobs')
    await page.goto('/jobs')
    // Wait for the query to settle, then require: no empty state AND at least
    // one job-card heading that is not the empty-state heading.
    const emptyState = page.getByRole('heading', { name: 'No jobs match your filters.' })
    const cardTitle = page.locator('main h3', { hasNotText: 'No jobs match' }).first()
    await expect(cardTitle).toBeVisible({ timeout: 10_000 })
    await expect(emptyState).not.toBeVisible()
  })

  test('visitor /jobs page renders the search UI without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/jobs')
    await expect(page.getByRole('button', { name: 'Search Jobs' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Couples welcome' })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('seeker browses jobs', () => {
  test.skip(() => !hasState('seeker'), SKIP_NO_CREDS('seeker'))
  test.use({ storageState: hasState('seeker') ? statePath('seeker') : undefined })

  test('logged-in seeker sees a non-empty marketplace and can open a job', async ({ page }) => {
    await page.goto('/jobs')
    const emptyState = page.getByRole('heading', { name: 'No jobs match your filters.' })
    const firstCard = page.locator('main h3', { hasNotText: 'No jobs match' }).first()
    await expect(firstCard).toBeVisible({ timeout: 10_000 })
    await expect(emptyState).not.toBeVisible()
    // Cards expand inline on click (SearchJobCard onToggle split-pane pattern).
    await firstCard.click()
    await expect(page.getByText(/apply|applied/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
