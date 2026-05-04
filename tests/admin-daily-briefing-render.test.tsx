import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Toaster } from 'sonner'
import { DailyBriefing } from '@/pages/admin/DailyBriefing'

// vi.mock is hoisted to the top of the module before any imports are evaluated,
// so the factory cannot close over a `const` defined below it (TDZ error).
// vi.hoisted returns a value that's safe to reference from the hoisted factory.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

/**
 * Honest-copy proof for ADMIN-VIEW-RESEND + MAIL-02 carryforward.
 *
 * CONTEXT.md MVP scope item 1: the daily briefing surfaces the Resend delivery rate
 * as a "carve-out from feature E given recurring MAIL-02 failures per
 * v2.0-MILESTONE-AUDIT". When the metrics cache row is absent or unreadable,
 * the briefing MUST render the literal copy "Delivery data unavailable.
 * Check Resend dashboard." — NOT a silent zero, NOT an empty state.
 *
 * This test renders <DailyBriefing/> with the Resend cache mocked to
 * `{ unavailable: true }` and asserts the literal honest-copy string is on
 * screen via @testing-library/react.
 */
describe('DailyBriefing render — honest unavailable copy (ADMIN-VIEW-RESEND, MAIL-02 carryforward)', () => {
  it('renders the literal "Delivery data unavailable. Check Resend dashboard." string when resend_stats.unavailable=true', async () => {
    // First call: admin_get_daily_briefing — resend_stats is the unavailable shape
    rpcMock.mockResolvedValueOnce({
      data: {
        signups_yesterday: 0,
        jobs_posted_yesterday: 0,
        applications_yesterday: 0,
        placements_acked_yesterday: 0,
        revenue_snapshot: { placements_acked_this_month: 0, placements_confirmed_this_month: 0 },
        resend_stats: { unavailable: true },
      },
      error: null,
    })
    // Second call: admin_get_system_alerts
    rpcMock.mockResolvedValueOnce({
      data: { webhook_failures: [], cron_health: [] },
      error: null,
    })

    render(
      <>
        <Toaster />
        <DailyBriefing />
      </>,
    )

    // Wait for the unavailable copy to appear after the async rpc resolves
    await waitFor(() => {
      expect(
        screen.getByText('Delivery data unavailable. Check Resend dashboard.'),
      ).toBeInTheDocument()
    })
  })
})
