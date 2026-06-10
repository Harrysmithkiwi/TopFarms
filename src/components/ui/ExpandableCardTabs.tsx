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
  job,
  matchBreakdown,
  totalScore,
  isLoggedIn,
  appliedStatus,
  onApply,
}: ExpandableCardTabsProps) {
  // Apply tab is hidden only when an ACTIVE application exists.
  // Terminal statuses (declined / withdrawn / hired) re-enable the Apply tab — re-apply allowed.
  const hasActiveApplication = appliedStatus !== null && ACTIVE_STATUSES.includes(appliedStatus)

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
      toast.error(
        'Your application could not be submitted. Please check your connection and try again.',
      )
    } finally {
      setApplying(false)
    }
  }

  // Top 3 strongest dimensions for simplified My Match view
  const dimensionEntries = matchBreakdown
    ? Object.entries(matchBreakdown).sort(([, a], [, b]) => b - a)
    : []
  const maxScores: Record<string, number> = {
    shed_type: 25,
    location: 20,
    accommodation: 20,
    skills: 20,
    salary: 10,
    visa: 5,
    couples: 5,
  }
  const DIMENSION_LABELS: Record<string, string> = {
    shed_type: 'Shed Type',
    location: 'Location',
    accommodation: 'Accommodation',
    skills: 'Skills',
    salary: 'Salary',
    visa: 'Visa',
    couples: 'Couples',
  }

  return (
    <div className="border-border border-t" onClick={(e) => e.stopPropagation()}>
      {/* Tab bar */}
      <div className="border-border flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'font-body px-4 py-2.5 text-[13px] font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-brand border-brand border-b-2'
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
              <p className="font-body text-text-muted line-clamp-4 text-[14px] leading-relaxed">
                {job.description_overview}
              </p>
            ) : (
              <p className="font-body text-text-subtle text-[14px] italic">
                No description available.
              </p>
            )}
            <Link
              to={`/jobs/${job.id}`}
              className="font-body text-brand hover:text-brand-hover mt-3 inline-block text-[13px] font-semibold transition-colors"
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
              <span className="font-body text-text text-[14px] font-semibold">Overall Match</span>
            </div>
            {dimensionEntries.slice(0, 3).map(([dim, score]) => (
              <div key={dim} className="flex items-center gap-3">
                <span className="font-body text-text-muted w-28 flex-shrink-0 text-[13px]">
                  {DIMENSION_LABELS[dim] ?? dim}
                </span>
                <div className="bg-border h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(score / (maxScores[dim] ?? 25)) * 100}%`,
                      backgroundColor:
                        score / (maxScores[dim] ?? 25) >= 0.7
                          ? 'var(--color-brand)'
                          : score / (maxScores[dim] ?? 25) >= 0.4
                            ? 'var(--color-warn)'
                            : 'var(--color-danger)',
                    }}
                  />
                </div>
                <span className="font-body text-text-subtle w-10 text-right text-[12px]">
                  {score}/{maxScores[dim] ?? 25}
                </span>
              </div>
            ))}
            <Link
              to={`/jobs/${job.id}`}
              className="font-body text-brand inline-block text-[12px] hover:underline"
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
              className="border-border font-body focus:border-brand w-full resize-none rounded-[8px] border p-3 text-[14px] focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="font-body text-text-subtle text-[12px]">{coverNote.length}/500</span>
              <Button variant="primary" size="sm" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting...' : 'Apply Now'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
