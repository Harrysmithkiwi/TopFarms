import {
  LayoutDashboard,
  Search,
  FileText,
  Bookmark,
  User,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react'

/**
 * THE seeker navigation — single source of truth.
 *
 * Before this file existed there were three drifting copies: Nav.tsx said
 * "Find Work", Sidebar.tsx said "Find Jobs", ShellNav.tsx said "Find work",
 * and the mobile slide-out showed a subset that left Dashboard, Saved and
 * Profile unreachable on a phone. One label per intent (CLAUDE.md §10) means
 * one list, consumed everywhere: Sidebar, Nav, ShellNav, MobileBottomNav.
 *
 * `primary` marks the five items that fit a phone bottom bar; the rest are
 * secondary surfaces reached from the sidebar / slide-out menu.
 */
export interface SeekerNavItem {
  to: string
  label: string
  icon: LucideIcon
  primary: boolean
}

export const SEEKER_NAV: SeekerNavItem[] = [
  { to: '/dashboard/seeker', label: 'Home', icon: LayoutDashboard, primary: true },
  { to: '/jobs', label: 'Find work', icon: Search, primary: true },
  { to: '/dashboard/seeker/applications', label: 'Applications', icon: FileText, primary: true },
  { to: '/dashboard/seeker/saved', label: 'Saved', icon: Bookmark, primary: true },
  { to: '/dashboard/seeker/profile', label: 'Profile', icon: User, primary: true },
  { to: '/dashboard/seeker/documents', label: 'Documents', icon: FolderOpen, primary: false },
]

export const SEEKER_NAV_PRIMARY = SEEKER_NAV.filter((i) => i.primary)
