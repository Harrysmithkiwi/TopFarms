// v13 (directive 1.16): build-time sitemap. Extends the static launch baseline
// (public/sitemap.xml, TF-005/021) with one <url> per ACTIVE job, so job pages
// are discoverable the moment inventory exists. Runs as postbuild; overwrites
// dist/sitemap.xml only on success.
//
// FAIL-SOFT BY DESIGN: any error (missing env, network, RLS change) leaves the
// static baseline that Vite already copied from public/ and exits 0. A missing
// jobs section is degraded; a failed deploy over a sitemap is not acceptable.
//
// Anon read of active jobs is RLS-permitted (policy "jobs: anon users view
// active", verified 2026-08-03). Freshness = deploy frequency; the upgrade path
// is a server route when React Router framework mode lands (directive 1.16).

import { writeFileSync, existsSync } from 'node:fs'

const ORIGIN = 'https://www.topfarms.co.nz'
const OUT = new URL('../dist/sitemap.xml', import.meta.url).pathname

const STATIC_ROUTES = [
  ['/', 'daily', '1.0'],
  ['/jobs', 'hourly', '0.9'],
  ['/for-employers', 'weekly', '0.8'],
  ['/pricing', 'weekly', '0.8'],
  ['/signup', 'monthly', '0.6'],
  ['/privacy', 'yearly', '0.3'],
  ['/terms', 'yearly', '0.3'],
]

function url([path, changefreq, priority]) {
  return `  <url><loc>${ORIGIN}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}

function jobUrl({ id, created_at }) {
  const lastmod = created_at ? `<lastmod>${created_at.slice(0, 10)}</lastmod>` : ''
  return `  <url><loc>${ORIGIN}/jobs/${id}</loc>${lastmod}<changefreq>daily</changefreq><priority>0.7</priority></url>`
}

async function main() {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set')

  const res = await fetch(
    `${base}/rest/v1/jobs?status=eq.active&select=id,created_at&order=created_at.desc&limit=5000`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  )
  if (!res.ok) throw new Error(`jobs query failed: ${res.status}`)
  const jobs = await res.json()

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_ROUTES.map(url),
    ...jobs.map(jobUrl),
    '</urlset>',
    '',
  ].join('\n')

  writeFileSync(OUT, xml)
  console.log(`sitemap: ${STATIC_ROUTES.length} static + ${jobs.length} job urls -> dist/sitemap.xml`)
}

main().catch((err) => {
  console.warn(`sitemap: generation failed (${err.message}); static baseline kept`)
  if (!existsSync(OUT)) {
    // dist/ missing entirely means postbuild ran without a build; still exit 0.
    console.warn('sitemap: dist/sitemap.xml not present either; nothing written')
  }
  process.exit(0)
})
