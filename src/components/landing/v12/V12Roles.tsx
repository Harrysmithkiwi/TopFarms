import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { Container, Display, TextLink } from './V12Kit'
import { IconPin } from '@/components/landing/LandingIcons'

// The comp hard-codes four job cards. This does not, and that difference is the point: the
// section is a claim about inventory, and a claim about inventory has to be true.
//
// Prod holds ZERO active jobs as of 2026-08-19, so today this renders the empty state, not
// four invented farms. Directive 1.15 (inventory honesty) carries into v12 unchanged — an
// invented listing on the landing page is the one lie a job board cannot come back from.
//
// Four required states, all present: loading (skeleton), empty (honest + a route out),
// error (says so, offers the full list), and loaded.

interface Role {
  id: string
  title: string
  region: string
  contract_type: string | null
  accommodation: Record<string, unknown> | null
  employer_profiles: { farm_name: string } | null
}

const SELECT =
  'id, title, region, contract_type, accommodation, employer_profiles:marketplace_employer_profiles!inner(farm_name)'

/** Chips come from real columns only. An absent column renders nothing rather than a guess. */
function chips(r: Role): string[] {
  const out: string[] = []
  if (r.contract_type) {
    out.push(r.contract_type.charAt(0).toUpperCase() + r.contract_type.slice(1))
  }
  const acc = r.accommodation
  if (acc && typeof acc === 'object' && acc.available === true) out.push('Accommodation')
  return out.slice(0, 2)
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-rule rounded-xl border bg-white p-5 transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(26,60,42,0.08)]">
      {children}
    </div>
  )
}

export function V12Roles() {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4)
      if (!alive) return
      if (error) {
        reportError('landing: featured roles', error)
        setFailed(true)
        setRoles([])
        return
      }
      setRoles((data ?? []) as unknown as Role[])
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <section className="bg-linen border-rule border-y py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Display className="text-[clamp(1.5rem,2.6vw,1.9rem)]">
            Find your next opportunity
          </Display>
          <TextLink to="/jobs">Browse all jobs</TextLink>
        </div>

        {roles === null && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status">
            <span className="sr-only">Loading open roles</span>
            {[0, 1, 2, 3].map((i) => (
              <CardShell key={i}>
                <div className="bg-fern-50 h-10 w-10 animate-pulse rounded-full motion-reduce:animate-none" />
                <div className="bg-fern-50 mt-4 h-4 w-3/4 animate-pulse rounded motion-reduce:animate-none" />
                <div className="bg-fern-50 mt-2 h-3 w-1/2 animate-pulse rounded motion-reduce:animate-none" />
              </CardShell>
            ))}
          </div>
        )}

        {roles !== null && roles.length === 0 && (
          <div className="border-rule mt-8 rounded-xl border border-dashed bg-white px-6 py-12 text-center">
            <p className="text-fern-900 font-cormorant text-[clamp(1.35rem,2.2vw,1.6rem)] font-semibold">
              {failed ? 'Roles could not be loaded' : 'No roles listed right now'}
            </p>
            <p className="text-sage mx-auto mt-2 max-w-[30rem] text-[0.9375rem] leading-relaxed">
              {failed
                ? 'Something went wrong at our end. The full list is still available.'
                : 'New farm roles appear here as employers join. If you are the one hiring, listing is free.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2">
              <TextLink to="/jobs">Browse all jobs</TextLink>
              {!failed && <TextLink to="/signup?role=employer">Post the first job</TextLink>}
            </div>
          </div>
        )}

        {roles !== null && roles.length > 0 && (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <li key={r.id}>
                <CardShell>
                  <Link to={`/jobs/${r.id}`} className="block">
                    <h3 className="text-bark text-[1.0625rem] leading-snug font-semibold">{r.title}</h3>
                    {r.employer_profiles?.farm_name && (
                      <p className="text-sage mt-1 text-[0.875rem]">
                        {r.employer_profiles.farm_name}
                      </p>
                    )}
                    <p className="text-sage mt-2 flex items-center gap-1.5 text-[0.875rem]">
                      <IconPin className="text-fern-600 h-4 w-4" />
                      {r.region}
                    </p>
                    {chips(r).length > 0 && (
                      <span className="mt-4 flex flex-wrap gap-2">
                        {chips(r).map((c) => (
                          <span
                            key={c}
                            className="bg-fern-50 text-fern-800 rounded-full px-2.5 py-1 text-[0.875rem] font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </CardShell>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
