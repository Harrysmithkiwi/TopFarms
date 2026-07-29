/**
 * Loading skeletons for admin surfaces — replace the old plain "Loading…" text
 * so a load reads as "content arriving here" rather than a dead pause. One
 * Shimmer primitive; TableSkeleton / DetailSkeleton / PanelSkeleton compose it
 * to mirror the shape of what's loading. Honors prefers-reduced-motion.
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
      className={`animate-pulse rounded motion-reduce:animate-none ${className}`}
      style={{ backgroundColor: 'var(--color-surface-2)', ...style }}
      aria-hidden="true"
    />
  )
}

/** Table placeholder — header labels stay, rows shimmer at the real 52px height. */
export function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: { key: string; label: string }[]
  rows?: number
}) {
  return (
    <table className="w-full" aria-hidden="true">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          {columns.map((c) => (
            <th
              key={c.key}
              className="px-4 py-3 text-left text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr
            key={r}
            style={{
              borderBottom: r === rows - 1 ? 'none' : '1px solid var(--color-border)',
              height: '52px',
            }}
          >
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
        <div
          key={i}
          className="space-y-2 border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
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
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      aria-hidden="true"
    >
      <Shimmer className="mb-3 h-3 w-28" />
      <Shimmer style={{ height }} className="w-full" />
    </div>
  )
}
