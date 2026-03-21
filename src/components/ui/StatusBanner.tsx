import { cn } from '@/lib/utils'

export type StatusVariant = 'shortlisted' | 'interview' | 'offer' | 'declined'

export interface StatusBannerProps {
  variant: StatusVariant
  actions?: React.ReactNode
  className?: string
}

const bannerVariants: Record<StatusVariant, { wrapper: string; title: string; body: string; titleColor: string }> = {
  shortlisted: {
    wrapper: 'bg-hay-lt border-hay',
    title: "Great news \u2014 you've been shortlisted!",
    body: 'The employer has added you to their shortlist.',
    titleColor: 'text-ink',
  },
  interview: {
    wrapper: 'bg-green-lt border-green',
    title: "You've got an interview invitation!",
    body: 'Please respond to confirm your availability.',
    titleColor: 'text-ink',
  },
  offer: {
    wrapper: 'bg-green-lt border-green',
    title: "Congratulations \u2014 you've received an offer!",
    body: 'Review the offer details below.',
    titleColor: 'text-ink',
  },
  declined: {
    wrapper: 'bg-red-lt/60 border-red-lt',
    title: "Unfortunately, this application wasn't successful.",
    body: '',
    titleColor: 'text-red',
  },
}

export function StatusBanner({ variant, actions, className }: StatusBannerProps) {
  const config = bannerVariants[variant]

  return (
    <div
      className={cn(
        'rounded-[12px] border-[1.5px] p-4',
        config.wrapper,
        className,
      )}
    >
      <p className={cn('text-[16px] font-semibold font-body', config.titleColor)}>
        {config.title}
      </p>
      {config.body && (
        <p className="text-[14px] text-mid font-body mt-1">
          {config.body}
        </p>
      )}
      {actions && (
        <div className="flex gap-2 mt-3">
          {actions}
        </div>
      )}
    </div>
  )
}
