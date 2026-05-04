import { NavLink } from 'react-router'
import {
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const adminItems: NavItem[] = [
  { to: '/admin', label: 'Daily Briefing', icon: LayoutDashboard },
  { to: '/admin/employers', label: 'Employers', icon: Building2 },
  { to: '/admin/seekers', label: 'Seekers', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/placements', label: 'Placement Pipeline', icon: DollarSign },
]

export function AdminSidebar() {
  const { role } = useAuth()
  // Back-to-app target uses primary role if known; falls back to /dashboard/seeker.
  // The admin operator may also have a non-admin row in user_roles via legacy seeker
  // signup (handle_new_user trigger COALESCEs to seeker). The Studio-SQL bootstrap
  // overwrites that row to 'admin', so role IS 'admin' here. The escape hatch link
  // ships them to /dashboard/seeker by default — Harry can navigate from there.
  const backTo = role === 'employer' ? '/dashboard/employer' : '/dashboard/seeker'

  return (
    <aside
      className="hidden md:flex flex-col w-60 flex-shrink-0 min-h-screen border-r"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Section eyebrow */}
      <div
        className="px-4 pt-5 pb-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
      >
        Admin
      </div>

      {/* Back to app — escape hatch, no active state */}
      <NavLink
        to={backTo}
        className="flex items-center gap-3 px-3 mx-2 py-2.5 rounded-lg text-[15px] transition-all hover:bg-surface-2/50"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={18} />
        <span>Back to app</span>
      </NavLink>

      {/* 8px divider per UI-SPEC */}
      <div className="my-2" />

      <nav className="flex flex-col gap-0.5 p-3">
        {adminItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive ? 'font-semibold' : 'hover:bg-surface-2/50',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive
                ? { color: 'var(--color-brand)', backgroundColor: 'rgba(22,163,74,0.08)' }
                : { color: 'var(--color-text-muted)' }
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
