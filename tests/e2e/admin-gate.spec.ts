import { test, expect } from '@playwright/test'
import { hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Port of tests/admin-bootstrap-UAT.md steps 4 + 7 (browser flows). The
// server-side gate (_admin_gate(), migration 023) is asserted at unit level
// in tests/admin-rpc-gate.test.ts; these cover the standalone gate page UX.

test('anonymous /admin shows the standalone admin login gate', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Sign in to TopFarms admin' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to main site' })).toBeVisible()
})

test.describe('admin role', () => {
  test.skip(() => !hasState('admin'), SKIP_NO_CREDS('admin'))
  test.use({ storageState: hasState('admin') ? statePath('admin') : undefined })

  test('admin reaches /admin/employers list', async ({ page }) => {
    await page.goto('/admin/employers')
    await expect(page.getByRole('heading', { name: 'Employers' })).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe('non-admin denied', () => {
  test.skip(() => !hasState('seeker'), SKIP_NO_CREDS('seeker'))
  test.use({ storageState: hasState('seeker') ? statePath('seeker') : undefined })

  test('seeker visiting /admin gets AccessDenied, not the admin shell', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Access denied')).toBeVisible({ timeout: 15_000 })
  })
})
