import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Check, Zap, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { Nav } from '@/components/layout/Nav'
import { LandingFooter } from '@/components/landing/LandingFooter'

const benefits = [
  'Post a job in under 5 minutes',
  'AI-matched candidates delivered to your dashboard',
  'Track applications and schedule interviews in one place',
  'Only pay when you find the right person',
  'Verified farm worker profiles with references checked',
]

const features = [
  {
    icon: Zap,
    title: 'Fast Posting',
    body: 'Create a job listing in minutes with our guided form. We handle the formatting — you describe the role.',
  },
  {
    icon: Users,
    title: 'AI Matching',
    body: 'Our matching engine scores every applicant against your requirements so the best candidates rise to the top.',
  },
  {
    icon: BarChart3,
    title: 'Applicant Dashboard',
    body: 'See all your applicants in one place. Shortlist, message, and move candidates through your pipeline.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Workers',
    body: 'Workers complete identity verification and reference checks before applying — less noise in your inbox.',
  },
]

const steps = [
  {
    num: '01',
    label: 'Create your farm profile',
    detail: 'Tell candidates who you are and what makes your farm a great place to work.',
  },
  {
    num: '02',
    label: 'Post your listing',
    detail: 'Describe the role, pay, and start date. Takes less than 5 minutes.',
  },
  {
    num: '03',
    label: 'Review matched candidates',
    detail: 'Our AI ranks applicants by fit. You focus on the shortlist, not the stack.',
  },
  {
    num: '04',
    label: 'Hire with confidence',
    detail: 'Message candidates directly, check their verified profile, and make the call.',
  },
]

export function ForEmployers() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />

      {/* Hero */}
      <section className="px-4 py-24" style={{ backgroundColor: 'var(--color-brand-900)' }}>
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p
            className="mb-5 text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-brand)' }}
          >
            For Farm Employers
          </p>
          <h1
            className="font-display mb-6 text-5xl leading-tight font-bold md:text-6xl"
            style={{ color: 'var(--color-text-on-brand)' }}
          >
            Find skilled farm workers, faster.
          </h1>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            TopFarms connects you with verified, experienced farm workers across all 16 regions of
            New Zealand. Post a job today and get matched candidates in your dashboard.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/signup?role=employer"
              className="inline-block rounded-full px-8 py-3.5 text-base font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-brand)', color: 'var(--color-brand-900)' }}
            >
              Post Your First Job
            </Link>
            <Link
              to="/jobs"
              className="inline-block rounded-full px-8 py-3.5 text-base font-semibold transition-colors"
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'var(--color-text-on-brand)',
              }}
            >
              Browse Talent
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Benefits checklist */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-surface)' }}>
        <motion.div
          className="mx-auto max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2
            className="font-display mb-10 text-center text-3xl font-bold"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Everything you need to hire well
          </h2>
          <ul className="flex flex-col gap-4">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(122,175,63,0.15)' }}
                >
                  <Check size={12} style={{ color: 'var(--color-brand)' }} strokeWidth={3} />
                </span>
                <span className="text-base leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-6xl">
          <motion.h2
            className="font-display mb-12 text-center text-3xl font-bold"
            style={{ color: 'var(--color-brand-900)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
          >
            Built for busy farm operators
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-xl p-6"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(122,175,63,0.12)' }}
                >
                  <f.icon size={20} style={{ color: 'var(--color-brand)' }} />
                </div>
                <h3
                  className="mb-2 text-base font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-3xl">
          <motion.h2
            className="font-display mb-12 text-center text-3xl font-bold"
            style={{ color: 'var(--color-brand-900)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
          >
            How it works
          </motion.h2>
          <div className="flex flex-col gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="flex items-start gap-6"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <span
                  className="font-display w-12 flex-shrink-0 text-right text-3xl font-bold"
                  style={{ color: 'var(--color-brand)' }}
                >
                  {step.num}
                </span>
                <div>
                  <p
                    className="mb-1 text-base font-semibold"
                    style={{ color: 'var(--color-brand-900)' }}
                  >
                    {step.label}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {step.detail}
                  </p>
                </div>
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
            Ready to hire?
          </h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Join hundreds of farms already using TopFarms to find reliable, skilled workers.
          </p>
          <Link
            to="/signup?role=employer"
            className="inline-block rounded-full px-10 py-4 text-base font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-brand)', color: 'var(--color-brand-900)' }}
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  )
}
