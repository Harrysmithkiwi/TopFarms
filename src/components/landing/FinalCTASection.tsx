import { Link } from 'react-router'
import { motion } from 'motion/react'

export function FinalCTASection() {
  return (
    <section className="px-4 py-20 bg-brand-900">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2
          className="font-display mb-4 text-4xl font-bold md:text-5xl text-text-on-brand"
        >
          Ready to Find Your Perfect Match?
        </h2>
        <p className="mb-8 text-lg" style={{ color: 'var(--color-text-on-brand)', opacity: 0.8 }}>
          Whether you're looking for farm work or looking to hire, TopFarms connects you with the
          right people.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/signup?role=seeker"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 font-semibold transition-opacity hover:opacity-90"
            style={{
              // brand-900 on brand was 3.33:1 (axe serious, Phase 4.6)
              backgroundColor: 'var(--color-brand-hover)',
              color: 'var(--color-text-on-brand)',
            }}
          >
            Find Farm Work
          </Link>
          <Link
            to="/signup?role=employer"
            className="bg-transparent border-text-on-brand text-text-on-brand inline-flex items-center justify-center rounded-full border px-8 py-3 font-semibold transition-opacity hover:opacity-90"
          >
            Post a Job
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
