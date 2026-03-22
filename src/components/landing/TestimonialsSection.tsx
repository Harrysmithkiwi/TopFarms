interface Testimonial {
  name: string
  farm: string
  quote: string
  initial: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah M.',
    farm: 'Greenfield Dairy, Waikato',
    quote: 'Found our new herd manager within two weeks. The match scoring saved us hours of screening.',
    initial: 'S',
  },
  {
    name: 'James T.',
    farm: 'Highview Station, Canterbury',
    quote: 'Best platform for farm work in NZ. The agriculture-specific filters actually understand what matters.',
    initial: 'J',
  },
  {
    name: 'Rachel & Tom K.',
    farm: 'Valley View Farms, Southland',
    quote: 'As a couple looking for dairy work, TopFarms was the only platform that matched us together.',
    initial: 'R',
  },
]

const stats = [
  { value: '500+', label: 'Farms' },
  { value: '2,000+', label: 'Workers' },
  { value: '48hr', label: 'Avg Match Time' },
  { value: '95%', label: 'Satisfaction' },
]

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 1.5l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.81l-3.708 1.1.708-4.128-3-2.924 4.146-.602L8 1.5z"
            fill="var(--color-hay)"
          />
        </svg>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-soil)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Stat blocks row — above the testimonial heading/cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center py-6 md:border-r"
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                borderRight: i === stats.length - 1 ? 'none' : undefined,
              }}
            >
              <p
                className="text-3xl md:text-4xl font-bold font-display mb-1"
                style={{ color: 'var(--color-cream)' }}
              >
                {stat.value}
              </p>
              <p
                className="text-sm uppercase tracking-wider"
                style={{ color: 'rgba(247,242,232,0.5)' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h2
            className="font-display font-bold text-4xl md:text-5xl"
            style={{ color: 'var(--color-cream)' }}
          >
            Trusted by farms across{' '}
            <em style={{ color: 'var(--color-hay)', fontStyle: 'italic' }}>New Zealand</em>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <StarRating />

              {/* Quote */}
              <blockquote
                className="text-base italic leading-relaxed flex-1"
                style={{ color: 'rgba(247,242,232,0.8)' }}
              >
                "{t.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--color-fern)',
                    color: 'var(--color-cream)',
                  }}
                >
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-cream)' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(247,242,232,0.5)' }}>
                    {t.farm}
                  </p>
                </div>
                {/* Verified badge */}
                <div className="ml-auto flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(122,175,63,0.15)',
                      color: 'var(--color-meadow)',
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
