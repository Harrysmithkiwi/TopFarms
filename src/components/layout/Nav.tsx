import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const employerLinks = [
  { to: '/dashboard/employer', label: 'Dashboard' },
  { to: '/listings', label: 'My Listings' },
  { to: '/applications', label: 'Applications' },
  { to: '/settings', label: 'Settings' },
]

const seekerLinks = [
  { to: '/jobs', label: 'Find Work' },
  { to: '/my-applications', label: 'My Applications' },
  { to: '/profile', label: 'My Profile' },
  { to: '/settings', label: 'Settings' },
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
        ? 'text-cream bg-white/8'
        : 'text-cream/50 hover:text-cream/80',
    ].join(' ')

  return (
    <>
      <nav
        className="sticky top-0 z-50 h-14 flex items-center px-4 md:px-6"
        style={{
          backgroundColor: 'var(--color-soil)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-[20px] font-semibold mr-8 flex-shrink-0"
          style={{ color: 'var(--color-cream)' }}
        >
          🌿 TopFarms
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
                  backgroundColor: 'var(--color-meadow)',
                  color: 'var(--color-white)',
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
                      backgroundColor: 'var(--color-white)',
                      borderColor: 'var(--color-fog)',
                    }}
                  >
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-fog transition-colors"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-fog transition-colors"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      Settings
                    </Link>
                    <hr style={{ borderColor: 'var(--color-fog)' }} className="my-1" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        signOut()
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-fog transition-colors"
                      style={{ color: 'var(--color-red)' }}
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
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/8"
                style={{ color: 'var(--color-cream)' }}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-meadow)',
                  color: 'var(--color-white)',
                }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-1.5 rounded-lg transition-colors hover:bg-white/8"
          style={{ color: 'var(--color-cream)' }}
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
            backgroundColor: 'var(--color-soil)',
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
                      ? 'text-cream bg-white/8'
                      : 'text-cream/60 hover:text-cream/90',
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
                style={{ color: 'var(--color-red)' }}
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
                    color: 'var(--color-cream)',
                  }}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: 'var(--color-meadow)',
                    color: 'var(--color-white)',
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
