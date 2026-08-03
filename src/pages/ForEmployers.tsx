import { Link } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'

// v13 port, stage 3a (directive 1.17d). The route SURVIVES (inbound links, the
// sitemap entry, and the nav's employer-lens destination; 1.14 forbids changing
// IA for SEO reasons) but its job NARROWS. The old page was a second landing
// page: "Find skilled farm workers, faster" plus a benefits list plus "Ready to
// hire?", all of which the ported landing page's employer lens now carries.
// This is now "what happens after you post": the posting sequence, what a
// listing includes, and where pricing lives.
//
// Dropped with the old page: "AI-matched candidates delivered to your dashboard"
// (re-advertises the mechanic, directive 1.3) and the feature-icon grid.

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

const INCLUDED: [string, string][] = [
  ['30 days live', 'Renew or repost at any time from your dashboard.'],
  [
    'Scored applicants throughout',
    'Not a one-off ranking at close: the list stays ordered as people apply.',
  ],
  ['Your first listing free', 'One per account, no card required.'],
  [
    'Documents already verified',
    'Where an applicant has uploaded and verified documents, you see that status.',
  ],
]

export function ForEmployers() {
  usePageMeta(
    'For employers | TopFarms',
    'How posting a farm job on TopFarms works: post the whole job, applicants arrive scored with reasons, you decide who to ring. First listing free.',
  )

  return (
    <PublicShell>
      <section className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5">
        <div className="v13-dark bg-green relative overflow-hidden rounded-3xl px-7 py-12 text-white md:px-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
          />
          <div className="relative">
            <p className="text-lime font-bricolage text-xs font-semibold tracking-[.08em] uppercase">
              For employers
            </p>
            <h1 className="mt-5 max-w-[18ch] text-4xl leading-[.95] font-extrabold tracking-[-.04em] md:text-6xl">
              What happens after you post.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[17px] text-white/82">
              Three steps, and the list stays yours the whole way through.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                to="/signup?role=employer"
                className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
              >
                I'm hiring
              </Link>
              <Link
                to="/pricing"
                className="hover:text-lime inline-flex min-h-11 items-center px-2.5 text-[15px] font-semibold text-white underline decoration-[1.5px] underline-offset-4 transition-colors"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="seq-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5">
        <div className="bg-card border-line rounded-3xl border px-7 py-8 md:px-11 md:pb-10">
          <h2 id="seq-h2" className="text-2xl font-extrabold tracking-[-.03em] md:text-[30px]">
            How posting works
          </h2>
          <div className="mt-6 grid gap-7 md:grid-cols-3">
            {SEQUENCE.map((s) => (
              <div key={s.n} className="border-ink border-t-2 pt-3.5">
                <p className="text-ochre-ink text-sm font-extrabold tracking-[.02em]">{s.n}</p>
                <h3 className="mt-2.5 text-[17px] font-bold tracking-[-.02em]">{s.h}</h3>
                <p className="text-ink-60 mt-1.5 max-w-[60ch] text-[13.5px]">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="incl-h2" className="mx-auto max-w-[1440px] px-3 pt-3.5 sm:px-5">
        <div className="bg-card border-line rounded-3xl border px-7 py-9 md:px-11">
          <h2 id="incl-h2" className="text-2xl font-extrabold tracking-[-.03em] md:text-[30px]">
            What a listing includes
          </h2>
          <div className="mt-6 grid gap-x-11 gap-y-7 md:grid-cols-2">
            {INCLUDED.map(([h, p]) => (
              <div key={h}>
                <h3 className="text-[16px] font-bold tracking-[-.02em]">{h}</h3>
                <p className="text-ink-60 mt-1.5 max-w-[60ch] text-[14px]">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-3 pt-14 pb-4 sm:px-5">
        <div className="bg-green-3 flex flex-wrap items-center justify-between gap-6 rounded-3xl px-7 py-9 text-white md:px-11">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-[-.04em]">
              First listing free. Workers never pay.
            </h2>
            <p className="mt-2 text-[15px] font-medium text-white/82">
              Prices published, no calls, no quotes.
            </p>
          </div>
          <Link
            to="/pricing"
            className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
          >
            See pricing
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
