import { Link } from 'react-router'
import { motion, type Variants } from 'motion/react'
import { Target } from 'lucide-react'

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
      className="relative min-h-screen overflow-hidden pt-14 bg-brand-900"
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
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 pb-20 md:px-6 md:pt-24 lg:grid-cols-[1fr_480px]">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          {/* Eyebrow badge */}
          <div className="inline-flex w-fit items-center gap-2">
            <div
              className="border-brand/30 bg-brand/10 text-brand-300 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300"
              />
              NZ Agriculture
            </div>
          </div>

          {/* Headline */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="font-display text-text-on-brand leading-[1.05] font-bold tracking-tight"
            // fluid clamp() type — no utility equivalent; colour is on the class.
            style={{ fontSize: 'clamp(48px, 6.5vw, 82px)' }}
          >
            <motion.span variants={lineVariants} className="block">
              Where New Zealand's
            </motion.span>
            <motion.span
              variants={lineVariants}
              className="text-brand-50 italic block"
            >
              Best Farms
            </motion.span>
            <motion.span variants={lineVariants} className="block">
              Find Their Next Team
            </motion.span>
          </motion.h1>

          {/* Subtext */}
          <p
            className="max-w-xl text-lg leading-relaxed md:text-xl text-white/65"
          >
            TopFarms matches skilled farm workers with quality employers across dairy, sheep &amp;
            beef, and livestock operations.
          </p>

          {/* Dual CTA fork */}
          <div
            className="border-white/12 rounded-[14px] flex flex-col overflow-hidden border sm:flex-row"
          >
            {/* Seeker side */}
            <div
              className="flex flex-1 flex-col gap-3 p-6 border-r border-white/8"
            >
              <p
                className="text-[10px] font-bold tracking-widest uppercase text-brand-300"
              >
                Farm Workers
              </p>
              <div>
                <p
                  className="font-display mb-1 text-lg font-semibold text-text-on-brand"
                >
                  Find Your Next Role
                </p>
                <p className="text-sm text-white/55">
                  Browse jobs matched to your experience
                </p>
              </div>
              <Link
                to="/signup?role=seeker"
                // brand-hover, not brand: white on brand was 3.33:1 (axe serious, Phase 4.6)
                className="bg-brand-hover text-text-on-brand mt-1 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Find Farm Work
              </Link>
            </div>

            {/* Employer side */}
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p
                className="text-[10px] font-bold tracking-widest uppercase text-text-on-brand"
              >
                Farm Employers
              </p>
              <div>
                <p
                  className="font-display mb-1 text-lg font-semibold text-text-on-brand"
                >
                  Find Skilled Workers
                </p>
                <p className="text-sm text-white/55">
                  AI-matched candidates for your farm
                </p>
              </div>
              <Link
                to="/signup?role=employer"
                className="border-text-on-brand text-text-on-brand hover:bg-warn/10 mt-1 inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                Post a Job
              </Link>
            </div>
          </div>
        </div>

        {/* Right column — decorative floating cards (desktop only).
            Illustration only: names are placeholders, percentages are not real stats.
            The "Example" label keeps this unmistakable. Do not present as real data. */}
        <div className="relative hidden flex-col gap-4 lg:flex" aria-hidden="true">
          <span
            className="bg-white/12 text-white/70 self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
          >
            Example
          </span>
          {/* Main card */}
          <div
            className="bg-white/6 border border-white/10 backdrop-blur-[12px] rounded-2xl p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p
                  className="font-display mb-0.5 text-base font-semibold text-text-on-brand"
                >
                  Senior Dairy Farm Manager
                </p>
                <p className="text-sm text-white/60">
                  Example Farm, Waikato
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Dairy', 'Herd Manager', 'Permanent', '$90k+'].map((tag) => (
                <span
                  key={tag}
                  className="bg-white/8 text-white/70 rounded-full px-2 py-0.5 text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Candidate preview card */}
          <div
            className="bg-white/5 border border-white/8 backdrop-blur-[12px] ml-8 rounded-2xl p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="bg-brand/30 text-brand-300 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                EX
              </div>
              <div>
                <p
                  className="text-sm font-semibold text-text-on-brand"
                >
                  Example Profile
                </p>
                <p className="text-xs text-white/50">
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
                    className="mb-0.5 flex justify-between text-[11px] text-white/50"
                  >
                    <span>{label}</span>
                  </div>
                  <div
                    className="h-1 overflow-hidden rounded-full bg-white/10"
                  >
                    <div
                      className="bg-brand h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Match notification chip */}
          <div
            className="bg-brand/15 border-brand/30 ml-4 flex items-center gap-3 self-start rounded-xl border px-4 py-3 shadow-lg backdrop-blur-[8px]"
          >
            <Target
              className="h-5 w-5 flex-shrink-0 text-brand"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-brand-300">
                New match found
              </p>
              <p className="text-[11px] text-white/60">
                3 candidates match your criteria
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <p className="text-xs tracking-widest uppercase text-white/40">
          Explore
        </p>
        <div className="flex animate-bounce flex-col items-center gap-0.5">
          <div className="h-5 w-px bg-white/25" />
          <svg className="text-white/30"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
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
