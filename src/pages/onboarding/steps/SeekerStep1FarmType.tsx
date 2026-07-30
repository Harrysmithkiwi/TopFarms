import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { FARM_TYPE_OPTIONS } from '@/types/domain'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep1Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  defaultValues?: { sector_pref?: string[] }
}

export function SeekerStep1FarmType({ onComplete, defaultValues }: SeekerStep1Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultValues?.sector_pref ?? [])

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

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false
    supabase
      .from('seeker_contacts')
      .select('first_name, last_name, phone')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
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
    if (selectedTypes.length === 0) return

    const userId = session?.user?.id
    if (userId) {
      setSaving(true)
      const { error } = await supabase
        .from('seeker_contacts')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('user_id', userId)
      setSaving(false)
      if (error) {
        // Non-fatal: the profile step should still proceed. The employer-facing
        // display name falls back to the email derivation until this succeeds.
        console.error('SeekerStep1FarmType: contact details save failed', error)
        toast.warning('We could not save your contact details — you can add them later.')
      }
    }

    onComplete({ sector_pref: selectedTypes })
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
        <p className="font-body text-xs text-text-muted">
          Please select at least one farm type to continue
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={selectedTypes.length === 0 || saving}
        >
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}
