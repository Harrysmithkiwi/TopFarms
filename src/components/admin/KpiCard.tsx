import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/tremor/Card'
import { Tag } from '@/components/ui/Tag'

/**
 * Delta vs prior period. Null → honest "—" (no baseline); a number lights up the
 * coloured ↑/↓ pill.
 */
function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-text-subtle text-[11px]" title="No prior-period baseline">
        vs prior day —
      </span>
    )
  }
  const up = delta >= 0
  return (
    <Tag variant={up ? 'green' : 'red'} className="gap-0.5">
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(delta)}%
    </Tag>
  )
}

/**
 * KpiCard — big tabular number in an equal-height Tremor Card, with an optional
 * delta pill. Shared across admin screens (Daily Briefing KPI strip, Placement
 * Pipeline summary).
 *
 * - `value` accepts a string so callers can pass a pre-formatted figure
 *   (e.g. "$12,500") as well as a raw count.
 * - `delta` is optional: omit it entirely for cards that have no prior-period
 *   comparison (the pill disappears); pass `null` for "baseline unknown".
 */
export function KpiCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string | number
  delta?: number | null
}) {
  return (
    // h-full + grid stretch = equal-height cards; mt-auto pins the number row to
    // the bottom so numbers stay aligned even when a label wraps to two lines.
    <Card className="flex h-full flex-col">
      <div
        className="text-text-subtle text-[11px] font-semibold uppercase"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span
          className="text-text text-[28px] leading-none font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        {delta !== undefined && <DeltaPill delta={delta} />}
      </div>
    </Card>
  )
}
