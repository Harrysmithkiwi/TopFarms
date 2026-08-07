interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

// v13 port, stage 3a (directive 1.17a). Restyled in place rather than wrapped in
// PublicShell: auth is a deliberately chrome-less surface (no nav, no footer),
// and this layout is shared by all seven auth routes -- porting only /login and
// /signup would step between design eras inside one flow.
// v13-shell gives Archivo + the ink focus ring; v13-dark flips the ring to white
// on the green panel. The "16 / 5 / Free" value points are a TF-003 truth-pass
// artefact (they replaced fabricated 500+/2,000+ stats) and survive verbatim.

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="v13-shell bg-cream text-ink font-archivo flex min-h-screen [font-variant-numeric:tabular-nums]">
      {/* Left panel: brand surface, hidden on mobile */}
      <div className="v13-dark bg-green relative hidden flex-col justify-between overflow-hidden p-12 md:flex md:w-1/2 lg:w-3/5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(96deg,rgba(255,255,255,.035)_0_1px,transparent_1px_54px)]"
        />
        <div className="relative z-10">
          <span className="text-2xl font-extrabold tracking-tight text-white">
            TopFarms<span className="text-lime">.</span>
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="mb-5 text-4xl leading-[1.05] font-extrabold tracking-[-.035em] text-white lg:text-5xl">
            New Zealand's agriculture job marketplace
          </h2>
          <p className="max-w-[52ch] text-lg text-white/80">
            Connecting farm employers with skilled workers across all 16 regions. Job type,
            roster, stock class, visa type and housing, all in one place.
          </p>
        </div>

        {/* Honest value points. Replaced fabricated stats in the TF-003 truth pass. */}
        <div className="relative z-10 flex gap-10">
          <div>
            <p className="text-lime text-3xl font-extrabold tracking-[-.03em]">16</p>
            <p className="mt-1 text-sm text-white/80">NZ regions covered</p>
          </div>
          <div>
            <p className="text-lime text-3xl font-extrabold tracking-[-.03em]">5</p>
            <p className="mt-1 text-sm text-white/80">Farm sectors</p>
          </div>
          <div>
            <p className="text-lime text-3xl font-extrabold tracking-[-.03em]">Free</p>
            <p className="mt-1 text-sm text-white/80">To join as a worker</p>
          </div>
        </div>
      </div>

      {/* Right panel: form area */}
      <div className="bg-cream flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* <main>, not a div: this layout has no shell around it, so /login and
            /signup had no main landmark at all — nothing for a screen-reader
            user to skip to. DashboardLayout and AdminLayout both provide one. */}
        <main className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            <span className="text-3xl font-extrabold tracking-tight">
              TopFarms<span className="text-ochre-ink">.</span>
            </span>
          </div>

          {(title || subtitle) && (
            <div className="mb-7">
              {title && (
                <h1 className="mb-2 text-2xl font-extrabold tracking-[-.03em]">{title}</h1>
              )}
              {subtitle && <p className="text-ink-60 text-base">{subtitle}</p>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
