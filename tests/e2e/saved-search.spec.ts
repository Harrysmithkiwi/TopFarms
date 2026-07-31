import { test, expect } from '@playwright/test'
import { hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Port of tests/saved-search-UAT.md item 1 (save -> appears in list), with
// delete as cleanup so repeated runs never accumulate rows or hit the 10-cap.
// Items 2-5 (undo, cap-replace, cross-session) remain covered by the vitest
// saved-search-* component suites.

test.describe('saved search round-trip', () => {
  test.skip(() => !hasState('seeker'), SKIP_NO_CREDS('seeker'))
  test.use({ storageState: hasState('seeker') ? statePath('seeker') : undefined })

  test('seeker saves a filtered search, sees it listed, then deletes it', async ({ page }) => {
    const name = `e2e-${Date.now()}`

    // Apply a filter so the inline "Save search" affordance appears (canSave
    // requires active filters + session — JobSearch.tsx SRCH-13).
    // Phase 5.0b: wait for the session to hydrate before interacting. Without
    // this the click lands before auth resolves, the INSERT goes out without a
    // session and fails into the modal's error surface, and the test then failed
    // much later at the list assertion with a misleading message. Diagnosed by
    // driving the same flow manually with networkidle (POST 201, row created)
    // versus the test's bare goto (no row ever written).
    await page.goto('/jobs?region=Waikato', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Save search' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill(name)
    await page.getByRole('dialog').getByRole('button', { name: /^Save/ }).click()

    // Assert the save SUCCEEDED here, not implicitly three steps later. A failed
    // insert leaves the dialog open with an error; catching it here says what
    // actually broke instead of "the list page is missing a row".
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // Round-trip: the saved search shows up on the dashboard list page.
    await page.goto('/dashboard/seeker/saved-searches')
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })

    // Cleanup: delete (no undo path — UAT item 3) and confirm it is gone.
    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 10_000 })
  })
})
