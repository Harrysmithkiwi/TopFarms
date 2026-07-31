import { test, expect, type Page } from '@playwright/test'
import { hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Phase 5.6 — the behavioural gate for "failed is not empty".
//
// A source grep proves nothing here. The whole finding is that these screens
// DO handle the error — they log it and return, leaving the collection empty so
// the render shows the EMPTY state. The only way to catch that is to abort the
// request and look at what the user actually sees. Same discipline as Phase 4's
// A7, where a grep would have missed that the CSS reduced-motion clamp never
// reached JS animation.
//
// Anonymous routes always run. Role-gated routes skip cleanly without E2E_*
// creds and arm automatically in CI e2e-preview.

/** Fail every Supabase REST read, as a dropped rural connection would. */
async function killRest(page: Page) {
  await page.route('**/rest/v1/**', (route) => route.abort('connectionfailed'))
}

/**
 * The contract: an alert with a working retry, and NO empty-state copy.
 * Asserting the absence is the half that matters — a screen can show an error
 * banner and still render "no results" underneath, which is the bug.
 */
async function expectErrorNotEmpty(page: Page, emptyCopy: RegExp, label: string) {
  const alert = page.getByRole('alert')
  await expect(alert.first(), `${label}: no error surfaced on a failed fetch`).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    page.getByRole('button', { name: /try again|retry/i }).first(),
    `${label}: error has no retry affordance — a dead end`,
  ).toBeVisible()
  await expect(
    page.getByText(emptyCopy),
    `${label}: rendered the EMPTY state for a FAILED fetch — this is the Phase 5.6 bug`,
  ).toHaveCount(0)
}

test.describe('failed is not empty (Phase 5.6)', () => {
  test('/jobs shows an error with retry, not "No jobs listed right now"', async ({ page }) => {
    await killRest(page)
    await page.goto('/jobs')
    await expectErrorNotEmpty(page, /No jobs listed right now|No jobs match your filters/i, '/jobs')
  })

  test('/jobs retry re-issues the request', async ({ page }) => {
    let attempts = 0
    await page.route('**/rest/v1/jobs**', (route) => {
      attempts++
      return route.abort('connectionfailed')
    })
    await page.goto('/jobs')
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 })
    const before = attempts
    await page.getByRole('button', { name: /try again|retry/i }).first().click()
    await expect
      .poll(() => attempts, { message: 'retry did not re-issue the request' })
      .toBeGreaterThan(before)
  })
})

test.describe('failed is not a 404 (Phase 5.6)', () => {
  test('/jobs/:id shows a retryable error, not "listing not found"', async ({ page }) => {
    await killRest(page)
    // Any id: the request is aborted before it can resolve either way.
    await page.goto('/jobs/00000000-0000-4000-8000-000000000001')
    await expectErrorNotEmpty(
      page,
      /no longer available|not found|been filled|been removed/i,
      '/jobs/:id',
    )
  })
})

test.describe('failed is not empty — employer surfaces', () => {
  test.skip(() => !hasState('employer'), SKIP_NO_CREDS('employer'))
  test.use({ storageState: hasState('employer') ? statePath('employer') : undefined })

  test('applicant dashboard shows an error, not "No applicants yet"', async ({ page }) => {
    // Reach the route BEFORE killing REST — we need a real job id to land on.
    await page.goto('/dashboard/employer')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href*="/applicants"]').first()
    test.skip((await link.count()) === 0, 'employer has no listings — route unreachable')
    const href = (await link.getAttribute('href'))!
    await killRest(page)
    await page.goto(href)
    await expectErrorNotEmpty(page, /No applicants yet/i, 'applicant dashboard')
  })
})

test.describe('offline (Phase 5.7)', () => {
  test('going offline shows the banner; coming back removes it', async ({ page, context }) => {
    await page.goto('/jobs')
    await page.waitForLoadState('networkidle')
    const banner = page.getByTestId('offline-banner')
    await expect(banner, 'banner visible while online').toHaveCount(0)

    await context.setOffline(true)
    await expect(banner, 'no offline banner after losing connectivity').toBeVisible({
      timeout: 10_000,
    })
    // Politeness matters: this must not steal focus mid-task on a flaky link.
    await expect(banner).toHaveAttribute('aria-live', 'polite')

    await context.setOffline(false)
    await expect(banner, 'banner persisted after reconnecting').toHaveCount(0, { timeout: 10_000 })
  })
})

test.describe('password recovery routing (Phase 5.0e)', () => {
  // Observed in production 2026-07-31: a recovery mail sent from the Supabase
  // dashboard carries no redirectTo, so it uses the project Site URL and lands
  // on "/". detectSessionInUrl consumes the single-use token there, the user is
  // silently signed in, and no password form is ever shown — each retry burns
  // another token with no visible cause.
  test('a recovery link landing anywhere still reaches the reset form', async ({ page }) => {
    await page.goto('/#access_token=stub&refresh_token=stub&type=recovery')
    await expect(page).toHaveURL(/\/auth\/reset/, { timeout: 10_000 })
    // Either the form or the expired-link surface is acceptable — a stub token
    // cannot establish a session. What must NOT happen is silently staying on
    // the landing page with the token spent.
    await expect(
      page.getByText(/Verifying reset link|Set a new password|Link expired/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('normal navigation is untouched', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/reset/)
  })
})
