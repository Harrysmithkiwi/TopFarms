// NOTE: 2026-06-20 — removed fabricated per-sector listing counts ("12 listings",
// "8 listings", ...) which both invented inventory and contradicted the live
// counters. Sectors now reflect real current scope; future verticals are marked
// "Coming soon" rather than implying open roles. (Scope: docs/_canonical/PRD.md §3.)
import { motion, useReducedMotion, type Variants } from 'motion/react'

interface Sector {
  name: string
  icon: string
  status: 'live' | 'soon'
}

const sectors: Sector[] = [
  { name: 'Dairy', icon: '🐄', status: 'live' },
  { name: 'Sheep & Beef', icon: '🐑', status: 'live' },
  { name: 'Arable & Cropping', icon: '🌾', status: 'live' },
  { name: 'Machinery & Contracting', icon: '🚜', status: 'live' },
  { name: 'Farm Management', icon: '📋', status: 'live' },
  { name: 'Horticulture', icon: '🌱', status: 'soon' },
  { name: 'Viticulture', icon: '🍇', status: 'soon' },
]

export function FarmTypesStrip() {
  const reduce = useReducedMotion()
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
  }
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="px-4 py-24" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8" style={{ backgroundColor: 'var(--color-brand)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-brand)' }}
          >
            Farm Sectors
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-10 max-w-2xl text-4xl font-bold tracking-tight md:text-5xl"
          style={{ color: 'var(--color-brand-900)' }}
        >
          Built for the breadth of{' '}
          <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>New Zealand farming</em>
        </h2>

        {/* Sector cards */}
        <motion.div
          className="flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {sectors.map((sector) => (
            <motion.div
              key={sector.name}
              variants={item}
              className="flex min-w-[160px] snap-center items-center gap-3 rounded-xl p-5 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="text-2xl" aria-hidden="true">
                {sector.icon}
              </span>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  {sector.name}
                </p>
                {sector.status === 'soon' ? (
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-subtle)' }}>
                    Coming soon
                  </p>
                ) : (
                  <p className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
                    Open to roles
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
