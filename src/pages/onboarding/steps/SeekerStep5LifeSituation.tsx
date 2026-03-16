import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Checkbox } from '@/components/ui/Checkbox'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { NZ_REGIONS } from '@/lib/constants'
import type { SeekerProfileData } from '@/types/domain'

const schema = z.object({
  couples_seeking: z.boolean().optional(),
  partner_name: z.string().optional(),
  accommodation_needed: z.boolean().optional(),
  pets_dogs: z.boolean().optional(),
  family_has_children: z.boolean().optional(),
  vehicle_parking: z.boolean().optional(),
  region: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SeekerStep5Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  defaultValues?: {
    couples_seeking?: boolean
    accommodation_needed?: boolean
    pets?: SeekerProfileData['pets']
    family?: SeekerProfileData['family']
    region?: string
  }
}

const REGION_OPTIONS = NZ_REGIONS.map((r) => ({ value: r, label: r }))

export function SeekerStep5LifeSituation({ onComplete, onBack, defaultValues }: SeekerStep5Props) {
  const { handleSubmit, control, watch, register } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      couples_seeking: defaultValues?.couples_seeking ?? false,
      partner_name: '',
      accommodation_needed: defaultValues?.accommodation_needed ?? false,
      pets_dogs: defaultValues?.pets?.dogs ?? false,
      family_has_children: defaultValues?.family?.has_children ?? false,
      vehicle_parking: false,
      region: defaultValues?.region ?? '',
    },
  })

  const couplesOn = watch('couples_seeking')
  const accommodationOn = watch('accommodation_needed')

  function onSubmit(data: FormData) {
    onComplete({
      couples_seeking: data.couples_seeking,
      accommodation_needed: data.accommodation_needed,
      pets: data.pets_dogs ? { dogs: true } : undefined,
      family: data.family_has_children ? { has_children: true } : undefined,
      region: data.region || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Life situation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Help us find jobs that are the right fit for your lifestyle
        </p>
      </div>

      <div className="space-y-4">
        {/* Couples section */}
        <div className="rounded-[10px] border-[1.5px] border-fog bg-mist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[13px] font-semibold text-ink">
                Seeking work as a couple?
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                We'll match you with jobs that welcome couples
              </p>
            </div>
            <Controller
              control={control}
              name="couples_seeking"
              render={({ field }) => (
                <Toggle checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {couplesOn && (
            <Input
              label="Partner's name (optional)"
              placeholder="Enter partner's name"
              {...register('partner_name')}
            />
          )}
        </div>

        {/* Accommodation section */}
        <div className="rounded-[10px] border-[1.5px] border-fog bg-mist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[13px] font-semibold text-ink">
                Need on-farm accommodation?
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                Filter to jobs that offer housing
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation_needed"
              render={({ field }) => (
                <Toggle checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {accommodationOn && (
            <div className="space-y-2.5 pl-1">
              <p className="font-body text-[12px] font-medium text-mid">
                Accommodation requirements
              </p>
              <Controller
                control={control}
                name="pets_dogs"
                render={({ field }) => (
                  <Checkbox
                    label="Pets (dogs)"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="family_has_children"
                render={({ field }) => (
                  <Checkbox
                    label="Children / Family"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="vehicle_parking"
                render={({ field }) => (
                  <Checkbox
                    label="Vehicle parking needed"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* Region preference */}
        <div>
          <Controller
            control={control}
            name="region"
            render={({ field }) => (
              <Select
                label="Preferred region"
                placeholder="Select a region (optional)"
                options={REGION_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <p className="mt-1 text-[12px] font-body" style={{ color: 'var(--color-mid)' }}>
            You can refine your region search after completing your profile
          </p>
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
