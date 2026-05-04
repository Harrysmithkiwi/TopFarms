import { describe, it } from 'vitest'

describe('admin RPC backend gate (ADMIN-GATE-BE)', () => {
  it.todo("ADMIN-GATE-BE-1: anonymous JWT calling admin_get_daily_briefing returns 'Not authenticated'")
  it.todo("ADMIN-GATE-BE-2: employer JWT calling admin_* RPC returns 'Forbidden: admin role required'")
  it.todo("ADMIN-GATE-BE-3: seeker JWT calling admin_* RPC returns 'Forbidden: admin role required'")
})
