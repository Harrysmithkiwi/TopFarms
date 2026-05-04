import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { InfoBox } from '@/components/ui/InfoBox'
import { PAY_FREQUENCY_OPTIONS, WEEKEND_ROSTER_OPTIONS } from '@/types/domain'

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
    // Phase 8 new fields
    pay_frequency: z.string().optional(),
    on_call_allowance: z.boolean().optional(),
    hours_min: z.coerce.number().optional(),
    hours_max: z.coerce.number().optional(),
    weekend_roster: z.string().optional(),
  })
  .refine(
    (d) => !d.salary_min || !d.salary_max || d.salary_min < d.salary_max,
    {
      message: 'Maximum must be greater than minimum',
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
    control,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salary_min: defaultValues?.salary_min,
      salary_max: defaultValues?.salary_max,
      benefits: defaultValues?.benefits ?? [],
      other_benefit: '',
      pay_frequency: defaultValues?.pay_frequency ?? '',
      on_call_allowance: defaultValues?.on_call_allowance ?? false,
      hours_min: defaultValues?.hours_min,
      hours_max: defaultValues?.hours_max,
      weekend_roster: defaultValues?.weekend_roster ?? '',
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
      pay_frequency: data.pay_frequency,
      on_call_allowance: data.on_call_allowance,
      hours_min: data.hours_min,
      hours_max: data.hours_max,
      weekend_roster: data.weekend_roster,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Compensation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Enter the salary range and any additional benefits
        </p>
      </div>

      <div className="space-y-5">
        {/* Salary range */}
        <div>
          <p className="font-body text-[13px] font-medium text-text mb-2">
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
                {...register('salary_max', { onBlur: () => trigger('salary_max') })}
              />
            </div>
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Leave blank if negotiable or prefer not to say
          </p>
        </div>

        {/* Market rate hint */}
        <div className="mt-2">
          <InfoBox variant="blue">Market rate for Farm Manager: $55k-$75k NZD</InfoBox>
        </div>

        {/* Pay frequency */}
        <Controller
          control={control}
          name="pay_frequency"
          render={({ field }) => (
            <Select
              label="Pay frequency"
              placeholder="Select pay frequency"
              options={PAY_FREQUENCY_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        {/* On-call allowance toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-border bg-surface-2">
          <div>
            <p className="font-body text-[13px] font-semibold text-text">On-call allowance</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Additional compensation for on-call duties
            </p>
          </div>
          <Controller
            control={control}
            name="on_call_allowance"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Working hours per week */}
        <div>
          <p className="font-body text-[13px] font-semibold text-text mb-2">Working hours per week</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min hours"
              type="number"
              placeholder="e.g. 40"
              {...register('hours_min')}
            />
            <Input
              label="Max hours"
              type="number"
              placeholder="e.g. 55"
              {...register('hours_max')}
            />
          </div>
        </div>

        {/* Weekend roster */}
        <Controller
          control={control}
          name="weekend_roster"
          render={({ field }) => (
            <Select
              label="Weekend roster"
              placeholder="Select weekend roster"
              options={WEEKEND_ROSTER_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        {/* Benefits */}
        <div>
          <p className="font-body text-[13px] font-medium text-text mb-3">Benefits</p>
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
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
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
