import { NavLink } from 'react-router'
import { LayoutDashboard, Search, FileText, FolderOpen, User, LogOut, Bookmark } from 'lucide-react'
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
  { to: '/dashboard/seeker/documents', label: 'My Documents', icon: FolderOpen },
  { to: '/dashboard/seeker/saved-searches', label: 'Saved searches', icon: Bookmark },
  { to: '/onboarding/seeker', label: 'Edit Profile', icon: User },
]

export function Sidebar() {
  const { role, signOut } = useAuth()

  const items = role === 'employer' ? employerItems : seekerItems

  return (
    <aside
      className="hidden min-h-[calc(100vh-56px)] w-60 flex-shrink-0 flex-col border-r md:flex"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive ? 'font-semibold' : 'hover:bg-surface-2/50',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive
                ? { color: 'var(--color-brand)', backgroundColor: 'rgba(45,80,22,0.05)' }
                : { color: 'var(--color-text-muted)' }
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
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
