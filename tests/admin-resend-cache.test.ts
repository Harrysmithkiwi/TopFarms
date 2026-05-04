import { describe, it } from 'vitest'

describe('admin resend cache reader (ADMIN-VIEW-RESEND)', () => {
  it.todo('ADMIN-VIEW-RESEND: admin_get_daily_briefing reads admin_metrics_cache.resend_stats and exposes rate + cached_at')
  it.todo('ADMIN-VIEW-RESEND: when cached_at older than 30 minutes, briefing payload sets resend_stale=true')
  it.todo('ADMIN-VIEW-RESEND: when no cache row exists, briefing payload sets resend_unavailable=true')
})
