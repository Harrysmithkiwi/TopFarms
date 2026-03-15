import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'

const BENEFIT_OPTIONS = [
  { value: 'Accommodation provided', label: 'Accommodation provided' },
  { value: 'Vehicle provided', label: 'Vehicle provided' },
  { value: 'Phone provided', label: 'Phone provided' },
  { value: 'Meals provided', label: 'Meals provided' },
  { value: 'Training/upskilling', label: 'Training/upskilling' },
  { value: 'Health insurance', label: 'Health insurance' },
  { value: 'Bonus structure', label: 'Bonus structure' },
]

const schema = z
  .object({
    salary_min: z.coerce.number().min(0, 'Enter minimum salary').optional(),
    salary_max: z.coerce.number().min(0).optional(),
    benefits: z.array(z.string()),
    other_benefit: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.salary_min ||
      !data.salary_max ||
      data.salary_min <= data.salary_max,
    {
      message: 'Minimum salary must be less than or equal to maximum',
      path: ['salary_max'],
    },
  )

type FormData = z.infer<typeof schema>

interface Step4Props {
  onComplete: (data: Omit<FormData, 'other_benefit'> & { benefits: string[] }) => void
  onBack?: () => void
  defaultValues?: Partial<Omit<FormData, 'other_benefit'>>
}

export function JobStep4Compensation({ onComplete, onBack, defaultValues }: Step4Props) {
  const [includeOther, setIncludeOther] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salary_min: defaultValues?.salary_min,
      salary_max: defaultValues?.salary_max,
      benefits: defaultValues?.benefits ?? [],
      other_benefit: '',
    },
  })

  const currentBenefits = watch('benefits') ?? []
  const otherBenefit = watch('other_benefit') ?? ''

  function toggleBenefit(value: string) {
    if (currentBenefits.includes(value)) {
      setValue('benefits', currentBenefits.filter((b) => b !== value))
    } else {
      setValue('benefits', [...currentBenefits, value])
    }
  }

  function onSubmit(data: FormData) {
    const benefits = [...data.benefits]
    if (includeOther && data.other_benefit?.trim()) {
      benefits.push(data.other_benefit.trim())
    }
    onComplete({
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      benefits,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Compensation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Enter the salary range and any additional benefits
        </p>
      </div>

      <div className="space-y-5">
        {/* Salary range */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-2">
            Salary range (NZD per year)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Input
                label="Minimum"
                type="number"
                placeholder="e.g. 60000"
                error={errors.salary_min?.message}
                {...register('salary_min')}
              />
            </div>
            <div className="relative">
              <Input
                label="Maximum"
                type="number"
                placeholder="e.g. 80000"
                error={errors.salary_max?.message}
                {...register('salary_max')}
              />
            </div>
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-mid)' }}>
            Leave blank if negotiable or prefer not to say
          </p>
        </div>

        {/* Benefits */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-3">Benefits</p>
          <div className="space-y-2.5">
            {BENEFIT_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={currentBenefits.includes(option.value)}
                onCheckedChange={() => toggleBenefit(option.value)}
              />
            ))}

            {/* Other benefit */}
            <Checkbox
              label="Other"
              checked={includeOther}
              onCheckedChange={(checked) => {
                setIncludeOther(Boolean(checked))
                if (!checked) {
                  setValue('other_benefit', '')
                }
              }}
            />
            {includeOther && (
              <div className="pl-6">
                <Input
                  placeholder="Describe other benefit..."
                  {...register('other_benefit')}
                />
                {otherBenefit.trim() === '' && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-mid)' }}>
                    Please describe the benefit
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
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
