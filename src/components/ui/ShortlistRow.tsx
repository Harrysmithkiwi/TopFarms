import { cn } from '@/lib/utils'
import { MatchBadge } from './MatchBadge'

interface ShortlistRowProps {
  name: string
  /** Role + region line, e.g. "Dairy Farm Manager · Waikato". */
  role: string
  /** Short skill / experience tags. */
  skills: string[]
  score: number
  /** Highlighted "worth calling" row — brand-tinted border. */
  top?: boolean
  className?: string
}

export function ShortlistRow({ name, role, skills, score, top = false, className }: ShortlistRowProps) {
  return (
    <div
      data-anim="shortlist-row"
      data-top={top ? '' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface p-4',
        top
          ? 'border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]'
          : 'border-border',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-text">{name}</div>
        <div className="mt-0.5 text-[12px] text-text-muted">{role}</div>
        {skills.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-surface-2 px-[7px] py-1 text-[10px] font-semibold text-text-muted"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <MatchBadge score={score} />
    </div>
  )
}
