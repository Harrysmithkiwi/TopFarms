import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  shed_type: z.array(z.string()).optional(),
  herd_size_min: z.coerce.number().min(0).optional(),
  herd_size_max: z.coerce.number().min(0).optional(),
  visa_sponsorship: z.boolean(),
  couples_welcome: z.boolean(),
  accommodation: z
    .object({
      available: z.boolean(),
      type: z.string().optional(),
      pets: z.boolean().optional(),
      couples: z.boolean().optional(),
      family: z.boolean().optional(),
      utilities_included: z.boolean().optional(),
    })
    .optional(),
})

type FormData = z.infer<typeof schema>

interface Step2Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

const SHED_TYPES = ['Rotary', 'Herringbone', 'Other']

const ACCOMMODATION_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'unit', label: 'Unit' },
  { value: 'room', label: 'Room' },
  { value: 'other', label: 'Other' },
]

export function JobStep2FarmDetails({ onComplete, onBack, defaultValues }: Step2Props) {
  const { register, handleSubmit, control, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shed_type: defaultValues?.shed_type ?? [],
      herd_size_min: defaultValues?.herd_size_min,
      herd_size_max: defaultValues?.herd_size_max,
      visa_sponsorship: defaultValues?.visa_sponsorship ?? false,
      couples_welcome: defaultValues?.couples_welcome ?? false,
      accommodation: defaultValues?.accommodation ?? { available: false },
    },
  })

  const shedType = watch('shed_type') ?? []
  const accommodation = watch('accommodation')
  const accommodationAvailable = accommodation?.available ?? false

  function toggleShedType(type: string) {
    if (shedType.includes(type)) {
      setValue('shed_type', shedType.filter((t) => t !== type))
    } else {
      setValue('shed_type', [...shedType, type])
    }
  }

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Farm details
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Help candidates understand the farm operation
        </p>
      </div>

      <div className="space-y-5">
        {/* Shed type */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-2">Shed type</p>
          <div className="flex flex-wrap gap-3">
            {SHED_TYPES.map((type) => (
              <Checkbox
                key={type}
                label={type}
                checked={shedType.includes(type)}
                onCheckedChange={() => toggleShedType(type)}
              />
            ))}
          </div>
        </div>

        {/* Herd size range */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-2">Herd size</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum"
              type="number"
              placeholder="e.g. 200"
              {...register('herd_size_min')}
            />
            <Input
              label="Maximum"
              type="number"
              placeholder="e.g. 500"
              {...register('herd_size_max')}
            />
          </div>
        </div>

        {/* Visa sponsorship toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">
              Visa sponsorship available
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              Can you sponsor work visas for international candidates?
            </p>
          </div>
          <Controller
            control={control}
            name="visa_sponsorship"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Couples welcome toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">Couples welcome</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              Is this role suitable for working couples?
            </p>
          </div>
          <Controller
            control={control}
            name="couples_welcome"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Accommodation */}
        <div>
          <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
            <div>
              <p className="font-body text-[13px] font-semibold text-ink">
                Accommodation available
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                On-site or nearby housing for the worker
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation.available"
              render={({ field }) => (
                <Toggle checked={field.value ?? false} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {accommodationAvailable && (
            <div className="mt-4 space-y-4 pl-1">
              <Controller
                control={control}
                name="accommodation.type"
                render={({ field }) => (
                  <Select
                    label="Accommodation type"
                    placeholder="Select type"
                    options={ACCOMMODATION_TYPE_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <div>
                <p className="font-body text-[13px] font-medium text-ink mb-3">
                  Accommodation details
                </p>
                <div className="space-y-2.5">
                  <Controller
                    control={control}
                    name="accommodation.pets"
                    render={({ field }) => (
                      <Checkbox
                        label="Pets allowed"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.couples"
                    render={({ field }) => (
                      <Checkbox
                        label="Suitable for couples"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.family"
                    render={({ field }) => (
                      <Checkbox
                        label="Suitable for families"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.utilities_included"
                    render={({ field }) => (
                      <Checkbox
                        label="Utilities included"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}
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
