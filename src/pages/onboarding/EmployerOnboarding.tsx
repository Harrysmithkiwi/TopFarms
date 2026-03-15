import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useWizard } from '@/hooks/useWizard'
import { Step1FarmType } from './steps/Step1FarmType'
import { Step2FarmDetails } from './steps/Step2FarmDetails'
import { Step3Culture } from './steps/Step3Culture'
import { Step4Accommodation } from './steps/Step4Accommodation'
import { Step5Verification } from './steps/Step5Verification'
import { Step6Pricing } from './steps/Step6Pricing'
import { Step7Preview } from './steps/Step7Preview'
import { Step8Complete } from './steps/Step8Complete'

const STEP_LABELS = [
  'Farm Type',
  'Farm Details',
  'Culture',
  'Accommodation',
  'Verification',
  'Pricing',
  'Preview',
  'Complete',
]

const TOTAL_STEPS = 8

// Profile data accumulated across steps
export interface EmployerProfileData {
  farm_type?: string
  farm_name?: string
  region?: string
  herd_size?: number
  shed_type?: string[]
  milking_frequency?: string
  breed?: string
  property_size_ha?: number
  ownership_type?: string
  culture_description?: string
  team_size?: number
  about_farm?: string
  accommodation_available?: boolean
  accommodation_type?: string
  accommodation_pets?: boolean
  accommodation_couples?: boolean
  accommodation_family?: boolean
  accommodation_utilities_included?: boolean
}

export function EmployerOnboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [profileData, setProfileData] = useState<EmployerProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialStep, setInitialStep] = useState(0)

  const wizard = useWizard({ totalSteps: TOTAL_STEPS, initialStep })

  // Load existing profile on mount to resume progress
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected for new users)
        console.error('Error loading profile:', error)
      }

      if (data) {
        const resumeStep = Math.min(data.onboarding_step ?? 0, TOTAL_STEPS - 1)
        setInitialStep(resumeStep)
        wizard.goToStep(resumeStep)
        setProfileData({
          farm_type: data.farm_type,
          farm_name: data.farm_name,
          region: data.region,
          herd_size: data.herd_size,
          shed_type: data.shed_type,
          milking_frequency: data.milking_frequency,
          breed: data.breed,
          property_size_ha: data.property_size_ha,
          ownership_type: data.ownership_type,
          culture_description: data.culture_description,
          team_size: data.team_size,
          about_farm: data.about_farm,
          accommodation_available: data.accommodation_available,
          accommodation_type: data.accommodation_type,
          accommodation_pets: data.accommodation_pets,
          accommodation_couples: data.accommodation_couples,
          accommodation_family: data.accommodation_family,
          accommodation_utilities_included: data.accommodation_utilities_included,
        })
      }

      setLoading(false)
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function handleStepComplete(stepData: Partial<EmployerProfileData>, stepIndex: number) {
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

    const { error } = await supabase
      .from('employer_profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' })

    setSaving(false)

    if (error) {
      toast.error('Failed to save progress. Please try again.')
      console.error('Upsert error:', error)
      return
    }

    if (isLastStep) {
      // Step 8 handles its own display — navigate after setting onboarding_complete
      navigate('/dashboard/employer')
    } else {
      wizard.nextStep()
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div
            className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-fern)', borderTopColor: 'transparent' }}
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
            style={{ color: 'var(--color-soil)' }}
          >
            Set up your farm profile
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mid)' }}>
            Complete your profile to start posting jobs and finding great farm workers
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          labels={STEP_LABELS}
        />

        {/* Step content */}
        <div className="bg-white rounded-[16px] border border-fog p-6 shadow-sm">
          {saving && (
            <div className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-moss)' }}>
              <div
                className="w-4 h-4 rounded-full border-[2px] border-t-transparent animate-spin"
                style={{ borderColor: 'var(--color-moss)', borderTopColor: 'transparent' }}
              />
              Saving...
            </div>
          )}

          {currentStep === 0 && (
            <Step1FarmType
              onComplete={(data) => handleStepComplete(data, 0)}
              defaultValues={{ farm_type: profileData.farm_type }}
            />
          )}

          {currentStep === 1 && (
            <Step2FarmDetails
              onComplete={(data) => handleStepComplete(data, 1)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                farm_name: profileData.farm_name,
                region: profileData.region,
                herd_size: profileData.herd_size,
                shed_type: profileData.shed_type,
                milking_frequency: profileData.milking_frequency,
                breed: profileData.breed,
                property_size_ha: profileData.property_size_ha,
                ownership_type: profileData.ownership_type,
              }}
            />
          )}

          {currentStep === 2 && (
            <Step3Culture
              onComplete={(data) => handleStepComplete(data, 2)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                culture_description: profileData.culture_description,
                team_size: profileData.team_size,
                about_farm: profileData.about_farm,
              }}
            />
          )}

          {currentStep === 3 && (
            <Step4Accommodation
              onComplete={(data) => handleStepComplete(data, 3)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                accommodation_available: profileData.accommodation_available,
                accommodation_type: profileData.accommodation_type,
                accommodation_pets: profileData.accommodation_pets,
                accommodation_couples: profileData.accommodation_couples,
                accommodation_family: profileData.accommodation_family,
                accommodation_utilities_included: profileData.accommodation_utilities_included,
              }}
            />
          )}

          {currentStep === 4 && (
            <Step5Verification
              onComplete={(data) => handleStepComplete(data, 4)}
              onBack={() => wizard.prevStep()}
            />
          )}

          {currentStep === 5 && (
            <Step6Pricing
              onComplete={(data) => handleStepComplete(data, 5)}
              onBack={() => wizard.prevStep()}
            />
          )}

          {currentStep === 6 && (
            <Step7Preview
              onComplete={(data) => handleStepComplete(data, 6)}
              onBack={() => wizard.prevStep()}
              onGoToStep={(step) => wizard.goToStep(step)}
              profileData={profileData}
            />
          )}

          {currentStep === 7 && (
            <Step8Complete />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
