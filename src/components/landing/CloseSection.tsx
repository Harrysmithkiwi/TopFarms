import { Link } from 'react-router'

// v13 close (comp section 9). Supersedes FinalCTASection. End-of-page surface
// per directive 1.6: green-2, finer 28px rules. Canonical intent labels only.

export function CloseSection() {
  return (
    <section aria-labelledby="close-h2" className="mx-auto max-w-[1440px] px-3 pt-14 pb-0 sm:px-5 md:pt-16">
      <div className="v13-dark bg-green-2 relative overflow-hidden rounded-3xl px-7 py-14 text-center text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.045)_0_1px,transparent_1px_28px)]"
        />
        <div className="relative">
          <h2
            id="close-h2"
            className="mx-auto max-w-[16ch] text-3xl leading-none font-extrabold tracking-[-.04em] uppercase md:text-[52px]"
          >
            The whole job. <i className="text-lime font-normal normal-case">The whole person.</i>
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup?role=employer"
              className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
            >
              I'm hiring
            </Link>
            <Link
              to="/signup?role=seeker"
              className="hover:text-lime inline-flex min-h-11 items-center px-2.5 text-[15px] font-semibold text-white underline decoration-[1.5px] underline-offset-4 transition-colors"
            >
              I'm looking for work
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
