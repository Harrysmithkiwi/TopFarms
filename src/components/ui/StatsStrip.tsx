import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface StatItem {
  label: string
  value: string | number
}

interface StatsStripProps extends HTMLAttributes<HTMLDivElement> {
  stats: StatItem[]
  className?: string
}

export function StatsStrip({ stats, className, ...props }: StatsStripProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-4 max-[860px]:grid-cols-2 gap-0 border border-fog rounded-[12px] bg-white overflow-hidden',
        className,
      )}
      {...props}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center py-4 px-2 border-r border-fog last:border-r-0"
        >
          <span className="text-[16px] font-semibold text-ink font-body">
            {stat.value}
          </span>
          <span className="text-[13px] text-light font-body mt-1">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  )
}
