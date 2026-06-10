import { motion } from 'motion/react'

const brands = [
  'Fonterra Sharemilkers',
  'Silver Fern Farms',
  'Greenfield Agriculture',
  'Highview Station',
  'Valley View Dairy',
]

export function TrustedByStrip() {
  return (
    <section className="px-4 py-16" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="mx-auto max-w-5xl"
      >
        <p
          className="mb-8 text-center text-sm font-semibold tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Trusted by Leading New Zealand Farms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-lg font-bold md:text-xl"
              style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
            >
              {brand}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
