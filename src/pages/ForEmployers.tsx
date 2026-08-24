import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'
import { Container, Display, Btn, TextLink, IconPlate } from '@/components/landing/v12/V12Kit'
import { PastoralBand } from '@/components/landing/PastoralScene'
import { IconCheck, IconLeaf, IconShield, IconTag } from '@/components/landing/LandingIcons'

// v12 port (docs/design/v12-DIRECTIVE.md §0 scope line: this route was explicitly left on
// v13 when Home landed, so "See pricing" from the new landing dropped the visitor into the
// old world mid-journey). The route, the IA and every sentence of copy are UNCHANGED — this
// is a costume change, not a rewrite. What the page says is still the v13 port's narrowing
// (directive 1.17d): not a second landing page, but "what happens after you post".
//
// Three v12 rules bite here and are worth naming, because each removes something the v13
// page had:
//
//   §5 NO EYEBROW LABELS — the "For employers" kicker above the h1 is dropped. It is the one
//      piece of text that goes, and it goes because the directive bans the device on this
//      surface, not because the words were wrong; the h1 and the page title still say it.
//   v11 §1.6-1.8, retired — no dark green panel, no repeating-gradient grille, no bar
//      treatment. The sequence numerals survive in a different role: they are step ORDER,
//      which is semantic, so they sit inside the v12 IconPlate rather than as the display
//      device 1.8 retired.
//   §2 FORM — pills for every action, 1rem card radius, the one shadow. No second button
//      shape is introduced; if one were needed that would be a gap in V12Kit, not an
//      exception to it.
//
// The scene work is deliberately quieter than Home's. PastoralHero is full-bleed and owns a
// first viewport; an interior page that opens with the same weight competes with the landing
// page it was reached from. PastoralBand behind a white wash gives the page its ground
// without restating the argument.

const SEQUENCE = [
  {
    n: '01',
    h: 'Post the whole job',
    p: 'Job type, roster, stock class, visa type, housing, location and pay. The things a farm hire actually turns on, not just a title and a region.',
  },
  {
    n: '02',
    h: 'Applicants arrive scored',
    p: 'Every applicant is scored against the job you posted, with the reason for each one written in plain language. Every applicant stays on the list.',
  },
  {
    n: '03',
    h: 'You decide who to ring',
    p: 'Open the strongest fits first. Shortlist to unlock contact details and CV. Nothing is auto-rejected on your behalf.',
  },
]

const INCLUDED: { icon: React.ReactNode; h: string; p: string }[] = [
  {
    icon: <IconTag className="h-[22px] w-[22px]" />,
    h: '30 days live',
    p: 'Renew or repost at any time from your dashboard.',
  },
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    h: 'Scored applicants throughout',
    p: 'Not a one-off ranking at close: the list stays ordered as people apply.',
  },
  {
    icon: <IconLeaf className="h-[22px] w-[22px]" />,
    h: 'Every listing free',
    p: 'Post as many roles as you like. No card required.',
  },
  {
    icon: <IconShield className="h-[22px] w-[22px]" />,
    h: 'Documents already verified',
    p: 'Where an applicant has uploaded and verified documents, you see that status.',
  },
]

export function ForEmployers() {
  usePageMeta(
    'For employers | TopFarms',
    'How posting a farm job on TopFarms works: post the whole job, applicants arrive scored with reasons, you decide who to ring. Every listing free.',
  )

  return (
    <PublicShell>
      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden">
        <PastoralBand className="absolute inset-0 h-full w-full" />
        {/* The wash, not a haze on the scene itself: v12 §3 records that a 0.55 haze plus a
            white top wash bleached the ranges into the sky on the first build. A flat overlay
            above the finished scene keeps its internal contrast intact. */}
        <div className="absolute inset-0 bg-white/45" aria-hidden="true" />
        <Container className="relative py-20 text-center sm:py-24">
          <Display as="h1" className="mx-auto max-w-[18ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.06]">
            What happens after you post.
          </Display>
          <p className="text-bark/80 mx-auto mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">
            Three steps, and the list stays yours the whole way through.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Btn to="/signup?role=employer" size="lg">
              Post a job
            </Btn>
            <Btn to="/pricing" variant="onScene" size="lg">
              See pricing
            </Btn>
          </div>
        </Container>
      </section>

      {/* ── How posting works ── */}
      <section aria-labelledby="seq-h2" className="py-20 sm:py-24">
        <Container>
          <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
            <span id="seq-h2">How posting works</span>
          </Display>
          <div className="mt-10 grid gap-9 md:grid-cols-3">
            {SEQUENCE.map((s) => (
              <div key={s.n}>
                <IconPlate className="font-semibold">{s.n}</IconPlate>
                <h3 className="text-fern-900 mt-4 text-[1.0625rem] leading-snug font-semibold">
                  {s.h}
                </h3>
                <p className="text-sage mt-2.5 max-w-[42ch] text-[0.9375rem] leading-relaxed">
                  {s.p}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── What a listing includes ── */}
      <section aria-labelledby="incl-h2" className="bg-linen py-20 sm:py-24">
        <Container>
          <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
            <span id="incl-h2">What a listing includes</span>
          </Display>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <div
                key={item.h}
                className="border-rule rounded-2xl border bg-white p-7 shadow-[0_4px_24px_rgba(26,60,42,0.08)]"
              >
                <IconPlate>{item.icon}</IconPlate>
                <h3 className="text-fern-900 mt-4 text-[1.0625rem] leading-snug font-semibold">
                  {item.h}
                </h3>
                <p className="text-sage mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed">
                  {item.p}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Close ── the V12Banner idiom: fern-100 panel, scene bleeding off its right edge. */}
      <Container className="py-20 sm:py-24">
        <div className="border-rule relative isolate grid overflow-hidden rounded-2xl border md:grid-cols-[1fr_1.1fr]">
          <div className="bg-fern-100 relative z-10 flex flex-col justify-center px-8 py-12 sm:px-11">
            <Display className="text-[clamp(1.6rem,3vw,2.1rem)] leading-[1.16]">
              Every listing free. Workers never pay.
            </Display>
            <p className="text-sage mt-4 max-w-[24rem] text-[1.0625rem] leading-relaxed">
              Prices published, no calls, no quotes.
            </p>
            <div className="mt-6">
              <TextLink to="/pricing">See pricing</TextLink>
            </div>
          </div>
          <div className="relative min-h-[13rem]">
            <PastoralBand className="absolute inset-0 h-full w-full" />
            <div
              aria-hidden="true"
              className="from-fern-100 absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r to-transparent md:block"
            />
          </div>
        </div>
      </Container>
    </PublicShell>
  )
}
