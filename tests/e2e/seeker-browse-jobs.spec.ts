import { test, expect } from '@playwright/test'
import { hasState, statePath, SKIP_NO_CREDS, findPublicJobId, SKIP_EMPTY_MARKETPLACE } from './helpers'

// Flow 1 (written first, per audit follow-up session 2026-06-10): the
// marketplace must not be empty. This is the flow that would have caught
// RLS-MKT-01 — the bug where /jobs renders "0 jobs found" for visitors.

test.describe('visitor (anonymous) marketplace', () => {
  // RLS-MKT-01 regression guard (fixed by migration 038 + the aliased
  // marketplace_employer_profiles embeds): visitors must always see a
  // non-empty marketplace while >=1 active job exists.
  test('visitor sees a non-empty marketplace on /jobs', async ({ page }) => {
    // Phase 5.0b: ask the DATA whether a job exists before asserting the UI shows
    // one. Skipping on an empty marketplace is honest; asserting would fail
    // forever on a legitimately empty product, and the previous copy-based filter
    // silently passed instead — which is how this guard stopped guarding.
    const jobId = await findPublicJobId(page)
    test.skip(jobId === null, SKIP_EMPTY_MARKETPLACE)

    // A job exists in the data, so the marketplace MUST render it. This is the
    // RLS-MKT-01 assertion proper: data present + UI empty = the bug.
    await expect(page.getByRole('heading', { name: /No jobs (match|listed)/i })).not.toBeVisible()
    await expect(page.locator('main h3').first()).toBeVisible({ timeout: 10_000 })
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
    const jobId = await findPublicJobId(page)
    test.skip(jobId === null, SKIP_EMPTY_MARKETPLACE)

    const firstCard = page.locator('main h3').first()
    await expect(page.getByRole('heading', { name: /No jobs (match|listed)/i })).not.toBeVisible()
    await expect(firstCard).toBeVisible({ timeout: 10_000 })
    // Cards expand inline on click (SearchJobCard onToggle split-pane pattern).
    await firstCard.click()
    await expect(page.getByText(/apply|applied/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
