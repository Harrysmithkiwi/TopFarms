// v13 problem section (comp section 3). New: no production equivalent existed.
// The recitation was cut in v11 (directive section 3); this keeps the claim
// short and leaves the seven dimensions to the match band that follows.

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="bg-card border-line grid items-center gap-8 rounded-3xl border px-7 py-9 md:grid-cols-2 md:gap-11 md:px-11">
        <h2 className="text-3xl leading-[1] font-extrabold tracking-[-.04em] md:text-[42px]">
          The right person applied. <i className="text-green font-normal">You just never found them.</i>
        </h2>
        <div>
          <p className="text-ink-60 max-w-[60ch] text-base">
            A farm job isn't a job title. General job boards can't see what the job actually is,
            so the fit stays buried in a pile of applications.
          </p>
          <p className="text-ink-60 mt-3.5 max-w-[60ch] text-base">
            TopFarms scores each applicant against the job you posted, and writes out why.
          </p>
        </div>
      </div>
    </section>
  )
}
