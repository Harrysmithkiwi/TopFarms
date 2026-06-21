// NOTE: Repurposed 2026-06-20. This dark-green band previously held fabricated
// testimonials ("Sarah M.", "James T.") and unverifiable scale stats
// (500+ farms, 2,000+ workers, 95% satisfaction). All removed pre-launch.
// It now carries honest differentiation: the real, on-farm dimensions the
// Claude-powered match engine scores on. No claimed people, no claimed numbers.
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Home, Users, Tractor, Sprout, MapPin, Award } from 'lucide-react'

interface Dimension {
  icon: typeof Home
  title: string
  body: string
}

const dimensions: Dimension[] = [
  {
    icon: Home,
    title: 'Accommodation',
    body: 'On-farm house, single quarters, or bring-your-own. We match what is offered to what is needed.',
  },
  {
    icon: Users,
    title: 'Couples & family',
    body: 'Two-role placements and family-friendly farms, surfaced together rather than as an afterthought.',
  },
  {
    icon: Tractor,
    title: 'Shed & system',
    body: 'Rotary or herringbone, robotic or conventional. The detail that decides whether a worker is a fit.',
  },
  {
    icon: Sprout,
    title: 'Livestock & sector',
    body: 'Dairy, sheep & beef, and the wider sector, with the stock experience each role actually calls for.',
  },
  {
    icon: MapPin,
    title: 'Region & travel',
    body: 'Distance, relocation, and the realities of rural life weighed into every score, not bolted on.',
  },
  {
    icon: Award,
    title: 'Experience & tickets',
    body: 'Years on the land, qualifications, and the practical tickets that prove someone can do the work.',
  },
]

export function TestimonialsSection() {
  const reduce = useReducedMotion()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
  }
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="px-4 py-24" style={{ backgroundColor: 'var(--color-brand-900)' }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-8" style={{ backgroundColor: 'var(--color-brand)' }} />
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--color-brand)' }}
            >
              Why TopFarms
            </p>
          </div>
          <h2
            className="font-display text-4xl font-bold tracking-tight md:text-5xl"
            style={{ color: 'var(--color-text-on-brand)' }}
          >
            We match on what actually{' '}
            <em style={{ color: 'var(--color-brand-50)', fontStyle: 'italic' }}>matters on-farm</em>
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            A generic job board sees a title and a region. TopFarms reads the texture of farm work,
            so workers find roles that fit their life and employers hire people who stay.
          </p>
        </div>

        {/* Dimension grid */}
        <motion.div
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {dimensions.map((d) => {
            const Icon = d.icon
            return (
              <motion.div
                key={d.title}
                variants={item}
                className="flex flex-col gap-3 p-7"
                style={{ backgroundColor: 'var(--color-brand-900)' }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'color-mix(in oklab, var(--color-brand) 16%, transparent)' }}
                >
                  <Icon size={18} strokeWidth={2} style={{ color: 'var(--color-brand)' }} aria-hidden="true" />
                </span>
                <h3
                  className="font-display text-lg font-semibold"
                  style={{ color: 'var(--color-text-on-brand)' }}
                >
                  {d.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {d.body}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
