import { cn } from '@/lib/utils'

interface ChipProps {
  children: React.ReactNode
  /** Selected state — brand-tinted fill with a leading tick. */
  checked?: boolean
  className?: string
}

export function Chip({ children, checked = false, className }: ChipProps) {
  return (
    <span
      data-anim="chip"
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap',
        checked
          ? 'border-brand-50 bg-brand-50 text-brand-hover'
          : 'border-border bg-surface-2 text-text-muted',
        className,
      )}
    >
      {checked ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="text-brand"
        >
          <path
            d="M2.5 6.5l2.2 2.2L9.5 3.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      {children}
    </span>
  )
}
