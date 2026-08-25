import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

/**
 * TrainingDemandCard: demand-validation capture for the training feature
 * (go-live map S1; assessment in .planning/go-live/issues/06).
 *
 * Asks one question: which skills would training help with, for yourself or
 * your staff. Answers are keyed to the same 24-competency taxonomy the match
 * engine uses (public.skills), so the responses join directly against future
 * training offerings. Partner signal, not a throwaway survey.
 *
 * Deliberately light: dismissible, one row per user (upsert), and separable
 * from every launch flow. Dismissal is localStorage, not DB: it is a device
 * preference, and the cost of losing it is seeing a dismissible card again.
 *
 * §5 states: loading (SectionSkeleton, announced), error (ErrorState with
 * retry, both load and submit), success (thanks, role=status). Empty does not
 * apply (the form is the content). Unauthorised cannot be reached from its
 * mounts (gated dashboards); if the session dies mid-submit, RLS refuses and
 * the error state says to sign in again.
 */

const DISMISS_KEY = 'tf-training-demand-dismissed'

interface SkillRow {
  id: string
  name: string
  category: string
}

type Phase = 'loading' | 'loadError' | 'form' | 'submitting' | 'submitError' | 'thanks'

export function TrainingDemandCard({
  role,
  context,
  className,
}: {
  role: 'seeker' | 'employer'
  context: string
  className?: string
}) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [phase, setPhase] = useState<Phase>('loading')
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [audience, setAudience] = useState<'self' | 'staff'>(role === 'employer' ? 'staff' : 'self')
  const [otherText, setOtherText] = useState('')
  const [hadResponse, setHadResponse] = useState(false)

  // load() never sets state before its first await: the initial phase is
  // already 'loading', and the retry path resets it in the click handler where
  // synchronous setState is fine. Keeps the set-state-in-effect lint honest.
  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    const [skillsRes, mineRes] = await Promise.all([
      supabase.from('skills').select('id, name, category').order('category').order('name'),
      userId
        ? supabase
            .from('training_demand' as never)
            .select('audience, skill_ids, other_text')
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (skillsRes.error || !skillsRes.data?.length) {
      console.error('TrainingDemandCard: skills load failed', skillsRes.error)
      setPhase('loadError')
      return
    }
    setSkills(skillsRes.data as SkillRow[])
    const mine = mineRes.data as {
      audience: 'self' | 'staff'
      skill_ids: string[]
      other_text: string | null
    } | null
    if (mine) {
      setHadResponse(true)
      setAudience(mine.audience)
      setSelected(new Set(mine.skill_ids))
      setOtherText(mine.other_text ?? '')
    }
    setPhase('form')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; every setState inside load() follows an await (the repo's standard pattern, 27 prior instances)
    if (!dismissed) void load()
  }, [dismissed, load])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async () => {
    setPhase('submitting')
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) {
      setPhase('submitError')
      return
    }
    const { error } = await supabase.from('training_demand' as never).upsert(
      {
        user_id: userId,
        audience,
        skill_ids: [...selected],
        other_text: otherText.trim() || null,
        context,
        // No DB trigger maintains updated_at; sent explicitly, matching the
        // SavedSearches convention. The admin summary orders free text by it.
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('TrainingDemandCard: submit failed', error)
      setPhase('submitError')
      return
    }
    setPhase('thanks')
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const heading = role === 'employer' ? 'Help shape training on TopFarms' : 'What would you like to learn?'
  const bodyCopy =
    role === 'employer'
      ? 'Which skills would training most help with, for you or your staff? Your answer guides which training providers we bring on.'
      : 'Which skills would training most help you build? Your answer guides which training providers we bring on.'

  return (
    <Card className={cn('relative', className)} data-testid="training-demand-card">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss training question"
        className="text-text-subtle hover:text-text focus-visible:outline-brand absolute top-3 right-3 rounded p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <h2 className="font-body text-text pr-8 text-[17px] leading-6 font-semibold">{heading}</h2>

      {phase === 'loading' && <SectionSkeleton rows={1} label="Loading training question" />}

      {phase === 'loadError' && (
        <ErrorState
          compact
          className="mt-3"
          message="We could not load this question"
          onRetry={() => {
            setPhase('loading')
            void load()
          }}
        />
      )}

      {phase === 'thanks' && (
        <p role="status" className="font-body text-text-muted mt-2 text-[15px]">
          Thanks, that helps us pick the right training partners. You can update your answer here
          any time.
        </p>
      )}

      {(phase === 'form' || phase === 'submitting' || phase === 'submitError') && (
        <>
          <p className="font-body text-text-muted mt-1 text-[15px]">{bodyCopy}</p>

          {role === 'employer' && (
            <div className="mt-3">
              <SegmentedControl
                aria-label="Who is the training for"
                options={[
                  { value: 'staff', label: 'My staff' },
                  { value: 'self', label: 'Myself' },
                ]}
                value={audience}
                onChange={setAudience}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Skills training would help with">
            {skills.map((s) => {
              const active = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'font-body rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    'focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2',
                    active
                      ? 'bg-brand-50 border-brand/40 text-success-text-on-bg'
                      : 'bg-surface-2 border-border text-text-muted hover:border-border-strong',
                  )}
                >
                  {s.name}
                </button>
              )
            })}
          </div>

          <label className="font-body text-text-muted mt-3 block text-[13px]" htmlFor="training-demand-other">
            Anything else? (optional)
          </label>
          <textarea
            id="training-demand-other"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="A course, ticket or qualification you have in mind"
            className="font-body border-border bg-surface-2 text-text focus-visible:outline-brand mt-1 w-full rounded-8 border-[1.5px] p-2.5 text-[15px] focus-visible:outline-2"
          />

          {phase === 'submitError' && (
            <ErrorState
              compact
              className="mt-3"
              message="That did not save. If it keeps failing, sign in again"
              onRetry={() => void submit()}
            />
          )}

          <div className="mt-3 flex items-center gap-3">
            <Button onClick={() => void submit()} disabled={phase === 'submitting' || selected.size === 0}>
              {phase === 'submitting' ? 'Saving' : hadResponse ? 'Update my answer' : 'Send'}
            </Button>
            <span className="font-body text-text-subtle text-[13px]">
              {selected.size === 0 ? 'Pick at least one skill' : `${selected.size} selected`}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
