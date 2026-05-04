import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { SHED_TYPES, HERD_SIZE_BUCKETS } from '@/types/domain'
import type { SeekerProfileData, ShedType, HerdSizeBucket } from '@/types/domain'

const schema = z.object({
  years_experience: z.coerce.number().min(0).max(50).optional(),
  shed_types_experienced: z.array(z.string()).optional(),
  herd_sizes_worked: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

interface SeekerStep2Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  defaultValues?: {
    years_experience?: number
    shed_types_experienced?: ShedType[]
    herd_sizes_worked?: HerdSizeBucket[]
  }
}

export function SeekerStep2Experience({ onComplete, onBack, defaultValues }: SeekerStep2Props) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      years_experience: defaultValues?.years_experience,
      shed_types_experienced: defaultValues?.shed_types_experienced ?? [],
      herd_sizes_worked: defaultValues?.herd_sizes_worked ?? [],
    },
  })

  function onSubmit(data: FormData) {
    onComplete({
      years_experience: data.years_experience,
      shed_types_experienced: (data.shed_types_experienced ?? []) as ShedType[],
      herd_sizes_worked: (data.herd_sizes_worked ?? []) as HerdSizeBucket[],
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Your experience
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Tell us about your farming background so we can find the best matches
        </p>
      </div>

      {/* Years of experience */}
      <div>
        <Input
          type="number"
          label="Years of farm experience"
          min={0}
          max={50}
          placeholder="0"
          error={errors.years_experience?.message}
          {...register('years_experience')}
        />
      </div>

      {/* Shed types */}
      <div>
        <p className="font-body text-[13px] font-medium text-text mb-3">
          Shed types you've worked with
        </p>
        <div className="space-y-2.5">
          <Controller
            control={control}
            name="shed_types_experienced"
            render={({ field }) => (
              <>
                {SHED_TYPES.map((shed) => {
                  const isChecked = (field.value ?? []).includes(shed.value)
                  return (
                    <Checkbox
                      key={shed.value}
                      label={shed.label}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? []
                        if (checked) {
                          field.onChange([...current, shed.value])
                        } else {
                          field.onChange(current.filter((v) => v !== shed.value))
                        }
                      }}
                    />
                  )
                })}
              </>
            )}
          />
        </div>
      </div>

      {/* Herd sizes */}
      <div>
        <p className="font-body text-[13px] font-medium text-text mb-3">
          Herd sizes you've worked with
        </p>
        <div className="space-y-2.5">
          <Controller
            control={control}
            name="herd_sizes_worked"
            render={({ field }) => (
              <>
                {HERD_SIZE_BUCKETS.map((bucket) => {
                  const isChecked = (field.value ?? []).includes(bucket.value)
                  return (
                    <Checkbox
                      key={bucket.value}
                      label={bucket.label}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? []
                        if (checked) {
                          field.onChange([...current, bucket.value])
                        } else {
                          field.onChange(current.filter((v) => v !== bucket.value))
                        }
                      }}
                    />
                  )
                })}
              </>
            )}
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Continue
        </Button>
      </div>
    </form>
  )
}
