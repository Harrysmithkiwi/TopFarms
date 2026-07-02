import { test, expect } from '@playwright/test'

// Port of tests/p0-prod-smoke-UAT.md steps 1-4 (the anonymous steps).
// Step 5 (employer accommodation chips) is covered at component level by
// vitest (ui-primitives-batch, chip-status) and needs an in-progress
// onboarding profile — deliberately not ported.

test('SIGNUP-01: invalid-email signup error toast persists >=10s', async ({ page }) => {
  await page.goto('/signup')
  // Explicit role click + terms acceptance — both block submit silently if
  // missed (the UAT doc predates the Terms checkbox; discovered porting it).
  await page.getByRole('button', { name: /Seeker Find farm work/ }).click()
  await page.getByRole('textbox', { name: /email/i }).fill('not_an_email@example.test')
  await page.getByRole('textbox', { name: /^password/i }).fill('ValidPass123!')
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check()
  const signupResponse = page.waitForResponse(
    (r) => r.url().includes('/auth/v1/signup') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create account' }).click()
  // 400 email_address_invalid normally; repeated runs from one IP can draw a
  // 429 rate limit instead. Either is a signup error — and the regression
  // under guard (SIGNUP-01) is the TOAST behaviour below, not the code.
  const status = (await signupResponse).status()
  expect(status).toBeGreaterThanOrEqual(400)
  expect(status).toBeLessThan(500)
  // Sonner error toast appears...
  const toast = page.locator('[data-sonner-toast]')
  await expect(toast).toBeVisible({ timeout: 5_000 })
  // ...and must still be visible 10s later (duration: Infinity regression guard).
  await page.waitForTimeout(10_500)
  await expect(toast).toBeVisible()
  // Submit button reverted from its loading state.
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
})

test('HOMEBUG-02: featured listings query uses numeric tiers and returns 200', async ({ page }) => {
  const featured = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/jobs') && r.url().includes('listing_tier=in.'),
  )
  await page.goto('/')
  const res = await featured
  expect(res.status()).toBe(200)
  // Numeric tier list, not the pre-fix string enums.
  expect(decodeURIComponent(res.url())).toContain('listing_tier=in.(2,3)')
})

test('HOMEBUG-03: accommodation filter produces 200 (no PostgREST 400)', async ({ page }) => {
  await page.goto('/jobs')
  const filtered = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/jobs') && r.url().includes('accommodation_extras=ov.'),
  )
  await page.getByRole('checkbox', { name: 'Couples welcome' }).click()
  const res = await filtered
  expect(res.status()).toBe(200)
  // querystring spaces arrive as '+' — match either encoding
  expect(decodeURIComponent(res.url())).toMatch(/Couples[+ ]welcome/)
})

test('HOMEBUG-01: get_platform_stats RPC returns 200 with {jobs,seekers,matches}', async ({
  page,
}) => {
  // CountersSection (the only in-app caller of get_platform_stats) was removed
  // from the homepage pre-launch, so the page no longer fires this RPC — waiting
  // for it timed out. Re-point the guard at the RPC endpoint DIRECTLY so it holds
  // regardless of which UI component happens to call it.
  //
  // Derive the Supabase origin + anon apikey from the app's own traffic (the
  // homepage fires /rest/v1/jobs for FeaturedListings) rather than env vars —
  // the e2e-preview job does not export VITE_SUPABASE_*, so this stays
  // self-contained across both the local-preview and preview-deployment jobs.
  const firstRestReq = page.waitForRequest((r) => r.url().includes('/rest/v1/'))
  await page.goto('/')
  const req = await firstRestReq
  const origin = new URL(req.url()).origin
  const apikey = req.headers()['apikey']
  expect(apikey, 'anon apikey captured from app traffic').toBeTruthy()

  const res = await page.request.post(`${origin}/rest/v1/rpc/get_platform_stats`, {
    headers: {
      apikey,
      Authorization: `Bearer ${apikey}`,
      'Content-Type': 'application/json',
    },
    data: {},
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toEqual(
    expect.objectContaining({
      jobs: expect.any(Number),
      seekers: expect.any(Number),
      matches: expect.any(Number),
    }),
  )
})
