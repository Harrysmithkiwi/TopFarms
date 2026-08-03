import { Link } from 'react-router'

// v13 worker split (comp section 6). New: no production equivalent existed.
// The profile panel shows a WORD, never a personal number (directive 1.4):
// a number attached to a person invites reading it as a rating of their worth,
// and the worker side includes structurally vulnerable migrant workers.

const PROFILE = [
  ['housing', 'family house', true],
  ['roster', '5:2 or 6:2', false],
  ['job type', 'dairy, 2IC', true],
  ['stock class', 'dairy, beef', false],
  ['visa type', 'class 2, HT', true],
  ['couple', 'yes', false],
] as const

const CHIPS = [
  'family house',
  'couple-friendly',
  'roster',
  'job type',
  'stock class',
  'sector',
  'visa type',
]

export function WorkerSplitSection() {
  return (
    <section aria-labelledby="work-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="grid gap-3.5 md:grid-cols-[.92fr_1.08fr]">
        <div className="v13-dark bg-green relative overflow-hidden rounded-3xl p-6 text-white sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
          />
          <div className="relative">
            <p className="text-lime font-bricolage text-xs font-semibold tracking-[.06em] uppercase">
              Your profile
            </p>
            <div className="mt-4">
              {PROFILE.map(([k, v, on]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-3.5 border-b border-white/11 py-3 text-[13.5px] font-medium"
                >
                  <span className="text-white/72">{k}</span>
                  <span className={on ? 'text-lime text-right' : 'text-right text-white'}>{v}</span>
                </div>
              ))}
            </div>
            {/* a word, never a number (1.4) */}
            <div className="mt-5 flex items-baseline gap-2.5 border-t border-white/16 pt-4">
              <span className="text-lime text-[34px] leading-none font-extrabold tracking-[-.04em]">
                Strong
              </span>
              <span className="text-[12.5px] leading-snug font-medium text-white/72">
                fit against
                <br />
                Dairy 2IC, Mid-Canterbury
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card border-line flex flex-col justify-center rounded-3xl border px-7 py-9 md:px-11">
          <h2 id="work-h2" className="text-3xl leading-[1.04] font-extrabold tracking-[-.04em] lowercase md:text-[40px]">
            work that fits <i className="text-green font-normal">the life you want</i>
          </h2>
          <p className="text-ink-60 mt-4 max-w-[46ch] text-[15.5px]">
            The filters that matter don't exist anywhere else. Search by them, set them on your
            profile, and see how well each job fits before you apply.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <span
                key={c}
                className="border-line bg-cream text-ink-60 rounded-full border px-3.5 py-2 text-[13px] font-medium"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/signup?role=seeker"
              className="bg-green hover:bg-green-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-colors"
            >
              I'm looking for work
            </Link>
            <span className="text-ink-40 text-[13px] font-medium">
              free, always. workers never pay.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
