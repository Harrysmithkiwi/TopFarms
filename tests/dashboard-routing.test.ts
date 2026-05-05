import { describe, it, expect } from 'vitest'
import { dashboardPathFor } from '@/lib/routing'

describe('dashboardPathFor', () => {
  it('returns /admin for admin role', () => {
    expect(dashboardPathFor('admin')).toBe('/admin')
  })
  it('returns /dashboard/employer for employer role', () => {
    expect(dashboardPathFor('employer')).toBe('/dashboard/employer')
  })
  it('returns /dashboard/seeker for seeker role', () => {
    expect(dashboardPathFor('seeker')).toBe('/dashboard/seeker')
  })
})
