// Phase 5 Stage 2 — before/after screenshot harness.
//   node shot.mjs <label> [route ...]
// Shoots each route at 1200 and 360 into scratchpad/shots/<label>/.
// Stubs the Supabase REST /jobs response so JobDetail renders against an empty
// production marketplace — no seeding, prod untouched (same mechanism Task 5.6
// uses to abort requests).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const DIR = process.env.SHOT_DIR ?? '/tmp/phase5-shots'
const [label, ...routes] = process.argv.slice(2)
if (!label || !routes.length) { console.error('usage: shot.mjs <label> <route...>'); process.exit(2) }

const STUB_JOB = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Assistant Herd Manager', status: 'active', sector: 'dairy',
  region: 'Waikato', town: 'Morrinsville', employment_type: 'full_time',
  pay_min: 62000, pay_max: 74000, pay_period: 'year', pay_type: 'salary',
  description: 'Join a 480-cow spring-calving operation with a strong team culture.\n\nWe are looking for someone reliable who wants to build a long career in dairy.',
  responsibilities: 'Milking, pasture management, calf rearing.',
  requirements: 'Full NZ licence. Two seasons of shed experience preferred.',
  accommodation_provided: true, accommodation_type: 'house',
  visa_sponsorship_available: true, herd_size: 480, farm_size_ha: 210,
  listing_tier: 2, published_at: '2026-07-20T00:00:00Z', created_at: '2026-07-20T00:00:00Z',
  employer_id: '00000000-0000-4000-8000-0000000000e1',
  employer_profiles: {
    id: '00000000-0000-4000-8000-0000000000e1', farm_name: 'Kowhai Downs',
    region: 'Waikato', town: 'Morrinsville', sector: 'dairy', herd_size: 480,
    about: 'Family-run since 1994.', verified: true,
  },
}

const stub = async (page) => {
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url()
    if (/\/rest\/v1\/jobs\b/.test(url)) {
      const single = route.request().headers()['accept']?.includes('vnd.pgrst.object')
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? STUB_JOB : [STUB_JOB]) })
    }
    return route.continue()
  })
}

const browser = await chromium.launch()
for (const route of routes) {
  const slug = route.replace(/[^a-z0-9]/gi, '_') || 'root'
  for (const [w, h] of [[1200, 900], [360, 740]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await stub(page)
    await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(700)
    mkdirSync(`${DIR}/${label}`, { recursive: true })
    await page.screenshot({ path: `${DIR}/${label}/${slug}_${w}.png`, fullPage: true })
    console.log(`  ${route} @${w} -> ${slug}_${w}.png`)
    await ctx.close()
  }
}
await browser.close()
