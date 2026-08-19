import { Btn, Container, Display, IconPlate, TextLink } from './V12Kit'
import { PastoralBand, PastoralHero, PastoralVignette } from '@/components/landing/PastoralScene'
import {
  IconArable,
  IconCheck,
  IconDairy,
  IconEmployer,
  IconForestry,
  IconHandshake,
  IconHorticulture,
  IconLeaf,
  IconLock,
  IconMap,
  IconSeeker,
  IconSheepBeef,
  IconShield,
  IconTractor,
  IconViticulture,
} from '@/components/landing/LandingIcons'

// v12 landing sections, in the approved comp's order.
//
// Routes are real and were walked on live prod before this build:
//   Find Work / Browse jobs      -> /jobs
//   Hire Staff / Post a job      -> /signup?role=employer  (pre-selects the employer role;
//                                   verified 2026-08-19, the email+password fields are
//                                   already expanded on arrival)
//   See pricing                  -> /pricing
//   Sign in                      -> /login   (owned by the shell's utility bar, not here)
// The comp's "Resources" and "About" nav items have no route and no content behind them;
// they are deliberately NOT rendered rather than shipped as dead links.

/* ============================ 1. HERO ============================ */

/**
 * Full-bleed illustration with the headline centred over the sky.
 *
 * The scene's top third is deliberately the quietest part of the drawing — that is where the
 * type lands, and fern-900 on the pale sky measures well past AA. The headline does not sit
 * in a card or a scrim, because the comp's whole idea is that the words are IN the landscape.
 */
export function V12Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <PastoralHero className="absolute inset-0 h-full w-full" />
      <Container className="relative pt-20 pb-44 sm:pt-24 sm:pb-56 lg:pb-64">
        <div className="mx-auto max-w-[46rem] text-center">
          <Display as="h1" className="text-[clamp(2.7rem,6.2vw,4.6rem)] leading-[1.04]">
            <span className="block">The right people.</span>
            <span className="block">The right farm.</span>
          </Display>
          <p className="mx-auto mt-5 max-w-[30rem] text-[1.0625rem] leading-relaxed text-bark/80 sm:text-[1.1875rem]">
            TopFarms connects agricultural employers with people looking for their next
            opportunity across New Zealand.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Btn to="/jobs" size="lg">
              Find work
            </Btn>
            <Btn to="/signup?role=employer" variant="onScene" size="lg">
              Hire staff
            </Btn>
          </div>
          <div className="mt-5">
            <TextLink to="/jobs">Browse jobs</TextLink>
          </div>
        </div>
      </Container>
    </section>
  )
}

/* ==================== 2. THE TWO-AUDIENCE FORK ==================== */

const AUDIENCE = [
  {
    icon: <IconSeeker className="h-[22px] w-[22px]" />,
    title: 'Looking for work?',
    body: 'Discover farm jobs that fit your skills, your experience and the life you want.',
    cta: 'Browse jobs',
    to: '/jobs',
    art: 'paddock' as const,
  },
  {
    icon: <IconEmployer className="h-[22px] w-[22px]" />,
    title: 'Looking for people?',
    body: 'Post a role and reach people who already do this work. Listing is free.',
    cta: 'Post a job',
    to: '/signup?role=employer',
    art: 'gate' as const,
  },
]

/**
 * The fork, riding up over the hero on the negative margin the comp specifies. This is the
 * page's most important decision point: a visitor is one of exactly two people, and the page
 * asks which before it says anything else.
 */
export function V12AudienceCards() {
  return (
    <section className="relative z-10 -mt-24 sm:-mt-28">
      <Container>
        <div className="grid gap-6 md:grid-cols-2">
          {AUDIENCE.map((c) => (
            <div
              key={c.title}
              className="border-rule relative isolate min-h-[10rem] overflow-hidden rounded-2xl border bg-white shadow-[0_4px_24px_rgba(26,60,42,0.08)]"
            >
              <PastoralVignette
                variant={c.art}
                className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[46%] sm:block"
              />
              {/* The comp fades the art into the card rather than butting it against the copy. */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] bg-gradient-to-r from-white via-white/85 to-transparent sm:block"
                aria-hidden="true"
              />
              <div className="relative flex gap-5 p-7">
                <IconPlate>{c.icon}</IconPlate>
                <div className="sm:max-w-[58%]">
                  <h2 className="text-fern-900 text-[1.1875rem] font-semibold">{c.title}</h2>
                  <p className="text-sage mt-2 text-[0.9375rem] leading-relaxed">{c.body}</p>
                  <TextLink to={c.to} className="mt-4">
                    {c.cta}
                  </TextLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ==================== 3. BUILT FOR AGRICULTURE ==================== */

const BUILT = [
  {
    icon: <IconLeaf className="h-7 w-7" />,
    h: 'Built for the farm',
    p: 'Roster, stock class, shed type, housing. The things a farm hire actually turns on.',
  },
  {
    icon: <IconEmployer className="h-7 w-7" />,
    h: 'Built for people',
    p: 'Profiles that show more than a CV, in the words the work is actually described in.',
  },
  {
    icon: <IconHandshake className="h-7 w-7" />,
    h: 'Built for connection',
    p: 'You deal with the person directly. No agency sitting between you and the hire.',
  },
]

export function V12Recruitment() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <Display className="text-[clamp(2rem,4vw,2.8rem)] leading-[1.12]">
              Recruitment
              <br />
              built for agriculture.
            </Display>
            <p className="text-sage mt-5 max-w-[26rem] text-[1.0625rem] leading-relaxed">
              TopFarms is designed around the way farms and growers actually work. Practical,
              specific, and focused on the details that decide a hire.
            </p>
            <TextLink to="/for-employers" className="mt-6">
              Learn more about TopFarms
            </TextLink>
          </div>
          <div className="grid gap-9 sm:grid-cols-3">
            {BUILT.map((f) => (
              <div key={f.h}>
                <span className="text-fern-600 block">{f.icon}</span>
                <h3 className="text-fern-900 mt-4 text-[1.0625rem] font-semibold">{f.h}</h3>
                <p className="text-sage mt-2 text-[0.875rem] leading-relaxed">{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

/* ========================= 5. THE BANNER ========================= */

export function V12Banner() {
  return (
    <Container className="pb-20 sm:pb-24">
      <div className="border-rule relative isolate grid overflow-hidden rounded-2xl border md:grid-cols-[1fr_1.1fr]">
        <div className="bg-fern-100 relative z-10 flex flex-col justify-center px-8 py-12 sm:px-11">
          <Display className="text-[clamp(1.8rem,3.4vw,2.4rem)] leading-[1.16]">
            Good people
            <br />
            make good farms.
          </Display>
          <p className="text-sage mt-4 max-w-[24rem] text-[1.0625rem] leading-relaxed">
            Whether you are looking for your next role or the person who becomes part of your
            team, TopFarms makes that easier to find.
          </p>
        </div>
        <div className="relative min-h-[13rem]">
          <PastoralBand className="absolute inset-0 h-full w-full" />
          {/* left-edge feather into the pale green panel, mirrored for RTL safety */}
          <div
            className="from-fern-100 absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r to-transparent md:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </Container>
  )
}

/* ======================= 6. THE SPLIT CARDS ======================= */

const SPLIT = [
  {
    icon: <IconEmployer className="h-[22px] w-[22px]" />,
    h: 'Find the people your farm needs.',
    p: 'Post a role, reach the right workers, and hire with confidence.',
    cta: 'Hire staff',
    to: '/signup?role=employer',
    art: 'shed' as const,
  },
  {
    icon: <IconSeeker className="h-[22px] w-[22px]" />,
    h: 'Find work that fits your life.',
    p: 'Search roles, build a profile once, and apply directly.',
    cta: 'Find work',
    to: '/jobs',
    art: 'track' as const,
  },
]

export function V12SplitCards() {
  return (
    <Container className="pb-20 sm:pb-24">
      <div className="grid gap-6 md:grid-cols-2">
        {SPLIT.map((c) => (
          <div
            key={c.h}
            className="border-rule grid overflow-hidden rounded-2xl border bg-white shadow-[0_4px_24px_rgba(26,60,42,0.08)] sm:grid-cols-2"
          >
            <div className="flex flex-col justify-center p-8">
              <IconPlate className="mb-4">{c.icon}</IconPlate>
              <h3 className="text-fern-900 text-[1.1875rem] leading-snug font-semibold">{c.h}</h3>
              <p className="text-sage mt-2.5 text-[0.9375rem] leading-relaxed">{c.p}</p>
              <div className="mt-5">
                <Btn to={c.to}>{c.cta}</Btn>
              </div>
            </div>
            <div className="relative min-h-[9rem]">
              <PastoralVignette variant={c.art} className="absolute inset-0 h-full w-full" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

/* ========================== 7. SECTORS ========================== */

const SECTORS = [
  { icon: <IconDairy className="h-7 w-7" />, label: 'Dairy' },
  { icon: <IconSheepBeef className="h-7 w-7" />, label: 'Sheep & beef' },
  { icon: <IconHorticulture className="h-7 w-7" />, label: 'Horticulture' },
  { icon: <IconViticulture className="h-7 w-7" />, label: 'Viticulture' },
  { icon: <IconArable className="h-7 w-7" />, label: 'Arable' },
  { icon: <IconForestry className="h-7 w-7" />, label: 'Forestry' },
]

export function V12Sectors() {
  return (
    <section className="pb-16 text-center sm:pb-20">
      <Container>
        <Display className="text-[clamp(1.5rem,2.6vw,1.9rem)]">Roles across every sector</Display>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-9">
          {SECTORS.map((s) => (
            <li key={s.label} className="flex w-24 flex-col items-center gap-2.5">
              <span className="bg-fern-50 text-fern-700 flex h-14 w-14 items-center justify-center rounded-full">
                {s.icon}
              </span>
              <span className="text-fern-800 text-[0.875rem] font-medium">{s.label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ======================== 8. WHY TOPFARMS ======================== */

// Every line below is a claim the product can actually meet. The comp's original sixth item
// read "Free first job listing", which UNDERSTATES and contradicts the pricing model shipped
// on 2026-08-04: every listing is free, always, and the fee is a one-off on hire. A landing
// page that promises less than the product delivers is still a landing page that is wrong.
const WHY = [
  { icon: <IconShield className="h-[22px] w-[22px]" />, label: 'Verified employers' },
  { icon: <IconMap className="h-[22px] w-[22px]" />, label: 'New Zealand only' },
  { icon: <IconLock className="h-[22px] w-[22px]" />, label: 'Secure applications' },
  { icon: <IconTractor className="h-[22px] w-[22px]" />, label: 'Agriculture specific' },
  { icon: <IconCheck className="h-[22px] w-[22px]" />, label: 'Applicants arrive scored' },
  { icon: <IconLeaf className="h-[22px] w-[22px]" />, label: 'Every listing free' },
]

export function V12Why() {
  return (
    <section className="pb-20 text-center sm:pb-24">
      <Container>
        <Display className="text-[clamp(1.5rem,2.6vw,1.9rem)]">Why choose TopFarms?</Display>
        <ul className="mt-9 flex flex-wrap justify-center gap-x-10 gap-y-6">
          {WHY.map((w) => (
            <li key={w.label} className="text-bark/85 flex items-center gap-2.5 text-[0.9375rem] font-medium">
              <span className="text-fern-600">{w.icon}</span>
              {w.label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ========================== 9. THE CLOSE ========================== */

export function V12Close() {
  return (
    <Container className="pb-20 sm:pb-24">
      <div className="relative isolate overflow-hidden rounded-2xl">
        <PastoralBand className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-white/45" aria-hidden="true" />
        <div className="relative px-6 py-14 text-center sm:py-16">
          <Display className="text-[clamp(1.8rem,3.4vw,2.4rem)]">Ready for what&rsquo;s next?</Display>
          <div className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Btn to="/jobs" size="lg">
              Find work
            </Btn>
            <Btn to="/signup?role=employer" variant="onScene" size="lg">
              Hire staff
            </Btn>
          </div>
        </div>
      </div>
    </Container>
  )
}
