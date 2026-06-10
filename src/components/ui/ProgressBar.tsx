import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  className?: string
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('bg-border h-1 w-full rounded-full', className)}>
      <div
        className="bg-brand h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  )
}
