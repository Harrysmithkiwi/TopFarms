import { NavLink } from 'react-router'
import {
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  BarChart2,
  TrendingUp,
  Inbox,
  Send,
  Target,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

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

export function AdminSidebar() {
  const { role, signOut } = useAuth()
  // Back-to-app target uses primary role if known; falls back to /dashboard/seeker.
  // The admin operator may also have a non-admin row in user_roles via legacy seeker
  // signup (handle_new_user trigger COALESCEs to seeker). The Studio-SQL bootstrap
  // overwrites that row to 'admin', so role IS 'admin' here. The escape hatch link
  // ships them to /dashboard/seeker by default — Harry can navigate from there.
  const backTo = role === 'employer' ? '/dashboard/employer' : '/dashboard/seeker'

  return (
    <aside
      className="hidden min-h-screen w-60 flex-shrink-0 flex-col border-r md:flex"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
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
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-8 px-3 py-2.5 text-sm transition-all',
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
    </aside>
  )
}
