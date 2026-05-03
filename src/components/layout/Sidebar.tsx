import { NavLink } from 'react-router'
import {
  LayoutDashboard,
  Search,
  FileText,
  User,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const employerItems: NavItem[] = [
  { to: '/dashboard/employer', label: 'Dashboard', icon: LayoutDashboard },
  // 'Applications' link removed 2026-04-29 (NAV-02 — employer flow is per-job at
  // /dashboard/employer/jobs/:id/applicants, no aggregate page exists).
  // 'My Listings' (/listings), 'Farm Profile' (/farm-profile), 'Settings' (/settings) removed
  // 2026-05-04 (UAT-04 — routes unregistered in main.tsx; pages don't exist yet).
]

const seekerItems: NavItem[] = [
  { to: '/dashboard/seeker', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/dashboard/seeker/applications', label: 'My Applications', icon: FileText },
  { to: '/onboarding/seeker', label: 'Edit Profile', icon: User },
]

export function Sidebar() {
  const { role } = useAuth()

  const items = role === 'employer' ? employerItems : seekerItems

  return (
    <aside
      className="hidden md:flex flex-col w-60 flex-shrink-0 min-h-[calc(100vh-56px)] border-r"
      style={{
        backgroundColor: 'var(--color-white)',
        borderColor: 'var(--color-fog)',
      }}
    >
      <nav className="flex flex-col gap-0.5 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.includes('/dashboard')}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'font-semibold'
                  : 'hover:bg-fog/50',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive
                ? { color: 'var(--color-moss)', backgroundColor: 'rgba(45,80,22,0.05)' }
                : { color: 'var(--color-mid)' }
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
