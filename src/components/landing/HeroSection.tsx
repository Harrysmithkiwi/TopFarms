import { Link } from 'react-router'
import { motion } from 'motion/react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
}

const lineVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen pt-14 overflow-hidden"
      style={{ backgroundColor: 'var(--color-soil-deep)' }}
    >
      {/* Radial gradient blobs */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 90% 10%, rgba(74,124,47,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 5% 90%, rgba(212,168,67,0.08) 0%, transparent 70%)
          `,
        }}
      />

      {/* Topographic lines overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(122,175,63,0.04) 0px,
            rgba(122,175,63,0.04) 1px,
            transparent 1px,
            transparent 29px
          )`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-20 md:pt-24 grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 items-center min-h-[calc(100vh-56px)]">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 w-fit">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase"
              style={{
                borderColor: 'rgba(122,175,63,0.3)',
                backgroundColor: 'rgba(122,175,63,0.1)',
                color: 'var(--color-meadow)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-meadow)' }}
              />
              NZ Agriculture
            </div>
          </div>

          {/* Headline */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="font-display font-bold leading-[1.05] tracking-tight"
            style={{
              fontSize: 'clamp(48px, 6.5vw, 82px)',
              color: 'var(--color-cream)',
            }}
          >
            <motion.span variants={lineVariants} className="block">
              Where New Zealand's
            </motion.span>
            <motion.span
              variants={lineVariants}
              className="block"
              style={{ color: 'var(--color-brand-50)', fontStyle: 'italic' }}
            >
              Best Farms
            </motion.span>
            <motion.span variants={lineVariants} className="block">
              Find Their Next Team
            </motion.span>
          </motion.h1>

          {/* Subtext */}
          <p
            className="text-lg md:text-xl leading-relaxed max-w-xl"
            style={{ color: 'rgba(247,242,232,0.65)' }}
          >
            TopFarms matches skilled farm workers with quality employers across dairy, sheep &amp;
            beef, and livestock operations.
          </p>

          {/* Dual CTA fork */}
          <div
            className="flex flex-col sm:flex-row border overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.12)', borderRadius: '14px' }}
          >
            {/* Seeker side */}
            <div
              className="flex-1 p-6 flex flex-col gap-3"
              style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-meadow)' }}
              >
                Farm Workers
              </p>
              <div>
                <p
                  className="font-display font-semibold text-lg mb-1"
                  style={{ color: 'var(--color-cream)' }}
                >
                  Find Your Next Role
                </p>
                <p className="text-sm" style={{ color: 'rgba(247,242,232,0.55)' }}>
                  Browse jobs matched to your experience
                </p>
              </div>
              <Link
                to="/signup?role=seeker"
                className="mt-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-meadow)',
                  color: 'var(--color-white)',
                }}
              >
                Find Farm Work
              </Link>
            </div>

            {/* Employer side */}
            <div className="flex-1 p-6 flex flex-col gap-3">
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-hay)' }}
              >
                Farm Employers
              </p>
              <div>
                <p
                  className="font-display font-semibold text-lg mb-1"
                  style={{ color: 'var(--color-cream)' }}
                >
                  Find Skilled Workers
                </p>
                <p className="text-sm" style={{ color: 'rgba(247,242,232,0.55)' }}>
                  AI-matched candidates for your farm
                </p>
              </div>
              <Link
                to="/signup?role=employer"
                className="mt-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-hay/10"
                style={{
                  borderColor: 'var(--color-hay)',
                  color: 'var(--color-hay)',
                }}
              >
                Post a Job
              </Link>
            </div>
          </div>
        </div>

        {/* Right column — decorative floating cards (desktop only) */}
        <div className="hidden lg:flex flex-col gap-4 relative" aria-hidden="true">
          {/* Main card */}
          <div
            className="rounded-2xl p-5 shadow-2xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p
                  className="font-display font-semibold text-base mb-0.5"
                  style={{ color: 'var(--color-cream)' }}
                >
                  Senior Dairy Farm Manager
                </p>
                <p className="text-sm" style={{ color: 'rgba(247,242,232,0.6)' }}>
                  Greenfield Dairy, Waikato
                </p>
              </div>
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: 'rgba(122,175,63,0.2)',
                  color: 'var(--color-meadow)',
                  border: '2px solid var(--color-meadow)',
                }}
              >
                94%
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Dairy', 'Herd Manager', 'Permanent', '$90k+'].map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(247,242,232,0.7)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Candidate preview card */}
          <div
            className="rounded-2xl p-4 shadow-xl ml-8"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(74,124,47,0.3)',
                  color: 'var(--color-meadow)',
                }}
              >
                JD
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-cream)' }}>
                  Jamie D.
                </p>
                <p className="text-xs" style={{ color: 'rgba(247,242,232,0.5)' }}>
                  5 yrs dairy experience
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Herd Management', pct: 90 },
                { label: 'Tractor Operation', pct: 75 },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-0.5" style={{ color: 'rgba(247,242,232,0.5)' }}>
                    <span>{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: 'var(--color-meadow)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Match notification chip */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg self-start ml-4"
            style={{
              backgroundColor: 'rgba(122,175,63,0.15)',
              border: '1px solid rgba(122,175,63,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-meadow)' }}>
                New match found
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(247,242,232,0.6)' }}>
                3 candidates match your criteria
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(247,242,232,0.4)' }}>
          Explore
        </p>
        <div className="flex flex-col items-center gap-0.5 animate-bounce">
          <div className="w-px h-5" style={{ backgroundColor: 'rgba(247,242,232,0.25)' }} />
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{ color: 'rgba(247,242,232,0.3)' }}
          >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  )
}
