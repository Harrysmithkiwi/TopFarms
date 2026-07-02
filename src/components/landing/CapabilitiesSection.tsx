// Pre-launch stats-block swap (2026-06-20). Replaces the live CountersSection
// in the page flow so we never surface near-zero launch numbers (0 jobs once the
// UAT record is archived). CountersSection.tsx is intentionally KEPT in the
// codebase — wire it back into Home.tsx once real listings create genuine traction.
// These are capability statements only: no counts, no claimed scale.
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Sparkles, Route, Sprout } from 'lucide-react'

interface Capability {
  icon: typeof Sparkles
  title: string
  body: string
}

const capabilities: Capability[] = [
  {
    icon: Sparkles,
    title: 'Fit, not keywords',
    body: 'The TopFarms Match Score rates how well a person and a role actually fit, built on the real texture of farm work: accommodation, shed type, livestock and more.',
  },
  {
    icon: Route,
    title: 'Clear for both sides',
    body: 'Workers find roles that suit their life. Farms find people who stay. One platform, two honest paths.',
  },
  {
    icon: Sprout,
    title: 'Grounded in the real work',
    body: 'No stock photos, no fluff. A clean, fast tool built around how New Zealand farms actually hire.',
  },
]

export function CapabilitiesSection() {
  const reduce = useReducedMotion()
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  }
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-brand-900)' }}>
      <motion.div
        className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3 sm:gap-8"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        {capabilities.map((c) => {
          const Icon = c.icon
          return (
            <motion.div key={c.title} variants={item} className="flex flex-col gap-4">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'color-mix(in oklab, var(--color-brand) 16%, transparent)' }}
              >
                <Icon size={20} strokeWidth={2} style={{ color: 'var(--color-brand)' }} aria-hidden="true" />
              </span>
              <h3
                className="font-display text-xl font-semibold tracking-tight"
                style={{ color: 'var(--color-text-on-brand)' }}
              >
                {c.title}
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {c.body}
              </p>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
