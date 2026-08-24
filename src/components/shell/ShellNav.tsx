import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { dashboardPathFor } from '@/lib/routing'
import { IconLeaf } from '@/components/landing/LandingIcons'

// v14 shell nav (docs/design/MARKETING-DESIGN.md, comp of 2026-08-24): ONE bar, per the
// comp. The old two-bar shell (utility bar with an audience toggle + a pill nav) spent
// ~120px of the first viewport on chrome and made the visitor configure the page before
// reading it. The comp shows both audiences at once instead: "Find work" in the links,
// "Post a job" as the one green action, so neither farmer nor worker has to flip a switch
// to see their door.
//
// Signed in, the ROLE link sets from the old Nav are preserved verbatim — role-aware nav
// is on the port's must-not-lose list, as are the avatar menu, sign-out, and the mobile
// states. Old Nav.tsx stays untouched until every consumer has moved to the shell.
//
// ONE LABEL PER INTENT: "Post a job" is the page's only employer CTA label; "For
// employers" is a learn destination, not an action, so the two coexist. Sign in is a
// quiet link — returning users know where they're going.

const publicLinks = [
  { to: '/jobs', label: 'Find work' },
  { to: '/for-employers', label: 'For employers' },
  { to: '/pricing', label: 'Pricing' },
]

// Preserved from Nav.tsx (see its comments for the removal history), with one change:
// "Find Work" is now "Find work", so the seeker's signed-in nav uses the same label as
// the rest of the site. One label per intent means one CASING per label too.
const authedEmployerLinks = [{ to: '/dashboard/employer', label: 'Dashboard' }]
const authedSeekerLinks = [
  { to: '/jobs', label: 'Find work' },
  { to: '/dashboard/seeker/applications', label: 'My Applications' },
  { to: '/dashboard/seeker/documents', label: 'My Documents' },
]

export function ShellNav() {
  const { session, role, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navLinks = session
    ? role === 'employer'
      ? authedEmployerLinks
      : authedSeekerLinks
    : publicLinks

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase() ?? '?'

  const linkClass = (isActive: boolean) =>
    [
      'inline-flex min-h-11 flex-none items-center rounded-full px-3.5 text-sm font-medium transition-colors md:min-h-9',
      isActive ? 'bg-fern-50 text-bark' : 'text-sage hover:text-bark',
    ].join(' ')

  return (
    <nav className="border-rule bg-paper border-b" aria-label="Main">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-2 gap-y-0 px-5 py-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-1.5 text-xl font-extrabold tracking-tight"
          aria-label="TopFarms"
        >
          <IconLeaf className="text-fern-600 h-5 w-5" aria-hidden="true" />
          <span>
            TopFarms<span className="text-fern-600">.</span>
          </span>
        </Link>

        {/* Section links. One row on md+; below md they wrap to a scrollable second row
            with an edge fade so a clipped link reads as scrollable, not broken. */}
        <div className="border-rule order-last -mx-1 flex w-full basis-full items-center gap-1 overflow-x-auto border-t px-1 pt-1.5 [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] [scrollbar-width:none] md:order-none md:mx-0 md:ml-6 md:w-auto md:flex-none md:basis-auto md:border-t-0 md:px-0 md:pt-0 md:[mask-image:none]">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => linkClass(isActive)}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Right side. Signed out: Sign in + the one green action. Signed in: avatar menu
            (preserved states: menu open/closed, dashboard link, sign out). */}
        {session ? (
          <div className="relative ml-auto">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="bg-fern-700 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {avatarLetter}
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="bg-white border-rule absolute top-11 right-0 z-20 w-48 rounded-2xl border py-1 shadow-lg">
                  {role && (
                    <Link
                      to={dashboardPathFor(role)}
                      onClick={() => setUserMenuOpen(false)}
                      className="text-bark hover:bg-paper block px-4 py-2.5 text-sm transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  {role && <hr className="border-rule my-1" />}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      signOut()
                    }}
                    className="text-danger-ink hover:bg-paper w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/login"
              className="text-bark hover:text-fern-800 inline-flex min-h-11 items-center px-3 text-sm font-semibold underline decoration-[1.5px] underline-offset-4"
            >
              Sign in
            </Link>
            <Link
              to="/signup?role=employer"
              className="bg-fern-700 hover:bg-fern-800 inline-flex min-h-11 items-center rounded-full px-4.5 text-sm font-semibold text-white transition-colors"
            >
              Post a job
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
