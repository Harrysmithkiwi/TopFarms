import { describe, it } from 'vitest'

describe('admin notes (ADMIN-MUT-NOTE)', () => {
  it.todo('ADMIN-MUT-NOTE: admin_add_note(uuid, text) inserts admin_notes row with admin_id, target_user_id, content')
  it.todo('ADMIN-MUT-NOTE: admin_add_note(uuid, text) writes admin_audit_log row with action=add_note, target_table=admin_notes')
  it.todo('ADMIN-MUT-NOTE: admin_add_note returns the inserted note row {id, target_user_id, admin_id, content, created_at}')
  it.todo('ADMIN-MUT-NOTE: non-admin caller raises Forbidden exception (no insert, no audit)')
})
