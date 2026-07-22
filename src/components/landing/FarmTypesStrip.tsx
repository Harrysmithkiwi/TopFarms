import { motion } from 'motion/react'

// No listing counts here — they were hardcoded and contradicted the live
// platform stats (TF-003 truth pass). Re-add only when driven by real data.
const sectors = [
  { name: 'Dairy', icon: '🐄' },
  { name: 'Sheep & Beef', icon: '🐑' },
  { name: 'Horticulture', icon: '🌱' },
  { name: 'Viticulture', icon: '🍇' },
  { name: 'Arable', icon: '🌾' },
]

export function FarmTypesStrip() {
  return (
    <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-surface)' }}>
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
            Farm Sectors
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-10 text-4xl font-bold md:text-5xl"
          style={{ color: 'var(--color-brand-900)' }}
        >
          Opportunities Across Every Sector
        </h2>

        {/* Sector cards — horizontal scroll on mobile, grid on sm+ */}
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:pb-0 lg:grid-cols-5">
          {sectors.map((sector) => (
            <div
              key={sector.name}
              className="min-w-[160px] cursor-default snap-center rounded-xl p-6 text-center transition-shadow hover:shadow-lg sm:min-w-0"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="mb-3 text-3xl">{sector.icon}</div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-brand-900)' }}>
                {sector.name}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
