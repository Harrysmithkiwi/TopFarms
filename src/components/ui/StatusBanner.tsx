import { cn } from '@/lib/utils'

export type StatusVariant = 'shortlisted' | 'interview' | 'offer' | 'declined'

export interface StatusBannerProps {
  variant: StatusVariant
  actions?: React.ReactNode
  className?: string
}

const bannerVariants: Record<
  StatusVariant,
  { wrapper: string; title: string; body: string; titleColor: string }
> = {
  shortlisted: {
    wrapper: 'bg-warn-bg border-warn',
    title: "Great news \u2014 you've been shortlisted!",
    body: 'The employer has added you to their shortlist.',
    titleColor: 'text-text',
  },
  interview: {
    wrapper: 'bg-success-bg border-success',
    title: "You've got an interview invitation!",
    body: 'Please respond to confirm your availability.',
    titleColor: 'text-text',
  },
  offer: {
    wrapper: 'bg-success-bg border-success',
    title: "Congratulations \u2014 you've received an offer!",
    body: 'Review the offer details below.',
    titleColor: 'text-text',
  },
  declined: {
    wrapper: 'bg-danger-bg/60 border-danger-bg',
    title: "Unfortunately, this application wasn't successful.",
    body: '',
    titleColor: 'text-danger',
  },
}

export function StatusBanner({ variant, actions, className }: StatusBannerProps) {
  const config = bannerVariants[variant]

  return (
    <div className={cn('rounded-[12px] border-[1.5px] p-4', config.wrapper, className)}>
      <p className={cn('font-body text-[16px] font-semibold', config.titleColor)}>{config.title}</p>
      {config.body && <p className="text-text-muted font-body mt-1 text-[14px]">{config.body}</p>}
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  )
}
