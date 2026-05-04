import type { ReactNode } from 'react'
import { Nav } from './Nav'
import { Sidebar } from './Sidebar'

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
        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
