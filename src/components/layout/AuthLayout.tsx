interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — soil-themed farm imagery, hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 bg-soil relative overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-soil-deep) 0%, var(--color-soil) 40%, var(--color-moss) 100%)',
          }}
        />

        {/* Background texture pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, var(--color-hay) 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, var(--color-meadow) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-hay)' }}
            >
              TopFarms
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <h2
            className="text-4xl lg:text-5xl font-semibold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-cream)' }}
          >
            New Zealand's Agriculture Job Marketplace
          </h2>
          <p className="text-lg" style={{ color: 'var(--color-hay)' }}>
            Connecting farm employers with skilled seekers across all 16 regions.
            DairyNZ qualifications, herd experience, and accommodation — all in one place.
          </p>
        </div>

        <div className="relative z-10 flex gap-8">
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-meadow)' }}>
              500+
            </p>
            <p className="text-sm" style={{ color: 'var(--color-hay)' }}>Farm roles listed</p>
          </div>
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-meadow)' }}>
              16
            </p>
            <p className="text-sm" style={{ color: 'var(--color-hay)' }}>NZ regions covered</p>
          </div>
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-meadow)' }}>
              2,000+
            </p>
            <p className="text-sm" style={{ color: 'var(--color-hay)' }}>Skilled seekers</p>
          </div>
        </div>
      </div>

      {/* Right panel — cream form area */}
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 py-12"
        style={{ backgroundColor: 'var(--color-cream)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo — shown on mobile only (left panel hidden) */}
          <div className="md:hidden mb-8 text-center">
            <span
              className="text-3xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-soil)' }}
            >
              TopFarms
            </span>
          </div>

          {/* Title and subtitle */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1
                  className="text-2xl font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-soil)' }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-base" style={{ color: 'var(--color-mid)' }}>
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
