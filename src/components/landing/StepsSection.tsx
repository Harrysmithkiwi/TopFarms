// v13 steps (comp section 7). Supersedes HowItWorksSection: the comp's three
// steps serve BOTH sides in one set, so the per-role tabs (and their 4+4 step
// copy) retire with the old section. The 01/02/03 numerals are typographic
// rhythm, kept by explicit decision (directive 1.8, NOT THIS list) with
// --color-ochre-ink carrying the contrast fix.

const STEPS = [
  {
    n: '01',
    h: 'Say what matters',
    p: 'Employers post the whole job. Workers set the same things on a profile, once.',
  },
  {
    n: '02',
    h: 'See the score',
    p: 'Each applicant gets a score against your job, and the reason in plain language.',
  },
  {
    n: '03',
    h: 'Start with the strongest fits',
    p: 'Talk to the people the job actually suits, on either side of the table.',
  },
]

export function StepsSection() {
  return (
    <section aria-labelledby="steps-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="bg-card border-line rounded-3xl border px-7 py-8 md:px-11 md:pb-10">
        <h2 id="steps-h2" className="text-2xl font-extrabold tracking-[-.03em] md:text-[30px]">
          Three steps, either side.
        </h2>
        <div className="mt-6 grid gap-7 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-ink border-t-2 pt-3.5">
              <p className="text-ochre-ink text-sm font-extrabold tracking-[.02em]">{s.n}</p>
              <h3 className="mt-2.5 text-[17px] font-bold tracking-[-.02em]">{s.h}</h3>
              <p className="text-ink-60 mt-1.5 max-w-[64ch] text-[13.5px]">{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
