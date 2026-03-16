import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ApplicantPanel } from '@/components/ui/ApplicantPanel'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ApplicationStatus, MatchScore } from '@/types/domain'
import { APPLICATION_STATUS_LABELS } from '@/types/domain'

interface SeekerProfile {
  id: string
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
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!session?.user || !jobId) {
        setLoading(false)
        return
      }

      // Get employer profile ID
      const { data: empProfile, error: empError } = await supabase
        .from('employer_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (empError || !empProfile) {
        navigate('/dashboard/employer')
        return
      }

      // Load job details and verify ownership
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('title, employer_id')
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

      // Load applicants with seeker profiles
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          id, status, cover_note, created_at,
          seeker_profiles(
            id, region, years_experience, sector_pref, visa_status,
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
      setLoading(false)
    }

    loadData()
  }, [session?.user?.id, jobId])

  async function handleTransition(applicationId: string, newStatus: ApplicationStatus, _note?: string) {
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
                onTransition={handleTransition}
                expanded={expandedId === app.id}
                onToggle={() => setExpandedId((prev) => (prev === app.id ? null : app.id))}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
