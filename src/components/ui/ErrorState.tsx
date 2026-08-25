import { AlertCircle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Phase 5.6 — the one error idiom.
//
// Before this, 22 sites across 17 files handled a failed fetch by logging to a
// console nobody reads and returning early, leaving the collection empty. The
// render then showed the EMPTY state: an employer who paid to list a job was
// told "No applicants yet" when the request had actually failed. On a rural
// connection that is not a rare edge — it is the normal failure mode, and it
// reads as "nobody wants to work for you".
//
// Three states must stay distinct and never collapse:
//   loading           — we do not know yet
//   empty             — we asked, the answer is genuinely zero
//   failed (this)     — we asked and could not find out
//
// Voice matches AppErrorBoundary: the fault is ours, the next step is theirs.

interface ErrorStateProps {
  /** What failed, in the user's terms — "We couldn't load your applicants". */
  message?: string
  /** Re-runs the fetch. Required: an error the user cannot act on is a dead end. */
  onRetry: () => void
  /** Inline variant for sidebars and cards; default is the block variant. */
  compact?: boolean
  className?: string
}

export function ErrorState({ message, onRetry, compact = false, className }: ErrorStateProps) {
  const text = message ?? 'We could not load this'

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'bg-danger-bg text-danger-text-on-bg flex items-center gap-2 rounded-[8px] px-3 py-2',
          className,
        )}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="font-body text-label flex-1">{text}</span>
        <button
          type="button"
          onClick={onRetry}
          className="font-body text-label focus-visible:outline-brand -my-2 -mr-2 inline-flex h-11 items-center px-3 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <div className="bg-danger-bg mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <AlertCircle className="text-danger-text-on-bg h-6 w-6" aria-hidden="true" />
      </div>
      {/* A paragraph, not a headline. The spec allows the display face on an empty-state
          HEADLINE; this is the body of an error message at 16px. */}
      <p className="font-body text-text text-base font-semibold">{text}</p>
      {/* Named cause, not blame. Mirrors AppErrorBoundary's voice. */}
      <p className="font-body text-text-muted mt-1 max-w-sm text-sm">
        This one&rsquo;s on us, not you — it usually means the connection dropped. Try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-brand-hover text-text-on-brand hover:bg-brand-900 font-body focus-visible:outline-brand mt-5 inline-flex h-11 items-center gap-2 rounded-[8px] px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
