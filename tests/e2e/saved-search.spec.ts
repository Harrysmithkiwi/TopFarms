import { test, expect } from '@playwright/test'
import { creds, hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Port of tests/saved-search-UAT.md item 1 (save -> appears in list), with
// delete as cleanup so repeated runs never accumulate rows or hit the 10-cap.
// Items 2-5 (undo, cap-replace, cross-session) remain covered by the vitest
// saved-search-* component suites.

test.describe('saved search round-trip', () => {
  test.skip(() => !hasState('seeker'), SKIP_NO_CREDS('seeker'))
  test.use({ storageState: hasState('seeker') ? statePath('seeker') : undefined })

  /**
   * Cleanup that runs whether the test passed or not — the delete at the end of the
   * test only ran when everything before it passed.
   *
   * That difference is a ratchet, and it fired: runs on 2026-07-31 and 2026-08-03 died
   * before their delete step and left nine rows behind. With the account's real search
   * that made ten, which is the cap — so every run after it clicked "Save search" and
   * got the REPLACE-OLDEST dialog, correctly, while this spec waited for the name field
   * of a dialog that was never going to open. It timed out at 30s pointing at the save
   * flow, and the save flow was working the whole time. CI had been red on it since
   * 2026-08-11 and the fixture could not recover on its own: at the cap, the spec can
   * no longer create the row whose deletion would have freed a slot.
   *
   * REST rather than the UI, because cleanup that depends on the page rendering fails
   * in exactly the runs that need it most. Best-effort by design: it never throws, so a
   * cleanup problem cannot turn a passing test red.
   */
  test.afterEach(async ({ request }) => {
    const c = creds('seeker')
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY
    if (!c || !url || !key) return
    const auth = await request.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: key },
      data: { email: c.email, password: c.password },
    })
    if (!auth.ok()) return
    const { access_token: token } = await auth.json()
    // PostgREST `like` takes `*` as the wildcard. Scoped to this spec's own naming
    // (`e2e-${Date.now()}`) so a real saved search on the account survives, and RLS
    // scopes the delete to this user regardless.
    await request.delete(`${url}/rest/v1/saved_searches?name=like.e2e-*`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    })
  })

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
