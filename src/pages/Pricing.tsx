import { Link } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'

// v13 port, stage 3a (directive 1.12, 1.17c). ONE route, audience-switched view:
// two routes would split the SEO signal for the term the business most wants to
// own, and contradict 1.14's rejection of audience-as-URL-segment. Employer view
// is the CSS default so the page is correct without JS; the seeker view uses the
// same .emp-only / .seek-only mechanism as the hero.
// Numbers and mechanics are UNCHANGED from the live page: 100 / 150 / 200,
// placement 200 to 800, first listing free, one free listing per account.

const tiers = [
  {
    name: 'First listing',
    price: 'Free',
    period: 'one per account',
    description: 'Your first job, listed and match-scored. No card required.',
    highlight: false,
    features: ['Listed in search results', '30-day listing', 'Scored applicants', 'Email applications'],
  },
  {
    name: 'Standard',
    price: '$100',
    period: 'per listing',
    description: 'Everything you need to attract quality candidates.',
    highlight: false,
    features: ['Listed in search results', '30-day listing', 'Up to 5 photos', 'Basic analytics'],
  },
  {
    name: 'Featured',
    price: '$150',
    period: 'per listing',
    description: 'Priority placement in search and sector pages.',
    highlight: true,
    features: [
      'Everything in Standard',
      'Highlighted in search results',
      'Featured badge on listing',
      'Detailed analytics',
    ],
  },
  {
    name: 'Premium',
    price: '$200',
    period: 'per listing',
    description: 'Maximum visibility for roles you need to fill fast.',
    highlight: false,
    features: [
      'Everything in Featured',
      'Top of search results',
      'Longer run, refreshed listing date',
      'Dedicated support',
    ],
  },
  {
    name: 'Placement',
    price: '$200-800',
    period: 'per hire, by role',
    description: 'We shortlist and check, you interview. Priced up front.',
    highlight: false,
    features: [
      'Shortlisting and reference checks',
      'Priced by salary band',
      'Invoiced Net-14 on confirmed hire',
      'Free until you shortlist',
    ],
  },
]

const faqs = [
  {
    q: 'Is my first listing really free?',
    a: 'Yes. Your very first job listing is free regardless of which tier you choose. No credit card required until your second listing. The free listing is one per account (deleting a job does not restore it).',
  },
  {
    q: 'Is there a fee when I hire someone?',
    a: 'Yes. A one-off placement fee of $200, $400 or $800 NZD based on the role’s salary band and seniority. You accept it when you shortlist a candidate (which unlocks their contact details and CV), and it is invoiced on Net-14 terms when you confirm the hire. Until you shortlist, you see their full profile, match breakdown and summary free.',
  },
  {
    q: 'How long does a listing stay active?',
    a: 'All listings are active for 30 days. You can renew or repost at any time from your dashboard.',
  },
  {
    q: 'Can I upgrade my listing tier after posting?',
    a: 'Yes. You can upgrade a live listing to a higher tier at any time and pay only the difference.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Stripe. All prices are in NZD.',
  },
  {
    q: 'Is there a subscription or contract?',
    a: 'No subscriptions, no contracts. You pay per listing, only when you post.',
  },
]

export function Pricing() {
  usePageMeta(
    'Pricing | TopFarms',
    'Simple per-listing pricing for NZ farm job ads. First listing free, no subscriptions, no contracts. Workers never pay.',
  )

  return (
    <PublicShell>
      {/* Employer view: the fee table. CSS default. */}
      <div className="emp-only">
        <section className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5">
          <div className="v13-dark bg-green relative overflow-hidden rounded-3xl px-7 py-12 text-white md:px-11">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
            />
            <div className="relative">
              <h1 className="max-w-[18ch] text-4xl leading-[.95] font-extrabold tracking-[-.04em] md:text-6xl">
                What it costs
              </h1>
              <p className="mt-5 max-w-[46ch] text-[17px] text-white/82">
                Published in the open. No calls, no quotes. Your first listing is always free, and
                workers never pay.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="tiers-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5">
          <h2 id="tiers-h2" className="sr-only">
            Listing tiers
          </h2>
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-5">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-3xl border p-6 ${
                  tier.highlight ? 'bg-lime border-lime text-green-2' : 'bg-card border-line'
                }`}
              >
                <p
                  className={`font-bricolage text-xs font-semibold tracking-[.05em] uppercase ${
                    tier.highlight ? 'text-green-2/80' : 'text-ink-40'
                  }`}
                >
                  {tier.name}
                </p>
                <p className="mt-3 text-[34px] leading-none font-extrabold tracking-[-.045em]">
                  {tier.price}
                </p>
                <p
                  className={`mt-1.5 text-[12.5px] font-medium ${
                    tier.highlight ? 'text-green-2/75' : 'text-ink-40'
                  }`}
                >
                  {tier.period}
                </p>
                <p
                  className={`mt-3 text-[13.5px] ${tier.highlight ? 'text-green-2/85' : 'text-ink-60'}`}
                >
                  {tier.description}
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`text-[13px] ${tier.highlight ? 'text-green-2/85' : 'text-ink-60'}`}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-ink-40 mt-5 text-[13px] font-medium">
            All prices in NZD. Workers never pay: not to apply, not to match, not ever.
          </p>
        </section>

        <section aria-labelledby="faq-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5">
          <div className="bg-card border-line rounded-3xl border px-7 py-9 md:px-11">
            <h2 id="faq-h2" className="text-2xl font-extrabold tracking-[-.03em] md:text-[30px]">
              Questions
            </h2>
            <div className="mt-6 grid gap-x-11 gap-y-7 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-[16px] font-bold tracking-[-.02em]">{faq.q}</h3>
                  <p className="text-ink-60 mt-1.5 max-w-[60ch] text-[14px]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Seeker view: stated plainly, never an empty page (directive 1.17c). */}
      <div className="seek-only">
        <section className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5">
          <div className="v13-dark bg-green relative overflow-hidden rounded-3xl px-7 py-12 text-white md:px-11">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
            />
            <div className="relative">
              <h1 className="max-w-[20ch] text-4xl leading-[.95] font-extrabold tracking-[-.04em] md:text-6xl">
                Free, always. <span className="text-lime">Workers never pay.</span>
              </h1>
              <p className="mt-5 max-w-[46ch] text-[17px] text-white/82">
                Not to apply, not to match, not ever. Employers pay to list a job. You do not pay to
                find one.
              </p>
              <Link
                to="/signup?role=seeker"
                className="bg-lime text-green-2 hover:bg-lime-2 mt-7 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
              >
                I'm looking for work
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="free-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5">
          <div className="bg-card border-line rounded-3xl border px-7 py-9 md:px-11">
            <h2 id="free-h2" className="text-2xl font-extrabold tracking-[-.03em] md:text-[30px]">
              What free actually covers
            </h2>
            <div className="mt-6 grid gap-x-11 gap-y-7 md:grid-cols-2">
              {[
                ['A profile that does the filtering', 'Set housing, roster, job type, stock class and visa type once. Every job is scored against it.'],
                ['Applying to any listing', 'No limit, no credit, no upsell at the point of applying.'],
                ['Seeing the fit before you apply', 'You see how well a job matches you, and why, before you spend the time.'],
                ['Your documents, stored once', 'Upload once and reuse across applications.'],
              ].map(([h, p]) => (
                <div key={h}>
                  <h3 className="text-[16px] font-bold tracking-[-.02em]">{h}</h3>
                  <p className="text-ink-60 mt-1.5 max-w-[60ch] text-[14px]">{p}</p>
                </div>
              ))}
            </div>
            <p className="text-ink-40 mt-7 text-[13px] font-medium">
              Employers pay per listing, published on this page when you switch to the employer view.
            </p>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-[1440px] px-3 pt-14 pb-4 sm:px-5">
        <div className="v13-dark bg-green-2 relative overflow-hidden rounded-3xl px-7 py-12 text-center text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.045)_0_1px,transparent_1px_28px)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[20ch] text-3xl leading-none font-extrabold tracking-[-.04em] md:text-[44px]">
              The whole job. <i className="text-lime font-normal">The whole person.</i>
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup?role=employer"
                className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
              >
                I'm hiring
              </Link>
              <Link
                to="/signup?role=seeker"
                className="hover:text-lime inline-flex min-h-11 items-center px-2.5 text-[15px] font-semibold text-white underline decoration-[1.5px] underline-offset-4 transition-colors"
              >
                I'm looking for work
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
