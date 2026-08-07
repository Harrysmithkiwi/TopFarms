import { Link } from 'react-router'

// v13 pricing claim (directive 1.12). The comp's five pricing cards move to
// /pricing; the POSITION stays here, in the slot they vacate. Surface family
// per 1.6: green-3, flat, no rules -- the commercial surface, plainest on the
// page, matching "no calls, no quotes". Do not remove this claim line when
// touching the pricing table (NOT THIS).

export function PricingClaimSection() {
  return (
    <section aria-labelledby="price-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="bg-green-3 flex flex-wrap items-center justify-between gap-6 rounded-3xl px-7 py-9 text-white md:px-11">
        <div>
          <h2 id="price-h2" className="text-[26px] font-extrabold tracking-[-.04em]">
            Every listing free. Workers never pay.
          </h2>
          <p className="mt-2 text-[15px] font-medium text-white/82">
            Prices published, no calls, no quotes.
          </p>
        </div>
        <Link
          to="/pricing"
          className="bg-lime text-green-2 hover:bg-lime-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors"
        >
          See pricing
        </Link>
      </div>
    </section>
  )
}
