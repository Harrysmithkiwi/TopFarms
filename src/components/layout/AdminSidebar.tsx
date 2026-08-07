import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  Receipt,
  FileText,
  BarChart2,
  TrendingUp,
  Inbox,
  Send,
  Target,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: null, // Overview — no eyebrow, sits directly under "Admin"
    items: [
      { to: '/admin', label: 'Daily Briefing', icon: LayoutDashboard },
      { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
      { to: '/admin/skills', label: 'Skills', icon: BarChart2 },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/employers', label: 'Employers', icon: Building2 },
      { to: '/admin/seekers', label: 'Seekers', icon: Users },
      { to: '/admin/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Jobs & Revenue',
    items: [
      { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/admin/placements', label: 'Placement Pipeline', icon: DollarSign },
      { to: '/admin/revenue', label: 'Revenue', icon: Receipt },
    ],
  },
  {
    label: 'Leads',
    items: [
      { to: '/admin/leads/staging', label: 'Lead Staging', icon: Inbox },
      { to: '/admin/leads/outreach', label: 'Outreach', icon: Send },
      { to: '/admin/leads', label: 'Leads', icon: Target },
    ],
  },
]

/**
 * The nav body — eyebrow, back-to-app, grouped links, sign-out. Shared verbatim
 * by the desktop rail (AdminSidebar) and the mobile drawer (AdminMobileNav) so
 * there is one source of truth for the admin nav. `onNavigate` lets the mobile
 * drawer close itself when a link is tapped.
 */
function AdminNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth()
  const { pathname } = useLocation()

  // Back-to-app used to target /dashboard/{role}, which is a dead link for the
  // only people who ever see it. An admin's role IS 'admin' (the Studio-SQL
  // bootstrap overwrites the seeker row handle_new_user COALESCEs in), so
  // /dashboard/seeker hits ProtectedRoute's `role !== requiredRole` branch and
  // Navigates straight back to dashboardPathFor('admin') === '/admin'. Click,
  // bounce, same page. It reads as a broken button because it is one.
  //
  // '/' is public, role-free and cannot loop. It is also what "the app" means
  // from the admin's side of the fence: the site as everyone else sees it.
  //
  // Hidden on the portal home — an escape hatch belongs on the pages you need
  // escaping from, not on the one you land on.
  const isPortalHome = pathname === '/admin'

  return (
    <>
      {/* Section eyebrow */}
      <div
        className="px-4 pt-5 pb-3 text-xs font-semibold tracking-wider uppercase"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
      >
        Admin
      </div>

      {/* Back to app — escape hatch, no active state. Absent on the portal home. */}
      {!isPortalHome && (
        <NavLink
          to="/"
          onClick={onNavigate}
          className="hover:bg-surface mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-all"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={18} />
          <span>Back to app</span>
        </NavLink>
      )}

      {/* 8px divider per UI-SPEC */}
      <div className="my-2" />

      <nav className="flex flex-col gap-0.5 px-3 pb-3">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <div
                className="text-text-subtle px-3 pb-1 text-[11px] font-semibold uppercase"
                style={{ letterSpacing: '0.04em' }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                // Exact match on every item: /admin/leads/outreach must NOT also
                // light up the /admin/leads parent (both rendered active otherwise).
                end
                className={({ isActive }) =>
                  [
                    'rounded-8 flex items-center gap-3 px-3 py-2.5 text-sm transition-all',
                    // Filled brand active state (tokenised); white icon + label.
                    isActive
                      ? 'bg-brand-hover text-text-on-brand font-semibold'
                      : 'text-text-muted hover:bg-surface',
                  ].join(' ')
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Sign out — pinned to the bottom (mt-auto). Clean logout matters on
          shared machines. signOut() clears the Supabase session; AuthContext's
          onAuthStateChange then drops the admin guard and routes to login. */}
      <div className="mt-auto border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => signOut()}
          className="hover:bg-surface flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </>
  )
}

/** Desktop rail — fixed 240px, hidden below md (the mobile drawer takes over). */
export function AdminSidebar() {
  return (
    <aside
      className="hidden min-h-screen w-60 flex-shrink-0 flex-col border-r md:flex"
      style={{
        // Second neutral layer. Cards are --color-surface (#ffffff) and the page
        // is --color-bg (#fafbf9): a 2% delta was carrying three structural
        // layers on its own, so the rail read as a card that happened to be tall.
        backgroundColor: 'var(--color-surface-2)',
        borderColor: 'var(--color-border)',
      }}
    >
      <AdminNavContent />
    </aside>
  )
}

/**
 * Mobile nav — a sticky top bar with a hamburger (md:hidden) that opens a
 * left-anchored slide-in drawer with the same AdminNavContent. Closes on route
 * change and on backdrop/Escape; focus is trapped inside while open (shared
 * useFocusTrap contract). Fixes the pre-v2 dead-end where the desktop-only rail
 * left an admin with zero navigation below 768px.
 */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open)

  // Close whenever the route changes (link tap or browser back/forward). Setting
  // open=false when it's already false is a React no-op (Object.is bail-out), so
  // this can't cascade — the lint rule is a false positive for ephemeral overlays.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 border-b px-4"
        style={{
          height: '56px',
          backgroundColor: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="hover:bg-surface-hover flex h-10 w-10 items-center justify-center rounded-md"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Menu size={20} />
        </button>
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
        >
          Admin
        </span>
      </div>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(11, 31, 16, 0.25)' }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="fixed top-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r"
            style={{
              // Matches the desktop rail so AdminNavContent's hover reads the
              // same in both. On white it would be invisible.
              backgroundColor: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 12px 32px rgba(11, 31, 16, 0.08)',
            }}
          >
            <div className="flex justify-end px-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="hover:bg-surface-hover flex h-10 w-10 items-center justify-center rounded-md"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            <AdminNavContent onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
