import type { ReactNode } from 'react'
import { PublicShell } from '@/components/shell/PublicShell'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

interface JobSearchLayoutProps {
  children: ReactNode
}

/**
 * Page wrapper for the job search experience.
 *
 * v13 port: chrome now comes from PublicShell (utility bar, audience-scoped
 * nav, footer) instead of the legacy Nav. The original reasoning still holds
 * and is why this stays a thin wrapper rather than a dashboard layout: job
 * search has its own filter sidebar inside the page, and a second left rail
 * would be visually busy and architecturally wrong. Pattern matches Seek: top
 * nav for cross-page navigation, page-internal sidebar for filters. Distinct
 * from DashboardLayout, which adds the role-based rail used on /dashboard/*.
 */
export function JobSearchLayout({ children }: JobSearchLayoutProps) {
  // MobileBottomNav self-guards (seeker session only), so visitors and
  // employers see plain PublicShell. It sits AFTER the shell — outside
  // <main>, below the footer — so its in-flow spacer lets the footer's last
  // rows scroll clear of the fixed bar instead of being covered by it.
  return (
    <>
      <PublicShell>{children}</PublicShell>
      <MobileBottomNav />
    </>
  )
}
