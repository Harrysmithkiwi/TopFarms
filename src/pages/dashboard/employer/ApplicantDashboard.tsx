import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ApplicantPanel } from '@/components/ui/ApplicantPanel'
import { PlacementFeeModal } from '@/pages/dashboard/employer/PlacementFeeModal'
import { HireConfirmModal } from '@/pages/dashboard/employer/HireConfirmModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ApplicationStatus, MatchScore, SeekerContact } from '@/types/domain'
import {
  APPLICATION_STATUS_LABELS,
  PLACEMENT_FEE_TIERS,
  calculatePlacementFee,
} from '@/types/domain'

interface SeekerProfile {
  id: string
  user_id?: string
  first_name?: string
  region?: string
  years_experience?: number
  sector_pref?: string[]
  visa_status?: string
  dairynz_level?: string
  couples_seeking?: boolean
  accommodation_needed?: boolean
  shed_types_experienced?: string[]
  herd_sizes_worked?: string[]
}

interface SeekerSkill {
  skill_id: string
  seeker_id: string
  proficiency: string
  skills: { name: string; category: string }
}

interface Applicant {
  id: string
  status: ApplicationStatus
  cover_note?: string
  created_at: string
  seeker_profiles: SeekerProfile
  seeker_skills?: Omit<SeekerSkill, 'seeker_id'>[]
}

function buildSeekerLabel(app: Applicant): string {
  return [
    app.seeker_profiles.region ? `Seeker from ${app.seeker_profiles.region}` : 'Seeker',
    app.seeker_profiles.years_experience != null
      ? `${app.seeker_profiles.years_experience}yr experience`
      : null,
  ]
    .filter(Boolean)
    .join(' - ')
}

function SkeletonRow() {
  return (
    <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-4 bg-fog rounded" />
        <div className="w-9 h-9 bg-fog rounded-full" />
        <div className="w-20 h-5 bg-fog rounded-full" />
      </div>
    </div>
  )
}

export function ApplicantDashboard() {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [jobTitle, setJobTitle] = useState<string>('')
  const [jobSalaryMin, setJobSalaryMin] = useState<number | null>(null)
  const [jobSalaryMax, setJobSalaryMax] = useState<number | null>(null)
  const [empProfileId, setEmpProfileId] = useState<string | null>(null)
  const [farmName, setFarmName] = useState<string>('')
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Placement fee modal state
  const [pendingShortlistApp, setPendingShortlistApp] = useState<Applicant | null>(null)
  const [showPlacementFeeModal, setShowPlacementFeeModal] = useState(false)
  const [contactsMap, setContactsMap] = useState<Map<string, SeekerContact>>(new Map())

  // Hire confirmation modal state
  const [pendingHireApp, setPendingHireApp] = useState<Applicant | null>(null)
  const [showHireConfirmModal, setShowHireConfirmModal] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!session?.user || !jobId) {
        setLoading(false)
        return
      }

      // Get employer profile ID and farm name
      const { data: empProfile, error: empError } = await supabase
        .from('employer_profiles')
        .select('id, farm_name')
        .eq('user_id', session.user.id)
        .single()

      if (empError || !empProfile) {
        navigate('/dashboard/employer')
        return
      }

      setEmpProfileId(empProfile.id)
      setFarmName(empProfile.farm_name ?? '')

      // Load job details and verify ownership
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('title, employer_id, salary_min, salary_max')
        .eq('id', jobId)
        .single()

      if (jobError || !jobData) {
        navigate('/dashboard/employer')
        return
      }

      if (jobData.employer_id !== empProfile.id) {
        navigate('/dashboard/employer')
        return
      }

      setJobTitle(jobData.title)
      setJobSalaryMin(jobData.salary_min ?? null)
      setJobSalaryMax(jobData.salary_max ?? null)

      // Load applicants with seeker profiles (including user_id and first_name for contact lookup)
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          id, status, cover_note, created_at,
          seeker_profiles(
            id, user_id, first_name, region, years_experience, sector_pref, visa_status,
            dairynz_level, couples_seeking, accommodation_needed,
            shed_types_experienced, herd_sizes_worked
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (appError) {
        console.error('ApplicantDashboard: failed to load applicants', appError)
        setLoading(false)
        return
      }

      // Supabase returns seeker_profiles as array for joins — normalise to object
      const apps: Applicant[] = (appData ?? []).map((row: unknown) => {
        const r = row as Record<string, unknown>
        const sp = Array.isArray(r.seeker_profiles) ? r.seeker_profiles[0] : r.seeker_profiles
        return { ...r, seeker_profiles: sp as SeekerProfile } as Applicant
      })

      // Batch load skills for all seekers
      const seekerIds = apps
        .map((a) => a.seeker_profiles?.id)
        .filter((id): id is string => !!id)

      let skillsMap = new Map<string, Omit<SeekerSkill, 'seeker_id'>[]>()

      if (seekerIds.length > 0) {
        const { data: skillsData } = await supabase
          .from('seeker_skills')
          .select('skill_id, seeker_id, proficiency, skills(name, category)')
          .in('seeker_id', seekerIds)

        if (skillsData) {
          for (const row of skillsData as unknown as SeekerSkill[]) {
            const skillRow = row as SeekerSkill
            // skills may come as array from Supabase join
            const skillsObj = Array.isArray(skillRow.skills) ? skillRow.skills[0] : skillRow.skills
            const existing = skillsMap.get(skillRow.seeker_id) ?? []
            existing.push({ skill_id: skillRow.skill_id, proficiency: skillRow.proficiency, skills: skillsObj })
            skillsMap.set(skillRow.seeker_id, existing)
          }
        }
      }

      // Attach skills to applicants
      const appsWithSkills: Applicant[] = apps.map((a) => ({
        ...a,
        seeker_skills: skillsMap.get(a.seeker_profiles?.id ?? '') ?? [],
      }))

      // Fetch batch match scores using seeker IDs for this single job
      let newScoreMap = new Map<string, MatchScore>()

      if (seekerIds.length > 0) {
        // Load all pre-computed scores for this job in one query
        const { data: scoreRows } = await supabase
          .from('match_scores')
          .select('seeker_id, total_score, breakdown, explanation')
          .eq('job_id', jobId)
          .in('seeker_id', seekerIds)

        if (scoreRows) {
          for (const row of scoreRows) {
            newScoreMap.set(row.seeker_id, {
              total_score: row.total_score,
              breakdown: row.breakdown,
              explanation: row.explanation,
            })
          }
        }
      }

      setScoreMap(newScoreMap)

      // Sort applicants by match score descending
      const sorted = [...appsWithSkills].sort((a, b) => {
        const scoreA = newScoreMap.get(a.seeker_profiles?.id ?? '')?.total_score ?? 0
        const scoreB = newScoreMap.get(b.seeker_profiles?.id ?? '')?.total_score ?? 0
        return scoreB - scoreA
      })

      setApplicants(sorted)

      // Batch-fetch contacts for applicants already shortlisted/offered/hired
      // RLS ensures only acknowledged rows are returned
      const acknowledgedSeekerUserIds = sorted
        .filter((a) => ['shortlisted', 'offered', 'hired'].includes(a.status))
        .map((a) => a.seeker_profiles?.user_id)
        .filter((id): id is string => !!id)

      if (acknowledgedSeekerUserIds.length > 0) {
        const { data: contactRows } = await supabase
          .from('seeker_contacts')
          .select('user_id, phone, email')
          .in('user_id', acknowledgedSeekerUserIds)

        if (contactRows) {
          const cMap = new Map<string, SeekerContact>()
          for (const c of contactRows) {
            cMap.set(c.user_id, { phone: c.phone, email: c.email })
          }
          setContactsMap(cMap)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [session?.user?.id, jobId])

  async function handleTransition(applicationId: string, newStatus: ApplicationStatus, _note?: string) {
    // Shortlist gate — intercept and show placement fee modal
    if (newStatus === 'shortlisted') {
      const applicant = applicants.find((a) => a.id === applicationId)
      if (applicant) {
        setPendingShortlistApp(applicant)
        setShowPlacementFeeModal(true)
        return // Block until modal confirmed
      }
    }

    // Hire gate — intercept and show hire confirmation modal
    if (newStatus === 'hired') {
      const applicant = applicants.find((a) => a.id === applicationId)
      if (applicant) {
        setPendingHireApp(applicant)
        setShowHireConfirmModal(true)
        return // Block until modal confirmed
      }
    }

    // All other transitions — direct update
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId)

    if (error) {
      toast.error('Failed to update application status')
      return
    }

    toast.success(`Application moved to ${APPLICATION_STATUS_LABELS[newStatus]}`)
    // Update local state
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)),
    )
  }

  async function handlePlacementFeeConfirm() {
    if (!pendingShortlistApp || !session?.user || !empProfileId || !jobId) return

    const feeCalc = calculatePlacementFee(jobSalaryMin, jobSalaryMax, jobTitle)

    // Call Edge Function to write placement_fees row via service role
    const { error: fnError } = await supabase.functions.invoke('acknowledge-placement-fee', {
      body: {
        application_id: pendingShortlistApp.id,
        job_id: jobId,
        employer_id: empProfileId,
        seeker_id: pendingShortlistApp.seeker_profiles.id,
        fee_tier: feeCalc.tier,
        amount_nzd: feeCalc.amount,
      },
    })

    if (fnError) throw fnError

    // Now update application status to shortlisted
    const { error: statusErr } = await supabase
      .from('applications')
      .update({ status: 'shortlisted' })
      .eq('id', pendingShortlistApp.id)

    if (statusErr) throw statusErr

    // Update local state
    const acknowledgedAppId = pendingShortlistApp.id
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === acknowledgedAppId ? { ...a, status: 'shortlisted' as ApplicationStatus } : a,
      ),
    )

    // Fetch newly revealed contacts (RLS now allows access since placement_fees.acknowledged_at is set)
    const seekerUserId = pendingShortlistApp.seeker_profiles.user_id
    if (seekerUserId) {
      const { data: contactRow } = await supabase
        .from('seeker_contacts')
        .select('user_id, phone, email')
        .eq('user_id', seekerUserId)
        .maybeSingle()

      if (contactRow) {
        setContactsMap(
          (prev) => new Map(prev).set(contactRow.user_id, { phone: contactRow.phone, email: contactRow.email }),
        )
      }
    }

    toast.success('Contact details released')
    setShowPlacementFeeModal(false)
    setPendingShortlistApp(null)
  }

  async function handleHireConfirm(rating: number | null) {
    if (!pendingHireApp || !session?.user || !empProfileId || !jobId) return

    const feeCalc = calculatePlacementFee(jobSalaryMin, jobSalaryMax, jobTitle)

    // Resolve seeker email — prefer contactsMap, fall back to null
    const seekerUserIdForContact = pendingHireApp.seeker_profiles?.user_id
    const seekerContact = seekerUserIdForContact
      ? contactsMap.get(seekerUserIdForContact)
      : null

    // Call Edge Function to create Stripe Invoice + send seeker hire notification email
    const { error } = await supabase.functions.invoke('create-placement-invoice', {
      body: {
        application_id: pendingHireApp.id,
        job_id: jobId,
        employer_id: empProfileId,
        employer_email: session.user.email,
        farm_name: farmName,
        job_title: jobTitle,
        fee_tier: feeCalc.tier,
        amount_nzd: feeCalc.amount,
        rating,
        seeker_email: seekerContact?.email ?? null,
        seeker_name: pendingHireApp.seeker_profiles?.first_name ?? null,
      },
    })

    if (error) throw error

    // Update application status to hired
    const { error: statusErr } = await supabase
      .from('applications')
      .update({ status: 'hired' })
      .eq('id', pendingHireApp.id)

    if (statusErr) throw statusErr

    // Update local state
    setApplicants((prev) =>
      prev.map((a) => (a.id === pendingHireApp.id ? { ...a, status: 'hired' as ApplicationStatus } : a)),
    )

    toast.success('Hire confirmed — invoice sent to your email.')
    setShowHireConfirmModal(false)
    setPendingHireApp(null)
  }

  // Compute fee info for the pending app (only when modal is open)
  const pendingFeeCalc = pendingShortlistApp
    ? calculatePlacementFee(jobSalaryMin, jobSalaryMax, jobTitle)
    : null

  const hireFeeCalc = pendingHireApp
    ? calculatePlacementFee(jobSalaryMin, jobSalaryMax, jobTitle)
    : null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/dashboard/employer"
            className="flex items-center gap-1.5 text-sm font-body text-mid hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1
              className="font-display text-3xl font-semibold"
              style={{ color: 'var(--color-soil)' }}
            >
              {jobTitle ? `Applicants for ${jobTitle}` : 'Applicants'}
            </h1>
            {!loading && applicants.length > 0 && (
              <span
                className="px-2.5 py-1 rounded-full text-[12px] font-body font-semibold"
                style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
              >
                {applicants.length}
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Empty state */}
        {!loading && applicants.length === 0 && (
          <div
            className="rounded-[12px] p-12 text-center"
            style={{ backgroundColor: 'var(--color-mist)' }}
          >
            <p className="text-base font-body font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
              No applications yet for this listing
            </p>
            <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
              Applications will appear here once seekers apply
            </p>
          </div>
        )}

        {/* Applicant list */}
        {!loading && applicants.length > 0 && (
          <div className="space-y-3">
            {applicants.map((app) => (
              <ApplicantPanel
                key={app.id}
                application={app}
                matchScore={scoreMap.get(app.seeker_profiles?.id ?? '') ?? null}
                contacts={contactsMap.get(app.seeker_profiles?.user_id ?? '') ?? null}
                onTransition={handleTransition}
                expanded={expandedId === app.id}
                onToggle={() => setExpandedId((prev) => (prev === app.id ? null : app.id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Placement fee modal */}
      {showPlacementFeeModal && pendingShortlistApp && pendingFeeCalc && (
        <PlacementFeeModal
          candidateName={buildSeekerLabel(pendingShortlistApp)}
          feeTier={pendingFeeCalc.tier}
          feeAmount={pendingFeeCalc.amount}
          feeDisplayAmount={pendingFeeCalc.displayAmount}
          feeTierLabel={PLACEMENT_FEE_TIERS[pendingFeeCalc.tier].label}
          onConfirm={handlePlacementFeeConfirm}
          onCancel={() => {
            setShowPlacementFeeModal(false)
            setPendingShortlistApp(null)
          }}
        />
      )}

      {/* Hire confirmation modal */}
      {showHireConfirmModal && pendingHireApp && hireFeeCalc && (
        <HireConfirmModal
          candidateName={buildSeekerLabel(pendingHireApp)}
          feeDisplayAmount={hireFeeCalc.displayAmount}
          onConfirm={handleHireConfirm}
          onCancel={() => {
            setShowHireConfirmModal(false)
            setPendingHireApp(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}
