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
      const { data } = await supabase
        .from('jobs')
        .select('title, region')
        .eq('id', jobId)
        .single()

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
    <div className="flex flex-col items-center text-center py-8 space-y-6">
      {/* Success icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(74,124,47,0.1)' }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-brand-hover)' }} />
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
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        <div className="text-center p-4 rounded-[10px] border border-border bg-surface-2">
          <p className="text-2xl font-semibold font-body" style={{ color: 'var(--color-brand)' }}>3</p>
          <p className="text-[12px] font-body mt-1" style={{ color: 'var(--color-text-muted)' }}>avg days to first applicant</p>
        </div>
        <div className="text-center p-4 rounded-[10px] border border-border bg-surface-2">
          <p className="text-2xl font-semibold font-body" style={{ color: 'var(--color-brand)' }}>120+</p>
          <p className="text-[12px] font-body mt-1" style={{ color: 'var(--color-text-muted)' }}>seekers in match pool</p>
        </div>
        <div className="text-center p-4 rounded-[10px] border border-border bg-surface-2">
          <p className="text-2xl font-semibold font-body" style={{ color: 'var(--color-brand)' }}>85%</p>
          <p className="text-[12px] font-body mt-1" style={{ color: 'var(--color-text-muted)' }}>actively looking</p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        <Link
          to={`/jobs/${jobId}`}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-[8px] font-body font-bold text-[14px] text-white transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: 'var(--color-brand)' }}
        >
          <Briefcase className="w-4 h-4" />
          View listing
        </Link>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share listing
        </Button>

        <Link
          to="/jobs/new"
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-[8px] font-body font-bold text-[14px] border border-border text-text-muted transition-all duration-200 hover:border-border-strong"
        >
          Post another job
        </Link>

        <Link
          to="/dashboard/employer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 font-body text-[13px] font-medium transition-colors duration-200"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
