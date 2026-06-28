import type { ReactNode } from 'react'

/**
 * Consistent admin page header: eyebrow + title + optional helper line, with an
 * optional right-aligned action. Mirrors the Daily Briefing card header treatment
 * (eyebrow uppercase / title) at page scale — the standard top of every admin
 * screen in the Phase-1 uplift.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <div
            className="text-text-subtle text-[11px] font-semibold uppercase"
            style={{ letterSpacing: '0.04em' }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          className="text-text text-[20px] leading-7 font-semibold"
          style={{ letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
        {description && <p className="text-text-muted mt-1 text-sm">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
