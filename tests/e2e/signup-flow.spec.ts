import { test, expect } from '@playwright/test'

// Signup-path regression guard (037/040 closure item, 2026-06-11).
//
// WHY THIS EXISTS: the definer-function hardening (migration 037) revoked
// EXECUTE on handle_new_user() — the auth.users INSERT trigger that creates
// the user_roles row. Trigger firing does not consult EXECUTE ACLs, but this
// is the one flow most at risk from any future RLS/definer change, so it
// gets a permanent UI-level guard.
//
// THE LOAD-BEARING PROPERTY: if handle_new_user raises (permissions, schema
// drift, anything), GoTrue aborts the INSERT and returns 500 "Database error
// saving new user" — signup does NOT return 200 and the UI does NOT reach
// /auth/verify. So 200 + /auth/verify == the trigger executed successfully.
// Deeper row-level assertions (auth.users + user_roles role value) were
// verified out-of-band via read-only MCP on 2026-06-11 and recorded in
// audit-state.json; this spec guards the property reachable from the UI.
//
// COST CONTROL: each run creates a REAL auth user in prod (and sends a
// confirmation email). In CI this only runs when the E2E_SIGNUP env/secret
// is set (run on demand / nightly, not every push); locally it runs by
// default. The auth email rate limit (429) is a graceful skip, not a
// failure — Supabase default limits are easily exhausted by repeated runs.

test('signup creates an account through the real UI (handle_new_user path)', async ({
  page,
}, testInfo) => {
  test.skip(
    !!process.env.CI && !process.env.E2E_SIGNUP,
    'creates a real prod user per run — set E2E_SIGNUP=1 to enable in CI',
  )

  const email = `e2e-signup-${Date.now()}@topfarms.co.nz`
  testInfo.annotations.push({ type: 'test-user-email', description: email })

  await page.goto('/signup')
  await page.getByRole('button', { name: /Seeker Find farm work/ }).click()
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password/i }).fill(`E2e!${Date.now()}aB`)
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check()

  const signupResponse = page.waitForResponse(
    (r) => r.url().includes('/auth/v1/signup') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create account' }).click()
  const res = await signupResponse
  const status = res.status()

  test.skip(status === 429, `auth email rate limit (429) — rerun once the limit clears`)

  // 500 here is the handle_new_user failure signature ("Database error
  // saving new user") — the exact regression this spec exists to catch.
  expect(status, 'signup must succeed; 500 means the handle_new_user trigger failed').toBe(200)
  await page.waitForURL('**/auth/verify**', { timeout: 15_000 })
})
