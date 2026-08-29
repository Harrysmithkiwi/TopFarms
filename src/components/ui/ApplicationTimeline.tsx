import type { ApplicationEvent } from '@/types/domain'

/**
 * Candidate-facing application timeline. Renders application_events rows and
 * NOTHING else — no event, no entry (the brief's "do not fabricate events").
 *
 * Deliberately quiet: a plain dated list with a dot rail, not an ATS pipeline
 * graphic. The seeker's question is "what has happened, and when" — dates and
 * plain sentences answer it.
 */

function eventLabel(e: ApplicationEvent): string {
  if (e.event_type === 'interview_accepted') return 'You accepted the interview'
  // status_change — phrased from the candidate's side of the screen.
  switch (e.to_status) {
    case 'applied':
      return e.from_status ? 'You re-applied' : 'Application submitted'
    case 'review':
      return 'Employer reviewing your application'
    case 'interview':
      return 'Interview requested'
    case 'shortlisted':
      return 'You were shortlisted'
    case 'offered':
      return 'Offer made'
    case 'hired':
      return 'Hired — congratulations'
    case 'declined':
      return 'Not selected for this role'
    case 'withdrawn':
      return 'You withdrew your application'
    default:
      return 'Application updated'
  }
}

function eventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export function ApplicationTimeline({ events }: { events: ApplicationEvent[] }) {
  if (events.length === 0) return null
  return (
    <ol className="border-border mt-3 space-y-2 border-t pt-3">
      {events.map((e, i) => {
        const latest = i === events.length - 1
        return (
          <li key={e.id} className="flex items-baseline gap-2.5">
            <span
              aria-hidden="true"
              className={
                latest
                  ? 'bg-brand h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full'
                  : 'bg-border h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full'
              }
            />
            <span
              className={
                latest
                  ? 'font-body text-text text-label font-semibold'
                  : 'font-body text-text-muted text-label'
              }
            >
              {eventLabel(e)}
            </span>
            <span className="font-body text-text-subtle ml-auto flex-shrink-0 text-xs tabular-nums">
              {eventDate(e.created_at)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
