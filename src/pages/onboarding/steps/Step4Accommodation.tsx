import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  accommodation_available: z.boolean(),
  accommodation_type: z.string().optional(),
  accommodation_pets: z.boolean().optional(),
  accommodation_couples: z.boolean().optional(),
  accommodation_family: z.boolean().optional(),
  accommodation_utilities_included: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

interface Step4Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

const ACCOMMODATION_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'unit', label: 'Unit' },
  { value: 'room', label: 'Room' },
  { value: 'other', label: 'Other' },
]

export function Step4Accommodation({ onComplete, onBack, defaultValues }: Step4Props) {
  const { handleSubmit, control, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      accommodation_available: defaultValues?.accommodation_available ?? false,
      accommodation_type: defaultValues?.accommodation_type ?? '',
      accommodation_pets: defaultValues?.accommodation_pets ?? false,
      accommodation_couples: defaultValues?.accommodation_couples ?? false,
      accommodation_family: defaultValues?.accommodation_family ?? false,
      accommodation_utilities_included: defaultValues?.accommodation_utilities_included ?? false,
    },
  })

  const accommodationAvailable = watch('accommodation_available')

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Accommodation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Accommodation can be a deciding factor for many farm workers
        </p>
      </div>

      <div className="space-y-5">
        {/* Main toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">
              Do you offer accommodation?
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              On-site or nearby housing provided to workers
            </p>
          </div>
          <Controller
            control={control}
            name="accommodation_available"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Conditional fields */}
        {accommodationAvailable && (
          <div className="space-y-4 pl-1">
            <Controller
              control={control}
              name="accommodation_type"
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
                  name="accommodation_pets"
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
                  name="accommodation_couples"
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
                  name="accommodation_family"
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
                  name="accommodation_utilities_included"
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
