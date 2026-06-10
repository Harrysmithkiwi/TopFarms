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
  { to: '/dashboard/seeker/documents', label: 'My Documents' },
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

  const navLinks = session ? (role === 'employer' ? employerLinks : seekerLinks) : publicLinks

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase() ?? '?'

  const navLinkClass = (isActive: boolean) =>
    [
      'text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
      isActive ? 'text-white bg-surface/8' : 'text-white/50 hover:text-white/80',
    ].join(' ')

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex h-14 items-center px-4 md:px-6"
        style={{
          backgroundColor: 'var(--color-brand-900)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="font-display mr-8 inline-flex flex-shrink-0 items-center gap-1.5 text-[20px] font-semibold"
          style={{ color: 'var(--color-text-on-brand)' }}
          aria-label="TopFarms"
        >
          <Leaf size={20} className="text-brand" aria-hidden="true" />
          <span>TopFarms</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
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
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {session ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
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
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div
                    className="absolute top-10 right-0 z-20 w-48 rounded-lg border py-1 shadow-lg"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {role && (
                      <Link
                        to={dashboardPathFor(role)}
                        onClick={() => setUserMenuOpen(false)}
                        className="hover:bg-surface-2 block px-4 py-2 text-sm transition-colors"
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
                      className="hover:bg-surface-2 w-full px-4 py-2 text-left text-sm transition-colors"
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
                className="hover:bg-surface/8 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text-on-brand)' }}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
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
          className="hover:bg-surface/8 ml-auto rounded-lg p-1.5 transition-colors md:hidden"
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
          className="fixed inset-x-0 top-14 z-40 border-b shadow-lg md:hidden"
          style={{
            backgroundColor: 'var(--color-brand-900)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-surface/8 text-white' : 'text-white/60 hover:text-white/90',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {session ? (
              <button
                onClick={() => {
                  setMobileOpen(false)
                  signOut()
                }}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                Sign Out
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors"
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
                  className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors"
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
