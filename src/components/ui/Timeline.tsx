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
          <li key={index} className="relative pl-6 pb-6 last:pb-0">
            {/* Dot */}
            <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-meadow" />

            {/* Connecting line — hidden on last item */}
            {!isLast && (
              <span className="absolute left-[4px] top-3.5 bottom-0 w-[1.5px] bg-fog" />
            )}

            {/* Content */}
            <div>
              <p className="text-[14px] font-semibold text-ink font-body">
                {entry.title}
              </p>
              {entry.date && (
                <p className="text-[13px] text-light font-body mt-0.5">
                  {entry.date}
                </p>
              )}
              {entry.description && (
                <p className="text-[14px] text-mid font-body mt-1">
                  {entry.description}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
