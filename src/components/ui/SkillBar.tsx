import { cn } from '@/lib/utils'

interface SkillBarProps {
  /** Skill name, e.g. "Herd Management". */
  name: string
  /** 0–100 proficiency, drives both the readout and the fill width. */
  value: number
  className?: string
}

export function SkillBar({ name, value, className }: SkillBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div data-anim="skill-bar" className={cn('flex flex-col gap-[7px]', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] text-text-muted">{name}</span>
        <span className="font-mono text-[13px] font-medium tabular-nums text-text">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div data-anim="skill-fill" className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
