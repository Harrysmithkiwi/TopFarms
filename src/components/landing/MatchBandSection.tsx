import { useInView } from '@/hooks/useInView'

// v13 match band (comp section 4, id="how"). Supersedes AIMatchingSection:
// same job (explain the mechanic), no purple, no fake browser chrome. This is
// the ONE place the landing page explains scoring (directive 1.3); nothing
// else on the page re-advertises it.
// Bars: rebased to start at 50, transform-driven, no filled track (1.7).
// "Every applicant stays on the list..." is load-bearing (1.5). Do not cut.

const DIMS = [
  ['skills', 92],
  ['location', 84],
  ['housing', 88],
  ['roster', 90],
  ['stock class', 85],
  ['visa type', 95],
  ['pay range', 78],
] as const

const rebase = (v: number) => Math.max(0, Math.min(100, (v - 50) * 2)) / 100

export function MatchBandSection() {
  const { ref, inView } = useInView(0.2)

  return (
    <section id="how" aria-labelledby="how-h2" className="mx-auto max-w-[1440px] px-3 pt-3.5 sm:px-5">
      <div
        ref={ref}
        className="v13-dark bg-green relative grid items-start gap-8 overflow-hidden rounded-3xl px-7 py-10 text-white md:grid-cols-[.85fr_1.15fr] md:gap-12 md:px-11"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
        />
        <div className="relative">
          <h2 id="how-h2" className="text-[26px] leading-none font-extrabold tracking-[-.04em] md:text-[34px]">
            Built around the farm
          </h2>
          <p className="text-lime mt-4 text-[78px] leading-[.82] font-extrabold tracking-[-.05em] md:text-[120px]">
            87
          </p>
          <p className="mt-2.5 text-[13px] font-medium text-white/70">
            Match score for one applicant against one job.
          </p>
          {/* load-bearing sentence, directive 1.5 */}
          <p className="mt-4 max-w-[38ch] text-[15.5px] text-white/82">
            Every applicant stays on the list, ordered by fit. You decide who to ring.
          </p>
        </div>
        <div className="relative">
          <div className="border-t border-white/20 pt-1.5">
            {DIMS.map(([k, v], i) => (
              <div
                key={k}
                className="grid grid-cols-[104px_1fr_36px] items-center gap-3.5 py-2 text-[13.5px] font-medium"
              >
                <span className="text-white/72">{k}</span>
                <span className="h-[3px]">
                  <span
                    className="bg-ochre block h-full origin-left rounded-sm transition-transform duration-700"
                    style={{
                      transform: `scaleX(${inView ? rebase(v) : 0})`,
                      transitionDelay: `${120 + i * 70}ms`,
                    }}
                  />
                </span>
                <span className="text-ochre text-right font-extrabold">{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-[46ch] border-t border-white/16 pt-4 text-sm text-white/78 italic">
            "Strong: 50-bail rotary experience matches yours. Watch: housing is single quarters,
            you asked for a family house."
          </p>
        </div>
      </div>
    </section>
  )
}
