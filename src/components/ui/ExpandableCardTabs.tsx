import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { Button } from '@/components/ui/Button'
import type { MatchScore, JobListing, ApplicationStatus } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/types/domain'

type TabId = 'details' | 'match' | 'apply'

interface ExpandableCardTabsProps {
  job: JobListing
  matchBreakdown: MatchScore['breakdown'] | null
  totalScore: number | null
  isLoggedIn: boolean
  appliedStatus: ApplicationStatus | null
  onApply: (coverNote: string) => Promise<void>
}

export function ExpandableCardTabs({
  job, matchBreakdown, totalScore, isLoggedIn, appliedStatus, onApply,
}: ExpandableCardTabsProps) {
  // Apply tab is hidden only when an ACTIVE application exists.
  // Terminal statuses (declined / withdrawn / hired) re-enable the Apply tab — re-apply allowed.
  const hasActiveApplication =
    appliedStatus !== null && ACTIVE_STATUSES.includes(appliedStatus)

  // Determine available tabs
  const tabs: { id: TabId; label: string }[] = [{ id: 'details', label: 'Details' }]
  if (isLoggedIn && totalScore !== null) tabs.push({ id: 'match', label: 'My Match' })
  if (isLoggedIn && !hasActiveApplication) tabs.push({ id: 'apply', label: 'Apply' })

  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [coverNote, setCoverNote] = useState('')
  const [applying, setApplying] = useState(false)

  async function handleApply() {
    setApplying(true)
    try {
      await onApply(coverNote)
      setCoverNote('')
    } catch {
      toast.error('Your application could not be submitted. Please check your connection and try again.')
    } finally {
      setApplying(false)
    }
  }

  // Top 3 strongest dimensions for simplified My Match view
  const dimensionEntries = matchBreakdown
    ? Object.entries(matchBreakdown).sort(([, a], [, b]) => b - a)
    : []
  const maxScores: Record<string, number> = {
    shed_type: 25, location: 20, accommodation: 20, skills: 20, salary: 10, visa: 5, couples: 5,
  }
  const DIMENSION_LABELS: Record<string, string> = {
    shed_type: 'Shed Type', location: 'Location', accommodation: 'Accommodation',
    skills: 'Skills', salary: 'Salary', visa: 'Visa', couples: 'Couples',
  }

  return (
    <div className="border-t border-border" onClick={(e) => e.stopPropagation()}>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-body font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-brand border-b-2 border-brand'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Details tab */}
        {activeTab === 'details' && (
          <div>
            {job.description_overview ? (
              <p className="text-[14px] font-body text-text-muted leading-relaxed line-clamp-4">
                {job.description_overview}
              </p>
            ) : (
              <p className="text-[14px] font-body text-text-subtle italic">No description available.</p>
            )}
            <Link
              to={`/jobs/${job.id}`}
              className="inline-block mt-3 text-[13px] font-body font-semibold text-brand hover:text-brand-hover transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View Full Listing &rarr;
            </Link>
          </div>
        )}

        {/* My Match tab */}
        {activeTab === 'match' && totalScore !== null && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MatchCircle score={totalScore} size="md" />
              <span className="text-[14px] font-body font-semibold text-text">Overall Match</span>
            </div>
            {dimensionEntries.slice(0, 3).map(([dim, score]) => (
              <div key={dim} className="flex items-center gap-3">
                <span className="text-[13px] font-body text-text-muted w-28 flex-shrink-0">{DIMENSION_LABELS[dim] ?? dim}</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(score / (maxScores[dim] ?? 25)) * 100}%`,
                      backgroundColor: score / (maxScores[dim] ?? 25) >= 0.7 ? 'var(--color-brand)' : score / (maxScores[dim] ?? 25) >= 0.4 ? 'var(--color-warn)' : 'var(--color-danger)',
                    }}
                  />
                </div>
                <span className="text-[12px] font-body text-text-subtle w-10 text-right">{score}/{maxScores[dim] ?? 25}</span>
              </div>
            ))}
            <Link
              to={`/jobs/${job.id}`}
              className="inline-block text-[12px] font-body text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              See full 7-dimension breakdown &rarr;
            </Link>
          </div>
        )}

        {/* Apply tab */}
        {activeTab === 'apply' && !hasActiveApplication && (
          <div className="space-y-3">
            <textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Add a cover note (optional)..."
              rows={3}
              maxLength={500}
              className="w-full rounded-[8px] border border-border p-3 text-[14px] font-body resize-none focus:border-brand focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-body text-text-subtle">{coverNote.length}/500</span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? 'Submitting...' : 'Apply Now'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
