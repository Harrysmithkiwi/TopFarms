import { cn } from '@/lib/utils'

/**
 * Phase 5.5 — the one loading idiom.
 *
 * Promoted from components/admin/Skeleton.tsx, which had the right primitives
 * but only admin could reach them, so six surfaces outside admin fell back to
 * centred "Loading..." text. Two idioms for one state is exactly the variance
 * this phase exists to remove.
 *
 * Why skeletons rather than a spinner: a spinner says "wait", a skeleton says
 * "content is arriving, here is its shape". On a rural connection the wait is
 * long enough for that difference to matter.
 *
 * All shapes are aria-hidden and paired with a single polite live region
 * (RouteSkeleton / SectionSkeleton / TableSkeleton), so a screen reader hears
 * "Loading" once instead of reading a wall of empty boxes.
 *
 * DetailSkeleton and PanelSkeleton are still silent — they are aria-hidden with
 * no announcement, so their wait is invisible to a screen reader. Give them the
 * same treatment when their surfaces are next touched.
 *
 * Inline styles from the admin original migrated to utilities on the way over
 * (Task 5.1) — this file is now token-clean.
 */

export function Shimmer({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn('bg-surface-2 animate-pulse rounded motion-reduce:animate-none', className)}
      style={style}
      aria-hidden="true"
    />
  )
}

/** Announce the wait once, for the whole skeleton. */
function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  )
}

/**
 * Whole-route wait: auth gates, role resolution, first paint of a page.
 * Replaces the centred spinner + "Loading..." pair.
 */
export function RouteSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <LoadingAnnouncement label={label} />
      <div className="w-full max-w-md space-y-3">
        <Shimmer className="h-7 w-1/2" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
      </div>
    </div>
  )
}

/** In-page section wait, inside an existing layout shell. */
export function SectionSkeleton({
  rows = 3,
  label = 'Loading',
}: {
  rows?: number
  label?: string
}) {
  return (
    <div className="space-y-3 py-8">
      <LoadingAnnouncement label={label} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-border bg-surface space-y-2 rounded-[12px] border p-4">
          <Shimmer className="h-4 w-1/3" />
          <Shimmer className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/** Table placeholder — header labels stay, rows shimmer at the real 52px height. */
export function TableSkeleton({
  columns,
  rows = 8,
  label = 'Loading',
}: {
  columns: { key: string; label: string }[]
  rows?: number
  label?: string
}) {
  return (
    <>
      {/* The table below is aria-hidden, so without this the wait is silent for a
          screen reader. RouteSkeleton and SectionSkeleton both already announce. */}
      <LoadingAnnouncement label={label} />
      <table className="w-full" aria-hidden="true">
        <thead>
          <tr className="border-border border-b">
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-text-subtle px-4 py-3 text-left text-xs font-semibold tracking-[0.04em] uppercase"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className={cn('h-[52px]', r === rows - 1 ? '' : 'border-border border-b')}>
              {columns.map((c, ci) => (
                <td key={c.key} className="px-4">
                  <Shimmer
                    className="h-3.5"
                    // Vary width so it reads as content, not a grid. First column widest.
                    style={{ width: ci === 0 ? '70%' : `${45 + ((r + ci) % 3) * 12}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Drawer body placeholder — a title line plus a few section blocks. */
export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <Shimmer className="h-5 w-2/3" />
        <Shimmer className="h-3 w-1/3" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-border space-y-2 border-t pt-4">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3.5 w-full" />
          <Shimmer className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/** Generic card/panel placeholder for dashboard loads (Daily Briefing, Analytics). */
export function PanelSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-5" aria-hidden="true">
      <Shimmer className="mb-3 h-3 w-28" />
      <Shimmer style={{ height }} className="w-full" />
    </div>
  )
}
