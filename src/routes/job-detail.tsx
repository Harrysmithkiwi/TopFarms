import { createClient } from '@supabase/supabase-js'
import type { LoaderFunctionArgs, MetaArgs, MetaDescriptor } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { JobDetail } from '@/pages/jobs/JobDetail'

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

interface JobMeta {
  title: string
  region: string
  contract_type: string
  salary_min: number | null
  salary_max: number | null
  created_at: string
  expires_at: string | null
  description_overview: string | null
  description_daytoday: string | null
  farm_name: string | null
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin
  const url = `${origin}/jobs/${params.id}`
  // A malformed id is a 400 from PostgREST, not a job — don't ask.
  if (!params.id || !UUID.test(params.id)) return { job: null, url }

  const { data } = await db
    .from('jobs')
    .select(
      `title, region, contract_type, salary_min, salary_max, created_at, expires_at,
       description_overview, description_daytoday,
       employer_profiles:marketplace_employer_profiles(farm_name)`,
    )
    .eq('id', params.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!data) return { job: null, url }

  const { employer_profiles, ...job } = data as unknown as Omit<JobMeta, 'farm_name'> & {
    employer_profiles: { farm_name: string } | null
  }
  return { job: { ...job, farm_name: employer_profiles?.farm_name ?? null } as JobMeta, url }
}

// Google reads employmentType from a fixed vocabulary; our three contract types
// map onto it. Anything unrecognised is omitted rather than guessed.
const EMPLOYMENT_TYPE: Record<string, string> = {
  permanent: 'FULL_TIME',
  contract: 'CONTRACTOR',
  casual: 'PART_TIME',
}

function summarise(job: JobMeta): string {
  const text = [job.description_overview, job.description_daytoday].filter(Boolean).join(' ').trim()
  const where = [job.farm_name, job.region].filter(Boolean).join(', ')
  const fallback = `${job.title}${where ? ` at ${where}` : ''}. Apply on TopFarms.`
  if (!text) return fallback
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}...` : text
}

export function meta({ data }: MetaArgs<typeof loader>): MetaDescriptor[] {
  // No job (bad id, or not active): leave index.html's site-level defaults in
  // place rather than emitting a card for a listing that isn't there.
  if (!data?.job) return []
  const { job, url } = data
  const where = [job.farm_name, job.region].filter(Boolean).join(', ')
  const title = `${job.title}${where ? ` — ${where}` : ''} | TopFarms`
  const description = summarise(job)

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
          name: job.farm_name ?? 'TopFarms employer',
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
  return (
    <PublicShell>
      <JobDetail />
    </PublicShell>
  )
}
