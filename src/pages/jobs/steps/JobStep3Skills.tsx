import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SkillsPicker } from '@/components/ui/SkillsPicker'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ChipSelector } from '@/components/ui/ChipSelector'
import {
  MIN_DAIRY_EXPERIENCE_OPTIONS,
  SENIORITY_OPTIONS,
  QUALIFICATION_OPTIONS,
  VISA_CHIP_OPTIONS,
} from '@/types/domain'
import type { SelectedSkill } from '@/types/domain'

interface Step3DefaultValues {
  min_dairy_experience?: string
  seniority_level?: string
  qualifications?: string[]
  visa_requirements?: string[]
}

interface Step3Props {
  jobId: string
  sector: string
  onComplete: (data: Record<string, unknown>) => void
  onBack?: () => void
  defaultValues?: Step3DefaultValues
}

export function JobStep3Skills({ jobId, sector, onComplete, onBack, defaultValues }: Step3Props) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [minExperience, setMinExperience] = useState(defaultValues?.min_dairy_experience ?? '')
  const [seniority, setSeniority] = useState(defaultValues?.seniority_level ?? '')
  const [qualifications, setQualifications] = useState<string[]>(defaultValues?.qualifications ?? [])
  const [visaRequirements, setVisaRequirements] = useState<string[]>(defaultValues?.visa_requirements ?? [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Delete existing job_skills for this job first
      const { error: deleteError } = await supabase
        .from('job_skills')
        .delete()
        .eq('job_id', jobId)

      if (deleteError) {
        toast.error('Failed to update skills. Please try again.')
        console.error('Delete job_skills error:', deleteError)
        setSaving(false)
        return
      }

      // Insert the newly selected skills if any
      if (selectedSkills.length > 0) {
        const rows = selectedSkills.map((s) => ({
          job_id: jobId,
          skill_id: s.skill_id,
          // In requirementMode, SkillsPicker sets proficiency to 'required' or 'preferred'
          requirement_level: (s.proficiency === 'advanced' || s.proficiency === 'basic')
            ? (s.proficiency === 'advanced' ? 'required' : 'preferred')
            : s.proficiency, // 'required' or 'preferred' from requirementMode
        }))

        const { error: insertError } = await supabase.from('job_skills').insert(rows)

        if (insertError) {
          toast.error('Failed to save skills. Please try again.')
          console.error('Insert job_skills error:', insertError)
          setSaving(false)
          return
        }
      }

      onComplete({
        min_dairy_experience: minExperience || undefined,
        seniority_level: seniority || undefined,
        qualifications: qualifications.length > 0 ? qualifications : undefined,
        visa_requirements: visaRequirements.length > 0 ? visaRequirements : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Required skills
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Select skills and whether they are required or preferred for this role
        </p>
      </div>

      <SkillsPicker
        sector={sector as 'dairy' | 'sheep_beef'}
        selectedSkills={selectedSkills}
        onChange={setSelectedSkills}
        requirementMode={true}
      />

      {/* Minimum dairy experience */}
      <Select
        label="Minimum dairy experience"
        placeholder="Select minimum experience"
        options={MIN_DAIRY_EXPERIENCE_OPTIONS}
        value={minExperience}
        onValueChange={setMinExperience}
      />

      {/* Seniority level */}
      <Select
        label="Seniority level"
        placeholder="Select seniority level"
        options={SENIORITY_OPTIONS}
        value={seniority}
        onValueChange={setSeniority}
      />

      {/* Qualifications */}
      <div>
        <p className="font-body text-[13px] font-semibold text-ink mb-2">Qualifications</p>
        <ChipSelector
          options={QUALIFICATION_OPTIONS}
          value={qualifications}
          onChange={setQualifications}
          mode="multi"
          columns={2}
        />
      </div>

      {/* Visa requirements */}
      <div>
        <p className="font-body text-[13px] font-semibold text-ink mb-2">Visa requirements</p>
        <ChipSelector
          options={VISA_CHIP_OPTIONS}
          value={visaRequirements}
          onChange={setVisaRequirements}
          mode="multi"
          columns={2}
        />
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className={onBack ? '' : 'ml-auto'}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </form>
  )
}
