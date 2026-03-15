import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SkillsPicker } from '@/components/ui/SkillsPicker'
import { Button } from '@/components/ui/Button'
import type { SelectedSkill } from '@/types/domain'

interface Step3Props {
  jobId: string
  sector: 'dairy' | 'sheep_beef'
  onComplete: () => void
  onBack?: () => void
}

export function JobStep3Skills({ jobId, sector, onComplete, onBack }: Step3Props) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [saving, setSaving] = useState(false)

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

      onComplete()
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
        sector={sector}
        selectedSkills={selectedSkills}
        onChange={setSelectedSkills}
        requirementMode={true}
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
