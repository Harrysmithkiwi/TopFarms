import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { Select } from '@/components/ui/Select'
import { SeekerContactFields } from '@/components/ui/SeekerContactFields'
import { useSeekerContact } from '@/hooks/useSeekerContact'
import { FARM_TYPE_OPTIONS } from '@/types/domain'
import { NZ_REGIONS, ROLE_TYPES, CONTRACT_TYPE_PREFS } from '@/lib/constants'
import type { SeekerProfileData } from '@/types/domain'
import { reportError } from '@/lib/observability'

interface SeekerStep1Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  defaultValues?: {
    sector_pref?: string[]
    region?: string
    role_type_pref?: string[]
    contract_type_pref?: string[]
  }
  /** Overrides the submit label. The profile editor reuses this form to edit one
   *  section, where "Continue" would imply a next step that does not exist. */
  submitLabel?: string
  /**
   * Whether to render the name/phone block. True during onboarding, where step 1 is the
   * one screen a bailing visitor is guaranteed to see. False in the profile editor, which
   * gives contact details their own section — rendering them here too would show the same
   * inputs twice on one page, each with its own save.
   */
  showContactFields?: boolean
}

/**
 * Step 1 is the MATCHABLE CORE: after this screen a profile can be scored against a job,
 * and every later step only sharpens the score. That is why region and role live here
 * rather than deeper in the wizard — the steps after this one are escapable
 * ("Save and finish later"), and a cold visitor who bails must still leave behind a
 * profile the match engine can see.
 *
 * `sector_pref` is the load-bearing one. trigger_recompute_job_scores filters
 * `WHERE NEW.sector = ANY(sp.sector_pref)`, so a profile without it matches NOTHING —
 * it is invisible to every job ever posted, silently. Verified 2026-08-11 (LAUNCH.md R3).
 */

export function SeekerStep1FarmType({
  onComplete,
  defaultValues,
  submitLabel = 'Continue',
  showContactFields = true,
}: SeekerStep1Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultValues?.sector_pref ?? [])
  const [region, setRegion] = useState<string>(defaultValues?.region ?? '')
  const [roles, setRoles] = useState<string[]>(defaultValues?.role_type_pref ?? [])
  const [terms, setTerms] = useState<string[]>(defaultValues?.contract_type_pref ?? [])
  const [saving, setSaving] = useState(false)

  // Phase 3 Task 3.6. Name and phone live in seeker_contacts — the table the employer's
  // placement fee unlocks. Nothing in the product asked for either one, so employers were
  // paying $200–$800 for a row that held only the signup email. State, prefill and the
  // data-loss guard moved to useSeekerContact 2026-08-16 so the profile editor can offer
  // the same fields as their own section.
  const contact = useSeekerContact()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTypes.length === 0 || !region) return

    if (showContactFields) {
      setSaving(true)
      const result = await contact.save()
      setSaving(false)
      if (result?.error) {
        // Non-fatal: the profile step should still proceed. The profile upsert in
        // onComplete() is independent and must not be blocked by a contact write. The
        // employer-facing display name falls back to the email derivation until it lands.
        reportError('seeker onboarding step 1: contact save', result.error)
        toast.warning('We could not save your contact details — you can add them later.')
      }
    }

    onComplete({
      sector_pref: selectedTypes,
      region,
      ...(roles.length ? { role_type_pref: roles } : {}),
      ...(terms.length ? { contract_type_pref: terms } : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showContactFields && (
        <SeekerContactFields
          heading="Your details"
          firstName={contact.firstName}
          lastName={contact.lastName}
          phone={contact.phone}
          onFirstNameChange={contact.setFirstName}
          onLastNameChange={contact.setLastName}
          onPhoneChange={contact.setPhone}
        />
      )}

      <div>
        <h2 className="text-lg font-semibold text-text">
          What type of farm work are you looking for?
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Select all that apply.
        </p>
      </div>

      {/* ariaLabel, not label: the h2 above already asks the question visibly.
          `hint`, not the loose <p> that used to sit below the chips: this is the one group
          on the step that disables Continue while it is empty, and the sentence saying so
          was an unassociated paragraph AFTER the control - nothing tied it to the group,
          and it was the only signal that the field was required at all. Found by the
          pre-launch UAT design pass, 2026-08-25. */}
      <ChipSelector
        ariaLabel="Farm types you are looking for"
        hint="Required — select at least one to continue."
        options={FARM_TYPE_OPTIONS}
        value={selectedTypes}
        onChange={setSelectedTypes}
        mode="multi"
        columns={2}
      />

      {/* Region and role complete the matchable core. Region carries real weight in the
          score; role sharpens it. Both sit here so a visitor who stops after this screen
          is still a profile the engine can see. */}
      <Select
        label="Where do you want to work?"
        required
        placeholder="Select a region"
        options={NZ_REGIONS.map((r) => ({ value: r, label: r }))}
        value={region}
        onValueChange={setRegion}
      />

      <ChipSelector
        label="Roles you're after"
        options={ROLE_TYPES.filter((r) => r !== 'Other').map((r) => ({ value: r, label: r }))}
        value={roles}
        onChange={setRoles}
        mode="multi"
        columns={2}
      />

      {/* Gap G-1. Four of six real seeker posts wanted relief or part-time work and had
          nowhere to say so — the profile could carry the role but never the terms. Multi
          on purpose: "a permanent job, or relief in the meantime" is the commonest answer
          in those posts, and a single-select would force them to misrepresent it. */}
      <ChipSelector
        label="Type of work"
        options={CONTRACT_TYPE_PREFS.map((c) => ({ value: c.value, label: c.label }))}
        value={terms}
        onChange={setTerms}
        mode="multi"
        columns={2}
      />

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={selectedTypes.length === 0 || !region || saving}
        >
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
