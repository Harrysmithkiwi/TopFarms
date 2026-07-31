import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { VISA_OPTIONS } from '@/types/domain'
import type { SeekerProfileData, VisaStatus } from '@/types/domain'

const schema = z.object({
  visa_status: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SeekerStep6Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  defaultValues?: { visa_status?: VisaStatus }
}

const VISA_SELECT_OPTIONS = VISA_OPTIONS.map((v) => ({ value: v.value, label: v.label }))

export function SeekerStep6Visa({ onComplete, onBack, defaultValues }: SeekerStep6Props) {
  const { handleSubmit, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      visa_status: defaultValues?.visa_status ?? '',
    },
  })

  function onSubmit(data: FormData) {
    onComplete({ visa_status: (data.visa_status || undefined) as VisaStatus | undefined })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          Visa status
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          This helps us match you with employers offering the right sponsorship
        </p>
      </div>

      <Controller
        control={control}
        name="visa_status"
        render={({ field }) => (
          <Select
            label="Your visa status"
            placeholder="Select your visa status"
            options={VISA_SELECT_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />

      {/* Info box */}
      <div className="border-info/30 bg-info-bg flex items-start gap-3 rounded-[8px] border-[1.5px] p-4">
        <svg className="text-info mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {/* text-on-bg, not the raw --color-info: this box sits on a tint, and the
            Phase 4.1 contract forbids the fill colour carrying text. */}
        <p className="font-body text-info-text-on-bg text-label">
          Your visa status helps us match you with jobs that offer the right sponsorship. This
          information is only shared with employers when you apply.
        </p>
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Complete Profile
        </Button>
      </div>
    </form>
  )
}
