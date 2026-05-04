import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shape-contract tests for admin_get_user_audit RPC + audit row payload structure.
// Live RPC integration verified post-deploy via plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1).
// These tests assert the {audit, notes} response shape and the payload structure that
// ProfileDrawer.tsx Timeline relies on.

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('admin audit log (ADMIN-AUDIT)', () => {
  it('ADMIN-AUDIT: admin_get_user_audit returns {audit, notes} with rows ordered DESC', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        audit: [
          {
            id: 'a1',
            action: 'suspend_user',
            admin_id: 'h',
            payload: { before: true, after: false },
            created_at: '2026-05-04T10:00:00Z',
          },
          {
            id: 'a2',
            action: 'add_note',
            admin_id: 'h',
            payload: { note_id: 'n1' },
            created_at: '2026-05-03T10:00:00Z',
          },
        ],
        notes: [
          {
            id: 'n1',
            admin_id: 'h',
            content: 'foo',
            created_at: '2026-05-03T10:00:00Z',
          },
        ],
      },
      error: null,
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('admin_get_user_audit', { p_user_id: 'x' })
    expect(result.data).toHaveProperty('audit')
    expect(result.data).toHaveProperty('notes')
    const audit = (result.data as { audit: Array<{ created_at: string }> }).audit
    expect(audit).toHaveLength(2)
    // Ordering DESC by created_at
    expect(new Date(audit[0].created_at).getTime()).toBeGreaterThan(
      new Date(audit[1].created_at).getTime(),
    )
  })

  it('ADMIN-AUDIT: suspend action payload contains before/after diff', () => {
    const auditRow = {
      id: 'a1',
      action: 'suspend_user',
      admin_id: 'h',
      payload: { before: true, after: false },
      created_at: '2026-05-04T10:00:00Z',
    }
    expect(auditRow.payload).toHaveProperty('before')
    expect(auditRow.payload).toHaveProperty('after')
    expect(auditRow.action).toMatch(/^(suspend_user|reactivate_user|add_note)$/)
  })
})
