import { motion } from 'motion/react'
import { Check } from 'lucide-react'

const features = [
  'Skills-based matching across dairy, livestock & horticulture',
  'Location and accommodation preference alignment',
  'Experience level and qualification verification',
  'Real-time match scoring updated as you complete your profile',
]

export function AIMatchingSection() {
  return (
    <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        className="mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8" style={{ backgroundColor: 'var(--color-brand)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-brand-700)' }}
          >
            AI-Powered Matching
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-12 text-4xl font-bold md:text-5xl"
          style={{ color: 'var(--color-brand-900)' }}
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
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(122,175,63,0.12)' }}
                >
                  <Check size={12} style={{ color: 'var(--color-brand)' }} strokeWidth={3} />
                </span>
                <span
                  className="text-base leading-relaxed"
                  style={{ color: 'var(--color-brand-900)' }}
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
              className="flex items-center gap-2 px-4 py-3"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              {/* Traffic lights */}
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
              {/* Address bar */}
              <div
                className="ml-2 flex-1 rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                }}
              >
                topfarms.co.nz/match
              </div>
            </div>

            {/* Browser content */}
            <div className="p-5" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="mb-4 flex items-center justify-between">
                <p
                  className="font-display text-lg font-bold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  Your Top Matches
                </p>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    color: 'var(--color-text-muted)',
                  }}
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
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-brand-900)' }}
                    >
                      {match.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {match.location}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: 'rgba(122,175,63,0.12)',
                      color: 'var(--color-brand)',
                    }}
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
