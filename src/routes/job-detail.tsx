import { createClient } from '@supabase/supabase-js'
import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaArgs, MetaDescriptor } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { JobDetail, type JobDetailSeed } from '@/pages/jobs/JobDetail'

// /jobs/:id — the route this whole stage exists for (directive 1.16).
//
// A job link shared into a Facebook group has to render a real card, and no
// social crawler executes JavaScript. So the title, description, og tags and
// JobPosting JSON-LD are produced by the loader below and land in the RAW HTML.
// Everything the page needs beyond that (skills, verifications, match score,
// similar jobs, apply state) still loads client-side; a crawler does not read
// it and a visitor gets it a moment later, exactly as today.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Loader-only client. Deliberately NOT @/lib/supabase: that one persists the
// session and detects it in the URL, which is browser behaviour with no meaning
// on a server that must stay anonymous. Anonymous is also the correct authority
// here — RLS policy "jobs: anon users view active" returns active listings and
// nothing else, so a draft or archived job cannot leak into crawlable HTML.
// VITE_ vars are inlined into the server bundle by Vite the same way they are
// into the client one; no new environment configuration.
const db = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
)

// The loader fetches what the page shows ABOVE THE FOLD, not just what the meta
// tags need. A JobPosting JSON-LD describing content the raw HTML doesn't show
// is the shape Google rejects, and it would leave every non-rendering crawler
// reading "Loading listing". Skills and verifications are here for the same
// reason: the trust badge is computed from verifications, so omitting them would
// server-render "unverified" and then flip it after hydration.
//
// Deliberately NOT fetched: application count, similar jobs, match score, and
// applied state. The first two are below the fold; the last two are personal to
// a signed-in seeker and correctly absent from an anonymous server render.
export async function loader({ params, request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin
  const url = `${origin}/jobs/${params.id}`
  const empty = { id: params.id ?? null, seed: null, url }
  // A malformed id is a 400 from PostgREST, not a job — don't ask.
  if (!params.id || !UUID.test(params.id)) return empty

  // Only status='active'. Drafts and archived listings are the owning
  // employer's business and are served by the page's own client fetch, which
  // runs with their session; they must never reach crawlable HTML.
  const { data: job } = await db
    .from('jobs')
    .select('*, employer_profiles:marketplace_employer_profiles(*)')
    .eq('id', params.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!job) return empty

  const [{ data: skills }, { data: verifications }] = await Promise.all([
    db
      .from('job_skills')
      .select('skill_id, requirement_level, skills(id, name, category)')
      .eq('job_id', params.id),
    job.employer_profiles?.id
      ? db
          .from('employer_verifications')
          .select('*')
          .eq('employer_id', job.employer_profiles.id)
      : Promise.resolve({ data: [] }),
  ])

  const seed = {
    job,
    skills: skills ?? [],
    verifications: verifications ?? [],
  } as unknown as JobDetailSeed

  return { id: params.id, seed, url }
}

// Google reads employmentType from a fixed vocabulary; our three contract types
// map onto it. Anything unrecognised is omitted rather than guessed.
const EMPLOYMENT_TYPE: Record<string, string> = {
  permanent: 'FULL_TIME',
  contract: 'CONTRACTOR',
  casual: 'PART_TIME',
}

function summarise(job: JobDetailSeed['job'], where: string): string {
  const text = [job.description_overview, job.description_daytoday].filter(Boolean).join(' ').trim()
  const fallback = `${job.title}${where ? ` at ${where}` : ''}. Apply on TopFarms.`
  if (!text) return fallback
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}...` : text
}

export function meta({ data }: MetaArgs<typeof loader>): MetaDescriptor[] {
  // No job (bad id, or not active): leave the root's site-level defaults in
  // place rather than emitting a card for a listing that isn't there.
  if (!data?.seed) return []
  const { job } = data.seed
  const { url } = data
  const farmName = job.employer_profiles?.farm_name ?? null
  const where = [farmName, job.region].filter(Boolean).join(', ')
  const title = `${job.title}${where ? ` — ${where}` : ''} | TopFarms`
  const description = summarise(job, where)

  const salary =
    job.salary_min || job.salary_max
      ? {
          '@type': 'MonetaryAmount',
          currency: 'NZD',
          value: {
            '@type': 'QuantitativeValue',
            minValue: job.salary_min ?? undefined,
            maxValue: job.salary_max ?? undefined,
            unitText: 'YEAR',
          },
        }
      : undefined

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'article' },
    // Repeated from root.tsx on purpose: a route's meta REPLACES the parent's
    // descriptors rather than merging with them, so site-level tags have to be
    // restated here or the card loses them.
    { property: 'og:site_name', content: 'TopFarms' },
    { name: 'twitter:card', content: 'summary' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { tagName: 'link', rel: 'canonical', href: url },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: job.title,
        description,
        datePosted: job.created_at,
        validThrough: job.expires_at ?? undefined,
        employmentType: EMPLOYMENT_TYPE[job.contract_type],
        directApply: true,
        hiringOrganization: {
          '@type': 'Organization',
          name: farmName ?? 'TopFarms employer',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressRegion: job.region,
            addressCountry: 'NZ',
          },
        },
        baseSalary: salary,
      },
    },
  ]
}

export default function JobDetailRoute() {
  const { id, seed } = useLoaderData<typeof loader>()
  return (
    <PublicShell>
      {/* key: remount per job so the seed below is never a previous listing's.
          Without it the state initialised from `seed` would survive a
          job -> job navigation and show stale content until the refetch. */}
      <JobDetail key={id ?? 'none'} seed={seed} />
    </PublicShell>
  )
}
