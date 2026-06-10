import fs from 'node:fs'
import { test as setup, expect } from '@playwright/test'
import { AUTH_DIR, creds, statePath, SKIP_NO_CREDS } from './helpers'

// Logs each seeded role in via the real UI once per run and saves a
// storage-state fixture; role-gated specs reuse it via test.use({ storageState }).
// Stale states from previous runs are removed so hasState() is trustworthy.

setup.beforeAll(() => {
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
  // Successful admin sign-in renders the admin shell on /admin.
  await expect(page.getByText('Access denied')).not.toBeVisible({ timeout: 15_000 })
  await page.waitForURL('**/admin**', { timeout: 15_000 })
  await page.context().storageState({ path: statePath('admin') })
})
