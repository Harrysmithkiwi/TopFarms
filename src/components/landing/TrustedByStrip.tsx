// NOTE: Repurposed 2026-06-20. Previously a fabricated partner-logo wall
// ("Fonterra Sharemilkers", "Silver Fern Farms", etc.) implying endorsements
// that do not exist. Replaced with honest, defensible positioning statements.
// VERIFY before launch: each claim below must be true (see changelog flags).
import { motion, useReducedMotion } from 'motion/react'
import { MapPin, HeartHandshake, Sparkles, ShieldCheck } from 'lucide-react'

const values: { icon: typeof MapPin; label: string }[] = [
  { icon: MapPin, label: 'Built in NZ for NZ farming' },
  { icon: Sparkles, label: 'TopFarms Match Score' },
  { icon: HeartHandshake, label: 'Always free for workers' },
  { icon: ShieldCheck, label: 'First job post free' },
]

export function TrustedByStrip() {
  const reduce = useReducedMotion()
  return (
    <section className="px-4 py-14" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4"
      >
        {values.map(({ icon: Icon, label }) => (
          <div key={label} className="inline-flex items-center gap-2.5">
            <Icon size={16} strokeWidth={2} style={{ color: 'var(--color-brand)' }} aria-hidden="true" />
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
