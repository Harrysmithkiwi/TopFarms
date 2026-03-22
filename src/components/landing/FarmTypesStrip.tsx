import { motion } from 'motion/react'

const sectors = [
  { name: 'Dairy', count: 12, icon: '🐄' },
  { name: 'Sheep & Beef', count: 8, icon: '🐑' },
  { name: 'Horticulture', count: 5, icon: '🌱' },
  { name: 'Viticulture', count: 3, icon: '🍇' },
  { name: 'Arable', count: 4, icon: '🌾' },
]

export function FarmTypesStrip() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-white)' }}>
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-meadow)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-meadow)' }}
          >
            Farm Sectors
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display font-bold text-4xl md:text-5xl mb-10"
          style={{ color: 'var(--color-soil)' }}
        >
          Opportunities Across Every Sector
        </h2>

        {/* Sector cards — horizontal scroll on mobile, grid on sm+ */}
        <div className="flex overflow-x-auto snap-x sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-4 pb-2 sm:pb-0">
          {sectors.map((sector) => (
            <div
              key={sector.name}
              className="snap-center min-w-[160px] sm:min-w-0 rounded-xl p-6 text-center transition-shadow hover:shadow-lg cursor-default"
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-fog)',
              }}
            >
              <div className="text-3xl mb-3">{sector.icon}</div>
              <p className="font-bold text-sm mb-1" style={{ color: 'var(--color-soil)' }}>
                {sector.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-mid)' }}>
                {sector.count} listings
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
