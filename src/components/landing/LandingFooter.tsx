import { Link } from 'react-router'

export function LandingFooter() {
  return (
    <footer className="px-4 py-14" style={{ backgroundColor: 'var(--color-brand-900)' }}>
      <div className="mx-auto max-w-6xl">
        {/* Main columns */}
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="font-display mb-3 inline-block text-xl font-semibold"
              style={{ color: 'var(--color-text-on-brand)' }}
            >
              🌿 TopFarms
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              New Zealand's agricultural recruitment platform.
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3
              className="mb-4 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/jobs"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link
                  to="/signup?role=employer"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Post a Job
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Log In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3
              className="mb-4 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@topfarms.co.nz"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3
              className="mb-4 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/privacy"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            &copy; 2026 TopFarms. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
