import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useWizard } from '@/hooks/useWizard'
import { SeekerStep1FarmType } from './steps/SeekerStep1FarmType'
import { SeekerStep2Experience } from './steps/SeekerStep2Experience'
import { SeekerStep3Qualifications } from './steps/SeekerStep3Qualifications'
import { SeekerStep4Skills } from './steps/SeekerStep4Skills'
import { SeekerStep5LifeSituation } from './steps/SeekerStep5LifeSituation'
import { SeekerStep6Visa } from './steps/SeekerStep6Visa'
import { SeekerStep7Complete } from './steps/SeekerStep7Complete'
import type { SeekerProfileData } from '@/types/domain'

const STEP_LABELS = [
  'Farm Type',
  'Experience',
  'Qualifications',
  'Skills',
  'Life Situation',
  'Visa',
  'Complete',
]

const TOTAL_STEPS = 7

export function SeekerOnboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [profileData, setProfileData] = useState<Partial<SeekerProfileData>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialStep, setInitialStep] = useState(0)
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null)

  // BUG-03 2026-05-04: guard against double-firing the completion marker when
  // currentStep transitions to the final step. SeekerStep7Complete has no
  // onComplete prop of its own; SeekerOnboarding marks completion via this useEffect.
  const completionMarked = useRef(false)

  const wizard = useWizard({ totalSteps: TOTAL_STEPS, initialStep })

  // Load existing seeker profile on mount to resume progress
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected for new users)
        console.error('Error loading seeker profile:', error)
      }

      if (data) {
        // BUG-03 2026-05-04: re-entry redirect. If onboarding is already complete,
        // /onboarding/seeker should bounce to /dashboard/seeker rather than re-render
        // the wizard chrome. Editing happens elsewhere (when /profile route exists,
        // per Phase 17/18 nav consolidation).
        if (data.onboarding_complete) {
          navigate('/dashboard/seeker', { replace: true })
          return
        }
        const resumeStep = Math.min(data.onboarding_step ?? 0, TOTAL_STEPS - 1)
        setInitialStep(resumeStep)
        wizard.goToStep(resumeStep)
        setSeekerProfileId(data.id)
        setProfileData({
          sector_pref: data.sector_pref,
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

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // BUG-03 2026-05-04: SeekerStep7Complete has no onComplete prop and no explicit
  // "finish" button — it's a "you're done" matches view. Without firing the completion
  // upsert, onboarding_complete stays false forever, and re-entry to /onboarding/seeker
  // resumes at step 6 (the matches view inside wizard chrome) instead of redirecting
  // to dashboard. Mark complete on the first transition to the final step. The upsert
  // is idempotent (onConflict user_id), so StrictMode double-fire is harmless.
  useEffect(() => {
    if (
      wizard.currentStep === TOTAL_STEPS - 1 &&
      session?.user &&
      seekerProfileId &&
      !completionMarked.current
    ) {
      completionMarked.current = true
      handleStepComplete({}, TOTAL_STEPS - 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizard.currentStep, session?.user?.id, seekerProfileId])

  async function handleStepComplete(stepData: Partial<SeekerProfileData>, stepIndex: number) {
    if (!session?.user) return

    const updatedData = { ...profileData, ...stepData }
    setProfileData(updatedData)

    setSaving(true)

    const isLastStep = stepIndex === TOTAL_STEPS - 1

    const upsertPayload = {
      user_id: session.user.id,
      ...updatedData,
      onboarding_step: stepIndex + 1,
      ...(isLastStep ? { onboarding_complete: true } : {}),
    }

    const { data: upsertData, error } = await supabase
      .from('seeker_profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' })
      .select('id')
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to save progress. Please try again.')
      console.error('Upsert error:', error)
      return
    }

    // Track the seeker profile ID after first upsert (needed for skills step)
    if (upsertData?.id && !seekerProfileId) {
      setSeekerProfileId(upsertData.id)
    }

    if (!isLastStep) {
      wizard.nextStep()
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div
            className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-brand-hover)', borderTopColor: 'transparent' }}
          />
        </div>
      </DashboardLayout>
    )
  }

  const currentStep = wizard.currentStep

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1
            className="font-display text-2xl font-semibold"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Set up your job seeker profile
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Complete your profile to search with match scores and apply to farm jobs
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          labels={STEP_LABELS}
        />

        {/* Step content */}
        <div className="bg-surface rounded-[16px] border border-border p-6 shadow-sm">
          {saving && (
            <div className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-brand)' }}>
              <div
                className="w-4 h-4 rounded-full border-[2px] border-t-transparent animate-spin"
                style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }}
              />
              Saving...
            </div>
          )}

          {currentStep === 0 && (
            <SeekerStep1FarmType
              onComplete={(data) => handleStepComplete(data, 0)}
              defaultValues={{ sector_pref: profileData.sector_pref }}
            />
          )}

          {currentStep === 1 && (
            <SeekerStep2Experience
              onComplete={(data) => handleStepComplete(data, 1)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                years_experience: profileData.years_experience,
                shed_types_experienced: profileData.shed_types_experienced,
                herd_sizes_worked: profileData.herd_sizes_worked,
              }}
            />
          )}

          {currentStep === 2 && (
            <SeekerStep3Qualifications
              onComplete={(data) => handleStepComplete(data, 2)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                dairynz_level: profileData.dairynz_level,
                licence_types: profileData.licence_types,
                certifications: profileData.certifications,
              }}
            />
          )}

          {currentStep === 3 && (
            <SeekerStep4Skills
              onComplete={(data) => handleStepComplete(data, 3)}
              onBack={() => wizard.prevStep()}
              seekerId={seekerProfileId}
              sectorPref={profileData.sector_pref}
            />
          )}

          {currentStep === 4 && (
            <SeekerStep5LifeSituation
              onComplete={(data) => handleStepComplete(data, 4)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                couples_seeking: profileData.couples_seeking,
                accommodation_needed: profileData.accommodation_needed,
                housing_sub_options: profileData.housing_sub_options,
                preferred_regions: profileData.preferred_regions,
                min_salary: profileData.min_salary,
                availability_date: profileData.availability_date,
                notice_period_text: profileData.notice_period_text,
              }}
            />
          )}

          {currentStep === 5 && (
            <SeekerStep6Visa
              onComplete={(data) => handleStepComplete(data, 5)}
              onBack={() => wizard.prevStep()}
              defaultValues={{ visa_status: profileData.visa_status }}
            />
          )}

          {currentStep === 6 && (
            <SeekerStep7Complete
              profileData={{
                sector_pref: profileData.sector_pref,
                years_experience: profileData.years_experience,
                dairynz_level: profileData.dairynz_level,
                accommodation_needed: profileData.accommodation_needed,
                region: profileData.preferred_regions?.[0] ?? profileData.region,
                visa_status: profileData.visa_status,
              }}
              seekerProfileId={seekerProfileId ?? undefined}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
