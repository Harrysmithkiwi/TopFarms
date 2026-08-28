import type { ReactNode } from 'react'
import { Nav } from './Nav'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'

interface DashboardLayoutProps {
  children: ReactNode
  hideSidebar?: boolean
}

export function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <div className="flex">
        {!hideSidebar && <Sidebar />}
        {/* pb-20 clears the seeker MobileBottomNav (h-16 + breathing room) on
            phones; md+ has no bottom bar. */}
        <main className="flex-1 p-6 pb-20 md:pb-6">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
