import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { hasState, statePath, SKIP_NO_CREDS } from './helpers'

// Phase 4.6 — the mechanical a11y gate. Six routes × two widths, axe-core on
// each. serious/critical violations FAIL the build; moderate is logged so the
// ratchet can tighten later without blocking this phase. Also enforces the
// 360px no-horizontal-scroll contract (Task 4.2) and the computed 44px hit box
// for the SearchJobCard bookmark (Task 4.3).
//
// Route auth model mirrors the other specs: anonymous routes always run;
// role-gated routes skip cleanly when E2E_* creds are absent.

const DESKTOP = { width: 1200, height: 800 }
const MOBILE = { width: 360, height: 740 }

async function runAxe(page: Page, label: string) {
  // [data-decorative] — purely decorative text (e.g. the HowItWorks watermark
  // numerals, aria-hidden). WCAG 1.4.3 exempts decorative text from contrast;
  // axe cannot infer decorativeness, so the exemption is explicit and narrow.
  const results = await new AxeBuilder({ page }).exclude('[data-decorative]').analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  const moderate = results.violations.filter((v) => v.impact === 'moderate')
  for (const v of moderate) {
    console.warn(
      `[a11y moderate] ${label}: ${v.id} (${v.nodes.length} node(s)) — not failing (ratchet later)`,
    )
  }
  expect(
    serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
    `${label}: axe serious/critical violations`,
  ).toEqual([])
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement!.scrollWidth,
    clientWidth: document.scrollingElement!.clientWidth,
  }))
  expect(scrollWidth, `${label}: horizontal overflow (${scrollWidth} > ${clientWidth})`).toBeLessThanOrEqual(clientWidth)
}

/** Discover a public job id from the marketplace's own REST query. */
async function findJobId(page: Page): Promise<string | null> {
  const responsePromise = page
    .waitForResponse((r) => r.url().includes('/rest/v1/jobs') && r.ok(), { timeout: 15_000 })
    .catch(() => null)
  await page.goto('/jobs')
  const response = await responsePromise
  if (!response) return null
  const rows = (await response.json().catch(() => [])) as { id?: string }[]
  return rows.find((r) => r.id)?.id ?? null
}

for (const viewport of [DESKTOP, MOBILE]) {
  const vp = `${viewport.width}px`

  test.describe(`a11y sweep @ ${vp} (anonymous)`, () => {
    test.use({ viewport })

    test(`/ passes axe @ ${vp}`, async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await runAxe(page, `/ @ ${vp}`)
      if (viewport === MOBILE) await assertNoHorizontalScroll(page, `/ @ ${vp}`)
    })

    test(`/jobs passes axe @ ${vp}`, async ({ page }) => {
      await page.goto('/jobs')
      await page.waitForLoadState('networkidle')
      await runAxe(page, `/jobs @ ${vp}`)
      if (viewport === MOBILE) await assertNoHorizontalScroll(page, `/jobs @ ${vp}`)
    })

    test(`/jobs/:id passes axe @ ${vp}`, async ({ page }) => {
      const jobId = await findJobId(page)
      test.skip(jobId === null, 'no public job id discoverable from /jobs REST response')
      await page.goto(`/jobs/${jobId}`)
      await page.waitForLoadState('networkidle')
      await runAxe(page, `/jobs/:id @ ${vp}`)
      if (viewport === MOBILE) await assertNoHorizontalScroll(page, `/jobs/:id @ ${vp}`)
    })
  })

  test.describe(`a11y sweep @ ${vp} (seeker)`, () => {
    test.skip(() => !hasState('seeker'), SKIP_NO_CREDS('seeker'))
    test.use({ storageState: hasState('seeker') ? statePath('seeker') : undefined, viewport })

    test(`/dashboard/seeker passes axe @ ${vp}`, async ({ page }) => {
      await page.goto('/dashboard/seeker')
      await page.waitForLoadState('networkidle')
      await runAxe(page, `/dashboard/seeker @ ${vp}`)
      if (viewport === MOBILE) await assertNoHorizontalScroll(page, `/dashboard/seeker @ ${vp}`)
    })

    test(`/onboarding/seeker passes axe @ ${vp}`, async ({ page }) => {
      await page.goto('/onboarding/seeker')
      await page.waitForLoadState('networkidle')
      // An onboarded test seeker bounces to /dashboard/seeker (by design).
      // No silent caps: say which surface actually got scanned.
      const finalUrl = page.url()
      if (!finalUrl.includes('/onboarding/seeker')) {
        console.warn(`[a11y] /onboarding/seeker redirected to ${finalUrl} — scanned that surface`)
      }
      await runAxe(page, `/onboarding/seeker @ ${vp}`)
      if (viewport === MOBILE) await assertNoHorizontalScroll(page, `/onboarding/seeker @ ${vp}`)
    })
  })

  // Admin had ZERO a11y coverage until 2026-08-07 — the six original routes are
  // three marketing surfaces plus seeker/employer, and the whole admin portal was
  // outside the sweep. Gate A found real defects there (an unnamed chart tab stop,
  // no heading structure) that this spec would have caught had it been looking.
  test.describe(`a11y sweep @ ${vp} (admin)`, () => {
    test.skip(() => !hasState('admin'), SKIP_NO_CREDS('admin'))
    test.use({ storageState: hasState('admin') ? statePath('admin') : undefined, viewport })

    // The landing screen (hand-rolled states, the chart) and one AdminTable screen,
    // which stands in for the nine that route through it.
    for (const [label, path] of [
      ['daily briefing', '/admin'],
      ['employers list', '/admin/employers'],
    ] as const) {
      test(`${label} passes axe @ ${vp}`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        // Role resolution gates the admin shell and can take seconds; without this
        // the sweep can scan a skeleton and call it clean.
        await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 })
        await runAxe(page, `${label} @ ${vp}`)
        if (viewport === MOBILE) await assertNoHorizontalScroll(page, `${label} @ ${vp}`)
      })
    }

    test(`admin regions are reachable by heading navigation @ ${vp}`, async ({ page }) => {
      // Not an axe rule — axe checks that an h1 exists and that present headings
      // are ordered, never that content regions HAVE headings. This is the defect
      // Gate A found and the mechanical gate could not see, so it is asserted here.
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 })
      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main h1, main h2, main h3')).map(
          (h) => h.tagName,
        ),
      )
      expect(levels.filter((l) => l === 'H1'), 'exactly one h1').toHaveLength(1)
      expect(
        levels.filter((l) => l !== 'H1').length,
        'content regions with no heading — screen-reader navigation is a list of one',
      ).toBeGreaterThanOrEqual(4)
    })
  })

  test.describe(`a11y sweep @ ${vp} (employer)`, () => {
    test.skip(() => !hasState('employer'), SKIP_NO_CREDS('employer'))
    test.use({ storageState: hasState('employer') ? statePath('employer') : undefined, viewport })

    test(`applicant dashboard passes axe @ ${vp}`, async ({ page }) => {
      // Route needs a job id owned by this employer — take the first
      // "view applicants" link from the employer dashboard.
      await page.goto('/dashboard/employer')
      await page.waitForLoadState('networkidle')
      const link = page.locator('a[href*="/applicants"]').first()
      const hasJobs = (await link.count()) > 0
      test.skip(!hasJobs, 'employer has no active listings — applicant dashboard unreachable')
      await page.goto((await link.getAttribute('href'))!)
      await page.waitForLoadState('networkidle')
      await runAxe(page, `applicant dashboard @ ${vp}`)
      if (viewport === MOBILE)
        await assertNoHorizontalScroll(page, `applicant dashboard @ ${vp}`)
    })
  })
}

test.describe('44px tap targets — computed boxes (Phase 4.3 gate)', () => {
  test('SearchJobCard bookmark hit box is >=44x44 at 360px', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/jobs')
    const bookmark = page.getByRole('button', { name: /save this job|job saved/i }).first()
    const hasCards = await bookmark
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!hasCards, 'no job cards in this environment — hit box unmeasurable')
    const box = await bookmark.boundingBox()
    expect(box, 'bookmark bounding box').not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('reduced motion honoured by JS animation (Phase 4.4 / A7)', () => {
  test('motion/react animations are suppressed under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // The landing hero animates via motion/react. With MotionConfig
    // reducedMotion="user", transform/opacity animations must not run — assert
    // no element is mid-animation shortly after load by sampling styles twice.
    const sample = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[style*="transform"]'))
          .slice(0, 20)
          .map((el) => (el as HTMLElement).style.transform),
      )
    const first = await sample()
    await page.waitForTimeout(400)
    const second = await sample()
    expect(second, 'transforms still changing under reduced motion').toEqual(first)
  })
})

test.describe('public routes carry exactly one h1 and one main', () => {
  // axe rates landmark-no-duplicate-main and the heading rules MODERATE, and
  // runAxe above only logs moderate — so the sweep watched these four routes
  // for weeks while /jobs served a <main> nested inside PublicShell's plus a
  // second h1, and /pricing served one h1 per audience view. Both are invalid
  // for a crawler and both split the document outline for a screen reader.
  // Asserted explicitly, for the same reason the admin heading test above is.
  //
  // Each route also asserts WHICH h1 it got. Counting alone cannot tell a
  // correct page from the 404: NotFound renders inside PublicShell, so it too
  // has exactly one h1 and one main, and a route that broke and fell through to
  // it would keep this green.
  //
  // `aud` runs the audience-swapped routes through BOTH lenses. The employer
  // string is the CSS default (directive 1.11), so a seek-only regression —
  // which is exactly half of the /pricing bug this guards — is invisible unless
  // the lens is set. sessionStorage must be written against the origin, hence
  // the goto-then-set-then-reload.
  // Patterns are case-INSENSITIVE on purpose: the landing h1 is CSS-uppercased,
  // and innerText returns rendered casing ("THE RIGHT MATCH,"). Matching the
  // source casing here fails against a page that is perfectly correct.
  const ROUTES = [
    { path: '/', h1: /the right match/i },
    { path: '/', h1: /find the farm job/i, aud: 'seeker' },
    { path: '/jobs', h1: /find your next farming opportunity/i },
    { path: '/pricing', h1: /what it costs/i },
    { path: '/pricing', h1: /workers never pay/i, aud: 'seeker' },
    { path: '/for-employers', h1: /what happens after you post/i },
  ]
  for (const { path, h1, aud } of ROUTES) {
    const label = `${path}${aud ? ` (${aud} lens)` : ''}`
    test(`${label} has one h1 and one main`, async ({ page }) => {
      await page.goto(path)
      if (aud) {
        await page.evaluate((a) => sessionStorage.setItem('tf-aud', a), aud)
        await page.reload()
      }
      await page.waitForLoadState('networkidle')
      await page.locator('main').first().waitFor({ timeout: 20_000 })
      const found = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        // innerText, not textContent: the hidden audience string must not count.
        text: (document.querySelector('h1') as HTMLElement | null)?.innerText ?? '',
      }))
      expect(found.h1, `${label}: h1 elements`).toBe(1)
      expect(found.main, `${label}: main landmarks`).toBe(1)
      expect(found.text, `${label}: h1 text — is this the right page, or the 404?`).toMatch(h1)
    })
  }
})

test('/login and /signup have a main landmark', async ({ page }) => {
  // AuthLayout has no shell around it and had no <main> of its own, so these
  // two routes shipped ZERO landmarks — nothing for a screen-reader user to
  // skip to — while DashboardLayout and AdminLayout both provide one. Found by
  // a verifier sweeping for siblings of the /jobs nested-landmark defect.
  //
  // NOTE for the merge train: pricing/model-v3 appends its own block to the end
  // of this file, so merge ③ will conflict here. Both blocks are wanted; keep
  // them both.
  for (const path of ['/login', '/signup']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main'), `${path}: main landmarks`).toHaveCount(1)
  }
})
