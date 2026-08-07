import { Link } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'

// v13 port, stage 3a (directive 1.12, 1.17c). ONE route, audience-switched view:
// two routes would split the SEO signal for the term the business most wants to
// own, and contradict 1.14's rejection of audience-as-URL-segment. Employer view
// is the CSS default so the page is correct without JS; the seeker view uses the
// same .emp-only / .seek-only mechanism as the hero.
// Pricing model v3 (directive 1.19, 2026-08-04). The three-tier listing ladder
// (100 / 150 / 200) and "first listing free" are RETIRED: listings are free and
// unlimited, and the placement fee carries the whole model. Featured ($99) is
// deliberately absent, not forgotten. NOT THIS forbids selling prominence before
// its traffic trigger fires, and an empty board is exactly when it would be a lie.
//
// Three cards, not five, because there are three facts: listing costs nothing,
// hiring costs one published fee, and that fee buys a guarantee.

const tiers = [
  {
    name: 'Listing',
    price: 'Free',
    period: 'every listing, always',
    description: 'Post every role you have. No card, no catch, no limit.',
    highlight: false,
    features: [
      'Unlimited listings',
      '30-day listing',
      'Scored applicants, ordered by fit',
      'Applications to your inbox',
    ],
  },
  {
    name: 'Placement',
    price: '$200-800',
    period: 'once, only if you hire',
    description: 'Set by the salary band on your listing. You know it before anyone applies.',
    highlight: true,
    features: [
      'Under $55k: $200',
      '$55k to $80k: $400',
      '$80k and above, and managers: $800',
      'Invoiced Net-14 on confirmed hire',
    ],
  },
  {
    name: 'Guarantee',
    price: 'Included',
    period: 'with every placement fee',
    description: 'If the hire does not last, you do not pay twice for the same seat.',
    highlight: false,
    features: [
      'Permanent roles: 90 days',
      'Fixed term roles: 30 days',
      'We rematch and relist free',
      'No placement fee on the replacement',
    ],
  },
]

const faqs = [
  {
    q: 'Is listing really free?',
    a: 'Yes, and there is no limit. Post one role or ten. No card is required to list a job, and there is no listing fee at any tier. We only earn if you actually hire someone.',
  },
  {
    q: 'Is there a fee when I hire someone?',
    a: 'Yes, one. A one-off placement fee of $200, $400 or $800 NZD, set by the salary band on your listing. You accept it when you shortlist a candidate, which is what unlocks their phone, email and CV, and it is invoiced on Net-14 terms when you confirm the hire. Until you shortlist, you see their full profile, match breakdown and summary free.',
  },
  {
    q: 'What happens if the person does not work out?',
    a: 'Every placement fee includes a replacement guarantee. On permanent roles it runs 90 days, the same window as the trial period in your employment agreement. On fixed term roles it runs 30 days. If they leave inside that window we rematch the role and relist it free, and you pay no placement fee for the replacement. Casual and relief work carries no guarantee, because the window would outlive most of those jobs.',
  },
  {
    q: 'How long does a listing stay active?',
    a: 'All listings are active for 30 days. You can renew or repost at any time from your dashboard, free.',
  },
  {
    q: 'How does this compare to a recruiter?',
    a: 'A recruitment agency in New Zealand typically charges 15 to 20 percent of first-year salary. On a $70,000 herd manager that is over $10,000. Ours is $400, published on this page, with a guarantee attached.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Placement fees are invoiced through Stripe on Net-14 terms, payable by card or bank transfer. All prices are in NZD. There is nothing to pay to post a job, so no card is needed to get started.',
  },
  {
    q: 'Is there a subscription or contract?',
    a: 'No subscriptions, no contracts, no minimum. Listing is free and the placement fee is a one-off, only when you hire.',
  },
]

export function Pricing() {
  usePageMeta(
    'Pricing | TopFarms',
    'Published pricing for NZ farm job ads. Every listing free and unlimited, one placement fee only if you hire, with a replacement guarantee. Workers never pay.',
  )

  return (
    <PublicShell>
      {/* One hero, one h1. Both audience strings live in the DOM and the CSS
          swaps them (1.11, same pattern as HeroSection) — but the h1 element
          itself is shared, so the page has exactly one no matter which
          audience is active. Two h1s here split the outline for crawlers even
          though display:none keeps one out of the a11y tree. */}
      <section className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-5">
        <div className="v13-dark bg-green relative overflow-hidden rounded-3xl px-7 py-12 text-white md:px-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
          />
          <div className="relative">
            <h1 className="max-w-[20ch] text-4xl leading-[.95] font-extrabold tracking-[-.04em] md:text-6xl">
              <span className="emp-only">What it costs</span>
              <span className="seek-only">
                Free, always. <span className="text-lime">Workers never pay.</span>
              </span>
            </h1>
            <p className="emp-only mt-5 max-w-[46ch] text-[17px] text-white/82">
              Published in the open. No calls, no quotes. Every listing is free, you pay once only
              if you hire, and workers never pay.
            </p>
            <p className="seek-only mt-5 max-w-[46ch] text-[17px] text-white/82">
              Not to apply, not to match, not ever. Employers pay to list a job. You do not pay to
              find one.
            </p>
            {/* Wrapper carries seek-only: the toggle forces display:block, which
                would stretch the pill if it sat on the Link itself. */}
            <div className="seek-only mt-7">
              <Link
                to="/signup?role=seeker"
                className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
              >
                I'm looking for work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Employer view: the fee table. CSS default. */}
      <div className="emp-only">
        <section aria-labelledby="tiers-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5">
          <h2 id="tiers-h2" className="sr-only">
            What it costs
          </h2>
          <div className="grid gap-3.5 md:grid-cols-3">
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
