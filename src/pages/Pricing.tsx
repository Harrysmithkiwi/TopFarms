import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'
import { Container, Display, Btn } from '@/components/landing/v12/V12Kit'
import { PastoralBand } from '@/components/landing/PastoralScene'

// v12 port (docs/design/v12-DIRECTIVE.md §0 scope line). Costume change only: ONE route,
// audience-switched view, and every price, band, boundary and sentence below is byte-for-byte
// what the v13 page carried. Pricing model v3 (directive 1.19) is a COMMERCIAL fact, not a
// design decision — 1.19 is listed in §0 as carried forward, unchanged — so a port that
// "tidied" a number would be changing the business, and `tests/pricing-parity.test.ts` guards
// the client copy against the server derivation regardless.
//
// Carried forward from the v13 page, deliberately and unchanged:
//   1.12 — pricing lives at /pricing; pinned by test.
//   1.11 — the per-audience swap. Both strings live in the DOM and CSS picks one, so the page
//          is correct with no JS. The mechanism is `.v13-shell[data-aud]` in index.css and
//          PublicShell still carries both the class and the attribute — verified before this
//          port, because a rename there would have silently shown employers the seeker page.
//   1.17c — the seeker view is stated plainly and is never an empty page.
//   ONE h1 — both audience strings sit inside a single shared h1 element. Two h1s split the
//          outline for crawlers even though display:none keeps one out of the a11y tree.
//
// Dropped by v12 §5: the dark green panels and their repeating-gradient grille. The
// highlighted tier reads on `fern-100` rather than a dark fill — v12 §2 bans `fern-500` as
// text on dark panels (3.54:1) and the pale plate keeps the emphasis without going near that
// rule. Featured ($99) remains deliberately absent, not forgotten.

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

const SEEKER_FREE: [string, string][] = [
  [
    'A profile that does the filtering',
    'Set housing, roster, job type, stock class and visa type once. Every job is scored against it.',
  ],
  ['Applying to any listing', 'No limit, no credit, no upsell at the point of applying.'],
  [
    'Seeing the fit before you apply',
    'You see how well a job matches you, and why, before you spend the time.',
  ],
  ['Your documents, stored once', 'Upload once and reuse across applications.'],
]

export function Pricing() {
  usePageMeta(
    'Pricing | TopFarms',
    'Published pricing for NZ farm job ads. Every listing free and unlimited, one placement fee only if you hire, with a replacement guarantee. Workers never pay.',
  )

  return (
    <PublicShell>
      {/* ── Hero. One h1; the audience strings swap inside it. ── */}
      <section className="relative isolate overflow-hidden">
        <PastoralBand className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-white/45" aria-hidden="true" />
        <Container className="relative py-20 text-center sm:py-24">
          <Display as="h1" className="mx-auto max-w-[20ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.06]">
            <span className="emp-only">What it costs</span>
            <span className="seek-only">Free, always. Workers never pay.</span>
          </Display>
          <p className="emp-only text-bark/80 mx-auto mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">
            Published in the open. No calls, no quotes. Every listing is free, you pay once only
            if you hire, and workers never pay.
          </p>
          <p className="seek-only text-bark/80 mx-auto mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">
            Not to apply, not to match, not ever. Employers pay to list a job. You do not pay to
            find one.
          </p>
          {/* The wrapper carries seek-only, not the Btn: the toggle forces display:block,
              which would stretch the pill to the full container width if it sat on the link. */}
          <div className="seek-only mt-9">
            <Btn to="/signup?role=seeker" size="lg">
              Create a profile
            </Btn>
          </div>
        </Container>
      </section>

      {/* ── Employer view: the fee table. CSS default. ── */}
      <div className="emp-only">
        <section aria-labelledby="tiers-h2" className="py-20 sm:py-24">
          <Container>
            <h2 id="tiers-h2" className="sr-only">
              What it costs
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-7 shadow-[0_4px_24px_rgba(26,60,42,0.08)] ${
                    tier.highlight ? 'border-fern-700 bg-fern-100' : 'border-rule bg-white'
                  }`}
                >
                  <p className="text-fern-800 text-[0.875rem] font-semibold">{tier.name}</p>
                  {/* clamp(), not a fixed size: v12 §2 is "display sizes are clamp()
                      throughout", and "$200-800" is the longest string of the three — at a
                      fixed 2.6rem it is the one that would wrap on a narrow card. */}
                  <p className="font-serif text-fern-900 mt-3 text-[clamp(2.1rem,3.6vw,2.6rem)] leading-none font-semibold tracking-[-0.02em]">
                    {tier.price}
                  </p>
                  <p className="text-sage mt-2 text-[0.875rem]">{tier.period}</p>
                  <p className="text-sage mt-4 text-[0.9375rem] leading-relaxed">
                    {tier.description}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="text-bark/85 text-[0.9375rem] leading-relaxed">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sage mt-6 text-[0.875rem]">
              All prices in NZD. Workers never pay: not to apply, not to match, not ever.
            </p>
          </Container>
        </section>

        <section aria-labelledby="faq-h2" className="bg-linen py-20 sm:py-24">
          <Container>
            <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
              <span id="faq-h2">Questions</span>
            </Display>
            <div className="mt-10 grid gap-x-12 gap-y-9 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-fern-900 text-[1.0625rem] leading-snug font-semibold">
                    {faq.q}
                  </h3>
                  <p className="text-sage mt-2.5 max-w-[60ch] text-[0.9375rem] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </div>

      {/* ── Seeker view: stated plainly, never an empty page (directive 1.17c). ── */}
      <div className="seek-only">
        <section aria-labelledby="free-h2" className="bg-linen py-20 sm:py-24">
          <Container>
            <Display className="text-[clamp(1.7rem,3.2vw,2.3rem)]">
              <span id="free-h2">What free actually covers</span>
            </Display>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {SEEKER_FREE.map(([h, p]) => (
                <div
                  key={h}
                  className="border-rule rounded-2xl border bg-white p-7 shadow-[0_4px_24px_rgba(26,60,42,0.08)]"
                >
                  <h3 className="text-fern-900 text-[1.0625rem] leading-snug font-semibold">{h}</h3>
                  <p className="text-sage mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed">
                    {p}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sage mt-6 text-[0.875rem]">
              Employers pay per listing, published on this page when you switch to the employer
              view.
            </p>
          </Container>
        </section>
      </div>

      {/* ── Close ── */}
      <Container className="py-20 sm:py-24">
        <div className="relative isolate overflow-hidden rounded-2xl">
          <PastoralBand className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-white/45" aria-hidden="true" />
          <div className="relative px-6 py-14 text-center sm:py-16">
            <Display className="mx-auto max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.4rem)]">
              The whole job. The whole person.
            </Display>
            <div className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Btn to="/signup?role=employer" size="lg">
                Post a job
              </Btn>
              <Btn to="/signup?role=seeker" variant="onScene" size="lg">
                Create a profile
              </Btn>
            </div>
          </div>
        </div>
      </Container>
    </PublicShell>
  )
}
