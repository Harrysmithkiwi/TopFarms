import type { MouseEvent } from 'react'
import { Mail, Phone, Link2 } from 'lucide-react'

/**
 * Shared lead-contact rendering for the staging review panel and the approved
 * pipeline. One source of truth so contact display can't drift between pages.
 * Contact fields are extract-only (never inferred) — see lead-harvest normalise().
 */

export interface LeadContact {
  email?: string
  phone?: string
  url?: string
  name?: string
  notes?: string
}

function hasContact(c?: LeadContact | null): c is LeadContact {
  return !!c && Object.keys(c).length > 0
}

const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`

/** Prominent contact block for a detail panel — the "work the lead" target. */
export function LeadContactCard({ contact }: { contact?: LeadContact | null }) {
  if (!hasContact(contact)) {
    return (
      <p className="mt-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        No contact printed in the ad
      </p>
    )
  }
  return (
    <div className="border-brand/40 bg-surface-2 mt-2 rounded-[8px] border p-3">
      <p
        className="text-xs font-semibold uppercase"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
      >
        Contact
      </p>
      {contact.name && <div className="mt-0.5 text-[15px] font-semibold">{contact.name}</div>}
      {contact.email && (
        <div className="mt-0.5">
          <a className="text-brand text-[14px] font-medium underline" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </div>
      )}
      {contact.phone && (
        <div className="mt-0.5">
          <a className="text-brand text-[14px] font-medium underline" href={telHref(contact.phone)}>
            {contact.phone}
          </a>
        </div>
      )}
      {contact.url && (
        <div className="mt-0.5">
          <a
            className="text-brand text-[13px] underline"
            href={contact.url}
            target="_blank"
            rel="noreferrer"
          >
            {contact.url}
          </a>
        </div>
      )}
      {contact.notes && (
        <div className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          {contact.notes}
        </div>
      )}
    </div>
  )
}

/**
 * Compact at-a-glance contact glyphs for a table row — triage who's workable
 * without opening each lead. Clicks stop propagation so they don't trigger the
 * row's onClick.
 */
export function ContactGlyphs({ contact }: { contact?: LeadContact | null }) {
  // No contact → blank, not a dash. A "—" in an otherwise-populated row reads as
  // a load failure; an empty cell reads as "no contact" (i.e. a Lane B lead).
  if (!hasContact(contact)) {
    return null
  }
  const stop = (e: MouseEvent) => e.stopPropagation()
  return (
    <span className="flex items-center gap-2.5" style={{ color: 'var(--color-text-muted)' }}>
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          title={contact.email}
          onClick={stop}
          className="hover:text-brand"
        >
          <Mail size={15} aria-label="Email" />
        </a>
      )}
      {contact.phone && (
        <a
          href={telHref(contact.phone)}
          title={contact.phone}
          onClick={stop}
          className="hover:text-brand"
        >
          <Phone size={15} aria-label="Phone" />
        </a>
      )}
      {!contact.email && !contact.phone && contact.url && (
        <Link2 size={15} aria-label="Profile link only" />
      )}
    </span>
  )
}
