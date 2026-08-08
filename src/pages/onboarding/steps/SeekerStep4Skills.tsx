import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SkillsPicker } from '@/components/ui/SkillsPicker'
import { Button } from '@/components/ui/Button'
import type { SelectedSkill, SeekerProfileData } from '@/types/domain'
import { ErrorState } from '@/components/ui/ErrorState'

interface SeekerStep4Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  seekerId: string | null
  sectorPref?: string[]
}

export function SeekerStep4Skills({ onComplete, onBack, seekerId }: SeekerStep4Props) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [prefillError, setPrefillError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

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
          // Phase 5.6 — DATA LOSS, not a display bug. handleSubmit below deletes
          // every seeker_skills row then re-inserts selectedSkills. If this
          // prefill failed, selectedSkills is empty, so saving wipes the skills
          // the seeker already had -- and 20 points of their match score with
          // them. Block the save rather than silently render "nothing selected".
          console.error('Error loading seeker skills:', error)
          setPrefillError(true)
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
  }, [seekerId, reloadNonce])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!seekerId) {
      // No seeker profile ID yet — skip skills save, just advance
      onComplete({})
      return
    }

    setSaving(true)

    try {
      // Refuse to save on an unknown starting state — see the prefill comment.
      if (prefillError) {
        toast.error('We could not load your saved skills. Reload before saving.')
        setSaving(false)
        return
      }

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

  if (prefillError) {
    return (
      <ErrorState
        message="We could not load your saved skills"
        onRetry={() => {
          setPrefillError(false)
          setReloadNonce((n) => n + 1)
        }}
      />
    )
  }

  if (loadingSkills) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-6 w-6 animate-spin rounded-full border-[2px] border-brand-hover border-t-transparent"
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          Your skills
        </h2>
      </div>

      <SkillsPicker
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
