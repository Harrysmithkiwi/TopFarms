import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  className?: string
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('h-[3px] bg-fog rounded-full w-full', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-moss to-meadow transition-all duration-300"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  )
}
