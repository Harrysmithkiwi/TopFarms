import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

// v13 hero (directive 1.1, 1.11). One dark green card: type left, example match
// panel right. The panel is EXPLANATORY, not a live system -- labelled
// "Example", no pulse, no "updated live", no verification claims (1.1). The
// invented candidate names are acceptable only while that label stays.
//
// Per-audience headline (1.11): BOTH strings are in the DOM; the employer
// string is the CSS default and the seeker string appears via the shell's
// data-aud attribute (.emp-only / .seek-only in index.css). The toggle is
// load-bearing for this copy.

const ROLES = [
  {
    t: 'Dairy 2IC',
    l: 'Mid-Canterbury',
    f: ['450 cows', '50-bail rotary', '5:2 roster', 'house incl.'],
    c: [
      ['R. McKenzie', '8 yrs dairy · rotary', 94],
      ['T. Paterson', '5 yrs dairy, herringbone', 88],
      ['J. Whaanga', '3 yrs mixed, relief milking', 76],
    ],
  },
  {
    t: 'Harvest Machinery Operator',
    l: 'Ashburton · seasonal',
    f: ['Class 5', 'arable run Oct to Apr', '11:3 over harvest', 'accom. avail.'],
    c: [
      ['D. Cullen', '12 yrs arable · class 5', 96],
      ['M. Ropata', '6 yrs machinery, baling', 87],
      ['S. Frew', '4 yrs cropping, irrigation', 79],
    ],
  },
  {
    t: 'Shepherd, General',
    l: 'Central Otago high country',
    f: ['6,000 SU', '2 dogs required', 'single quarters', 'vehicle'],
    c: [
      ['W. Tahi', '9 yrs sheep and beef · 3 dogs', 92],
      ['A. Bourke', '5 yrs high country, musterer', 85],
      ['L. Nikora', '2 yrs general, working dogs', 71],
    ],
  },
  {
    t: 'Assistant Farm Manager',
    l: 'Southland',
    f: ['cropping and lamb finishing', 'irrigation exp', 'family house', '$80-95k'],
    c: [
      ['K. Dalziel', '11 yrs mixed · irrigation', 93],
      ['P. Suli', '7 yrs cropping, lamb finishing', 86],
      ['R. Vaega', '4 yrs farm ops, fencing', 74],
    ],
  },
] as const

// Bars are rebased to start at 50 so real differences read (directive 1.7).
// Driven by transform, never width (layout thrash).
const rebase = (v: number) => Math.max(0, Math.min(100, (v - 50) * 2)) / 100

export function HeroSection() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [out, setOut] = useState(false)
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current
  const hovering = useRef(false)

  // WCAG 2.2.2: auto-updating content pauses on hover, focus, and via a real
  // control; never starts at all under reduced motion.
  useEffect(() => {
    if (reduced || paused) return
    const t = setInterval(() => {
      if (hovering.current) return
      setOut(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % ROLES.length)
        setOut(false)
      }, 360)
    }, 4600)
    return () => clearInterval(t)
  }, [reduced, paused])

  const role = ROLES[idx]

  return (
    <section className="px-3 pt-3 sm:px-5" aria-labelledby="hero-h1">
      <div className="v13-dark bg-green relative mx-auto grid max-w-[1440px] items-center gap-8 overflow-hidden rounded-3xl px-6 py-9 text-white sm:px-10 md:grid-cols-[1.08fr_.92fr] md:gap-12 md:py-12">
        {/* paddock rules texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
        />
        <div className="relative">
          <p className="text-lime font-bricolage text-xs font-semibold tracking-[.08em] uppercase">
            Agricultural recruitment
          </p>
          {/* Both headline strings in the DOM; employer is the CSS default (1.11) */}
          <h1
            id="hero-h1"
            className="mt-5 text-[46px] leading-[.9] font-extrabold tracking-[-.04em] uppercase sm:text-[64px] lg:text-[88px]"
          >
            <span className="emp-only">
              <span className="block">The right match,</span>
              <span className="text-lime block">both ways.</span>
            </span>
            <span className="seek-only">
              <span className="block">Find the farm job</span>
              <span className="text-lime block">that fits.</span>
            </span>
          </h1>
          <p className="emp-only mt-6 max-w-[42ch] text-[17px] text-white/80">
            Applicants arrive ordered by how well they fit the job, with the reasons attached.
          </p>
          <p className="seek-only mt-6 max-w-[42ch] text-[17px] text-white/80">
            See how well each job fits before you apply, with the reasons written out.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              to="/signup?role=employer"
              className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
            >
              I'm hiring
            </Link>
            <Link
              to="/signup?role=seeker"
              className="text-green hover:bg-cream-2 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[15px] font-semibold transition-colors"
            >
              I'm looking for work
            </Link>
          </div>
        </div>

        {/* Example panel. Explanatory, not simulated (1.1). */}
        <div className="bg-green-3 relative rounded-2xl border border-white/15 p-5">
          <div className="font-bricolage flex items-center justify-between gap-3 border-b border-white/12 pb-3 text-xs font-semibold tracking-[.05em] text-white/72 uppercase">
            <span id="hero-example-label">Example: how applicants arrive</span>
            {!reduced && (
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
                className="cursor-pointer rounded-full border border-white/28 px-2.5 py-1 text-[11px] tracking-[.04em] text-white/78 uppercase transition-colors hover:bg-white/12 hover:text-white"
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            )}
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            aria-describedby="hero-example-label"
            onMouseEnter={() => (hovering.current = true)}
            onMouseLeave={() => (hovering.current = false)}
            onFocus={() => (hovering.current = true)}
            onBlur={() => (hovering.current = false)}
            className={`transition-[opacity,transform] duration-300 ${out ? 'translate-y-1.5 opacity-0' : ''}`}
          >
            <div className="border-b border-white/10 py-3.5">
              <p className="text-[17px] font-extrabold tracking-[-.03em]">{role.t}</p>
              <p className="mt-1 text-[12.5px] font-medium text-white/66">{role.l}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {role.f.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-white/22 px-2 py-1 text-[11.5px] font-medium text-white/78"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            {role.c.map(([name, exp, score], i) => (
              <div
                key={String(name)}
                className="grid grid-cols-[24px_1fr_60px_34px] items-center gap-2.5 border-b border-white/8 py-2.5 text-[13px] last:border-b-0"
              >
                <span className="text-xs font-semibold text-white/62">0{i + 1}</span>
                <span>
                  <span className="text-[13.5px] font-semibold">{name}</span>
                  <br />
                  <span className="text-[11.5px] text-white/66">{exp}</span>
                </span>
                <span className="h-[3px]">
                  <span
                    className="bg-ochre block h-full origin-left rounded-sm transition-transform duration-700"
                    style={{ transform: `scaleX(${rebase(Number(score))})` }}
                  />
                </span>
                <span className="text-ochre text-right text-[15px] font-extrabold">{score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
