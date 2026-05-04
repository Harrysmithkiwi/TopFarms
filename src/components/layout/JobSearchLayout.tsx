import type { ReactNode } from 'react'
import { Nav } from './Nav'

interface JobSearchLayoutProps {
  children: ReactNode
}

/**
 * Minimal page wrapper for the job search experience.
 * Provides the persistent <Nav /> header (top bar with role-aware links + avatar
 * dropdown for profile access) but NO left rail / dashboard sidebar — job search
 * has its own filter sidebar inside the page, and a second left rail would be
 * visually busy and architecturally wrong.
 *
 * Pattern matches Seek: top nav header for cross-page navigation, page-internal
 * filter sidebar for filters. Distinct from DashboardLayout (which adds the
 * role-based sidebar rail used on /dashboard/* and /onboarding/* pages).
 */
export function JobSearchLayout({ children }: JobSearchLayoutProps) {
  return (
    <>
      <Nav />
      {children}
    </>
  )
}
