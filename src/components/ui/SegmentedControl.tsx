import { cn } from '@/lib/utils'

/**
 * SegmentedControl — single-select pill group (e.g. Mine / Harvested / All).
 * Minimal: `Toggle` is a 2-state switch and doesn't fit a 3-way choice. Tokens
 * only; the active segment carries the surface + text, the rest stay muted.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="border-border bg-surface-2 inline-flex rounded-[8px] border p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors',
              active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
