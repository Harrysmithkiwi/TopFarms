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
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-brand)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-brand)' }}
          >
            AI-Powered Matching
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display font-bold text-4xl md:text-5xl mb-12"
          style={{ color: 'var(--color-brand-900)' }}
        >
          Smart Matching That Understands Agriculture
        </h2>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Feature bullets */}
          <ul className="flex flex-col gap-5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(122,175,63,0.12)' }}
                >
                  <Check size={12} style={{ color: 'var(--color-brand)' }} strokeWidth={3} />
                </span>
                <span className="text-base leading-relaxed" style={{ color: 'var(--color-brand-900)' }}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* Right: Mock browser window */}
          <div
            className="rounded-xl shadow-2xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              {/* Traffic lights */}
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
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
              <p
                className="font-display font-bold text-lg mb-4"
                style={{ color: 'var(--color-brand-900)' }}
              >
                Your Top Matches
              </p>

              {/* Fake match rows */}
              {[
                { name: 'Dairy Farm Manager', score: 94, location: 'Waikato' },
                { name: 'Herd Manager', score: 88, location: 'Canterbury' },
                { name: 'Farm Hand', score: 81, location: 'Southland' },
              ].map((match) => (
                <div
                  key={match.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-900)' }}>
                      {match.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {match.location}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
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
