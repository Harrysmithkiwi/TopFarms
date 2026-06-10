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
        <label className="font-body text-text text-[13px] font-medium">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        <span
          className="font-body text-[11px]"
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
        className="border-border font-body text-text bg-surface placeholder:text-text-subtle focus:border-brand-hover w-full resize-none rounded-[10px] border-[1.5px] px-3 py-2.5 text-[13px] transition-colors duration-150 focus:outline-none"
      />
      {error && <p className="text-danger font-body text-[12px]">{error}</p>}
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
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
