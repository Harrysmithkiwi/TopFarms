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
    <section className="py-16 px-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="max-w-5xl mx-auto"
      >
        <p
          className="text-sm uppercase tracking-widest font-semibold mb-8 text-center"
          style={{ color: 'var(--color-mid)' }}
        >
          Trusted by Leading New Zealand Farms
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-lg md:text-xl font-bold"
              style={{ color: 'var(--color-mid)', opacity: 0.5 }}
            >
              {brand}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
