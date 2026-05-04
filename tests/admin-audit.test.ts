import { describe, it } from 'vitest'

describe('admin audit log (ADMIN-AUDIT)', () => {
  it.todo('ADMIN-AUDIT: admin_set_user_active writes admin_audit_log with admin_id=caller, target_table=user_roles, target_id=p_user_id')
  it.todo('ADMIN-AUDIT: admin_add_note writes admin_audit_log with admin_id=caller, target_table=admin_notes, payload.note_id=inserted.id')
  it.todo('ADMIN-AUDIT: admin_get_user_audit returns rows ordered by created_at DESC for a given target_id')
})
