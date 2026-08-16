import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { SeekerStep1FarmType } from '@/pages/onboarding/steps/SeekerStep1FarmType'
import { SeekerStep2Experience } from '@/pages/onboarding/steps/SeekerStep2Experience'
import { SeekerStep3Qualifications } from '@/pages/onboarding/steps/SeekerStep3Qualifications'
import { SeekerStep4Skills } from '@/pages/onboarding/steps/SeekerStep4Skills'
import { SeekerStep5LifeSituation } from '@/pages/onboarding/steps/SeekerStep5LifeSituation'
import { SeekerStep6Visa } from '@/pages/onboarding/steps/SeekerStep6Visa'
import { SeekerContactFields } from '@/components/ui/SeekerContactFields'
import { useSeekerContact } from '@/hooks/useSeekerContact'
import {
  labelFrom,
  visaLabel,
  dairynzLabel,
  FARM_TYPE_OPTIONS,
  SHED_TYPES,
  HERD_SIZE_BUCKETS,
  LICENCE_TYPE_OPTIONS,
  CERTIFICATION_OPTIONS,
  HOUSING_SUB_OPTIONS,
  SALARY_BAND_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
} from '@/types/domain'
import type { SeekerProfileData } from '@/types/domain'

/**
 * Seeker profile editor.
 *
 * Before this page existed a seeker who finished onboarding could not change
 * anything, ever: `/onboarding/seeker` hard-redirects to the dashboard once
 * `onboarding_complete` is true, and seven affordances — including the persistent
 * "Edit Profile" item in the sidebar — pointed at that route, so every one of them
 * was a no-op. The redirect's own comment anticipated a `/profile` route that was
 * never built. Found driving the seeker UAT on prod, 2026-08-16.
 *
 * It deliberately reuses the six onboarding step components rather than
 * reimplementing their forms. Each already takes `defaultValues` + `onComplete`
 * and each already prefills from the database, so a second set of forms would be
 * a second place for the prefill/data-loss bugs of Phase 5.6 to reappear. The only
 * thing they lacked was the submit label, which is now a prop.
 */

const SUMMARY_EMPTY = 'Not set'

function list(options: readonly { value: string; label: string }[], values?: string[] | null) {
  if (!values || values.length === 0) return SUMMARY_EMPTY
  return values.map((v) => labelFrom(options, v)).join(', ')
}

function text(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return SUMMARY_EMPTY
  return String(value)
}

interface Section {
  key: string
  title: string
  /** Rows shown when the section is collapsed. */
  rows: (p: Partial<SeekerProfileData>) => { label: string; value: string }[]
}

const SECTIONS: Section[] = [
  {
    key: 'contact',
    title: 'Your details',
    // Contact details sit first and under their own name because that is what a seeker
    // comes here to change. They used to be reachable only inside step 1 under the heading
    // "Farm type & region", so the capability existed but nobody would ever find it.
    // Rows are supplied by the contact hook, not the profile row — see renderRows below.
    rows: () => [],
  },
  {
    key: 'farm-type',
    title: 'Farm type & region',
    rows: (p) => [
      { label: 'Farm types', value: list(FARM_TYPE_OPTIONS, p.sector_pref) },
      { label: 'Region', value: text(p.region) },
      { label: 'Roles', value: p.role_type_pref?.join(', ') || SUMMARY_EMPTY },
    ],
  },
  {
    key: 'experience',
    title: 'Experience',
    rows: (p) => [
      {
        label: 'Years farming',
        value: p.years_experience != null ? `${p.years_experience} years` : SUMMARY_EMPTY,
      },
      { label: 'Shed types', value: list(SHED_TYPES, p.shed_types_experienced) },
      { label: 'Herd sizes', value: list(HERD_SIZE_BUCKETS, p.herd_sizes_worked) },
    ],
  },
  {
    key: 'qualifications',
    title: 'Qualifications',
    rows: (p) => [
      { label: 'DairyNZ level', value: dairynzLabel(p.dairynz_level) || SUMMARY_EMPTY },
      { label: 'Licences', value: list(LICENCE_TYPE_OPTIONS, p.licence_types) },
      { label: 'Certifications', value: list(CERTIFICATION_OPTIONS, p.certifications) },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    // Skills live in seeker_skills, not on the profile row, so the collapsed view
    // names the section rather than lying about a count it has not loaded.
    rows: () => [{ label: 'Skills', value: 'Edit to review your selected skills' }],
  },
  {
    key: 'life-situation',
    title: 'Life situation & preferences',
    rows: (p) => [
      { label: 'Accommodation needed', value: p.accommodation_needed ? 'Yes' : 'No' },
      { label: 'Housing', value: list(HOUSING_SUB_OPTIONS, p.housing_sub_options) },
      { label: 'Preferred regions', value: p.preferred_regions?.join(', ') || SUMMARY_EMPTY },
      {
        label: 'Minimum salary',
        value: p.min_salary != null ? labelFrom(SALARY_BAND_OPTIONS, String(p.min_salary)) : SUMMARY_EMPTY,
      },
      { label: 'Available from', value: text(p.availability_date) },
      {
        label: 'Notice period',
        value: labelFrom(NOTICE_PERIOD_OPTIONS, p.notice_period_text) || SUMMARY_EMPTY,
      },
    ],
  },
  {
    key: 'visa',
    title: 'Visa status',
    rows: (p) => [{ label: 'Visa', value: visaLabel(p.visa_status) || SUMMARY_EMPTY }],
  },
]

export function SeekerProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Partial<SeekerProfileData>>({})
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Contact details live in seeker_contacts, not on the profile row, so they load and save
  // on their own path. The hook carries the prefill-failure guard that stops an untouched
  // form from nulling the name and phone an employer pays to unlock.
  const contact = useSeekerContact()

  async function handleContactSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await contact.save()
    setSaving(false)
    if (result?.error) {
      // Leave the form open so the seeker can retry without retyping.
      toast.error('Could not save your details. Please try again.')
      console.error('Contact save error:', result.error)
      return
    }
    setEditing(null)
    toast.success('Profile updated')
  }

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      // PGRST116 = no row yet. That is not an error here — it means this seeker has
      // never started onboarding, which the empty state below handles. Anything else
      // is a genuine failure, and per Phase 5.6 an unknown must not render as a known:
      // showing "Not set" for every field would invite the seeker to overwrite real
      // data with blanks.
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading seeker profile:', error)
        setLoadError(true)
        setLoading(false)
        return
      }

      if (data) {
        setSeekerProfileId(data.id)
        setProfile({
          sector_pref: data.sector_pref,
          role_type_pref: data.role_type_pref,
          years_experience: data.years_experience,
          shed_types_experienced: data.shed_types_experienced,
          herd_sizes_worked: data.herd_sizes_worked,
          dairynz_level: data.dairynz_level,
          region: data.region,
          open_to_relocate: data.open_to_relocate,
          accommodation_needed: data.accommodation_needed,
          housing_type_pref: data.housing_type_pref,
          pets: data.pets,
          couples_seeking: data.couples_seeking,
          family: data.family,
          visa_status: data.visa_status,
          min_salary: data.min_salary,
          availability_date: data.availability_date,
          licence_types: data.licence_types,
          certifications: data.certifications,
          housing_sub_options: data.housing_sub_options,
          preferred_regions: data.preferred_regions,
          notice_period_text: data.notice_period_text,
        })
      }

      setLoading(false)
    }

    load()
    // Keyed on the user id, not the session object: `session` is replaced on every
    // token refresh, so depending on it would refetch the profile roughly hourly and
    // discard an in-progress edit. Same trade-off as SeekerOnboarding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, reloadNonce])

  async function handleSectionSave(stepData: Partial<SeekerProfileData>) {
    if (!session?.user) return

    const updated = { ...profile, ...stepData }
    setSaving(true)

    // onboarding_step / onboarding_complete are deliberately NOT written here.
    // This page edits a finished profile; rewinding the wizard's position because
    // someone corrected their phone number would send them back through onboarding.
    const { error } = await supabase
      .from('seeker_profiles')
      .upsert({ user_id: session.user.id, ...updated }, { onConflict: 'user_id' })

    setSaving(false)

    if (error) {
      // Leave the form open and the edit un-applied so the seeker can retry without
      // retyping — closing it here would look like a successful save.
      toast.error('Could not save your changes. Please try again.')
      console.error('Profile upsert error:', error)
      return
    }

    setProfile(updated)
    setEditing(null)
    toast.success('Profile updated')
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <ErrorState
          message="We could not load your profile"
          onRetry={() => {
            setLoadError(false)
            setLoading(true)
            setReloadNonce((n) => n + 1)
          }}
        />
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div
          className="flex min-h-[400px] items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="border-brand-hover h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent" />
          <span className="sr-only">Loading your profile</span>
        </div>
      </DashboardLayout>
    )
  }

  // Empty state: a seeker who has never onboarded has nothing to edit, so send them
  // to the wizard rather than showing six sections of "Not set".
  if (!seekerProfileId) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl">
          <div className="bg-surface border-border rounded-[16px] border p-6 text-center shadow-sm">
            <h1 className="font-display text-brand-900 text-[20px] leading-7 font-semibold">
              You haven't set up your profile yet
            </h1>
            <p className="text-text-muted mt-2 text-sm">
              Employers match on what's in your profile, so it's worth the few minutes.
            </p>
            <Link to="/onboarding/seeker" className="mt-5 inline-block">
              <Button variant="primary" size="md">
                Set up your profile
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-brand-900 text-[20px] leading-7 font-semibold">
            Your profile
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Keep this current — it's what employers match against.
          </p>
        </div>

        {SECTIONS.map((section) => {
          const isEditing = editing === section.key

          return (
            <section
              key={section.key}
              className="bg-surface border-border rounded-[16px] border p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-text text-lg font-semibold">{section.title}</h2>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setEditing(section.key)}
                    disabled={editing !== null}
                    className="text-brand-hover focus-visible:outline-brand inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    Edit
                    <span className="sr-only"> {section.title}</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-5">
                  {saving && (
                    <div
                      className="text-brand-hover mb-4 flex items-center gap-2 text-sm"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="border-brand h-4 w-4 animate-spin rounded-full border-[2px] border-t-transparent" />
                      Saving…
                    </div>
                  )}

                  {section.key === 'contact' && (
                    <form onSubmit={handleContactSave} className="space-y-6">
                      <SeekerContactFields
                        firstName={contact.firstName}
                        lastName={contact.lastName}
                        phone={contact.phone}
                        onFirstNameChange={contact.setFirstName}
                        onLastNameChange={contact.setLastName}
                        onPhoneChange={contact.setPhone}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="text-text-muted hover:text-text focus-visible:outline-brand min-h-[44px] cursor-pointer text-[13px] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Cancel
                        </button>
                        <Button type="submit" variant="primary" size="md" disabled={saving}>
                          {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {section.key === 'farm-type' && (
                    <SeekerStep1FarmType
                      submitLabel="Save changes"
                      showContactFields={false}
                      onComplete={handleSectionSave}
                      defaultValues={{
                        sector_pref: profile.sector_pref,
                        region: profile.region,
                        role_type_pref: profile.role_type_pref,
                      }}
                    />
                  )}

                  {section.key === 'experience' && (
                    <SeekerStep2Experience
                      submitLabel="Save changes"
                      onComplete={handleSectionSave}
                      onBack={() => setEditing(null)}
                      defaultValues={{
                        years_experience: profile.years_experience,
                        shed_types_experienced: profile.shed_types_experienced,
                        herd_sizes_worked: profile.herd_sizes_worked,
                      }}
                    />
                  )}

                  {section.key === 'qualifications' && (
                    <SeekerStep3Qualifications
                      submitLabel="Save changes"
                      onComplete={handleSectionSave}
                      onBack={() => setEditing(null)}
                      defaultValues={{
                        dairynz_level: profile.dairynz_level,
                        licence_types: profile.licence_types,
                        certifications: profile.certifications,
                      }}
                    />
                  )}

                  {section.key === 'skills' && (
                    <SeekerStep4Skills
                      submitLabel="Save changes"
                      onComplete={handleSectionSave}
                      onBack={() => setEditing(null)}
                      seekerId={seekerProfileId}
                      sectorPref={profile.sector_pref}
                    />
                  )}

                  {section.key === 'life-situation' && (
                    <SeekerStep5LifeSituation
                      submitLabel="Save changes"
                      onComplete={handleSectionSave}
                      onBack={() => setEditing(null)}
                      defaultValues={{
                        couples_seeking: profile.couples_seeking,
                        accommodation_needed: profile.accommodation_needed,
                        housing_sub_options: profile.housing_sub_options,
                        preferred_regions: profile.preferred_regions,
                        min_salary: profile.min_salary,
                        availability_date: profile.availability_date,
                        notice_period_text: profile.notice_period_text,
                      }}
                    />
                  )}

                  {section.key === 'visa' && (
                    <SeekerStep6Visa
                      submitLabel="Save changes"
                      onComplete={handleSectionSave}
                      onBack={() => setEditing(null)}
                      defaultValues={{ visa_status: profile.visa_status }}
                    />
                  )}

                  {/* Step 1 has no onBack of its own, so it needs its own way out. */}
                  {section.key === 'farm-type' && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-text-muted hover:text-text focus-visible:outline-brand min-h-[44px] cursor-pointer text-[13px] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <dl className="mt-4 space-y-2.5">
                  {(section.key === 'contact'
                    ? [
                        {
                          label: 'Name',
                          value: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || SUMMARY_EMPTY,
                        },
                        { label: 'Phone', value: contact.phone || SUMMARY_EMPTY },
                      ]
                    : section.rows(profile)
                  ).map((row) => (
                    <div key={row.label} className="flex flex-wrap gap-x-3 text-sm">
                      <dt className="text-text-muted w-44 flex-shrink-0">{row.label}</dt>
                      <dd className="text-text min-w-0 font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
