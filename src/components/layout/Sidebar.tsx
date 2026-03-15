import { NavLink } from 'react-router'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
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
  { to: '/listings', label: 'My Listings', icon: Briefcase },
  { to: '/applications', label: 'Applications', icon: Users },
  { to: '/farm-profile', label: 'Farm Profile', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const seekerItems: NavItem[] = [
  { to: '/dashboard/seeker', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Find Work', icon: Search },
  { to: '/my-applications', label: 'My Applications', icon: FileText },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
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
