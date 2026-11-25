import { useSearchParams } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'
import { readAttributionRef, signupHref } from '@/lib/attribution'
import { Container, Display, Btn, TextLink, IconPlate } from '@/components/landing/v12/V12Kit'
import { IconCheck, IconLeaf, IconShield, IconTag } from '@/components/landing/LandingIcons'

// Seeker half of ForEmployers: same v12 shape, same rules (no eyebrow labels,
// pills for actions, 1rem card radius, the one shadow), different copy. Built
// because outreach drives seekers here as well as employers, and the employer
// page's "Post a job" CTA was the wrong door for them. Copy is drawn from
// existing live wording only: the /jobs empty state ("Create a profile and
// we'll match you to roles the moment they land"), the homepage ("No agency
// in between"), and the employer page's verified-documents line, seeker-side.
// Nothing here promises a feature that does not exist yet.

const SEQUENCE = [
  {
    n: '01',
    h: 'Create your profile',
    p: 'Experience, roles, regions, housing needs. The things a farm hire actually turns on, not just a CV.',
  },
  {
    n: '02',
    h: 'Get matched as jobs land',
    p: 'New roles are scored against your profile, so the right ones reach you first instead of you scrolling every board.',
  },
  {
    n: '03',
    h: 'Apply, then hear back',
    p: 'Apply in a few taps. The farm sees your profile, your experience, and whether your documents are verified.',
  },
]

const INCLUDED: { icon: React.ReactNode; h: string; p: string }[] = [
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    h: 'Free for workers',
    p: 'Looking and applying costs nothing. Workers never pay.',
  },
  {
    icon: <IconLeaf className="h-[22px] w-[22px]" />,
    h: 'Matched as jobs land',
    p: 'Create a profile and we will match you to roles the moment they land.',
  },
  {
    icon: <IconShield className="h-[22px] w-[22px]" />,
    h: 'Documents already verified',
    p: 'Upload and verify your documents once, and farms see that status.',
  },
  {
    icon: <IconTag className="h-[22px] w-[22px]" />,
    h: 'No agency in between',
    p: 'Deal direct with the farm that posted the role.',
  },
]

export function ForSeekers() {
  usePageMeta(
    'For job seekers | TopFarms',
    'How finding farm work on TopFarms works: create a profile, get matched to new roles as they land, apply direct. Free for workers.',
  )

  // Carry `?ref=` through to the signup CTA: an outreach link that lands here
  // must not lose attribution on the way to /signup.
  const [searchParams] = useSearchParams()
  const attributionRef = readAttributionRef(searchParams)

  return (
    <PublicShell>
      {/* ── Hero ── */}
      {/* The comp grounds this in photography. No photography exists yet, and inventing an
          illustrated substitute is the exact failure being undone, so the ground stays
          clean until real imagery is supplied. */}
      <section className="border-border relative isolate overflow-hidden border-b bg-white">
        <Container className="relative py-20 text-center sm:py-24">
          <Display as="h1" className="mx-auto max-w-[18ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.06]">
            Find your next farm job.
          </Display>
          <p className="text-text/80 mx-auto mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">
            Create a profile and we will match you to roles the moment they land.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Btn to={signupHref('seeker', attributionRef)} size="lg">
              Create a profile
            </Btn>
            <Btn to="/jobs" variant="onScene" size="lg">
              Browse jobs
            </Btn>
          </div>
        </Container>
      </section>

      {/* ── How finding work works ── */}
      <section aria-labelledby="seq-h2" className="py-20 sm:py-24">
        <Container>
          <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
            <span id="seq-h2">How finding work works</span>
          </Display>
          <div className="mt-10 grid gap-9 md:grid-cols-3">
            {SEQUENCE.map((s) => (
              <div key={s.n}>
                <IconPlate className="font-semibold">{s.n}</IconPlate>
                <h3 className="text-brand-900 mt-4 text-[1.0625rem] leading-snug font-semibold">
                  {s.h}
                </h3>
                <p className="text-text-muted mt-2.5 max-w-[42ch] text-[0.9375rem] leading-relaxed">
                  {s.p}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── What a profile includes ── */}
      <section aria-labelledby="incl-h2" className="bg-surface py-20 sm:py-24">
        <Container>
          <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
            <span id="incl-h2">What a profile includes</span>
          </Display>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <div
                key={item.h}
                className="border-border rounded-16 border bg-white p-7 shadow-lg"
              >
                <IconPlate>{item.icon}</IconPlate>
                <h3 className="text-brand-900 mt-4 text-[1.0625rem] leading-snug font-semibold">
                  {item.h}
                </h3>
                <p className="text-text-muted mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed">
                  {item.p}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Close ── the V12Banner idiom: fern-100 panel, scene bleeding off its right edge. */}
      <Container className="py-20 sm:py-24">
        <div className="border-border relative isolate grid overflow-hidden rounded-16 border md:grid-cols-[1fr_1.1fr]">
          <div className="bg-brand-50 relative z-10 flex flex-col justify-center px-8 py-12 sm:px-11">
            <Display className="text-[clamp(1.6rem,3vw,2.1rem)] leading-[1.16]">
              Create a profile and we will match you to roles the moment they land.
            </Display>
            <p className="text-text-muted mt-4 max-w-[24rem] text-[1.0625rem] leading-relaxed">
              Free to look, free to apply.
            </p>
            <div className="mt-6">
              <TextLink to="/jobs">Browse jobs</TextLink>
            </div>
          </div>
          <div className="bg-brand-50 relative min-h-[13rem]" aria-hidden="true" />
        </div>
      </Container>
    </PublicShell>
  )
}
