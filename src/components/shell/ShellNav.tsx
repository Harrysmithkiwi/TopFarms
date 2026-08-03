import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useAudience } from '@/contexts/AudienceContext'
import { dashboardPathFor } from '@/lib/routing'

// v13 shell nav (directive 1.10, 1.14, section 3). Pill nav on the cream page,
// wordmark LEFT (NOT THIS: never centred). Logged out, the section links are
// audience-scoped; signed in, the ROLE link sets from the old Nav are preserved
// verbatim -- role-aware nav is on the port's must-not-lose list, as are the
// avatar menu, sign-out, and the mobile states. Old Nav.tsx stays untouched
// until every consumer has moved to the shell (parallel-component strategy,
// directive 1.10): pages flip atomically, never half-styled.
//
// "Post a job" and "Build a profile" are nav DESTINATIONS inside an audience-
// scoped set, excluded from the action-label count by the directive section 3
// scope note. /#how lands on the landing page; the anchor id arrives with the
// stage 2 landing port and the link degrades to top-of-page until then.

const publicEmployerLinks = [
  { to: '/#how', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/for-employers', label: 'Post a job' },
]

const publicSeekerLinks = [
  { to: '/#how', label: 'How it works' },
  { to: '/jobs', label: 'Open roles' },
  { to: '/signup?role=seeker', label: 'Build a profile' },
]

// Preserved verbatim from Nav.tsx (see its comments for the removal history).
const authedEmployerLinks = [{ to: '/dashboard/employer', label: 'Dashboard' }]
const authedSeekerLinks = [
  { to: '/jobs', label: 'Find Work' },
  { to: '/dashboard/seeker/applications', label: 'My Applications' },
  { to: '/dashboard/seeker/documents', label: 'My Documents' },
]

export function ShellNav() {
  const { session, role, signOut } = useAuth()
  const { audience } = useAudience()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navLinks = session
    ? role === 'employer'
      ? authedEmployerLinks
      : authedSeekerLinks
    : audience === 'seeker'
      ? publicSeekerLinks
      : publicEmployerLinks

  const avatarLetter = session?.user?.email?.[0]?.toUpperCase() ?? '?'

  const linkClass = (isActive: boolean) =>
    [
      'inline-flex min-h-11 flex-none items-center rounded-full px-4 text-sm font-medium transition-colors md:min-h-9',
      isActive ? 'bg-cream-2 text-ink' : 'text-ink-60 hover:bg-cream-2 hover:text-ink',
    ].join(' ')

  return (
    <nav className="px-3 pt-3 sm:px-5" aria-label="Main">
      <div className="bg-card border-line mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 rounded-3xl border px-4 py-2 md:rounded-full md:px-3 md:py-2 md:pl-6">
        <Link
          to="/"
          className="mr-auto inline-flex min-h-11 items-center text-xl font-extrabold tracking-tight"
          aria-label="TopFarms"
        >
          TopFarms<span className="text-ochre-ink">.</span>
        </Link>

        {/* Section links. One row on md+; below md they wrap to a scrollable
            second row with an edge fade so a clipped link reads as scrollable,
            not broken (v12 comp pattern, measured at 390). */}
        <div
          className="border-line -mx-1 flex w-full basis-full items-center gap-1 overflow-x-auto border-t px-1 pt-1.5 [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] [scrollbar-width:none] md:mx-0 md:w-auto md:flex-none md:basis-auto md:border-t-0 md:px-0 md:pt-0 md:[mask-image:none]"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => linkClass(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Signed in: avatar menu (preserved states: menu open/closed, dashboard
            link, sign out). Signed out: nothing here -- Sign in / Join live in
            the utility bar, and duplicating them would break the label gate. */}
        {session && (
          <div className="relative order-first ml-2 md:order-none">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="bg-green flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {avatarLetter}
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="bg-card border-line absolute top-11 right-0 z-20 w-48 rounded-2xl border py-1 shadow-lg">
                  {role && (
                    <Link
                      to={dashboardPathFor(role)}
                      onClick={() => setUserMenuOpen(false)}
                      className="text-ink hover:bg-cream block px-4 py-2.5 text-sm transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  {role && <hr className="border-line my-1" />}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      signOut()
                    }}
                    className="text-danger-ink hover:bg-cream w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
