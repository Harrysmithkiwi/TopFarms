import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Nav } from '@/components/layout/Nav'
import { usePageMeta } from '@/lib/usePageMeta'
import { LandingFooter } from '@/components/landing/LandingFooter'

const tiers = [
  {
    name: 'Standard',
    price: '$100',
    period: 'per listing',
    description: 'Everything you need to attract quality candidates.',
    isPopular: false,
    features: [
      'Listed in search results',
      '30-day listing',
      'Up to 5 photos',
      'Email applications',
      'Basic analytics',
    ],
    cta: 'Get Started',
    ctaTo: '/signup?role=employer',
  },
  {
    name: 'Featured',
    price: '$150',
    period: 'per listing',
    description: 'Stand out from the crowd with priority placement.',
    isPopular: true,
    features: [
      'Everything in Standard',
      'Highlighted in search results',
      'Featured badge on listing',
      'Priority email notifications',
      'Detailed analytics',
    ],
    cta: 'Get Started',
    ctaTo: '/signup?role=employer',
  },
  {
    name: 'Premium',
    price: '$200',
    period: 'per listing',
    description: 'Maximum visibility for roles you need to fill fast.',
    isPopular: false,
    features: [
      'Everything in Featured',
      'Top of search results',
      'Premium badge on listing',
      'Dedicated support',
      'Premium analytics',
      'Social media boost',
    ],
    cta: 'Get Started',
    ctaTo: '/signup?role=employer',
  },
]

const faqs = [
  {
    q: 'Is my first listing really free?',
    a: 'Yes — your very first job listing is free regardless of which tier you choose. No credit card required until your second listing. The free listing is one per account (deleting a job does not restore it).',
  },
  {
    q: 'Is there a fee when I hire someone?',
    a: 'Yes — a one-off placement fee of $200, $400 or $800 NZD based on the role’s salary band and seniority. You accept it when you shortlist a candidate (which unlocks their contact details and CV), and it is invoiced on Net-14 terms when you confirm the hire. Until you shortlist, you see their full profile, match breakdown and AI summary free.',
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
    a: 'We accept all major credit and debit cards via Stripe. All prices are in NZD.',
  },
  {
    q: 'Is there a subscription or contract?',
    a: 'No subscriptions, no contracts. You pay per listing, only when you post.',
  },
]

export function Pricing() {
  usePageMeta(
    'Pricing — TopFarms',
    'Simple per-listing pricing for NZ farm job ads. First listing free, no subscriptions, no contracts.',
  )
  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        {/* Hero */}
        <section className="px-4 py-20 bg-brand-900">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p
              className="mb-5 text-xs font-bold tracking-widest uppercase text-brand-hover"
            >
              Pricing
            </p>
            <h1
              className="font-display mb-5 text-5xl leading-tight font-bold text-text-on-brand"
            >
              Simple, per-listing pricing
            </h1>
            <p className="text-lg text-white/70">
              No subscriptions. No contracts. Your first listing is always free.
            </p>
          </motion.div>
        </section>

        {/* Tier cards */}
        <section className="px-4 py-20 bg-bg">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 md:grid-cols-3">
              {tiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  className="relative flex flex-col rounded-2xl"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: tier.isPopular
                      ? '2px solid var(--color-brand)'
                      : '1px solid var(--color-border)',
                    boxShadow: tier.isPopular ? '0 8px 32px rgba(122,175,63,0.15)' : undefined,
                  }}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  {tier.isPopular && (
                    <div
                      className="bg-brand text-text-on-brand absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold"
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="flex-1 p-7">
                    <p
                      className="font-display mb-1 text-lg font-bold text-brand-900"
                    >
                      {tier.name}
                    </p>
                    <p className="mb-5 text-sm text-text-muted">
                      {tier.description}
                    </p>
                    <div className="mb-6 flex items-end gap-1">
                      <span
                        className="font-display text-4xl font-bold text-brand-900"
                      >
                        {tier.price}
                      </span>
                      <span className="pb-1 text-sm text-text-muted">
                        {tier.period}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span
                            className="bg-brand/15 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                          >
                            <Check className="text-brand"
                              size={10}
                              strokeWidth={3}
                            />
                          </span>
                          <span className="text-sm text-text">
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-7 pb-7">
                    <Link
                      to={tier.ctaTo}
                      className="block rounded-full py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
                      style={
                        tier.isPopular
                          ? {
                              backgroundColor: 'var(--color-brand)',
                              color: 'var(--color-text-on-brand)',
                            }
                          : {
                              border: '1.5px solid var(--color-border)',
                              color: 'var(--color-brand-900)',
                            }
                      }
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* First listing free callout */}
            <motion.div
              className="mt-8 rounded-xl p-5 text-center text-sm font-semibold"
              style={{ backgroundColor: 'rgba(122,175,63,0.1)', color: 'var(--color-brand-900)' }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              Your first job listing is free — regardless of tier. No credit card required.
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-20 bg-surface">
          <div className="mx-auto max-w-2xl">
            <motion.h2
              className="font-display mb-10 text-center text-3xl font-bold text-brand-900"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
            >
              Frequently asked questions
            </motion.h2>
            <div className="flex flex-col divide-y border-border">
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.q}
                  className="py-5"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <p
                    className="mb-2 text-base font-semibold text-brand-900"
                  >
                    {faq.q}
                  </p>
                  <p
                    className="text-sm leading-relaxed text-text-muted"
                  >
                    {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 py-20 bg-brand-900">
          <motion.div
            className="mx-auto max-w-xl text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="font-display mb-5 text-4xl font-bold text-text-on-brand"
            >
              Ready to post your first job?
            </h2>
            <p className="mb-8 text-base text-white/70">
              It's free to get started. Pay only when you're ready to boost visibility.
            </p>
            <Link
              to="/signup?role=employer"
              className="bg-brand text-brand-900 inline-block rounded-full px-10 py-4 text-base font-semibold transition-opacity hover:opacity-90"
            >
              Post Your First Job Free
            </Link>
          </motion.div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
