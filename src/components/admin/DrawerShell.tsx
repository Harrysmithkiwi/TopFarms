import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * DrawerShell — the right-anchored slide-in drawer chrome shared by the admin
 * lead surfaces (Lead Staging, Outreach). Lifts the visual contract proven by
 * ProfileDrawer (Phase 20: Employer/Seeker/Jobs) so the lead detail views match
 * the rest of admin instead of the old inline border-2 green panels.
 *
 * Presentational only: backdrop + 400px panel + 56px header (uppercase label +
 * close) + scrollable body + optional sticky footer for primary actions. The
 * caller owns the content and the data. Escape and backdrop click both close.
 *
 * ProfileDrawer intentionally keeps its own copy of this chrome (it is
 * out-of-scope, working, and user/RPC-specific); this shell is the reusable
 * form for the two lead drawers. If ProfileDrawer is ever revisited it can
 * adopt this shell with no visual change.
 */
export function DrawerShell({
  label,
  onClose,
  children,
  footer,
}: {
  label: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(11, 31, 16, 0.25)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label={label}
        aria-modal="true"
        className="fixed top-0 right-0 z-50 flex h-full w-full flex-col transition-transform duration-[250ms] motion-reduce:transition-none lg:w-[420px]"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 12px 32px rgba(11, 31, 16, 0.08)',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header bar — 56px */}
        <div
          className="flex items-center justify-between border-b px-6"
          style={{
            height: '56px',
            backgroundColor: 'var(--color-surface-2)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
          >
            {label}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-surface-hover flex h-10 w-10 items-center justify-center rounded-md"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">{children}</div>

        {/* Footer — sticky primary actions */}
        {footer && (
          <div
            className="border-t px-6 py-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * DrawerSection — uppercase section label matching the Daily-Briefing / drawer
 * standard (text-xs uppercase, subtle, 0.04em). Replaces the lead pages' ad-hoc
 * 11px tracking-wide muted labels (audit C5).
 */
export function DrawerSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--color-border)' }}>
      <h3
        className="text-xs font-semibold uppercase"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
      >
        {label}
      </h3>
      {children}
    </section>
  )
}
