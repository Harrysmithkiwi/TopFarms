import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useWizard } from '@/hooks/useWizard'
import { JobStep1Basics } from './steps/JobStep1Basics'
import { JobStep2FarmDetails } from './steps/JobStep2FarmDetails'
import { JobStep3Skills } from './steps/JobStep3Skills'
import { JobStep4Compensation } from './steps/JobStep4Compensation'
import { JobStep5Description } from './steps/JobStep5Description'
import { JobStep6Preview } from './steps/JobStep6Preview'

const STEP_LABELS = [
  'Basics',
  'Farm Details',
  'Skills',
  'Compensation',
  'Description',
  'Preview',
  'Payment',
]

const TOTAL_STEPS = 7

export interface JobPostingData {
  // Step 1
  title?: string
  sector?: 'dairy' | 'sheep_beef'
  role_type?: string
  contract_type?: 'permanent' | 'contract' | 'casual'
  start_date?: string
  region?: string
  // Step 2
  shed_type?: string[]
  herd_size_min?: number
  herd_size_max?: number
  visa_sponsorship?: boolean
  couples_welcome?: boolean
  accommodation?: {
    available: boolean
    type?: string
    pets?: boolean
    couples?: boolean
    family?: boolean
    utilities_included?: boolean
  }
  // Step 4
  salary_min?: number
  salary_max?: number
  benefits?: string[]
  // Step 5
  description_overview?: string
  description_daytoday?: string
  description_offer?: string
  description_ideal?: string
}

export interface EmployerProfileDefaults {
  region?: string
  farm_type?: string
  shed_type?: string[]
  herd_size?: number
  accommodation_available?: boolean
  accommodation_type?: string
  accommodation_pets?: boolean
  accommodation_couples?: boolean
  accommodation_family?: boolean
  accommodation_utilities_included?: boolean
}

export function PostJob() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { id: urlJobId } = useParams<{ id: string }>()

  const [jobId, setJobId] = useState<string | null>(urlJobId ?? null)
  const [jobData, setJobData] = useState<JobPostingData>({})
  const [employerProfile, setEmployerProfile] = useState<EmployerProfileDefaults>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialStep, setInitialStep] = useState(0)

  const wizard = useWizard({ totalSteps: TOTAL_STEPS, initialStep })

  // Load employer profile and optionally an existing draft job on mount
  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      // Load employer profile for pre-filling and onboarding check
      const { data: profile, error: profileError } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading employer profile:', profileError)
      }

      if (profile) {
        if (!profile.onboarding_complete) {
          toast.error('Complete your farm profile first')
          navigate('/onboarding/employer')
          return
        }

        setEmployerProfile({
          region: profile.region,
          farm_type: profile.farm_type,
          shed_type: profile.shed_type,
          herd_size: profile.herd_size,
          accommodation_available: profile.accommodation_available,
          accommodation_type: profile.accommodation_type,
          accommodation_pets: profile.accommodation_pets,
          accommodation_couples: profile.accommodation_couples,
          accommodation_family: profile.accommodation_family,
          accommodation_utilities_included: profile.accommodation_utilities_included,
        })
      }

      // If editing existing draft, load it
      if (urlJobId) {
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', urlJobId)
          .eq('employer_id', session.user.id)
          .single()

        if (jobError) {
          toast.error('Could not load job draft')
          console.error('Error loading job draft:', jobError)
        } else if (job) {
          const acc = job.accommodation as JobPostingData['accommodation'] | null
          setJobData({
            title: job.title,
            sector: job.sector,
            role_type: job.role_type,
            contract_type: job.contract_type,
            start_date: job.start_date,
            region: job.region,
            shed_type: job.shed_type,
            herd_size_min: job.herd_size_min,
            herd_size_max: job.herd_size_max,
            visa_sponsorship: job.visa_sponsorship,
            couples_welcome: job.couples_welcome,
            accommodation: acc ?? undefined,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            benefits: job.benefits,
            description_overview: job.description_overview,
            description_daytoday: job.description_daytoday,
            description_offer: job.description_offer,
            description_ideal: job.description_ideal,
          })
          // Resume at step 1+ if we already have basics
          if (job.title && job.sector) {
            setInitialStep(1)
          }
        }
      }

      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function handleStep1Complete(stepData: Partial<JobPostingData>) {
    if (!session?.user) return

    const updatedData = { ...jobData, ...stepData }
    setJobData(updatedData)
    setSaving(true)

    if (!jobId) {
      // First submission — INSERT new draft job
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          employer_id: session.user.id,
          source: 'direct',
          status: 'draft',
          title: updatedData.title,
          sector: updatedData.sector,
          role_type: updatedData.role_type,
          contract_type: updatedData.contract_type,
          start_date: updatedData.start_date || null,
          region: updatedData.region,
        })
        .select('id')
        .single()

      setSaving(false)

      if (error || !data) {
        toast.error('Failed to create job draft. Please try again.')
        console.error('Insert error:', error)
        return
      }

      setJobId(data.id)
      // Update URL without navigation so browser back works properly
      window.history.replaceState(null, '', `/jobs/${data.id}/edit`)
    } else {
      // Editing existing draft — UPDATE step 1 fields
      const { error } = await supabase
        .from('jobs')
        .update({
          title: updatedData.title,
          sector: updatedData.sector,
          role_type: updatedData.role_type,
          contract_type: updatedData.contract_type,
          start_date: updatedData.start_date || null,
          region: updatedData.region,
        })
        .eq('id', jobId)

      setSaving(false)

      if (error) {
        toast.error('Failed to save. Please try again.')
        console.error('Update error:', error)
        return
      }
    }

    wizard.nextStep()
  }

  async function handleStepComplete(stepData: Partial<JobPostingData>, _stepIndex: number) {
    if (!session?.user || !jobId) return

    const updatedData = { ...jobData, ...stepData }
    setJobData(updatedData)
    setSaving(true)

    const { error } = await supabase
      .from('jobs')
      .update({
        shed_type: updatedData.shed_type,
        herd_size_min: updatedData.herd_size_min ?? null,
        herd_size_max: updatedData.herd_size_max ?? null,
        visa_sponsorship: updatedData.visa_sponsorship ?? false,
        couples_welcome: updatedData.couples_welcome ?? false,
        accommodation: updatedData.accommodation ?? null,
        salary_min: updatedData.salary_min ?? null,
        salary_max: updatedData.salary_max ?? null,
        benefits: updatedData.benefits ?? null,
        description_overview: updatedData.description_overview ?? null,
        description_daytoday: updatedData.description_daytoday ?? null,
        description_offer: updatedData.description_offer ?? null,
        description_ideal: updatedData.description_ideal ?? null,
      })
      .eq('id', jobId)

    setSaving(false)

    if (error) {
      toast.error('Failed to save. Please try again.')
      console.error('Update error:', error)
      return
    }

    wizard.nextStep()
  }

  function handlePreviewComplete() {
    // Advance to payment step (Plan 05)
    wizard.nextStep()
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
            Post a job
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mid)' }}>
            Complete all steps to publish your job listing
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
            <JobStep1Basics
              onComplete={handleStep1Complete}
              defaultValues={{
                title: jobData.title,
                sector: jobData.sector,
                role_type: jobData.role_type,
                contract_type: jobData.contract_type,
                start_date: jobData.start_date,
                region: jobData.region ?? employerProfile.region,
              }}
            />
          )}

          {currentStep === 1 && (
            <JobStep2FarmDetails
              onComplete={(data) => handleStepComplete(data, 1)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                shed_type: jobData.shed_type ?? employerProfile.shed_type,
                herd_size_min: jobData.herd_size_min,
                herd_size_max: jobData.herd_size_max ?? employerProfile.herd_size,
                visa_sponsorship: jobData.visa_sponsorship ?? false,
                couples_welcome: jobData.couples_welcome ?? false,
                accommodation: jobData.accommodation ?? (employerProfile.accommodation_available !== undefined
                  ? {
                      available: employerProfile.accommodation_available ?? false,
                      type: employerProfile.accommodation_type,
                      pets: employerProfile.accommodation_pets,
                      couples: employerProfile.accommodation_couples,
                      family: employerProfile.accommodation_family,
                      utilities_included: employerProfile.accommodation_utilities_included,
                    }
                  : undefined),
              }}
            />
          )}

          {currentStep === 2 && jobId && (
            <JobStep3Skills
              jobId={jobId}
              sector={jobData.sector ?? 'dairy'}
              onComplete={() => { wizard.nextStep() }}
              onBack={() => wizard.prevStep()}
            />
          )}

          {currentStep === 3 && (
            <JobStep4Compensation
              onComplete={(data) => handleStepComplete(data, 3)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                salary_min: jobData.salary_min,
                salary_max: jobData.salary_max,
                benefits: jobData.benefits ?? [],
              }}
            />
          )}

          {currentStep === 4 && (
            <JobStep5Description
              onComplete={(data) => handleStepComplete(data, 4)}
              onBack={() => wizard.prevStep()}
              defaultValues={{
                description_overview: jobData.description_overview,
                description_daytoday: jobData.description_daytoday,
                description_offer: jobData.description_offer,
                description_ideal: jobData.description_ideal,
              }}
            />
          )}

          {currentStep === 5 && jobId && (
            <JobStep6Preview
              jobId={jobId}
              onComplete={handlePreviewComplete}
              onBack={() => wizard.prevStep()}
              onGoToStep={(step) => wizard.goToStep(step)}
            />
          )}

          {currentStep === 6 && (
            <div className="text-center py-8 space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
                Choose a listing plan
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
                Payment flow coming in the next step.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/employer')}
                className="text-sm font-medium"
                style={{ color: 'var(--color-fern)' }}
              >
                Return to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
