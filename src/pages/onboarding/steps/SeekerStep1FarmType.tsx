import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { FARM_TYPE_OPTIONS } from '@/types/domain'
import { NZ_REGIONS, ROLE_TYPES } from '@/lib/constants'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep1Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  defaultValues?: { sector_pref?: string[]; region?: string; role_type_pref?: string[] }
  /** Overrides the submit label. The profile editor reuses this form to edit one
   *  section, where "Continue" would imply a next step that does not exist. */
  submitLabel?: string
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
}: SeekerStep1Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultValues?.sector_pref ?? [])
  const [region, setRegion] = useState<string>(defaultValues?.region ?? '')
  const [roles, setRoles] = useState<string[]>(defaultValues?.role_type_pref ?? [])

  // Phase 3 Task 3.6. Name and phone live in seeker_contacts — the table the
  // employer's placement fee unlocks. Nothing in the product asked for either
  // one, so employers were paying $200–$800 for a row that held only the signup
  // email (and, for 3 of 4 seekers, did not exist at all). Migration 077 creates
  // the row; this is where the human fills it in.
  const { session } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  // DATA LOSS guard, not a display flag. If the prefill read below fails, the three inputs
  // stay empty — and handleSubmit writes `firstName.trim() || null`, so an untouched step
  // NULLs the name and phone the employer pays $200–800 to unlock. This step is re-entered
  // on every resume at step 0 and every Back from step 2, and the seeker is on rural data
  // (docs/PRODUCT.md), so the failing read is a realistic event rather than a theoretical
  // one. On a read failure we skip the contact UPDATE entirely and still advance: the
  // profile upsert in onComplete() is independent and must not be blocked by it.
  const [contactPrefillFailed, setContactPrefillFailed] = useState(false)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    supabase
      .from('seeker_contacts')
      .select('first_name, last_name, phone')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('SeekerStep1FarmType: contact prefill failed', error)
          setContactPrefillFailed(true)
          return
        }
        // No row yet is the normal first-pass state, not a failure — the row is created
        // by the upsert in handleSubmit. Leave the fields empty and allow the write.
        if (!data) return
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPhone(data.phone ?? '')
      })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTypes.length === 0 || !region) return

    const userId = session?.user?.id
    // When the prefill failed the inputs never received the stored values, so writing an
    // empty field back would null real data. Send only the fields the seeker actually
    // filled — their typed input is still honoured, the untouched ones are left alone.
    // When the prefill succeeded the inputs mirror the stored row, so all three are sent
    // and deliberately clearing a field still works.
    const contactPatch: Record<string, string | null> = contactPrefillFailed
      ? Object.fromEntries(
          Object.entries({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          }).filter(([, v]) => v !== ''),
        )
      : {
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
        }

    if (userId && Object.keys(contactPatch).length > 0) {
      setSaving(true)
      // Ensure the row exists before updating it. `seeker_contacts` rows are created by
      // the seeker_profiles_ensure_contact trigger, which fires AFTER INSERT on
      // seeker_profiles — and the profile is only upserted by onComplete() below, i.e.
      // after this runs. So on a seeker's FIRST pass through step 1 there is no row yet,
      // an UPDATE matches nothing, and PostgREST returns no error: the name and phone the
      // employer pays $200–800 to see are silently dropped. Confirmed on live prod
      // 2026-08-12 (scripts/seeker-signup-walk.mjs; the row came back first_name NULL
      // after the form was filled).
      //
      // Two calls, not one upsert of everything: `email` is NOT NULL, so the insert has
      // to carry it, but the column is operator-curatable and a single upsert would
      // rewrite a corrected address back to the signup one on every later save.
      // ignoreDuplicates makes this INSERT … ON CONFLICT DO NOTHING — the same statement
      // the trigger runs, so whichever gets there first wins and neither clobbers.
      await supabase
        .from('seeker_contacts')
        .upsert(
          { user_id: userId, email: session?.user?.email },
          { onConflict: 'user_id', ignoreDuplicates: true },
        )

      const { error } = await supabase
        .from('seeker_contacts')
        .update(contactPatch)
        .eq('user_id', userId)
      setSaving(false)
      if (error) {
        // Non-fatal: the profile step should still proceed. The employer-facing
        // display name falls back to the email derivation until this succeeds.
        console.error('SeekerStep1FarmType: contact details save failed', error)
        toast.warning('We could not save your contact details — you can add them later.')
      }
    }

    onComplete({
      sector_pref: selectedTypes,
      region,
      ...(roles.length ? { role_type_pref: roles } : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          Your details
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Employers see your first name and last initial while deciding. Your full name, email and
          phone are shared only with an employer who shortlists you.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            maxLength={80}
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            maxLength={80}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={30}
            placeholder="021 123 4567"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text">
          What type of farm work are you looking for?
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Select all that apply.
        </p>
      </div>

      {/* ariaLabel, not label: the h2 above already asks the question visibly. */}
      <ChipSelector
        ariaLabel="Farm types you are looking for"
        options={FARM_TYPE_OPTIONS}
        value={selectedTypes}
        onChange={setSelectedTypes}
        mode="multi"
        columns={2}
      />

      {selectedTypes.length === 0 && (
        <p className="font-body text-xs text-text-muted">
          Please select at least one farm type to continue
        </p>
      )}

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
