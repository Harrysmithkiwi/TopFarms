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
  const { role, signOut } = useAuth()
  // Back-to-app target uses primary role if known; falls back to /dashboard/seeker.
  // The admin operator may also have a non-admin row in user_roles via legacy seeker
  // signup (handle_new_user trigger COALESCEs to seeker). The Studio-SQL bootstrap
  // overwrites that row to 'admin', so role IS 'admin' here. The escape hatch link
  // ships them to /dashboard/seeker by default — Harry can navigate from there.
  const backTo = role === 'employer' ? '/dashboard/employer' : '/dashboard/seeker'

  return (
    <>
      {/* Section eyebrow */}
      <div
        className="px-4 pt-5 pb-3 text-xs font-semibold tracking-wider uppercase"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
      >
        Admin
      </div>

      {/* Back to app — escape hatch, no active state */}
      <NavLink
        to={backTo}
        onClick={onNavigate}
        className="hover:bg-surface-2/50 mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-all"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={18} />
        <span>Back to app</span>
      </NavLink>

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
                      ? 'bg-brand text-text-on-brand font-semibold'
                      : 'text-text-muted hover:bg-surface-2/50',
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
          className="hover:bg-surface-2/50 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
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
        backgroundColor: 'var(--color-surface)',
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
          backgroundColor: 'var(--color-surface)',
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
              backgroundColor: 'var(--color-surface)',
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
