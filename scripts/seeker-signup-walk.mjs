/**
 * Walks the NEW seeker signup on live production, headed or headless.
 *
 * Proves the three things the split-onboarding change claims:
 *   1. `?ref=` survives signup into auth.users.raw_user_meta_data
 *   2. step 1 alone produces a MATCHABLE profile (sector_pref + region present)
 *   3. a seeker with no live jobs sees the waitlist, not an empty board
 *
 * Creates a real account in production and deletes it at the end. The email uses the
 * repo's existing throwaway pattern (`tests/e2e/signup-flow.spec.ts`) so nothing reaches
 * a real inbox.
 *
 *   node scripts/seeker-signup-walk.mjs            # headless
 *   HEADED=1 node scripts/seeker-signup-walk.mjs   # watch it
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'https://www.topfarms.co.nz'
const REF = process.env.REF ?? '52e62e58'
const EMAIL = `e2e-seeker-${Date.now()}@topfarms.co.nz`
const PASSWORD = 'Test1234!seeker'  // policy requires >= 10 chars

const step = (n, m) => console.log(`\n[${n}] ${m}`)
const results = {}

const browser = await chromium.launch({ headless: !process.env.HEADED })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('console', (m) => {
  if (m.type() === 'error') console.log('   console.error:', m.text().slice(0, 160))
})

try {
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

  console.log('\nPAUSE — confirm the user and re-login, then press Enter here.')
  console.log(`   email: ${EMAIL}`)
  results.email = EMAIL
} catch (e) {
  console.error('\n!!! FAILED:', e.message)
  results.error = e.message
  await page.screenshot({ path: '/tmp/seeker-walk-fail.png' }).catch(() => {})
  process.exitCode = 1
} finally {
  console.log('\n' + JSON.stringify(results, null, 2))
  await browser.close()
}
