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

test('HOMEBUG-02: the landing roles query returns 200', async ({ page }) => {
  // RETARGETED 2026-08-21. This guarded the old homepage's featured-listings call, which
  // filtered `listing_tier=in.(2,3)` — the numeric-tier fix. The v12 landing replaced
  // OpenRolesSection with V12Roles, which asks for the four newest ACTIVE jobs and applies
  // no tier filter at all, so the old waitForResponse matched nothing and timed out at 30s
  // on every run. It failed as a red X but its real meaning was "the page changed".
  //
  // What survives is the part that still has a subject: the landing's one live-data query
  // must come back 200. The numeric-tier invariant itself now has no mounted caller —
  // OpenRolesSection is still in the tree but nothing renders it — so it is NOT silently
  // dropped here, it is called out on the ticket instead.
  const roles = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/jobs') && r.url().includes('status=eq.active'),
  )
  await page.goto('/')
  const res = await roles
  expect(res.status()).toBe(200)
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

/*
 * HOMEBUG-01 (get_platform_stats returns 200 with {jobs,seekers,matches}) was REMOVED
 * 2026-08-21, and this note is the reason so nobody restores it blind.
 *
 * It asserted that loading `/` fires the get_platform_stats RPC. The v12 landing does not,
 * and that is a DECISION, not a regression — Home.tsx states it outright: "CountersSection,
 * TestimonialsSection and TrustedByStrip stay OUT ... no real volume, no consented names."
 * Publishing counters over an empty marketplace was the thing being avoided. So the test
 * was waiting forever for a call the product deliberately stopped making, timing out at 30s
 * and holding main red.
 *
 * A test that asserts behaviour the product intentionally removed is not a guard, it is a
 * blocker wearing a guard's clothes. The RPC itself still exists and CountersSection still
 * calls it; if that section is ever mounted again, restore this test with it.
 */

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
