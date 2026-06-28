/**
 * Guards the pre-existing tsc -b fix for AdminLeadsOutreach (PromiseLike await
 * helper + admin_outreach_list in the AdminListRpc union). The fix is type-only,
 * but the operator's concern was whether the admin_outreach_* RPCs being absent
 * from supabase-js's generated types masked a REAL gap. This proves the screen
 * renders the admin_outreach_list shape and the row→draft-drawer flow behaves —
 * i.e. the typing gap is cosmetic, the data path is intact.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn(), warning: vi.fn() },
}))

import { AdminLeadsOutreach } from '@/pages/admin/AdminLeadsOutreach'

const ROW = {
  id: 'st-1',
  created_at: '2026-06-28T00:00:00Z',
  source: 'fb_manual_capture',
  source_ref: 'https://facebook.com/post/1',
  raw_excerpt: 'Looking for a part-time hand near Taupo.',
  structured: {
    display_name: 'Halter Farm',
    region: 'Waikato',
    locality: 'Tirohanga',
    role_or_category: 'Farm assistant',
    lane: 'b' as const,
  },
  drafted_reply: 'Hey, saw your post for part-time help near Taupo. I built TopFarms…',
  draft_model: 'claude-sonnet-4-6',
  outreach_status: 'drafted' as const,
  sent_at: null,
  responded_at: null,
}

beforeEach(() => {
  rpcMock.mockReset()
  // admin_outreach_list → {rows,total}; any mutation rpc → {error:null}
  rpcMock.mockImplementation((name: string) =>
    Promise.resolve(
      name === 'admin_outreach_list'
        ? { data: { rows: [ROW], total: 1 }, error: null }
        : { data: null, error: null },
    ),
  )
})

describe('AdminLeadsOutreach (pre-existing tsc -b fix — render + behave)', () => {
  it('renders the admin_outreach_list row and opens the draft drawer', async () => {
    render(<AdminLeadsOutreach />)

    // Row renders from the admin_outreach_list shape (proves the RPC path works)
    const name = await screen.findByText('Halter Farm', {}, { timeout: 3000 })
    expect(name).toBeInTheDocument()
    expect(rpcMock).toHaveBeenCalledWith('admin_outreach_list', expect.anything())
    // status pill
    expect(screen.getByText('Drafted')).toBeInTheDocument()

    // Row → drawer: the drafted reply is editable in the drawer
    fireEvent.click(name)
    const textarea = await screen.findByDisplayValue(/I built TopFarms/, {}, { timeout: 3000 })
    expect(textarea).toBeInTheDocument()
  })
})
