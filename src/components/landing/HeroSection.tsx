import { Link } from 'react-router'
import { motion, type Variants } from 'motion/react'

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
}

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen overflow-hidden pt-14"
      style={{ backgroundColor: 'var(--color-brand-900)' }}
    >
      {/* Radial brand glow — one green, no earth-tones */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 90% 8%, color-mix(in oklab, var(--color-brand) 20%, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 55% 45% at 0% 100%, color-mix(in oklab, var(--color-brand) 12%, transparent) 0%, transparent 70%)
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
            color-mix(in oklab, var(--color-brand) 5%, transparent) 0px,
            color-mix(in oklab, var(--color-brand) 5%, transparent) 1px,
            transparent 1px,
            transparent 29px
          )`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 pb-20 md:px-6 md:pt-24 lg:grid-cols-[1fr_480px]">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          {/* Eyebrow badge */}
          <div className="inline-flex w-fit items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase"
              style={{
                borderColor: 'color-mix(in oklab, var(--color-brand) 30%, transparent)',
                backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
                color: 'var(--color-brand)',
              }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ backgroundColor: 'var(--color-brand)' }}
              />
              NZ Agriculture
            </div>
          </div>

          {/* Headline */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="font-display leading-[1.05] font-bold tracking-tight"
            style={{
              fontSize: 'clamp(48px, 6.5vw, 82px)',
              color: 'var(--color-text-on-brand)',
            }}
          >
            <motion.span variants={lineVariants} className="block">
              Great farms and
            </motion.span>
            <motion.span
              variants={lineVariants}
              className="block"
              style={{ color: 'var(--color-brand-50)', fontStyle: 'italic' }}
            >
              great people,
            </motion.span>
            <motion.span variants={lineVariants} className="block">
              matched on what matters.
            </motion.span>
          </motion.h1>

          {/* Subtext */}
          <p
            className="max-w-xl text-lg leading-relaxed md:text-xl"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            TopFarms scores every match on the real texture of farm work: accommodation, couples,
            shed type, livestock, region, experience. Workers find roles that fit. Employers hire
            people who stay.
          </p>

          {/* Dual CTA fork */}
          <div
            className="flex flex-col overflow-hidden border sm:flex-row"
            style={{ borderColor: 'rgba(255,255,255,0.12)', borderRadius: '14px' }}
          >
            {/* Seeker side */}
            <div
              className="flex flex-1 flex-col gap-3 p-6"
              style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-brand)' }}
              >
                Farm Workers
              </p>
              <div>
                <p
                  className="font-display mb-1 text-lg font-semibold"
                  style={{ color: 'var(--color-text-on-brand)' }}
                >
                  Find Your Next Role
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Browse jobs matched to your experience
                </p>
              </div>
              <Link
                to="/signup?role=seeker"
                className="mt-1 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-brand)',
                  color: 'var(--color-text-on-brand)',
                }}
              >
                Find Farm Work
              </Link>
            </div>

            {/* Employer side */}
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-text-on-brand)' }}
              >
                Farm Employers
              </p>
              <div>
                <p
                  className="font-display mb-1 text-lg font-semibold"
                  style={{ color: 'var(--color-text-on-brand)' }}
                >
                  Find Skilled Workers
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Candidates ranked by Match Score
                </p>
              </div>
              <Link
                to="/signup?role=employer"
                className="mt-1 inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
                style={{
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'var(--color-text-on-brand)',
                }}
              >
                Post a Job
              </Link>
            </div>
          </div>
        </div>

        {/* Right column — decorative floating cards (desktop only) */}
        <div className="relative hidden flex-col gap-4 lg:flex" aria-hidden="true">
          {/* Main card */}
          <div
            className="rounded-2xl p-5 shadow-2xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p
                  className="font-display mb-0.5 text-base font-semibold"
                  style={{ color: 'var(--color-text-on-brand)' }}
                >
                  Dairy Farm Manager
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Waikato · Permanent
                </p>
              </div>
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-brand) 22%, transparent)',
                  color: 'var(--color-brand)',
                  border: '2px solid var(--color-brand)',
                }}
              >
                94%
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Dairy', 'Herd Manager', 'Permanent', '$90k+'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Candidate preview card */}
          <div
            className="ml-8 rounded-2xl p-4 shadow-xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-brand) 28%, transparent)',
                  color: 'var(--color-brand)',
                }}
              >
                SC
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-on-brand)' }}
                >
                  Sample candidate
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                  <div
                    className="mb-0.5 flex justify-between text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <span>{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div
                    className="h-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: 'var(--color-brand)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Match notification chip */}
          <div
            className="ml-4 flex items-center gap-3 self-start rounded-xl px-4 py-3 shadow-lg"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-brand) 16%, transparent)',
              border: '1px solid color-mix(in oklab, var(--color-brand) 30%, transparent)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                New match found
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                3 candidates match your criteria
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Explore
        </p>
        <div className="flex animate-bounce flex-col items-center gap-0.5">
          <div className="h-5 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
