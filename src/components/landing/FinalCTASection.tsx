import { Link } from 'react-router'
import { motion } from 'motion/react'

export function FinalCTASection() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-soil-deep)' }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2
          className="font-display font-bold text-4xl md:text-5xl mb-4"
          style={{ color: 'var(--color-cream)' }}
        >
          Ready to Find Your Perfect Match?
        </h2>
        <p
          className="text-lg mb-8"
          style={{ color: 'var(--color-cream)', opacity: 0.8 }}
        >
          Whether you're looking for farm work or looking to hire, TopFarms connects you with the right people.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/seeker/onboarding"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-meadow)',
              color: 'var(--color-soil)',
            }}
          >
            Find Farm Work
          </Link>
          <Link
            to="/employer/onboarding"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full font-semibold border transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--color-hay)',
              color: 'var(--color-cream)',
            }}
          >
            Post a Job
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
