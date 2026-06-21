import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'

const features = [
  'Scores skills, experience, and tickets against every active role',
  'Aligns location, travel, and on-farm accommodation',
  'Reads the detail that decides fit: shed type, livestock, couples',
  'Re-scores in real time as a profile or a listing changes',
]

const matches = [
  { name: 'Dairy Farm Manager', score: 94, location: 'Waikato' },
  { name: 'Herd Manager', score: 88, location: 'Canterbury' },
  { name: 'Farm Hand', score: 81, location: 'Southland' },
]

export function AIMatchingSection() {
  const reduce = useReducedMotion()
  const rows: Variants = {
    hidden: {},
    show: { transition: { delayChildren: 0.15, staggerChildren: reduce ? 0 : 0.12 } },
  }
  const row: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, x: 12 },
    show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="px-4 py-24" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        className="mx-auto max-w-6xl"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8" style={{ backgroundColor: 'var(--color-brand)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-brand)' }}
          >
            The Match Engine
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-4 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl"
          style={{ color: 'var(--color-brand-900)' }}
        >
          Match scoring,{' '}
          <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>built for farm work</em>
        </h2>
        <p
          className="mb-12 max-w-2xl text-lg leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No keyword guesswork. Every candidate and every role is scored on the things that decide a
          good hire on the land.
        </p>

        {/* Two-column layout */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left: feature bullets */}
          <ul className="flex flex-col gap-5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in oklab, var(--color-brand) 12%, transparent)',
                  }}
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

          {/* Right: mock browser window (illustrative product preview) */}
          <div
            className="overflow-hidden rounded-xl shadow-2xl"
            style={{ border: '1px solid var(--color-border)' }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ backgroundColor: 'var(--color-surface-2)' }}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
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
                <p className="font-display text-lg font-bold" style={{ color: 'var(--color-brand-900)' }}>
                  Your Top Matches
                </p>
                {/* Sparing AI accent — the one match-engine moment */}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: 'var(--color-ai-bg)',
                    color: 'var(--color-ai)',
                  }}
                >
                  <Sparkles size={11} strokeWidth={2.5} aria-hidden="true" />
                  Match Score
                </span>
              </div>

              <motion.div variants={rows} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
                {matches.map((match) => (
                  <motion.div
                    key={match.name}
                    variants={row}
                    className="mb-2 flex items-center justify-between rounded-lg px-3 py-2.5"
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
                      className="rounded-full px-2 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: 'color-mix(in oklab, var(--color-brand) 12%, transparent)',
                        color: 'var(--color-brand)',
                      }}
                    >
                      {match.score}% match
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
