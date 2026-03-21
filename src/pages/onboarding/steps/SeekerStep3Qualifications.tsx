import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { DAIRYNZ_LEVELS, LICENCE_TYPE_OPTIONS, CERTIFICATION_OPTIONS } from '@/types/domain'
import type { SeekerProfileData, DairyNZLevel } from '@/types/domain'

const schema = z.object({
  dairynz_level: z.string().optional(),
  licence_types: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

interface SeekerStep3Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  defaultValues?: {
    dairynz_level?: DairyNZLevel
    licence_types?: string[]
    certifications?: string[]
  }
}

const LEVEL_OPTIONS = DAIRYNZ_LEVELS.map((l) => ({ value: l.value, label: l.label }))

export function SeekerStep3Qualifications({ onComplete, onBack, defaultValues }: SeekerStep3Props) {
  const { handleSubmit, control, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dairynz_level: defaultValues?.dairynz_level ?? '',
      licence_types: defaultValues?.licence_types ?? [],
      certifications: defaultValues?.certifications ?? [],
    },
  })

  const selectedLevel = watch('dairynz_level')
  const selectedLevelInfo = DAIRYNZ_LEVELS.find((l) => l.value === selectedLevel)

  function onSubmit(data: FormData) {
    onComplete({
      dairynz_level: (data.dairynz_level || undefined) as DairyNZLevel | undefined,
      licence_types: data.licence_types,
      certifications: data.certifications,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          DairyNZ qualification
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Select your highest DairyNZ qualification level, if any
        </p>
      </div>

      <div className="space-y-3">
        <Controller
          control={control}
          name="dairynz_level"
          render={({ field }) => (
            <Select
              label="DairyNZ level"
              placeholder="Select a level"
              options={LEVEL_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        {/* Description of selected level */}
        {selectedLevelInfo && (
          <div
            className="flex items-start gap-2 rounded-[8px] border-[1.5px] p-3 text-[13px]"
            style={{
              borderColor: 'var(--color-fern)',
              backgroundColor: 'rgba(74,124,47,0.04)',
              color: 'var(--color-ink)',
            }}
          >
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: 'var(--color-fern)' }}
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 7v4M8 5.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ color: 'var(--color-mid)' }}>{selectedLevelInfo.description}</span>
          </div>
        )}
      </div>

      {/* DairyNZ levels overview */}
      <div className="rounded-[8px] border-[1.5px] border-fog p-4 space-y-2">
        <p className="font-body text-[12px] font-semibold text-mid uppercase tracking-wide">
          DairyNZ Levels Overview
        </p>
        <div className="space-y-1.5">
          {DAIRYNZ_LEVELS.map((level) => (
            <div key={level.value} className="flex gap-2">
              <span className="font-body text-[12px] font-semibold text-fern min-w-[60px]">
                {level.label}
              </span>
              <span className="font-body text-[12px]" style={{ color: 'var(--color-mid)' }}>
                {level.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NZ driver's licence */}
      <div>
        <p className="font-body text-[13px] font-semibold text-ink mb-2">NZ driver's licence</p>
        <Controller
          control={control}
          name="licence_types"
          render={({ field }) => (
            <ChipSelector
              options={LICENCE_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              mode="multi"
              columns="inline"
            />
          )}
        />
      </div>

      {/* Certifications */}
      <div>
        <p className="font-body text-[13px] font-semibold text-ink mb-2">Certifications</p>
        <Controller
          control={control}
          name="certifications"
          render={({ field }) => (
            <ChipSelector
              options={CERTIFICATION_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              mode="multi"
              columns="inline"
            />
          )}
        />
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
