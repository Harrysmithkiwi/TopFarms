import { test, expect } from '@playwright/test'

// Port of tests/p0-prod-smoke-UAT.md steps 1-4 (the anonymous steps).
// Step 5 (employer accommodation chips) is covered at component level by
// vitest (ui-primitives-batch, chip-status) and needs an in-progress
// onboarding profile — deliberately not ported.

/**
 * SIGNUP-01 guards ONE regression, and it is a client contract: on a failed signup the
 * Sonner error toast must persist (`duration: Infinity`) rather than auto-dismiss, and
 * the submit button must revert out of its loading state.
 *
 * It used to obtain that failure by POSTing `not_an_email@example.test`, on the belief —
 * stated in the old comment — that Supabase answers `400 email_address_invalid`. Measured
 * against prod on 2026-08-15, it does not: that string is a syntactically valid address,
 * signup SUCCEEDS, the endpoint returns 200, and a junk account was created in production
 * on every CI run. The test still went green because a second rapid POST from the same
 * runner IP drew a 429 rate limit. It was asserting "we got rate-limited", under the name
 * "invalid email". Purging that account exposed it: the run went flaky, first attempt 200
 * (account created), retry 429.
 *
 * Nothing the UI permits reaches a deterministic server rejection. Measured, same day:
 *   - malformed email  -> 400, but `SignUp.tsx:16` (`z.string().email()`) blocks it first,
 *                         so no request is ever sent
 *   - weak password    -> `SignUp.tsx:21` requires 10 chars + letters + numbers, and
 *                         Supabase leaked-password protection is OFF (`Password123` -> 200)
 *   - duplicate email  -> 200, obfuscated: email-enumeration protection is ON
 *
 * So the failure is injected instead. The response is faked with the exact GoTrue error
 * body prod returns, which makes the test deterministic, keeps it from ever creating an
 * account, and points it at the thing it actually names.
 *
 * TRADE-OFF, stated rather than hidden: this no longer exercises Supabase's rejection —
 * but it never did. What it now guards is the client's error-rendering contract, which is
 * the regression that was worth a test in the first place.
 */
test('SIGNUP-01: signup error toast persists >=10s', async ({ page }) => {
  // The exact body prod returns for a rejected signup (measured against /auth/v1/signup).
  await page.route('**/auth/v1/signup**', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 400,
            error_code: 'validation_failed',
            msg: 'Unable to validate email address: invalid format',
          }),
        })
      : route.continue(),
  )

  await page.goto('/signup')
  // Explicit role click + terms acceptance — both block submit silently if
  // missed (the UAT doc predates the Terms checkbox; discovered porting it).
  await page.getByRole('button', { name: /Seeker Find farm work/ }).click()
  // Valid format on purpose: client validation must PASS so the request is attempted
  // and the intercepted failure reaches the app's error path.
  await page.getByRole('textbox', { name: /email/i }).fill('signup-01-guard@example.com')
  await page.getByRole('textbox', { name: /^password/i }).fill('ValidPass123!')
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check()
  const signupResponse = page.waitForResponse(
    (r) => r.url().includes('/auth/v1/signup') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create account' }).click()
  // Asserted so a silently-dropped interception fails loudly instead of the toast
  // assertions passing against some unrelated state.
  expect((await signupResponse).status()).toBe(400)
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
  const stats = page.waitForResponse((r) => r.url().includes('/rest/v1/rpc/get_platform_stats'))
  await page.goto('/')
  const res = await stats
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

// S1: the soft 404. The branded page always rendered — LAUNCH.md B3 asserted the copy and
// nothing else — while the server answered 200, so a crawler could index any junk URL as a
// real page. Assert the STATUS, since the copy assertion is exactly what let this hide.
test('S1: an unknown URL answers 404 and still renders the branded page', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page')
  expect(res?.status()).toBe(404)
  await expect(page.getByText(/this paddock's empty/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /go home/i })).toBeVisible()
})

// The other half of the same guard: the check keys on the legacy route table, so a bug in
// it would 404 real routes. A page nobody can mistake for junk has to keep answering 200.
test('S1: a real route still answers 200', async ({ page }) => {
  expect((await page.goto('/login'))?.status()).toBe(200)
  expect((await page.goto('/jobs'))?.status()).toBe(200)
})
