import fs from 'node:fs'
import { test as setup, expect } from '@playwright/test'
import { AUTH_DIR, creds, statePath, SKIP_NO_CREDS, requiredRoles } from './helpers'

// Logs each seeded role in via the real UI once per run and saves a
// storage-state fixture; role-gated specs reuse it via test.use({ storageState }).
// Stale states from previous runs are removed so hasState() is trustworthy.

setup.beforeAll(() => {
  // Fail loudly rather than skip silently. A green run that never signed in is
  // the false green this guard exists to make impossible.
  const missing = requiredRoles().filter((r) => !creds(r))
  if (missing.length > 0) {
    throw new Error(
      `E2E_REQUIRED_ROLES promises coverage for [${requiredRoles().join(', ')}] but ` +
        `credentials are missing for [${missing.join(', ')}]. ` +
        `Set E2E_<ROLE>_EMAIL/_PASSWORD, or remove the role from E2E_REQUIRED_ROLES ` +
        `and say so out loud — do not let the suite pass over untested roles.`,
    )
  }
  fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  fs.mkdirSync(AUTH_DIR, { recursive: true })
})

setup('seeker storage state', async ({ page }) => {
  const c = creds('seeker')
  setup.skip(!c, SKIP_NO_CREDS('seeker'))
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email address' }).fill(c!.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(c!.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL('**/dashboard/seeker**', { timeout: 15_000 })
  await page.context().storageState({ path: statePath('seeker') })
})

setup('employer storage state', async ({ page }) => {
  const c = creds('employer')
  setup.skip(!c, SKIP_NO_CREDS('employer'))
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email address' }).fill(c!.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(c!.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL('**/dashboard/employer**', { timeout: 15_000 })
  await page.context().storageState({ path: statePath('employer') })
})

setup('admin storage state', async ({ page }) => {
  const c = creds('admin')
  setup.skip(!c, SKIP_NO_CREDS('admin'))
  // Admins sign in on the standalone /admin gate (AdminLoginPage), not /login.
  await page.goto('/admin')
  await page.getByRole('textbox', { name: 'Email' }).fill(c!.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(c!.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Wait for a control that ONLY the authenticated admin shell renders.
  //
  // The previous pair of assertions was vacuous: page.goto('/admin') already put
  // us on /admin, so waitForURL('**/admin**') passed before any login happened,
  // and 'Access denied' is absent on the sign-in form too. The setup therefore
  // "passed" while saving a PRE-AUTH storage state, and every admin-gated spec
  // then silently redirected to /login. Found 2026-07-31, the first time these
  // specs ever ran with real credentials.
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15_000 })
  await page.context().storageState({ path: statePath('admin') })
})
