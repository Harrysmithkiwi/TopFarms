import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Link } from 'react-router'

const checklist = [
  'Post a job in under 5 minutes',
  'AI-matched candidates delivered to your dashboard',
  'Track applications and schedule interviews',
  'Only pay when you find the right person',
]

export function EmployerCTABand() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-soil)' }}>
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy + CTA */}
          <div>
            {/* Eyebrow */}
            <p
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: 'var(--color-meadow)' }}
            >
              For Employers
            </p>

            <h2
              className="font-display font-bold text-4xl mb-8"
              style={{ color: 'var(--color-cream)' }}
            >
              Find Your Next Team Member
            </h2>

            {/* Checklist */}
            <ul className="flex flex-col gap-4 mb-10">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(122,175,63,0.2)' }}
                  >
                    <Check size={12} style={{ color: 'var(--color-meadow)' }} strokeWidth={3} />
                  </span>
                  <span className="text-base leading-relaxed" style={{ color: 'rgba(247,242,232,0.85)' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/onboarding/employer"
              className="inline-block rounded-full px-8 py-3 font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-meadow)',
                color: 'var(--color-soil)',
              }}
            >
              Post Your First Job
            </Link>
          </div>

          {/* Right: mini dashboard mockup */}
          <div
            className="rounded-xl shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-white)' }}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-fog)' }}
            >
              <p className="font-display font-bold text-base" style={{ color: 'var(--color-soil)' }}>
                Your Dashboard
              </p>
            </div>

            <div className="p-5">
              {/* Stat boxes */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Active Jobs', value: '3' },
                  { label: 'Applicants', value: '14' },
                  { label: 'Shortlisted', value: '5' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg p-3 text-center"
                    style={{ backgroundColor: 'var(--color-cream)' }}
                  >
                    <p className="font-bold text-xl" style={{ color: 'var(--color-soil)' }}>
                      {stat.value}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-mid)' }}>
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
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                  style={{
                    border: '1px solid var(--color-fog)',
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-soil)' }}>
                      {applicant.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-mid)' }}>
                      {applicant.role}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: 'rgba(122,175,63,0.12)',
                      color: 'var(--color-meadow)',
                    }}
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
