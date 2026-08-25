import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Inbox, Send, Clock, CalendarClock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * LeadsWorklist — the "what do I do next" rollup (Admin Portal v2 stretch #2).
 * One `admin_leads_worklist` RPC → four clickable tiles + the follow-ups actually
 * due today. Sits at the top of Lead Staging so the morning triage starts here
 * instead of hunting across staging / outreach / leads.
 */

interface Worklist {
  to_review: number
  to_send: number
  awaiting_reply: number
  followups_due: number
  followups: { id: string; name: string; date: string }[]
}

interface Tile {
  key: keyof Omit<Worklist, 'followups'>
  label: string
  icon: React.ComponentType<{ size?: number }>
  to: string
}

const TILES: Tile[] = [
  { key: 'to_review', label: 'To review', icon: Inbox, to: '/admin/leads/staging' },
  { key: 'to_send', label: 'Drafts to send', icon: Send, to: '/admin/leads/outreach' },
  { key: 'awaiting_reply', label: 'Awaiting reply', icon: Clock, to: '/admin/leads' },
  { key: 'followups_due', label: 'Follow-ups due', icon: CalendarClock, to: '/admin/leads' },
]

export function LeadsWorklist() {
  const navigate = useNavigate()
  const [data, setData] = useState<Worklist | null>(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let live = true
    void supabase.rpc('admin_leads_worklist' as never).then(({ data, error }) => {
      if (!live) return
      if (error) {
        console.error('admin_leads_worklist failed', error)
        setErrored(true)
        return
      }
      setData(data as unknown as Worklist)
    })
    return () => {
      live = false
    }
  }, [])

  // Silent when it can't load or there's genuinely nothing — the queue below is
  // the real workspace; the worklist is an accelerator, not a blocker.
  if (errored || !data) return null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((t) => {
          const count = data[t.key]
          const active = count > 0
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(t.to)}
              className="hover:border-border-strong flex items-center gap-3 rounded-8 border p-4 text-left transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                opacity: active ? 1 : 0.6,
              }}
            >
              <t.icon size={18} />
              <div>
                <div
                  className="text-[22px] leading-6 font-semibold"
                  style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {count}
                </div>
                <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t.label}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {data.followups.length > 0 && (
        <div
          className="rounded-8 border p-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="mb-2 text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
          >
            Follow-ups due
          </div>
          <ul className="space-y-1">
            {data.followups.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/leads')}
                  className="hover:bg-surface-2 flex w-full items-center justify-between rounded px-2 py-1 text-left text-[13px]"
                >
                  <span style={{ color: 'var(--color-text)' }}>{f.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{f.date}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
