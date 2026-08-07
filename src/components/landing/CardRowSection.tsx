import { Link } from 'react-router'

// v13 card row (comp section 2). Supersedes EmployerCTABand: the employer
// pitch collapses to one card, the worker side gets equal footing, and the
// fake dashboard mock is gone for good (directive 1.1: no simulated product
// UI outside the labelled example panel). Card links are intent actions with
// the canonical labels; no scoring re-advertisement (1.3).

function Tile({ k, n, lime }: { k: string; n: string; lime?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex h-[100px] w-[88px] flex-none flex-col justify-between overflow-hidden rounded-xl p-3 ${
        lime ? 'bg-lime text-green-2' : 'bg-green text-white'
      }`}
    >
      <span className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.06)_0_1px,transparent_1px_22px)]" />
      <span className="relative text-[11px] leading-tight font-semibold opacity-80">{k}</span>
      <span className="relative text-[32px] leading-none font-extrabold tracking-[-.04em]">{n}</span>
    </div>
  )
}

export function CardRowSection() {
  return (
    <section className="mx-auto mt-3.5 grid max-w-[1440px] gap-3.5 px-3 sm:px-5 md:grid-cols-2 lg:grid-cols-[1fr_1.12fr_1fr]">
      <div className="bg-card border-line flex items-start gap-4 rounded-3xl border p-6">
        <Tile k="Sorted to" n="3" />
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-bold tracking-[-.02em]">
            Employers find the right person faster
          </h3>
          <p className="text-ink-60 mt-1.5 max-w-[64ch] text-[13.5px]">
            Post the whole job, and the fit is scored before you read a single CV.
          </p>
          <Link
            to="/signup?role=employer"
            className="font-bricolage text-green hover:text-green-2 mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold tracking-[.08em] uppercase underline decoration-1 underline-offset-4 whitespace-nowrap"
          >
            I'm hiring&nbsp;&#8599;
          </Link>
        </div>
      </div>
      <div className="bg-card border-line flex flex-col justify-center rounded-3xl border p-7 text-center md:col-span-2 md:-order-1 lg:order-none lg:col-span-1">
        <h3 className="text-xl leading-snug font-bold tracking-[-.02em] lg:text-2xl">
          Every application scored across seven things that <i className="font-normal">actually decide a hire</i>
        </h3>
        <div className="text-ink-40 mt-4 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[12.5px] font-medium">
          <span>every listing free</span>
          <span>workers never pay</span>
        </div>
      </div>
      <div className="bg-card border-line flex items-start gap-4 rounded-3xl border p-6">
        <Tile k="Fee to you" n="$0" lime />
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-bold tracking-[-.02em]">
            Workers find the job that suits
          </h3>
          <p className="text-ink-60 mt-1.5 max-w-[64ch] text-[13.5px]">
            Housing, roster, couple-friendly, sector. Set it once, see how well each job fits.
          </p>
          <Link
            to="/signup?role=seeker"
            className="font-bricolage text-green hover:text-green-2 mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold tracking-[.08em] uppercase underline decoration-1 underline-offset-4 whitespace-nowrap"
          >
            I'm looking for work&nbsp;&#8599;
          </Link>
        </div>
      </div>
    </section>
  )
}
