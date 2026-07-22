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
    a: 'Yes — your very first job listing is free regardless of which tier you choose. No credit card required until your second listing.',
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <main>
        {/* Hero */}
        <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-brand-900)' }}>
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p
              className="mb-5 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--color-brand)' }}
            >
              Pricing
            </p>
            <h1
              className="font-display mb-5 text-5xl leading-tight font-bold"
              style={{ color: 'var(--color-text-on-brand)' }}
            >
              Simple, per-listing pricing
            </h1>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
              No subscriptions. No contracts. Your first listing is always free.
            </p>
          </motion.div>
        </section>

        {/* Tier cards */}
        <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-bg)' }}>
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
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--color-brand)',
                        color: 'var(--color-text-on-brand)',
                      }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="flex-1 p-7">
                    <p
                      className="font-display mb-1 text-lg font-bold"
                      style={{ color: 'var(--color-brand-900)' }}
                    >
                      {tier.name}
                    </p>
                    <p className="mb-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {tier.description}
                    </p>
                    <div className="mb-6 flex items-end gap-1">
                      <span
                        className="font-display text-4xl font-bold"
                        style={{ color: 'var(--color-brand-900)' }}
                      >
                        {tier.price}
                      </span>
                      <span className="pb-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {tier.period}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: 'rgba(122,175,63,0.15)' }}
                          >
                            <Check
                              size={10}
                              style={{ color: 'var(--color-brand)' }}
                              strokeWidth={3}
                            />
                          </span>
                          <span className="text-sm" style={{ color: 'var(--color-text)' }}>
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
        <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="mx-auto max-w-2xl">
            <motion.h2
              className="font-display mb-10 text-center text-3xl font-bold"
              style={{ color: 'var(--color-brand-900)' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
            >
              Frequently asked questions
            </motion.h2>
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
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
                    className="mb-2 text-base font-semibold"
                    style={{ color: 'var(--color-brand-900)' }}
                  >
                    {faq.q}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-brand-900)' }}>
          <motion.div
            className="mx-auto max-w-xl text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="font-display mb-5 text-4xl font-bold"
              style={{ color: 'var(--color-text-on-brand)' }}
            >
              Ready to post your first job?
            </h2>
            <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
              It's free to get started. Pay only when you're ready to boost visibility.
            </p>
            <Link
              to="/signup?role=employer"
              className="inline-block rounded-full px-10 py-4 text-base font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-brand)', color: 'var(--color-brand-900)' }}
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
