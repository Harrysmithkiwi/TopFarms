import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
