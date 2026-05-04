import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  description_overview: z
    .string()
    .min(20, 'Please write at least 20 characters')
    .max(175, 'Maximum 175 characters'),
  description_daytoday: z.string().max(400, 'Maximum 400 characters').optional(),
  description_offer: z.string().max(400, 'Maximum 400 characters').optional(),
  description_ideal: z.string().max(400, 'Maximum 400 characters').optional(),
})

type FormData = z.infer<typeof schema>

interface Step5Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

interface TextAreaFieldProps {
  label: string
  required?: boolean
  placeholder: string
  maxLength: number
  value: string
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any
}

function TextAreaField({
  label,
  required,
  placeholder,
  maxLength,
  value,
  error,
  registration,
}: TextAreaFieldProps) {
  const charCount = value?.length ?? 0
  const isNearLimit = charCount > maxLength * 0.85

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="font-body text-[13px] font-medium text-text">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        <span
          className="text-[11px] font-body"
          style={{ color: isNearLimit ? 'var(--color-clay)' : 'var(--color-text-subtle)' }}
        >
          {charCount} / {maxLength}
        </span>
      </div>
      <textarea
        {...registration}
        placeholder={placeholder}
        rows={5}
        maxLength={maxLength}
        className="w-full rounded-[10px] border-[1.5px] border-border px-3 py-2.5 text-[13px] font-body text-text bg-surface resize-none transition-colors duration-150 placeholder:text-text-subtle focus:outline-none focus:border-brand-hover"
      />
      {error && <p className="text-[12px] text-danger font-body">{error}</p>}
    </div>
  )
}

export function JobStep5Description({ onComplete, onBack, defaultValues }: Step5Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description_overview: defaultValues?.description_overview ?? '',
      description_daytoday: defaultValues?.description_daytoday ?? '',
      description_offer: defaultValues?.description_offer ?? '',
      description_ideal: defaultValues?.description_ideal ?? '',
    },
  })

  const overview = watch('description_overview') ?? ''
  const daytoday = watch('description_daytoday') ?? ''
  const offer = watch('description_offer') ?? ''
  const ideal = watch('description_ideal') ?? ''

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Job description
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Tell candidates about the role and what you are looking for
        </p>
      </div>

      <div className="space-y-5">
        <TextAreaField
          label="Role Overview"
          required
          placeholder="Describe the role and what you're looking for..."
          maxLength={175}
          value={overview}
          error={errors.description_overview?.message}
          registration={register('description_overview')}
        />

        <TextAreaField
          label="Day-to-Day"
          placeholder="What does a typical day look like?"
          maxLength={400}
          value={daytoday}
          error={errors.description_daytoday?.message}
          registration={register('description_daytoday')}
        />

        <TextAreaField
          label="What We Offer"
          placeholder="What makes this role and your farm special?"
          maxLength={400}
          value={offer}
          error={errors.description_offer?.message}
          registration={register('description_offer')}
        />

        <TextAreaField
          label="Ideal Candidate"
          placeholder="Describe the ideal person for this role..."
          maxLength={400}
          value={ideal}
          error={errors.description_ideal?.message}
          registration={register('description_ideal')}
        />
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Save &amp; Continue
        </Button>
      </div>
    </form>
  )
}
