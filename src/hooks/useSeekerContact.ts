import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Owns the seeker's contact details — the `seeker_contacts` row an employer's placement
 * fee unlocks.
 *
 * Extracted from SeekerStep1FarmType 2026-08-16 so the profile editor can offer these
 * fields as their own section. They were only ever reachable inside step 1, under the
 * heading "Farm type & region", which meant a seeker looking for "change my phone number"
 * had no reason to click there. Extracting rather than copying keeps the data-loss guard
 * below in exactly one place: duplicating it is how it comes back.
 */
export function useSeekerContact() {
  const { session } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // DATA LOSS guard, not a display flag. Until the prefill read below settles, the three
  // inputs are empty — and a save writes `firstName.trim() || null`, so an untouched form
  // NULLs the name and phone an employer pays $200–800 to unlock. The seeker is on rural data
  // (docs/PRODUCT.md), so both a slow read and a failing one are realistic.
  //
  // Audit F-14: this used to be `prefillFailed`, defaulting to FALSE — which claims the
  // prefill SUCCEEDED. So the full-overwrite branch was the default, and a save that landed
  // before the fetch settled took it. The guard covered a failed read and not a pending one,
  // which is the more common case.
  //
  // Inverted: `loaded` is true only once the read has settled WITHOUT error. Pending and
  // failed now behave identically, which is right — in both the inputs do not mirror stored
  // data, so only what the human actually typed may be written.
  const [loaded, setLoaded] = useState(false)

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
          console.error('useSeekerContact: contact prefill failed', error)
          return   // `loaded` stays false — treated exactly like still-pending
        }
        // No row yet is the normal first-pass state, not a failure — the row is created by
        // the save below. Leave the fields empty and allow the write.
        if (data) {
          setFirstName(data.first_name ?? '')
          setLastName(data.last_name ?? '')
          setPhone(data.phone ?? '')
        }
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  /**
   * Persist the three fields. Returns an error only when a write was attempted and failed,
   * so callers can treat "nothing to write" and "written" the same way.
   */
  async function save(): Promise<{ error: unknown } | null> {
    const userId = session?.user?.id
    if (!userId) return null

    // Until the prefill has settled cleanly the inputs never received the stored values, so
    // writing an empty field back would null real data. Send only the fields the seeker
    // actually filled — their typed input is honoured, the untouched ones are left alone.
    // Once loaded, the inputs mirror the stored row, so all three are sent and deliberately
    // clearing a field still works.
    const patch: Record<string, string | null> = !loaded
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

    if (Object.keys(patch).length === 0) return null

    // Ensure the row exists before updating it. `seeker_contacts` rows are created by the
    // seeker_profiles_ensure_contact trigger, which fires AFTER INSERT on seeker_profiles —
    // so on a seeker's FIRST pass there is no row yet, an UPDATE matches nothing, and
    // PostgREST returns no error: the name and phone are silently dropped. Confirmed on
    // live prod 2026-08-12 (scripts/seeker-signup-walk.mjs).
    //
    // Two calls, not one upsert of everything: `email` is NOT NULL so the insert has to
    // carry it, but the column is operator-curatable and a single upsert would rewrite a
    // corrected address back to the signup one on every later save. ignoreDuplicates makes
    // this INSERT … ON CONFLICT DO NOTHING — the same statement the trigger runs, so
    // whichever gets there first wins and neither clobbers.
    await supabase
      .from('seeker_contacts')
      .upsert(
        { user_id: userId, email: session?.user?.email },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )

    const { error } = await supabase.from('seeker_contacts').update(patch).eq('user_id', userId)
    return error ? { error } : null
  }

  return {
    firstName,
    lastName,
    phone,
    setFirstName,
    setLastName,
    setPhone,
    /** True only once the prefill read settled without error. See F-14 above: a caller may
     *  use this to keep a save button disabled until the stored values have arrived. */
    loaded,
    save,
  }
}
