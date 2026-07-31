import { motion } from 'motion/react'
import { Check } from 'lucide-react'

const features = [
  'Skills-based matching across dairy, livestock & cropping',
  'Location and accommodation preference alignment',
  'Experience level and qualification verification',
  'Real-time match scoring updated as you complete your profile',
]

export function AIMatchingSection() {
  return (
    <section className="px-4 py-20 bg-bg">
      <motion.div
        className="mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8 bg-brand" />
          <p
            className="text-xs font-bold tracking-widest uppercase text-brand-700"
          >
            AI-Powered Matching
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-12 text-4xl font-bold md:text-5xl text-brand-900"
        >
          Smart Matching That Understands Agriculture
        </h2>

        {/* Two-column layout */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left: Feature bullets */}
          <ul className="flex flex-col gap-5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span
                  className="bg-brand/12 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                >
                  <Check className="text-brand" size={12} strokeWidth={3} />
                </span>
                <span
                  className="text-base leading-relaxed text-brand-900"
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* Right: Mock browser window. Illustration only — roles and scores are
              placeholders, labelled Example so it can't read as real data (TF-004). */}
          <div
            className="overflow-hidden rounded-xl shadow-2xl"
            style={{ border: '1px solid var(--color-border)' }}
            aria-hidden="true"
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3 bg-border"
            >
              {/* Traffic lights */}
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
              {/* Address bar */}
              <div
                className="bg-surface text-text-muted ml-2 flex-1 rounded-full px-3 py-1 text-xs"
              >
                topfarms.co.nz/match
              </div>
            </div>

            {/* Browser content */}
            <div className="p-5 bg-surface">
              <div className="mb-4 flex items-center justify-between">
                <p
                  className="font-display text-lg font-bold text-brand-900"
                >
                  Your Top Matches
                </p>
                <span
                  className="bg-surface-2 text-text-muted rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                >
                  Example
                </span>
              </div>

              {/* Fake match rows */}
              {[
                { name: 'Dairy Farm Manager', score: 94, location: 'Waikato' },
                { name: 'Herd Manager', score: 88, location: 'Canterbury' },
                { name: 'Farm Hand', score: 81, location: 'Southland' },
              ].map((match) => (
                <div
                  key={match.name}
                  className="mb-2 flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold text-brand-900"
                    >
                      {match.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {match.location}
                    </p>
                  </div>
                  <span
                    className="bg-brand/12 text-success-text-on-bg rounded-full px-2 py-1 text-xs font-bold"
                  >
                    {match.score}% match
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
