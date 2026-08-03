import type { MetaDescriptor } from 'react-router'
import { JobSearchLayout } from '@/components/layout/JobSearchLayout'
import { JobSearch } from '@/pages/jobs/JobSearch'

// /jobs — the board. Server-rendered shell: nav, footer, h1, title, canonical.
//
// NO LOADER YET, and that is a decision rather than an omission. JobSearch
// builds its query from ~20 URL parameters across 190 lines; reproducing that
// server-side is the expensive half of this stage, and it buys a board page
// that crawlers already reach through the sitemap and that no one shares into a
// Facebook group. The listings still arrive client-side exactly as today. If
// the raw-HTML board turns out to matter, the loader drops into this file
// without touching anything else.
const ORIGIN = 'https://www.topfarms.co.nz'

export function meta(): MetaDescriptor[] {
  const title = 'Farm jobs in New Zealand — TopFarms'
  const description =
    'Browse farm jobs across New Zealand — dairy, sheep & beef, cropping, deer and mixed. Filter by region, shed type, accommodation and visa sponsorship.'
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `${ORIGIN}/jobs` },
    { tagName: 'link', rel: 'canonical', href: `${ORIGIN}/jobs` },
  ]
}

export default function JobsRoute() {
  return (
    <JobSearchLayout>
      <JobSearch />
    </JobSearchLayout>
  )
}
