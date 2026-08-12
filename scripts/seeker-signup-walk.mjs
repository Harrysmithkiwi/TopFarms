/**
 * Walks the NEW seeker signup on live production, headed or headless.
 *
 * Proves the four things the split-onboarding change claims:
 *   1. `?ref=` survives signup into auth.users.raw_user_meta_data
 *   2. a seeker with no live jobs sees the waitlist, not an empty board
 *   3. step 1 alone persists a MATCHABLE profile (sector_pref + region on the row)
 *   4. "Save and finish later" from step 2 returns to the dashboard
 *
 * TWO MODES, because production requires email confirmation and this script holds no
 * service-role key. Signup cannot log itself in.
 *
 *   node scripts/seeker-signup-walk.mjs                      # A: sign up, print the email
 *   -- confirm the user out of band, then --
 *   RESUME_EMAIL=<that email> node scripts/seeker-signup-walk.mjs   # B: log in and walk on
 *
 * Mode B asserts the browser only. The seeker_profiles row is asserted separately with
 * SQL — a claim about the database belongs to a database query, not to a UI that merely
 * advanced a step.
 *
 * Creates a real account in production; delete it when done. The email uses the repo's
 * throwaway pattern (`tests/e2e/signup-flow.spec.ts`) so nothing reaches a real inbox.
 *
 *   HEADED=1 ... # watch it
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'https://www.topfarms.co.nz'
const REF = process.env.REF ?? '52e62e58'
const RESUME_EMAIL = process.env.RESUME_EMAIL
const EMAIL = RESUME_EMAIL ?? `e2e-seeker-${Date.now()}@topfarms.co.nz`
const PASSWORD = 'Test1234!seeker' // policy requires >= 10 chars
const OUT = process.env.OUT_DIR ?? '/tmp'

const step = (n, m) => console.log(`\n[${n}] ${m}`)
const results = { mode: RESUME_EMAIL ? 'B/resume' : 'A/signup', email: EMAIL }

const browser = await chromium.launch({ headless: !process.env.HEADED })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('console', (m) => {
  if (m.type() === 'error') console.log('   console.error:', m.text().slice(0, 160))
})

try {
  if (!RESUME_EMAIL) {
    step(1, `signup with attribution — ${EMAIL}`)
    await page.goto(`${BASE}/signup?role=seeker&ref=${REF}`, { waitUntil: 'domcontentloaded' })

    // Role should already be preselected by ?role=seeker.
    // Target by id — getByLabel matched nothing here, and the role cards are <button>s
    // whose accessible name includes their sub-label ("Seeker\n\nFind farm work").
    await page.getByRole('button', { name: /Seeker/ }).click()
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('#terms').check()
    await page.getByRole('button', { name: 'Create account' }).click()

    await page.waitForURL(/\/auth\/verify|\/onboarding|\/dashboard/, { timeout: 30000 })
    results.afterSignupUrl = page.url()
    console.log('   landed:', results.afterSignupUrl)

    console.log('\nNEXT — confirm this user, then re-run with:')
    console.log(`   RESUME_EMAIL=${EMAIL} node scripts/seeker-signup-walk.mjs`)
  } else {
    step(1, `log in as ${EMAIL}`)
    // networkidle, not domcontentloaded: fill() writes to the DOM before React has
    // attached its handlers, so the first run submitted a form nobody was listening to
    // and sat on /login with both fields populated and no error.
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    // exact: /log in|sign in/i matches "Sign in with Google" first and walks into OAuth.
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    results.afterLoginUrl = page.url()
    console.log('   landed:', results.afterLoginUrl)

    step(2, 'waitlist card is the first screen, not an empty board')
    const waitlist = page.getByText("You're on the list", { exact: false })
    await waitlist.waitFor({ timeout: 15000 })
    results.waitlistCard = true
    results.browseJobsSuppressed =
      (await page.getByRole('link', { name: 'Browse jobs' }).count()) === 0
    await page.screenshot({ path: `${OUT}/seeker-walk-2-dashboard.png`, fullPage: true })

    step(3, 'the waitlist CTA opens the wizard')
    await page.getByRole('link', { name: /Complete your profile|Finish your profile/ }).click()
    await page.waitForURL(/\/onboarding\/seeker/, { timeout: 20000 })

    step(4, 'step 1 — the matchable core')
    await page
      .getByRole('group', { name: 'Farm types you are looking for' })
      .getByRole('button', { name: 'Dairy' })
      .click()
    // Radix Select renders its trigger as a combobox; it is the only one on this step.
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Waikato', exact: true }).click()
    await page
      .getByRole('group', { name: /Roles you're after/ })
      .getByRole('button', { name: 'Farm Hand', exact: true })
      .click()
    await page.getByRole('textbox', { name: 'First name' }).fill('E2E')
    await page.getByRole('textbox', { name: 'Last name' }).fill('Walker')
    await page.getByRole('textbox', { name: 'Phone' }).fill('021 000 0000')
    await page.screenshot({ path: `${OUT}/seeker-walk-4-step1.png`, fullPage: true })
    await page.getByRole('button', { name: /Continue|Saving/ }).click()

    // Advancing to step 2 is the UI's evidence that the upsert resolved without error;
    // the row itself is asserted with SQL outside this script.
    await page.getByRole('heading', { name: /experience/i }).waitFor({ timeout: 20000 })
    results.reachedStep2 = true

    step(5, '"Save and finish later" returns to the dashboard')
    await page.getByRole('button', { name: 'Save and finish later' }).click()
    await page.waitForURL(/\/dashboard\/seeker/, { timeout: 20000 })
    results.escapeHatchUrl = page.url()
    // The hatch must not exist on step 1 — that is what makes the core mandatory.
    await page.goto(`${BASE}/onboarding/seeker`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: /experience/i }).waitFor({ timeout: 20000 })
    results.resumesAtStep2 = true
  }
} catch (e) {
  console.error('\n!!! FAILED:', e.message)
  results.error = e.message
  await page.screenshot({ path: `${OUT}/seeker-walk-fail.png` }).catch(() => {})
  process.exitCode = 1
} finally {
  console.log('\n' + JSON.stringify(results, null, 2))
  await browser.close()
}
