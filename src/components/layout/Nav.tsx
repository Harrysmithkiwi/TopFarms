import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Menu, X, Leaf } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { dashboardPathFor } from '@/lib/routing'

const employerLinks = [
  { to: '/dashboard/employer', label: 'Dashboard' },
  // 'Applications' link removed 2026-04-29 (NAV-02 — employer flow is per-job, no aggregate page).
  // 'My Listings' (/listings) and 'Settings' (/settings) removed 2026-05-04 (UAT-04 — routes
  // unregistered in main.tsx; pages don't exist yet). Employer hub is /dashboard/employer.
]

const seekerLinks = [
  { to: '/jobs', label: 'Find Work' },
  { to: '/dashboard/seeker/applications', label: 'My Applications' },
  // 'My Profile' (/profile) and 'Settings' (/settings) removed 2026-05-04 (UAT-04 — routes
  // unregistered in main.tsx; pages don't exist yet). Seeker profile editing is via sidebar
  // 'Edit Profile' → /onboarding/seeker.
]

const publicLinks = [
  { to: '/jobs', label: 'Find Work' },
  { to: '/for-employers', label: 'For Employers' },
  { to: '/pricing', label: 'Pricing' },
]

export function Nav() {
  const { session, role, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navLinks = session
    ? role === 'employer'
      ? employerLinks
      : seekerLinks
    : publicLinks

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase() ?? '?'

  const navLinkClass = (isActive: boolean) =>
    [
      'text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
      isActive
        ? 'text-white bg-surface/8'
        : 'text-white/50 hover:text-white/80',
    ].join(' ')

  return (
    <>
      <nav
        className="sticky top-0 z-50 h-14 flex items-center px-4 md:px-6"
        style={{
          backgroundColor: 'var(--color-brand-900)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-[20px] font-semibold mr-8 flex-shrink-0 inline-flex items-center gap-1.5"
          style={{ color: 'var(--color-text-on-brand)' }}
          aria-label="TopFarms"
        >
          <Leaf size={20} className="text-brand" aria-hidden="true" />
          <span>TopFarms</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {session ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: 'var(--color-brand)',
                  color: 'var(--color-surface)',
                }}
                aria-label="User menu"
              >
                {avatarLetter}
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-10 z-20 w-48 rounded-lg border shadow-lg py-1"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {role && (
                      <Link
                        to={dashboardPathFor(role)}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-surface-2 transition-colors"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Dashboard
                      </Link>
                    )}
                    {role && <hr style={{ borderColor: 'var(--color-border)' }} className="my-1" />}
                    {/* My Profile + Settings dropdown items: add back when /profile and /settings
                        routes are registered in main.tsx (Phase 17/18 nav consolidation). */}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        signOut()
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-surface-2 transition-colors"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-surface/8"
                style={{ color: 'var(--color-text-on-brand)' }}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-brand)',
                  color: 'var(--color-surface)',
                }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-1.5 rounded-lg transition-colors hover:bg-surface/8"
          style={{ color: 'var(--color-text-on-brand)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-14 z-40 border-b shadow-lg"
          style={{
            backgroundColor: 'var(--color-brand-900)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'text-white bg-surface/8'
                      : 'text-white/60 hover:text-white/90',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {session ? (
              <button
                onClick={() => {
                  setMobileOpen(false)
                  signOut()
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                Sign Out
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'var(--color-text-on-brand)',
                  }}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: 'var(--color-brand)',
                    color: 'var(--color-surface)',
                  }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
