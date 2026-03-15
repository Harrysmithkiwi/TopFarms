import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

const schema = z.object({
  culture_description: z.string().max(2000).optional(),
  team_size: z.coerce.number().min(1).optional(),
  about_farm: z.string().max(2000).optional(),
})

type FormData = z.infer<typeof schema>

interface Step3Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

const MAX_CHARS = 2000

export function Step3Culture({ onComplete, onBack, defaultValues }: Step3Props) {
  const [cultureCount, setCultureCount] = useState(
    defaultValues?.culture_description?.length ?? 0,
  )
  const [aboutCount, setAboutCount] = useState(defaultValues?.about_farm?.length ?? 0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      culture_description: defaultValues?.culture_description ?? '',
      team_size: defaultValues?.team_size,
      about_farm: defaultValues?.about_farm ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Farm culture & team
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Help candidates understand what it's like to work on your farm
        </p>
      </div>

      <div className="space-y-4">
        {/* Culture description textarea */}
        <div>
          <label
            className="font-body text-[13px] font-medium text-ink mb-1 block"
            htmlFor="culture_description"
          >
            Work culture
          </label>
          <textarea
            id="culture_description"
            className="w-full border-[1.5px] rounded-[8px] px-3 py-2 font-body text-[13px] text-ink placeholder:text-light bg-mist resize-none focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.08)] border-fog focus:border-fern transition-colors duration-200"
            rows={4}
            placeholder="Describe your farm's work culture and team environment..."
            maxLength={MAX_CHARS}
            {...register('culture_description', {
              onChange: (e) => setCultureCount(e.target.value.length),
            })}
          />
          <div className="flex justify-between mt-1">
            {errors.culture_description && (
              <p className="text-red text-[12px] font-body">{errors.culture_description.message}</p>
            )}
            <p className="text-[12px] font-body ml-auto" style={{ color: 'var(--color-light)' }}>
              {cultureCount}/{MAX_CHARS}
            </p>
          </div>
        </div>

        <Input
          label="Team size"
          type="number"
          placeholder="e.g. 4"
          error={errors.team_size?.message}
          {...register('team_size')}
        />

        {/* About farm textarea */}
        <div>
          <label
            className="font-body text-[13px] font-medium text-ink mb-1 block"
            htmlFor="about_farm"
          >
            About your farm
          </label>
          <textarea
            id="about_farm"
            className="w-full border-[1.5px] rounded-[8px] px-3 py-2 font-body text-[13px] text-ink placeholder:text-light bg-mist resize-none focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.08)] border-fog focus:border-fern transition-colors duration-200"
            rows={4}
            placeholder="Describe your farm — its history, location, what makes it special..."
            maxLength={MAX_CHARS}
            {...register('about_farm', {
              onChange: (e) => setAboutCount(e.target.value.length),
            })}
          />
          <div className="flex justify-between mt-1">
            {errors.about_farm && (
              <p className="text-red text-[12px] font-body">{errors.about_farm.message}</p>
            )}
            <p className="text-[12px] font-body ml-auto" style={{ color: 'var(--color-light)' }}>
              {aboutCount}/{MAX_CHARS}
            </p>
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
          Continue
        </Button>
      </div>
    </form>
  )
}
