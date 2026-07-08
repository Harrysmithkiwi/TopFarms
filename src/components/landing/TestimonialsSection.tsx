// ⚠️ DO NOT RENDER — truth pass 2026-07-08. Every testimonial, stat, and "Verified"
// badge below is fabricated (platform has no real users yet). Unrendered from Home.tsx.
// Reinstate only with real placement data ({{PLACEMENTS_TO_DATE}}) and per-name written
// consent per the GTM consent rule (funnel-design.md §compliance). See REMEDIATION-LOG.md.
interface Testimonial {
  name: string
  farm: string
  quote: string
  initial: string
}

// Placeholder shape only — unrendered. Real, per-name-consented quotes replace these
// when they exist; no invented names, farms, or metrics may go live (truth pass).
const testimonials: Testimonial[] = [
  { name: 'Example Name', farm: 'Example Farm, Region', quote: 'Placeholder — real consented quote only.', initial: 'E' },
]

const stats: { value: string; label: string }[] = []

function StarRating() {
  return (
    <div className="mb-4 flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.5l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.81l-3.708 1.1.708-4.128-3-2.924 4.146-.602L8 1.5z"
            fill="var(--color-warn)"
          />
        </svg>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-brand-900)' }}>
      <div className="mx-auto max-w-6xl">
        {/* Stat blocks row — above the testimonial heading/cards */}
        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="py-6 text-center md:border-r"
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                borderRight: i === stats.length - 1 ? 'none' : undefined,
              }}
            >
              <p
                className="font-display mb-1 text-3xl font-bold md:text-4xl"
                style={{ color: 'var(--color-text-on-brand)' }}
              >
                {stat.value}
              </p>
              <p
                className="text-sm tracking-wider uppercase"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="mb-12 text-center">
          <h2
            className="font-display text-4xl font-bold md:text-5xl"
            style={{ color: 'var(--color-text-on-brand)' }}
          >
            Trusted by farms across{' '}
            <em style={{ color: 'var(--color-brand-50)', fontStyle: 'italic' }}>New Zealand</em>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 rounded-2xl p-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <StarRating />

              {/* Quote */}
              <blockquote
                className="flex-1 text-base leading-relaxed italic"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                "{t.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--color-brand-hover)',
                    color: 'var(--color-text-on-brand)',
                  }}
                >
                  {t.initial}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-on-brand)' }}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t.farm}
                  </p>
                </div>
                {/* Verified badge */}
                <div className="ml-auto flex-shrink-0">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'rgba(122,175,63,0.15)',
                      color: 'var(--color-brand)',
                    }}
                  >
                    Verified
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
