import type { UserRole } from '@/types/domain'

export function dashboardPathFor(role: UserRole): string {
  return role === 'admin' ? '/admin' : `/dashboard/${role}`
}
