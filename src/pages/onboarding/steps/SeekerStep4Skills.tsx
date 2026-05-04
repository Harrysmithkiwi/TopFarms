import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SkillsPicker } from '@/components/ui/SkillsPicker'
import { Button } from '@/components/ui/Button'
import type { SelectedSkill, SeekerProfileData } from '@/types/domain'

interface SeekerStep4Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  seekerId: string | null
  sectorPref?: string[]
}

function getSector(sectorPref?: string[]): 'dairy' | 'sheep_beef' {
  if (!sectorPref || sectorPref.length === 0) return 'dairy'
  // If only sheep_beef selected, show sheep_beef skills; otherwise default to dairy
  if (sectorPref.length === 1 && sectorPref[0] === 'sheep_beef') return 'sheep_beef'
  return 'dairy'
}

export function SeekerStep4Skills({ onComplete, onBack, seekerId, sectorPref }: SeekerStep4Props) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingSkills, setLoadingSkills] = useState(false)

  const sector = getSector(sectorPref)

  // Load existing seeker skills on mount if seekerId is available
  useEffect(() => {
    if (!seekerId) return

    setLoadingSkills(true)

    supabase
      .from('seeker_skills')
      .select('skill_id, proficiency')
      .eq('seeker_id', seekerId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading seeker skills:', error)
        } else if (data) {
          setSelectedSkills(
            data.map((row) => ({
              skill_id: row.skill_id as string,
              proficiency: row.proficiency as SelectedSkill['proficiency'],
            })),
          )
        }
        setLoadingSkills(false)
      })
  }, [seekerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!seekerId) {
      // No seeker profile ID yet — skip skills save, just advance
      onComplete({})
      return
    }

    setSaving(true)

    try {
      // Delete existing seeker_skills for this seeker
      const { error: deleteError } = await supabase
        .from('seeker_skills')
        .delete()
        .eq('seeker_id', seekerId)

      if (deleteError) {
        toast.error('Failed to update skills. Please try again.')
        console.error('Delete seeker_skills error:', deleteError)
        setSaving(false)
        return
      }

      // Insert newly selected skills if any
      if (selectedSkills.length > 0) {
        const rows = selectedSkills.map((s) => ({
          seeker_id: seekerId,
          skill_id: s.skill_id,
          proficiency: s.proficiency,
        }))

        const { error: insertError } = await supabase.from('seeker_skills').insert(rows)

        if (insertError) {
          toast.error('Failed to save skills. Please try again.')
          console.error('Insert seeker_skills error:', insertError)
          setSaving(false)
          return
        }
      }

      // Skills saved directly to seeker_skills — no profile data to merge
      onComplete({})
    } finally {
      setSaving(false)
    }
  }

  if (loadingSkills) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="w-6 h-6 rounded-full border-[2px] border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-brand-hover)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Your skills
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Select the skills you have and your proficiency level in each
        </p>
      </div>

      <SkillsPicker
        sector={sector}
        selectedSkills={selectedSkills}
        onChange={setSelectedSkills}
        requirementMode={false}
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
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}
