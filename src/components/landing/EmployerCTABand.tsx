import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Link } from 'react-router'

const checklist = [
  'Post a job in under 5 minutes',
  'AI-matched candidates delivered to your dashboard',
  'Track applications and schedule interviews',
  'Your first job listing is free',
]

export function EmployerCTABand() {
  return (
    <section className="px-4 py-20 bg-brand-900">
      <motion.div
        className="mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left: copy + CTA */}
          <div>
            {/* Eyebrow — brand-300 for AA contrast on brand-900 (TF-020) */}
            <p
              className="mb-4 text-xs font-bold tracking-widest uppercase text-brand-300"
            >
              For Employers
            </p>

            <h2
              className="font-display mb-8 text-4xl font-bold text-text-on-brand"
            >
              Find Your Next Team Member
            </h2>

            {/* Checklist */}
            <ul className="mb-10 flex flex-col gap-4">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="bg-brand/20 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  >
                    <Check className="text-brand" size={12} strokeWidth={3} />
                  </span>
                  <span
                    className="text-base leading-relaxed text-white/85"
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-5">
              <Link
                to="/signup?role=employer"
                className="inline-block rounded-full px-8 py-3 font-semibold transition-opacity hover:opacity-90"
                style={{
                  // brand-900 on brand was 3.33:1 (axe serious, Phase 4.6)
                  backgroundColor: 'var(--color-brand-hover)',
                  color: 'var(--color-text-on-brand)',
                }}
              >
                Post Your First Job
              </Link>
              <Link
                to="/for-employers"
                className="inline-block text-sm font-semibold transition-opacity hover:opacity-80 text-brand-300"
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* Right: mini dashboard mockup. Illustration only — names and numbers
              are placeholders, kept unmistakable via the Example badge (TF-004). */}
          <div
            className="overflow-hidden rounded-xl shadow-xl bg-surface"
            aria-hidden="true"
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4 border-border"
            >
              <p
                className="font-display text-base font-bold text-brand-900"
              >
                Your Dashboard
              </p>
              <span
                className="bg-surface-2 text-text-muted rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
              >
                Example
              </span>
            </div>

            <div className="p-5">
              {/* Stat boxes */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Active Jobs', value: '3' },
                  { label: 'Applicants', value: '14' },
                  { label: 'Shortlisted', value: '5' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg p-3 text-center bg-bg"
                  >
                    <p className="text-xl font-bold text-brand-900">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fake applicant rows */}
              {[
                { name: 'Alex R.', role: 'Dairy Farm Manager', score: 92 },
                { name: 'Jordan M.', role: 'Herd Manager', score: 85 },
              ].map((applicant) => (
                <div
                  key={applicant.name}
                  className="mb-2 flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold text-brand-900"
                    >
                      {applicant.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {applicant.role}
                    </p>
                  </div>
                  <span
                    className="bg-brand/12 text-success-text-on-bg rounded-full px-2 py-1 text-xs font-bold"
                  >
                    {applicant.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
