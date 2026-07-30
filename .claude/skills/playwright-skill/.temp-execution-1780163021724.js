/**
 * Phase 23 smoke test — TAX-04 employer side
 * Drives the job-posting wizard to Step 3 (Skills) and asserts SkillsPicker
 * renders against the live migrated taxonomy.
 *
 * Flow:
 *  1. Launch headed Chromium at /login.
 *  2. Wait for OPERATOR to log in as EMPLOYER.
 *  3. Navigate to /jobs/new.
 *  4. Fill Step 1 (Basics) — title, sector, role_type, contract_type, region.
 *  5. Click Next → expect Step 2 (Farm Details).
 *  6. Click Next (Step 2 has no required fields per schema review) → expect Step 3 (Skills).
 *  7. Assert SkillsPicker:
 *     - All 6 friendly category headings render
 *     - 24 competency checkboxes total
 *     - Sample competency names from each category visible
 *     - The required/preferred control is the active mode (NOT proficiency)
 *  8. Screenshot + summary.
 */
const { chromium } = require('playwright')

const TARGET_URL = 'http://localhost:5173'
const SCREENSHOT_PATH = '/tmp/phase-23-employer-step3.png'

const EXPECTED_CATEGORY_HEADINGS = [
  'Livestock',
  'Cropping & agronomy',
  'Machinery & equipment',
  'Farm operations & infrastructure',
  'Management & business',
  'Cross-cutting',
]

// Sample competency names from each category (verified from CONTEXT.md decision #1
// + live MCP queries). One per category to spot-check the live render.
const SAMPLE_COMPETENCIES = [
  'Dairy cattle management',           // livestock
  'Pasture & forage management',       // cropping_agronomy
  'Tractor operation',                 // machinery_equipment
  'Irrigation & water systems',        // farm_operations_infrastructure
  'Farm financial management',         // management_business
  'Sustainable & regenerative practices', // cross_cutting
]

// Step 1 stub data — schema-valid but obviously a test record
const STEP1 = {
  title: 'TAX-04 Playwright Smoke Test Job',
  sector: 'dairy',           // FARM_TYPE_OPTIONS includes dairy
  roleType: 'Farm Hand',
  contractType: 'Permanent',
  region: 'Canterbury',
}

const results = []
function record(name, passed, detail) {
  results.push({ name, passed, detail })
  const mark = passed ? '✓' : '✗'
  console.log(`  ${mark} ${name}${detail ? ' — ' + detail : ''}`)
}

async function tryFillByLabel(page, label, value) {
  // Custom Select component may not expose <input>; try several strategies.
  try {
    await page.getByLabel(label, { exact: false }).fill(value)
    return true
  } catch {}
  return false
}

async function trySelectByLabel(page, label, optionText) {
  // For custom Select components — click the trigger by label, then click the option
  try {
    const trigger = page.getByLabel(label, { exact: false })
    await trigger.click()
    await page.getByRole('option', { name: optionText, exact: true }).click()
    return true
  } catch {}
  try {
    // Fallback: native <select>
    await page.getByLabel(label, { exact: false }).selectOption({ label: optionText })
    return true
  } catch {}
  return false
}

;(async () => {
  console.log('\n=== Phase 23 smoke test — TAX-04 employer Step 3 (SkillsPicker) ===\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleMessages = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => {
    consoleMessages.push(`[pageerror] ${err.message}`)
  })

  // 1. Login
  await page.goto(`${TARGET_URL}/login`)
  console.log('▸ Browser opened at /login. Please log in as EMPLOYER.')
  console.log('  (waiting up to 5 min for URL to leave /login...)\n')

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 5 * 60 * 1000,
  })
  console.log(`▸ Login detected — current URL: ${page.url()}`)

  // Early-detect wrong role before attempting /jobs/new navigation. The URL
  // after login is /dashboard/seeker for seekers, /dashboard/employer for
  // employers, /admin for admins.
  const postLoginUrl = page.url()
  if (postLoginUrl.includes('/dashboard/seeker') || postLoginUrl.includes('/admin')) {
    const role = postLoginUrl.includes('seeker') ? 'seeker' : 'admin'
    console.log(`\n✗ Logged in as ${role.toUpperCase()}, but this test requires EMPLOYER.`)
    console.log('  Log out and log back in as an employer, then re-run the script.\n')
    await browser.close()
    process.exit(2)
  }
  console.log()

  // 2. Navigate to /jobs/new
  await page.goto(`${TARGET_URL}/jobs/new`, { waitUntil: 'domcontentloaded' })
  if (!page.url().includes('/jobs/new')) {
    console.log(`\n✗ Bounced out of /jobs/new to ${page.url()}`)
    console.log('  Likely cause: logged-in user is NOT an employer.')
    await browser.close()
    process.exit(2)
  }
  console.log(`▸ Post-goto URL: ${page.url()}`)

  // /jobs/new may redirect to an employer onboarding "all-set" page for
  // newly-created employers (verification gate). Detect that and click the
  // "Post Your First Job" CTA to land on the real wizard.
  const cta = page.getByRole('button', { name: /post your first job/i })
  if ((await cta.count()) > 0) {
    console.log('▸ Employer onboarding completion page detected. Clicking "Post Your First Job"...')
    await cta.click()
    await page.waitForTimeout(800)
    console.log(`▸ After CTA click — URL: ${page.url()}`)
  }

  console.log('▸ Waiting for Step 1 "Job title" input...\n')

  try {
    await page.getByLabel(/job title/i).waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    console.log('  ⚠ Job title input not found after 15s. Capturing diagnostic.')
    await page.screenshot({ path: '/tmp/phase-23-employer-no-step1.png', fullPage: true })
    console.log('  📸 /tmp/phase-23-employer-no-step1.png')
    if (consoleMessages.length) {
      console.log('  Browser console:')
      consoleMessages.forEach((m) => console.log('    ' + m))
    }
    await browser.close()
    process.exit(1)
  }

  // 3. Step 1 — Basics
  // Title (text input — should be findable by label "Job title")
  const titleFilled = await tryFillByLabel(page, 'Job title', STEP1.title)
  record(`Step 1: filled "Job title"`, titleFilled, titleFilled ? STEP1.title : 'getByLabel failed')

  // Sector, role_type, contract_type, region — custom Selects
  for (const [label, value] of [
    ['Sector', STEP1.sector === 'dairy' ? 'Dairy' : STEP1.sector],
    ['Role type', STEP1.roleType],
    ['Contract type', STEP1.contractType],
    ['Region', STEP1.region],
  ]) {
    const ok = await trySelectByLabel(page, label, value)
    record(`Step 1: selected "${label}" = "${value}"`, ok)
  }

  // 4. Click Next
  console.log('\n▸ Clicking Next on Step 1...')
  try {
    await page.getByRole('button', { name: /next/i }).click()
  } catch (e) {
    record('Step 1: Next button clickable', false, e.message)
  }

  // Wait for Step 2 indicator OR Step 1 validation errors
  await page.waitForTimeout(800)
  const onStep2 = (await page.locator('text=Farm Details').count()) > 0 &&
                   (await page.locator('text=Breed').count()) > 0
  record('Advanced to Step 2 (Farm Details)', onStep2)

  if (!onStep2) {
    console.log('\n  Step 1 did not advance. Capturing diagnostic screenshot.')
    await page.screenshot({ path: '/tmp/phase-23-employer-step1-stuck.png', fullPage: true })
    console.log('  📸 /tmp/phase-23-employer-step1-stuck.png')
    if (consoleMessages.length) {
      console.log('  Browser console:')
      consoleMessages.forEach((m) => console.log('    ' + m))
    }
    await browser.close()
    process.exit(1)
  }

  // 5. Step 2 — Farm Details. Per schema review, no required fields. Click Next.
  console.log('\n▸ Clicking Next on Step 2...')
  try {
    await page.getByRole('button', { name: /next/i }).click()
  } catch (e) {
    record('Step 2: Next button clickable', false, e.message)
  }

  await page.waitForTimeout(800)

  // 6. Step 3 — Skills. SkillsPicker should render.
  const onStep3 = (await page.locator('text=/Skills/i').count()) > 0
  record('Advanced to Step 3 (Skills)', onStep3)

  // Wait for SkillsPicker to load skills from DB
  try {
    await page.waitForSelector('text=Loading skills...', { timeout: 2000, state: 'attached' }).catch(() => {})
    await page.waitForSelector('text=Loading skills...', { state: 'detached', timeout: 20_000 })
  } catch {
    // No loader visible, that's fine
  }

  console.log('\n▸ Assertions on Step 3 SkillsPicker:\n')

  // 6a. All 6 friendly category headings
  for (const heading of EXPECTED_CATEGORY_HEADINGS) {
    // SkillsPicker renders <h4 className="uppercase">{label}</h4>
    // Headings are styled uppercase via CSS — text content is the original case.
    const found = await page.locator('h4').filter({ hasText: new RegExp('^' + heading + '$', 'i') }).count()
    record(`Category heading "${heading}" visible`, found >= 1, `count=${found}`)
  }

  // 6b. Sample competency names — one per category
  for (const name of SAMPLE_COMPETENCIES) {
    const found = await page.getByText(name, { exact: true }).count()
    record(`Sample competency "${name}" visible`, found >= 1, `count=${found}`)
  }

  // 6c. Total competency checkbox count. Each <Checkbox> renders an input
  //     with the unique id `skill-${skill.id}`. Count those.
  const skillCheckboxes = await page.locator('input[id^="skill-"]').count()
  record('24 skill checkboxes total', skillCheckboxes === 24, `count=${skillCheckboxes}`)

  // 6d. No DairyNZ Level / qualification rows in the SkillsPicker (TAX-05 cross-check
  //     specific to the picker — the separate Qualifications field is allowed to retain those).
  //     The h4 + checkbox-block scope of the picker uses skill names; assert "DairyNZ Level"
  //     doesn't appear among the skill labels.
  const dairyNZLevelInPicker = await page.locator('h4, label').filter({ hasText: /DairyNZ Level/i }).count()
  record('No "DairyNZ Level" entries in SkillsPicker', dairyNZLevelInPicker === 0, `count=${dairyNZLevelInPicker}`)

  // 6e. Requirement-mode (required/preferred) — when a checkbox is checked, a Select
  //     appears showing Requirement options. Click one checkbox and assert "Required"
  //     option is present.
  try {
    const firstCheckbox = page.locator('input[id^="skill-"]').first()
    await firstCheckbox.check({ timeout: 5000 })
    await page.waitForTimeout(200)
    // The Select trigger appears; look for the requirement vocabulary
    const requirementBadge = await page.getByText(/required|preferred/i).count()
    record('Requirement mode active (required/preferred control present)', requirementBadge >= 1, `count=${requirementBadge}`)
  } catch (e) {
    record('Requirement mode active', false, 'could not check first skill — ' + e.message)
  }

  // 7. Screenshot
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
  console.log(`\n  📸 Screenshot: ${SCREENSHOT_PATH}\n`)

  // 8. Summary
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  if (passed < total && consoleMessages.length > 0) {
    console.log('\n--- Browser console (errors/warnings) ---')
    consoleMessages.forEach((m) => console.log('  ' + m))
    console.log('')
  }
  console.log(`=== SUMMARY: ${passed}/${total} assertions passed ===`)
  if (passed === total) {
    console.log('✓ TAX-04 employer-side smoke test PASSED.')
  } else {
    console.log('✗ One or more assertions failed. Review screenshot + DOM.')
  }

  await browser.close()
  process.exit(passed === total ? 0 : 1)
})().catch((err) => {
  console.error('\n✗ Script error:', err.message)
  console.error(err.stack)
  process.exit(3)
})
