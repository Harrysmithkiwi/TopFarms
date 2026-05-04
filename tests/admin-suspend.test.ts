import { describe, it } from 'vitest'

describe('admin suspend/reactivate (ADMIN-MUT-SUS, ADMIN-MUT-REA)', () => {
  it.todo('ADMIN-MUT-SUS: admin_set_user_active(uuid, false) flips user_roles.is_active to false')
  it.todo('ADMIN-MUT-SUS: admin_set_user_active(uuid, false) writes admin_audit_log row with action=suspend_user, payload.before=true, payload.after=false')
  it.todo('ADMIN-MUT-REA: admin_set_user_active(uuid, true) flips user_roles.is_active back to true')
  it.todo('ADMIN-MUT-REA: admin_set_user_active(uuid, true) writes admin_audit_log row with action=reactivate_user')
  it.todo('ADMIN-MUT-SUS: non-admin caller raises Forbidden exception (no flip, no audit row)')
})
