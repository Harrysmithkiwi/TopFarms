import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TimelineEntry {
  title: string
  date?: string
  description?: string
}

interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  entries: TimelineEntry[]
  className?: string
}

export function Timeline({ entries, className, ...props }: TimelineProps) {
  return (
    <ol className={cn('relative ml-3 space-y-0', className)} {...props}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1

        return (
          <li key={index} className="relative pb-6 pl-6 last:pb-0">
            {/* Dot */}
            <span className="bg-brand absolute top-1 left-0 h-2.5 w-2.5 rounded-full" />

            {/* Connecting line — hidden on last item */}
            {!isLast && (
              <span className="bg-border absolute top-3.5 bottom-0 left-[4px] w-[1.5px]" />
            )}

            {/* Content */}
            <div>
              <p className="text-text font-body text-[14px] font-semibold">{entry.title}</p>
              {entry.date && (
                <p className="text-text-subtle font-body mt-0.5 text-[13px]">{entry.date}</p>
              )}
              {entry.description && (
                <p className="text-text-muted font-body mt-1 text-[14px]">{entry.description}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
