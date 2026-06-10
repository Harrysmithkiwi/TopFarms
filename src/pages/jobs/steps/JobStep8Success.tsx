import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle, Share2, Briefcase, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

interface JobStep8SuccessProps {
  jobId: string
}

interface JobBasics {
  title: string
  region: string
}

export function JobStep8Success({ jobId }: JobStep8SuccessProps) {
  const [job, setJob] = useState<JobBasics | null>(null)

  useEffect(() => {
    async function loadJob() {
      const { data } = await supabase.from('jobs').select('title, region').eq('id', jobId).single()

      if (data) {
        setJob(data as JobBasics)
      }
    }
    loadJob()
  }, [jobId])

  const listingUrl = `${window.location.origin}/jobs/${jobId}`

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(listingUrl)
      toast.success('Link copied!')
    } catch {
      toast.error('Could not copy link. Please copy it manually.')
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-8 text-center">
      {/* Success icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(74,124,47,0.1)' }}
      >
        <CheckCircle className="h-10 w-10" style={{ color: 'var(--color-brand-hover)' }} />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2
          className="font-display text-2xl font-semibold"
          style={{ color: 'var(--color-brand-900)' }}
        >
          Your job is now live!
        </h2>
        {job && (
          <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
            {job.title} &middot; {job.region}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid w-full max-w-md grid-cols-3 gap-4">
        <div className="border-border bg-surface-2 rounded-[10px] border p-4 text-center">
          <p className="font-body text-2xl font-semibold" style={{ color: 'var(--color-brand)' }}>
            3
          </p>
          <p className="font-body mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            avg days to first applicant
          </p>
        </div>
        <div className="border-border bg-surface-2 rounded-[10px] border p-4 text-center">
          <p className="font-body text-2xl font-semibold" style={{ color: 'var(--color-brand)' }}>
            120+
          </p>
          <p className="font-body mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            seekers in match pool
          </p>
        </div>
        <div className="border-border bg-surface-2 rounded-[10px] border p-4 text-center">
          <p className="font-body text-2xl font-semibold" style={{ color: 'var(--color-brand)' }}>
            85%
          </p>
          <p className="font-body mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            actively looking
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        <Link
          to={`/jobs/${jobId}`}
          className="font-body flex w-full items-center justify-center gap-2 rounded-[8px] px-6 py-3 text-[14px] font-bold text-white transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: 'var(--color-brand)' }}
        >
          <Briefcase className="h-4 w-4" />
          View listing
        </Link>

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share listing
        </Button>

        <Link
          to="/jobs/new"
          className="font-body border-border text-text-muted hover:border-border-strong flex w-full items-center justify-center gap-2 rounded-[8px] border px-6 py-3 text-[14px] font-bold transition-all duration-200"
        >
          Post another job
        </Link>

        <Link
          to="/dashboard/employer"
          className="font-body flex w-full items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium transition-colors duration-200"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <LayoutDashboard className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
