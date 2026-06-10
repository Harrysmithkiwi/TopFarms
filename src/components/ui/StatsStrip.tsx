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
        'border-border bg-surface grid grid-cols-4 gap-0 overflow-hidden rounded-[12px] border max-[860px]:grid-cols-2',
        className,
      )}
      {...props}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className="border-border flex flex-col items-center justify-center border-r px-2 py-4 last:border-r-0"
        >
          <span className="text-text font-body text-[16px] font-semibold">{stat.value}</span>
          <span className="text-text-subtle font-body mt-1 text-[13px]">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
