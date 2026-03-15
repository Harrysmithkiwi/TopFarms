import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

interface JobPreviewData {
  id: string
  title: string
  role_type: string
  region: string
  sector: string
  contract_type: string
  start_date?: string
  herd_size_min?: number
  herd_size_max?: number
  shed_type?: string[]
  salary_min?: number
  salary_max?: number
  benefits?: string[]
  description_overview?: string
  description_daytoday?: string
  description_offer?: string
  description_ideal?: string
  visa_sponsorship?: boolean
  couples_welcome?: boolean
  accommodation?: {
    available?: boolean
    type?: string
    pets?: boolean
    couples?: boolean
    family?: boolean
    utilities_included?: boolean
  }
  job_skills?: {
    requirement_level: string
    skills: {
      id: string
      name: string
      category: string
    }
  }[]
}

interface Step6Props {
  jobId: string
  onComplete: () => void
  onBack?: () => void
  onGoToStep: (step: number) => void
}

interface SectionProps {
  title: string
  stepIndex: number
  onGoToStep: (step: number) => void
  children: React.ReactNode
}

function PreviewSection({ title, stepIndex, onGoToStep, children }: SectionProps) {
  return (
    <div className="border-b border-fog pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body font-semibold text-[14px] text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onGoToStep(stepIndex)}
          className="text-[12px] font-body text-fern hover:text-moss transition-colors"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

interface DataRowProps {
  label: string
  value?: string | number | boolean | string[] | null
}

function DataRow({ label, value }: DataRowProps) {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null
  }

  let displayValue: string
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No'
  } else if (Array.isArray(value)) {
    displayValue = value.join(', ')
  } else {
    displayValue = String(value)
  }

  return (
    <div className="flex gap-2 text-[12px]">
      <span style={{ color: 'var(--color-mid)' }} className="min-w-[160px]">
        {label}
      </span>
      <span className="text-ink font-body">{displayValue}</span>
    </div>
  )
}

function DescriptionBlock({ label, text }: { label: string; text?: string }) {
  if (!text?.trim()) return null
  return (
    <div className="space-y-1">
      <p className="font-body text-[12px] font-semibold text-ink">{label}</p>
      <p className="text-[12px] text-ink font-body whitespace-pre-line leading-relaxed">{text}</p>
    </div>
  )
}

const SECTOR_LABELS: Record<string, string> = {
  dairy: 'Dairy',
  sheep_beef: 'Sheep & Beef',
}

const CONTRACT_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  contract: 'Contract',
  casual: 'Casual',
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} – ${fmt(max)} per year`
  if (min) return `From ${fmt(min)} per year`
  if (max) return `Up to ${fmt(max)} per year`
  return null
}

export function JobStep6Preview({ jobId, onComplete, onBack, onGoToStep }: Step6Props) {
  const [job, setJob] = useState<JobPreviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadJob() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, job_skills(requirement_level, skills(id, name, category))')
        .eq('id', jobId)
        .single()

      if (error) {
        toast.error('Failed to load job preview')
        console.error('Preview load error:', error)
      } else {
        setJob(data as unknown as JobPreviewData)
      }
      setLoading(false)
    }

    loadJob()
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-fern)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="py-8 text-center text-[13px]" style={{ color: 'var(--color-mid)' }}>
        Could not load job preview.
      </div>
    )
  }

  const salaryDisplay = formatSalary(job.salary_min, job.salary_max)
  const requiredSkills = job.job_skills?.filter((js) => js.requirement_level === 'required') ?? []
  const preferredSkills =
    job.job_skills?.filter((js) => js.requirement_level === 'preferred') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Preview your listing
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Review all details before choosing your listing plan
        </p>
      </div>

      <div className="space-y-4">
        {/* Header */}
        <PreviewSection title="Job Basics" stepIndex={0} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            <p className="font-body font-semibold text-[15px] text-ink">{job.title}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-mist"
                style={{ color: 'var(--color-mid)' }}
              >
                {SECTOR_LABELS[job.sector] ?? job.sector}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-mist"
                style={{ color: 'var(--color-mid)' }}
              >
                {job.role_type}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-mist"
                style={{ color: 'var(--color-mid)' }}
              >
                {job.region}
              </span>
            </div>
            <div className="space-y-1 mt-2">
              <DataRow
                label="Contract type"
                value={CONTRACT_LABELS[job.contract_type] ?? job.contract_type}
              />
              {job.start_date && (
                <DataRow label="Start date" value={new Date(job.start_date).toLocaleDateString('en-NZ')} />
              )}
            </div>
          </div>
        </PreviewSection>

        {/* Farm Details */}
        <PreviewSection title="Farm Details" stepIndex={1} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            {job.shed_type && job.shed_type.length > 0 && (
              <DataRow label="Shed type" value={job.shed_type} />
            )}
            {(job.herd_size_min || job.herd_size_max) && (
              <DataRow
                label="Herd size"
                value={
                  job.herd_size_min && job.herd_size_max
                    ? `${job.herd_size_min} – ${job.herd_size_max}`
                    : job.herd_size_min
                      ? `From ${job.herd_size_min}`
                      : `Up to ${job.herd_size_max}`
                }
              />
            )}
            <DataRow label="Visa sponsorship" value={job.visa_sponsorship} />
            <DataRow label="Couples welcome" value={job.couples_welcome} />
            {job.accommodation?.available && (
              <>
                <DataRow label="Accommodation" value="Available" />
                {job.accommodation.type && (
                  <DataRow label="Accommodation type" value={job.accommodation.type} />
                )}
                {job.accommodation.pets && <DataRow label="Pets allowed" value={true} />}
                {job.accommodation.couples && (
                  <DataRow label="Suitable for couples" value={true} />
                )}
                {job.accommodation.family && (
                  <DataRow label="Suitable for families" value={true} />
                )}
                {job.accommodation.utilities_included && (
                  <DataRow label="Utilities included" value={true} />
                )}
              </>
            )}
            {!job.shed_type?.length &&
              !job.herd_size_min &&
              !job.herd_size_max &&
              !job.visa_sponsorship &&
              !job.couples_welcome &&
              !job.accommodation?.available && (
                <p className="text-[12px]" style={{ color: 'var(--color-light)' }}>
                  No farm details added
                </p>
              )}
          </div>
        </PreviewSection>

        {/* Skills */}
        <PreviewSection title="Skills" stepIndex={2} onGoToStep={onGoToStep}>
          {requiredSkills.length === 0 && preferredSkills.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--color-light)' }}>
              No skills selected
            </p>
          ) : (
            <div className="space-y-3">
              {requiredSkills.length > 0 && (
                <div>
                  <p className="text-[11px] font-body font-semibold text-mid uppercase tracking-wide mb-1.5">
                    Required
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((js) => (
                      <span
                        key={js.skills.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-[rgba(74,124,47,0.1)]"
                        style={{ color: 'var(--color-fern)' }}
                      >
                        {js.skills.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {preferredSkills.length > 0 && (
                <div>
                  <p className="text-[11px] font-body font-semibold text-mid uppercase tracking-wide mb-1.5">
                    Preferred
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preferredSkills.map((js) => (
                      <span
                        key={js.skills.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-mist"
                        style={{ color: 'var(--color-mid)' }}
                      >
                        {js.skills.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </PreviewSection>

        {/* Compensation */}
        <PreviewSection title="Compensation" stepIndex={3} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            {salaryDisplay ? (
              <DataRow label="Salary" value={salaryDisplay} />
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--color-light)' }}>
                Salary not specified
              </p>
            )}
            {job.benefits && job.benefits.length > 0 && (
              <DataRow label="Benefits" value={job.benefits} />
            )}
          </div>
        </PreviewSection>

        {/* Description */}
        <PreviewSection title="Description" stepIndex={4} onGoToStep={onGoToStep}>
          {!job.description_overview &&
          !job.description_daytoday &&
          !job.description_offer &&
          !job.description_ideal ? (
            <p className="text-[12px]" style={{ color: 'var(--color-light)' }}>
              No description added
            </p>
          ) : (
            <div className="space-y-3">
              <DescriptionBlock label="Role Overview" text={job.description_overview} />
              <DescriptionBlock label="Day-to-Day" text={job.description_daytoday} />
              <DescriptionBlock label="What We Offer" text={job.description_offer} />
              <DescriptionBlock label="Ideal Candidate" text={job.description_ideal} />
            </div>
          )}
        </PreviewSection>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="md"
          className={onBack ? '' : 'ml-auto'}
          onClick={onComplete}
        >
          Looks good — choose a listing plan
        </Button>
      </div>
    </div>
  )
}
