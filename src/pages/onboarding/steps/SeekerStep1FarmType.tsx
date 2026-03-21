import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { FARM_TYPE_OPTIONS } from '@/types/domain'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep1Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  defaultValues?: { sector_pref?: string[] }
}

export function SeekerStep1FarmType({ onComplete, defaultValues }: SeekerStep1Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultValues?.sector_pref ?? [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTypes.length === 0) return
    onComplete({ sector_pref: selectedTypes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          What type of farm work are you looking for?
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Select all that apply — this helps us match you with relevant jobs
        </p>
      </div>

      <ChipSelector
        options={FARM_TYPE_OPTIONS}
        value={selectedTypes}
        onChange={setSelectedTypes}
        mode="multi"
        columns={2}
      />

      {selectedTypes.length === 0 && (
        <p className="text-[12px] font-body" style={{ color: 'var(--color-mid)' }}>
          Please select at least one farm type to continue
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" disabled={selectedTypes.length === 0}>
          Continue
        </Button>
      </div>
    </form>
  )
}
