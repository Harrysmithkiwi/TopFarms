import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SkillsPicker } from '@/components/ui/SkillsPicker'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { ErrorState } from '@/components/ui/ErrorState'
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

export function JobStep3Skills({ jobId, onComplete, onBack, defaultValues }: Step3Props) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [minExperience, setMinExperience] = useState(defaultValues?.min_dairy_experience ?? '')
  const [seniority, setSeniority] = useState(defaultValues?.seniority_level ?? '')
  const [qualifications, setQualifications] = useState<string[]>(
    defaultValues?.qualifications ?? [],
  )
  const [visaRequirements, setVisaRequirements] = useState<string[]>(
    defaultValues?.visa_requirements ?? [],
  )
  const [loadingSkills, setLoadingSkills] = useState(true)
  const [prefillError, setPrefillError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  // Load the job's saved skills on mount. Without this the picker starts empty on every
  // re-entry — Edit from the preview, Back from step 4, reopening the wizard — and
  // handleSubmit below deletes every job_skills row before inserting what is in state,
  // so saving an untouched step WIPES the requirements the employer already chose.
  // Skills are a 20-point match dimension, and the preview then reports "No skills
  // selected", which reads as the employer's own omission rather than as data loss.
  // Same defect and same fix as SeekerStep4Skills.tsx:24-52 — block the save rather
  // than let an empty picker overwrite real data.
  useEffect(() => {
    if (!jobId) return

    // No setLoadingSkills(true) here: the state initialises to true, so the first render is
    // already the loading one, and the retry handler re-arms it. Setting it synchronously
    // inside the effect is what react-hooks/set-state-in-effect flags.
    supabase
      .from('job_skills')
      .select('skill_id, requirement_level')
      .eq('job_id', jobId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading job skills:', error)
          setPrefillError(true)
        } else if (data) {
          setSelectedSkills(
            data.map((row) => ({
              skill_id: row.skill_id as string,
              // SkillsPicker runs in requirementMode here, so proficiency carries
              // 'required' | 'preferred' verbatim — the inverse of the write below.
              proficiency: row.requirement_level as SelectedSkill['proficiency'],
            })),
          )
        }
        setLoadingSkills(false)
      })
  }, [jobId, reloadNonce])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Refuse to save on a failed prefill: selectedSkills would be empty and the
    // delete-then-insert below would destroy the job's real skills.
    if (prefillError) return
    setSaving(true)

    try {
      // Delete existing job_skills for this job first
      const { error: deleteError } = await supabase.from('job_skills').delete().eq('job_id', jobId)

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
          requirement_level:
            s.proficiency === 'advanced' || s.proficiency === 'basic'
              ? s.proficiency === 'advanced'
                ? 'required'
                : 'preferred'
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

  if (prefillError) {
    return (
      <ErrorState
        message="We could not load this job's saved skills"
        onRetry={() => {
          setPrefillError(false)
          setLoadingSkills(true)
          setReloadNonce((n) => n + 1)
        }}
      />
    )
  }

  if (loadingSkills) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-brand-hover h-6 w-6 animate-spin rounded-full border-[2px] border-t-transparent" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Required skills
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Select skills and whether they are required or preferred for this role
        </p>
      </div>

      <SkillsPicker
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
      <ChipSelector
        label="Qualifications"
        options={QUALIFICATION_OPTIONS}
        value={qualifications}
        onChange={setQualifications}
        mode="multi"
        columns={2}
      />

      {/* Visa requirements */}
      <ChipSelector
        label="Visa requirements"
        options={VISA_CHIP_OPTIONS}
        value={visaRequirements}
        onChange={setVisaRequirements}
        mode="multi"
        columns={2}
      />

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
