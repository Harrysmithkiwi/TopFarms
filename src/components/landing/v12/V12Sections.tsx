import { Btn, Container, Display, IconPlate, TextLink } from './V12Kit'
import {
  IconArable,
  IconDairy,
  IconEmployer,
  IconForestry,
  IconHandshake,
  IconHorticulture,
  IconLeaf,
  IconMap,
  IconPin,
  IconSeeker,
  IconSheepBeef,
  IconTractor,
  IconViticulture,
} from '@/components/landing/LandingIcons'

// v14 landing sections (docs/design/MARKETING-DESIGN.md), in the order of the operator's
// 2026-08-24 comp "TopFarms landing page final draft.png". The comp's own move is the big
// one: the marketing surface adopts the PORTAL material (one green around #16A34A, Inter
// body, near-white canvas, Newsreader display), so the page a farmer lands on and the
// product they sign into are one world.
//
// Routes are real and were walked on live prod before this build:
//   Find work    -> /jobs
//   Post a job   -> /signup?role=employer  (pre-selects the employer role; verified
//                   2026-08-19, the email+password fields are already expanded on arrival)
//   Sign in      -> /login   (owned by the shell nav, not here)
// The comp's "Resources" and "About" nav items have no route and no content behind them;
// they are deliberately NOT rendered rather than shipped as dead links.
//
// ONE LABEL PER INTENT (taste 4.5 / vercel writing): the seeker action is "Find work"
// everywhere, the employer action is "Post a job" everywhere. "Hire staff" and "Browse
// jobs" are retired as labels; two names for one door reads as two doors.
//
// Where this build deviates from the comp, each with a reason:
//   - The comp's hero mock shows "Match 95%" badges on public job rows. Directive 1.4
//     (workers never see a numeric score) and the 2026-08-07 admin gate ruling (score is
//     a word, not a number) both bind; the preview uses word chips.
//   - The comp's macOS traffic-light dots and "129 jobs found" counter are dropped:
//     fake window chrome and a fake-precise number on a real product's landing page.
//   - The comp's eight-eyebrow rhythm is rationed to ONE eyebrow (the hero's), per the
//     eyebrow ceiling (taste 4.7) that v12 §5 already enforced on this surface.
//   - The comp's six-card "Why TopFarms" grid is folded into the feature strip: same
//     claims, one section fewer, no three-equal-cards row.
//
// NO ILLUSTRATION. The hand-drawn PastoralScene SVGs are deleted, not parked — twice now
// they have regenerated simply because the file existed and reuse is the default reflex.
// Where the comp shows PHOTOGRAPHY (hero ground, closing band) this build ships a clean
// ground and the gap is named, because inventing a substitute is exactly the failure. Where
// the comp shows PRODUCT UI (the two split cards) this build renders real product UI in the
// product's own tokens.

/* ============================ 1. HERO ============================ */

// Illustrative preview data. NZ-plausible but INVENTED farms — never real leads or real
// listings (real ones render two sections down, in LiveRoles). The whole preview is
// aria-hidden: it is a picture of the product, not content.
const PREVIEW_ROWS = [
  {
    icon: <IconDairy className="h-5 w-5" />,
    role: 'Herd manager',
    farm: 'Riverbend Dairy',
    region: 'Waikato',
    tags: ['Full-time', 'Accommodation'],
    match: 'Strong match',
  },
  {
    icon: <IconSheepBeef className="h-5 w-5" />,
    role: 'Shepherd',
    farm: 'Highfield Station',
    region: 'Canterbury',
    tags: ['Full-time'],
    match: 'Good match',
  },
  {
    icon: <IconViticulture className="h-5 w-5" />,
    role: 'Vineyard worker',
    farm: 'Awatere Vines',
    region: 'Marlborough',
    tags: ['Seasonal'],
    match: null,
  },
  {
    icon: <IconTractor className="h-5 w-5" />,
    role: 'Machinery operator',
    farm: 'Karamea Downs',
    region: 'West Coast',
    tags: ['Contract'],
    match: null,
  },
]

/**
 * Split hero, per the comp: copy left, product right. The preview is a real mini render
 * of the /jobs UI in the product's own tokens — the honest version of a screenshot,
 * because marketing and product now share one design system so the preview IS the
 * product's styling, not an artist's impression of it.
 */
export function V12Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <Container className="grid items-center gap-10 pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:pb-20">
        <div className="lg:col-span-5">
          {/* The page's ONE eyebrow, and it is plain text: the pill, tint, border and icon
              were four pieces of chrome carrying one short line. */}
          <span className="text-sage block text-xs font-semibold tracking-[0.14em] uppercase">
            NZ agricultural recruitment
          </span>
          <Display
            as="h1"
            className="mt-5 text-[clamp(2.4rem,4.2vw,3.25rem)] leading-[1.12] tracking-[-0.02em]"
          >
            <span className="block">The right people.</span>
            <span className="text-sage block pb-1 italic">The right farm.</span>
          </Display>
          <p className="text-sage mt-5 max-w-[27rem] text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
            TopFarms connects agricultural employers with people looking for their next
            opportunity across New Zealand.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Btn to="/jobs" size="lg">
              Find work
            </Btn>
            <Btn to="/signup?role=employer" variant="outline" size="lg">
              Post a job
            </Btn>
          </div>
        </div>

        <div className="lg:col-span-7" aria-hidden="true">
          <div className="border-rule rounded-2xl border bg-white p-4 shadow-[0_10px_34px_rgba(11,31,16,0.05)] sm:p-5">
            <div className="border-rule flex items-center justify-between border-b pb-3.5">
              <span className="bg-paper border-rule text-sage rounded-md border px-2.5 py-1 text-xs font-medium">
                topfarms.co.nz/jobs
              </span>
              <span className="text-sage text-xs font-medium">Newest first</span>
            </div>
            <div className="grid gap-3.5 pt-4 md:grid-cols-12">
              {/* Filter rail — static, illustrative */}
              <div className="bg-paper/70 border-rule hidden space-y-3 rounded-xl border p-3 text-xs md:col-span-4 md:block">
                <div>
                  <span className="text-bark block font-semibold">Search jobs</span>
                  <span className="border-rule text-sage mt-1 block rounded-lg border bg-white px-2.5 py-1.5">
                    Dairy, shepherd, fencing
                  </span>
                </div>
                <div>
                  <span className="text-bark block font-semibold">Region</span>
                  <span className="border-rule text-sage mt-1 block rounded-lg border bg-white px-2.5 py-1.5">
                    All of New Zealand
                  </span>
                </div>
                <div>
                  <span className="text-bark block font-semibold">Sector</span>
                  <div className="text-sage mt-1 space-y-1">
                    <span className="flex items-center gap-1.5">
                      <span className="bg-fern-600 h-3 w-3 rounded-sm" /> Dairy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="bg-fern-600 h-3 w-3 rounded-sm" /> Sheep &amp; beef
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="border-rule h-3 w-3 rounded-sm border bg-white" /> Horticulture
                    </span>
                  </div>
                </div>
              </div>
              {/* Result rows */}
              <div className="space-y-2.5 md:col-span-8">
                {PREVIEW_ROWS.map((r) => (
                  <div
                    key={r.role}
                    className="border-rule flex items-start justify-between gap-3 rounded-xl border bg-white p-3.5"
                  >
                    <div className="flex gap-3">
                      <span className="bg-fern-50 text-fern-700 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                        {r.icon}
                      </span>
                      <div>
                        <span className="text-bark block text-sm font-semibold">{r.role}</span>
                        <span className="text-sage flex items-center gap-1 text-xs">
                          <IconPin className="h-3 w-3" />
                          {r.farm}, {r.region}
                        </span>
                        <span className="mt-1.5 flex gap-1.5">
                          {r.tags.map((t) => (
                            <span
                              key={t}
                              className="bg-paper border-rule text-sage rounded-full border px-2 py-0.5 text-[11px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    {r.match && (
                      <span className="bg-fern-100 text-fern-800 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                        {r.match}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

/* ======================= 2. FEATURE STRIP ======================= */

// The comp's under-hero strip carries the product's four honest claims. This section
// absorbed the old "Why TopFarms" grid: same claims, one section fewer.
const STRIP = [
  { icon: <IconMap className="h-5 w-5" />, label: 'New Zealand only' },
  { icon: <IconLeaf className="h-5 w-5" />, label: 'Every listing free' },
  { icon: <IconHandshake className="h-5 w-5" />, label: 'No agency in between' },
  { icon: <IconTractor className="h-5 w-5" />, label: 'Built for agriculture' },
]

export function V14FeatureStrip() {
  return (
    <section className="border-rule border-y py-5">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {STRIP.map((s) => (
            <li key={s.label} className="flex items-center justify-center gap-2.5 md:justify-start">
              <span className="text-fern-600 shrink-0">{s.icon}</span>
              <span className="text-bark text-sm font-medium">{s.label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ==================== 4. BUILT FOR AGRICULTURE ==================== */

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
    // pt matters now: the feature strip above is a hairline band, not a scene, so this
    // section supplies its own top space instead of inheriting it.
    <section className="pt-20 pb-20 sm:pt-24 sm:pb-24">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
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
                <h3 className="text-fern-900 mt-4 text-[1.0625rem] font-semibold text-balance">{f.h}</h3>
                <p className="text-sage mt-2 text-[0.875rem] leading-relaxed">{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

/* ================= 5. THE FORK (the only one) ================= */

/**
 * Compact previews of the two dashboards, in the product's own tokens. The comp puts a
 * screenshot in each of these cards; because marketing and product now share one design
 * system, rendering the real UI small IS the screenshot, and it can never drift out of
 * date the way a pasted PNG does. Invented but NZ-plausible rows, never real farms.
 */
function EmployerPreview() {
  const rows = [
    { role: 'Herd manager', meta: '12 applicants', state: 'Live' },
    { role: 'Shepherd', meta: '6 applicants', state: 'Live' },
  ]
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-bark text-xs font-semibold">Open roles</span>
        <span className="text-fern-700 text-[11px] font-semibold">View all</span>
      </div>
      {rows.map((r) => (
        <div key={r.role} className="border-rule flex items-center justify-between rounded-lg border bg-white px-3 py-2">
          <span>
            <span className="text-bark block text-xs font-semibold">{r.role}</span>
            <span className="text-sage text-[11px]">{r.meta}</span>
          </span>
          <span className="bg-fern-100 text-fern-800 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {r.state}
          </span>
        </div>
      ))}
      <div className="border-rule rounded-lg border bg-white px-3 py-2">
        <span className="text-bark block text-xs font-semibold">Recent applicants</span>
        <span className="text-sage mt-1 flex items-center gap-1.5 text-[11px]">
          <span className="bg-fern-600 h-4 w-4 shrink-0 rounded-full" />
          <span className="bg-fern-500 h-4 w-4 shrink-0 rounded-full" />
          <span className="bg-fern-lite h-4 w-4 shrink-0 rounded-full" />
          3 shortlisted, 2 interviewing
        </span>
      </div>
    </div>
  )
}

function SeekerPreview() {
  const rows = [
    { role: 'Dairy farm assistant', meta: 'Greenfield Dairy, Waikato' },
    { role: 'Farm hand', meta: 'Riverbend Pastoral, Canterbury' },
  ]
  return (
    <div className="space-y-2.5">
      <span className="text-bark block text-xs font-semibold">Recommended for you</span>
      {rows.map((r) => (
        <div key={r.role} className="border-rule flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2">
          <span className="bg-fern-50 text-fern-700 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            <IconPin className="h-3.5 w-3.5" />
          </span>
          <span>
            <span className="text-bark block text-xs font-semibold">{r.role}</span>
            <span className="text-sage text-[11px]">{r.meta}</span>
          </span>
        </div>
      ))}
      <div className="border-rule rounded-lg border bg-white px-3 py-2.5">
        <span className="text-sage flex items-center justify-between text-[11px] font-medium">
          Profile strength <span className="text-fern-800 font-semibold">Strong</span>
        </span>
        <span className="bg-fern-100 mt-1.5 block h-1.5 w-full overflow-hidden rounded-full">
          <span className="bg-fern-600 block h-full w-4/5 rounded-full" />
        </span>
      </div>
    </div>
  )
}

const SPLIT = [
  {
    icon: <IconEmployer className="h-[22px] w-[22px]" />,
    h: 'Find the people your farm needs.',
    p: 'Post a role, reach the right workers, and hire with confidence.',
    cta: 'Post a job',
    to: '/signup?role=employer',
    preview: <EmployerPreview />,
  },
  {
    icon: <IconSeeker className="h-[22px] w-[22px]" />,
    h: 'Find work that fits your life.',
    p: 'Search roles, build a profile once, and apply directly.',
    cta: 'Find work',
    to: '/jobs',
    preview: <SeekerPreview />,
  },
]

/**
 * The two-audience fork, stated ONCE. It previously appeared twice on this page in two
 * different card layouts saying the same thing; the version that survived is the one
 * carrying real product UI, and it inherits the other's headline.
 */
export function V12SplitCards() {
  return (
    <Container className="pb-20 sm:pb-24">
      <Display className="text-center text-[clamp(1.8rem,3.4vw,2.4rem)]">
        Two sides of the farming workforce.
      </Display>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {SPLIT.map((c) => (
          <div
            key={c.h}
            className="border-rule grid overflow-hidden rounded-2xl border bg-white sm:grid-cols-2"
          >
            <div className="flex flex-col justify-center p-8">
              <IconPlate className="mb-4">{c.icon}</IconPlate>
              <h3 className="text-fern-900 text-[1.1875rem] leading-snug font-semibold">{c.h}</h3>
              <p className="text-sage mt-2.5 text-[0.9375rem] leading-relaxed">{c.p}</p>
              <div className="mt-5">
                <Btn to={c.to}>{c.cta}</Btn>
              </div>
            </div>
            <div className="bg-paper border-rule flex flex-col justify-center border-t p-5 sm:border-t-0 sm:border-l" aria-hidden="true">
              {c.preview}
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

/* ========================== 9. THE CLOSE ========================== */

export function V12Close() {
  return (
    <Container className="pb-20 sm:pb-24">
      {/* No panel and no ground treatment. The close is type and two actions on the page's
          own canvas, separated by a hairline. */}
      <div className="border-rule border-t">
        <div className="px-6 py-16 text-center sm:py-20">
          <Display className="text-[clamp(1.8rem,3.4vw,2.4rem)]">Ready for what&rsquo;s next?</Display>
          <p className="text-bark/80 mx-auto mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed">
            Whether you&rsquo;re looking for your next role or the people your farm needs,
            TopFarms makes it easier to connect.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Btn to="/jobs" size="lg">
              Find work
            </Btn>
            <Btn to="/signup?role=employer" variant="outline" size="lg">
              Post a job
            </Btn>
          </div>
        </div>
      </div>
    </Container>
  )
}
