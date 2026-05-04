import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Checkbox } from '@/components/ui/Checkbox'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { Skill, SelectedSkill, SkillProficiency } from '@/types/domain'

interface SkillsPickerProps {
  sector: 'dairy' | 'sheep_beef'
  selectedSkills: SelectedSkill[]
  onChange: (skills: SelectedSkill[]) => void
  /**
   * If true, show required/preferred toggle instead of proficiency level.
   * Used in the job posting wizard (JPOS-03).
   */
  requirementMode?: boolean
  className?: string
}

type RequirementLevel = 'required' | 'preferred'

const PROFICIENCY_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const REQUIREMENT_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'preferred', label: 'Preferred' },
]

/**
 * Skills picker with grouped checklist by category.
 * Loads skills from Supabase filtered by sector (includes 'both' sector skills).
 * Each checked skill shows a proficiency dropdown (or required/preferred in requirementMode).
 */
export function SkillsPicker({
  sector,
  selectedSkills,
  onChange,
  requirementMode = false,
  className,
}: SkillsPickerProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSkills() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('skills')
        .select('*')
        .or(`sector.eq.${sector},sector.eq.both`)
        .order('category')
        .order('name')

      if (cancelled) return

      if (fetchError) {
        setError('Failed to load skills. Please try again.')
      } else {
        setSkills((data as Skill[]) ?? [])
      }
      setLoading(false)
    }

    loadSkills()

    return () => {
      cancelled = true
    }
  }, [sector])

  // Group skills by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = []
    acc[skill.category].push(skill)
    return acc
  }, {})

  const selectedMap = new Map(selectedSkills.map((s) => [s.skill_id, s]))

  function handleToggle(skillId: string, checked: boolean) {
    if (checked) {
      onChange([...selectedSkills, { skill_id: skillId, proficiency: 'basic' }])
    } else {
      onChange(selectedSkills.filter((s) => s.skill_id !== skillId))
    }
  }

  function handleProficiencyChange(skillId: string, value: string) {
    onChange(
      selectedSkills.map((s) =>
        s.skill_id === skillId ? { ...s, proficiency: value as SkillProficiency } : s,
      ),
    )
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-text-muted text-[13px] font-body', className)}>
        Loading skills...
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('py-4 text-[13px] font-body text-danger', className)}>{error}</div>
    )
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <div className={cn('py-4 text-[13px] font-body text-text-muted', className)}>
        No skills available for this sector.
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {Object.entries(grouped).map(([category, categorySkills]) => (
        <div key={category}>
          {/* Category header */}
          <h4 className="text-[11px] font-body font-semibold text-text-muted uppercase tracking-wide mb-2.5">
            {category.replace(/_/g, ' ')}
          </h4>

          <div className="space-y-2">
            {categorySkills.map((skill) => {
              const selected = selectedMap.get(skill.id)
              const isChecked = Boolean(selected)

              return (
                <div key={skill.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`skill-${skill.id}`}
                    label={skill.name}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                  />

                  {/* Proficiency / requirement dropdown — only shown when checked */}
                  {isChecked && (
                    <div className="ml-auto w-[140px] flex-shrink-0">
                      <Select
                        options={requirementMode ? REQUIREMENT_OPTIONS : PROFICIENCY_OPTIONS}
                        value={selected?.proficiency ?? 'basic'}
                        onValueChange={(value) => handleProficiencyChange(skill.id, value)}
                        placeholder={requirementMode ? 'Requirement' : 'Proficiency'}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
