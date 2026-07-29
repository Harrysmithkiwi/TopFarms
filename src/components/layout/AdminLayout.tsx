import type { ReactNode } from 'react'
import { AdminSidebar, AdminMobileNav } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          {/* Mobile-only top bar + slide-in nav; desktop uses the rail above. */}
          <AdminMobileNav />
          <main className="px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
