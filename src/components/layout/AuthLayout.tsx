interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — soil-themed farm imagery, hidden on mobile */}
      <div className="bg-brand-900 relative hidden flex-col justify-between overflow-hidden p-12 md:flex md:w-1/2 lg:w-3/5">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          // Multi-stop gradient — no utility equivalent.
          style={{
            background:
              'linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-900) 40%, var(--color-brand) 100%)',
          }}
        />

        {/* Background texture pattern */}
        <div
          className="absolute inset-0 opacity-10"
          // Layered radial-gradient dot pattern — no utility equivalent.
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.5) 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, var(--color-brand) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span
              className="font-display text-text-on-brand text-2xl font-semibold"
            >
              TopFarms
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <h2
            className="font-display text-text-on-brand mb-6 text-4xl leading-tight font-semibold lg:text-5xl"
          >
            New Zealand's Agriculture Job Marketplace
          </h2>
          <p className="text-lg text-text-on-brand">
            Connecting farm employers with skilled seekers across all 16 regions. DairyNZ
            qualifications, herd experience, and accommodation — all in one place.
          </p>
        </div>

        {/* Honest value points — replaced fabricated "500+/2,000+" stats (TF-003 truth pass). */}
        <div className="relative z-10 flex gap-8">
          <div>
            <p
              className="font-display text-brand-300 text-3xl font-bold"
            >
              16
            </p>
            <p className="text-sm text-text-on-brand">
              NZ regions covered
            </p>
          </div>
          <div>
            <p
              className="font-display text-brand-300 text-3xl font-bold"
            >
              5
            </p>
            <p className="text-sm text-text-on-brand">
              Farm sectors
            </p>
          </div>
          <div>
            <p
              className="font-display text-brand-300 text-3xl font-bold"
            >
              Free
            </p>
            <p className="text-sm text-text-on-brand">
              To join as a seeker
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — cream form area */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-bg"
      >
        <div className="w-full max-w-md">
          {/* Logo — shown on mobile only (left panel hidden) */}
          <div className="mb-8 text-center md:hidden">
            <span
              className="font-display text-brand-900 text-3xl font-semibold"
            >
              TopFarms
            </span>
          </div>

          {/* Title and subtitle */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1
                  className="font-display text-brand-900 mb-2 text-2xl font-semibold"
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-base text-text-muted">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  )
}
