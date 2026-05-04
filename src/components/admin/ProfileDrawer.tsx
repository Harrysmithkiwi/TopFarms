import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { Tag } from '@/components/ui/Tag'
import { Toggle } from '@/components/ui/Toggle'
import { Timeline } from '@/components/ui/Timeline'
import { Button } from '@/components/ui/Button'
import { AdminNotesField } from './AdminNotesField'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type EmployerProfile = {
  role: 'employer'
  name: string | null
  email: string
  region: string | null
  join_date: string
  last_sign_in: string | null
  verification_tier: 'unverified' | 'email' | 'nzbn' | 'featured'
  total_jobs_posted: number
}

type SeekerProfile = {
  role: 'seeker'
  name: string
  email: string
  region: string | null
  join_date: string
  last_sign_in: string | null
  onboarding_complete: boolean
  onboarding_step: number
  match_scores_computed: boolean
}

type DrawerProfile = EmployerProfile | SeekerProfile

interface AuditEntry {
  id: string
  action: string
  admin_id: string
  payload: Record<string, unknown>
  created_at: string
}

interface AdminNote {
  id: string
  admin_id: string
  content: string
  created_at: string
}

interface ProfileDrawerProps {
  userId: string | null
  /** Initial active state — typically passed from the row that opened the drawer. */
  initialActive: boolean
  onClose: () => void
  /** Called after a successful suspend/reactivate so caller can refresh row state. */
  onActiveChanged?: (next: boolean) => void
}

const TIER_LABEL: Record<
  EmployerProfile['verification_tier'],
  { label: string; variant: 'grey' | 'blue' | 'green' | 'warn' }
> = {
  unverified: { label: 'Unverified', variant: 'grey' },
  email: { label: 'Email', variant: 'blue' },
  nzbn: { label: 'NZBN', variant: 'green' },
  featured: { label: 'Featured', variant: 'warn' },
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * ProfileDrawer — right-anchored slide-in drawer for admin user inspection.
 *
 * Sections (per UI-SPEC §"Drawer sections"):
 *   1. Profile header (role-keyed: employer or seeker)
 *   2. Account state — Toggle + inline confirm row before commit
 *   3. Admin notes (composes <AdminNotesField/>)
 *   4. Audit log Timeline (admin_audit_log entries for this user)
 *
 * Suspend/reactivate UX: clicking Toggle reveals an inline confirm row in the
 * drawer (no modal, no focus trap). Confirm fires admin_set_user_active RPC,
 * refreshes audit timeline, surfaces error inline if RPC fails.
 *
 * Visual contract: lg:w-[400px] desktop / full-width mobile, 250ms cubic-bezier
 * transition, prefers-reduced-motion respected. Backdrop click closes.
 */
export function ProfileDrawer({
  userId,
  initialActive,
  onClose,
  onActiveChanged,
}: ProfileDrawerProps) {
  const [profile, setProfile] = useState<DrawerProfile | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suspend/reactivate state
  const [active, setActive] = useState(initialActive)
  const [pendingActive, setPendingActive] = useState<boolean | null>(null) // null = no pending change
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setAudit([])
      setNotes([])
      return
    }
    setActive(initialActive)
    setPendingActive(null)
    setLoading(true)
    setError(null)
    void Promise.all([
      supabase.rpc('admin_get_user_profile' as never, { p_user_id: userId } as never),
      supabase.rpc('admin_get_user_audit' as never, { p_user_id: userId } as never),
    ])
      .then(([profRes, auditRes]) => {
        if (profRes.error) throw profRes.error
        if (auditRes.error) throw auditRes.error
        setProfile(profRes.data as DrawerProfile)
        const auditPayload = auditRes.data as
          | { audit?: AuditEntry[]; notes?: AdminNote[] }
          | null
        setAudit(auditPayload?.audit ?? [])
        setNotes(auditPayload?.notes ?? [])
      })
      .catch((e) => {
        console.error('ProfileDrawer load failed', e)
        setError('Failed to load profile. Refresh the page.')
      })
      .finally(() => setLoading(false))
  }, [userId, initialActive])

  // Escape key collapses the inline confirm row (UI-SPEC §"Suspend / reactivate UX" step 8)
  useEffect(() => {
    if (pendingActive === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPendingActive(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingActive])

  async function commitActiveChange(next: boolean) {
    if (!userId) return
    setCommitting(true)
    setError(null)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_set_user_active' as never, {
        p_user_id: userId,
        p_active: next,
      } as never)
      if (rpcErr) {
        console.error('admin_set_user_active failed', rpcErr)
        setError('Failed to update account status. Try again.')
        return
      }
      setActive(next)
      setPendingActive(null)
      onActiveChanged?.(next)
      toast.success(next ? 'Account reactivated' : 'Account suspended')

      // Refresh audit timeline so the new row appears
      const { data: auditData } = await supabase.rpc('admin_get_user_audit' as never, {
        p_user_id: userId,
      } as never)
      const auditPayload = auditData as
        | { audit?: AuditEntry[]; notes?: AdminNote[] }
        | null
      setAudit(auditPayload?.audit ?? [])
    } finally {
      setCommitting(false)
    }
  }

  const displayName = useMemo(
    () => profile?.name ?? profile?.email ?? '',
    [profile],
  )

  if (!userId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(11, 31, 16, 0.25)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="User profile"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-full w-full lg:w-[400px] flex flex-col motion-reduce:transition-none transition-transform duration-[250ms]"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 12px 32px rgba(11, 31, 16, 0.08)',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header bar — 56px */}
        <div
          className="flex items-center justify-between px-6 border-b"
          style={{
            height: '56px',
            backgroundColor: 'var(--color-surface-2)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="text-xs font-semibold uppercase"
            style={{
              color: 'var(--color-text-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            Profile
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-hover"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-md p-3 text-[14px]"
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger)',
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Loading…
            </div>
          )}

          {!loading && profile && profile.role === 'employer' && (
            <div className="space-y-2">
              <h2
                className="text-[20px] font-semibold leading-7"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
              >
                {profile.name ?? profile.email}
              </h2>
              <div className="text-[15px]" style={{ color: 'var(--color-text-muted)' }}>
                {profile.email}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Tag variant={TIER_LABEL[profile.verification_tier].variant}>
                  {TIER_LABEL[profile.verification_tier].label}
                </Tag>
              </div>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                Joined {formatJoinDate(profile.join_date)}
              </div>
              {profile.region && (
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {profile.region}
                </div>
              )}
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {profile.total_jobs_posted} jobs posted
              </div>
              {profile.last_sign_in && (
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Last sign-in {new Date(profile.last_sign_in).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {!loading && profile && profile.role === 'seeker' && (
            <div className="space-y-2">
              <h2
                className="text-[20px] font-semibold leading-7"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
              >
                {profile.name}
              </h2>
              <div className="text-[15px]" style={{ color: 'var(--color-text-muted)' }}>
                {profile.email}
              </div>
              {profile.region && (
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {profile.region}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                {profile.onboarding_complete ? (
                  <Tag variant="green">Onboarding complete</Tag>
                ) : (
                  <Tag variant="warn">Step {profile.onboarding_step} of 7</Tag>
                )}
                {profile.match_scores_computed ? (
                  <Tag variant="green">Scores ready</Tag>
                ) : (
                  <Tag variant="grey">Scores pending</Tag>
                )}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                Joined {formatJoinDate(profile.join_date)}
              </div>
              {profile.last_sign_in && (
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Last sign-in {new Date(profile.last_sign_in).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Account state section */}
          {!loading && profile && (
            <section
              className="space-y-3 pt-4 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {active ? (
                    <Tag variant="green">Active</Tag>
                  ) : (
                    <Tag variant="red">Suspended</Tag>
                  )}
                </div>
                <Toggle
                  checked={active}
                  onCheckedChange={(next) => {
                    // Don't immediately fire RPC — show confirm row
                    setPendingActive(next)
                  }}
                  label={active ? 'Active' : 'Suspended'}
                  disabled={committing}
                />
              </div>

              {/* Inline confirm row per UI-SPEC §"Suspend / reactivate UX" */}
              {pendingActive !== null && (
                <div
                  className="rounded-lg p-4 mt-3"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="text-[15px] font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {pendingActive ? 'Reactivate this account?' : 'Suspend this account?'}
                  </div>
                  <div
                    className="mt-1 text-[13px]"
                    style={{
                      color: 'var(--color-text-muted)',
                      maxWidth: '60ch',
                    }}
                  >
                    {pendingActive
                      ? `${displayName} will regain full access immediately. This action is logged.`
                      : `${displayName} will not be able to log in or use TopFarms until reactivated. This action is logged.`}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingActive(null)}
                      disabled={committing}
                    >
                      Cancel
                    </Button>
                    {pendingActive ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => commitActiveChange(true)}
                        disabled={committing}
                      >
                        {committing ? 'Reactivating…' : 'Reactivate account'}
                      </Button>
                    ) : (
                      <Button
                        variant="warn"
                        size="sm"
                        onClick={() => commitActiveChange(false)}
                        disabled={committing}
                      >
                        {committing ? 'Suspending…' : 'Suspend account'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Admin notes */}
          {!loading && profile && (
            <section
              className="space-y-3 pt-4 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3
                className="text-xs font-semibold uppercase"
                style={{
                  color: 'var(--color-text-subtle)',
                  letterSpacing: '0.04em',
                }}
              >
                Notes
              </h3>
              <AdminNotesField targetUserId={userId} initialNotes={notes} />
            </section>
          )}

          {/* Audit log */}
          {!loading && profile && (
            <section
              className="space-y-3 pt-4 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3
                className="text-xs font-semibold uppercase"
                style={{
                  color: 'var(--color-text-subtle)',
                  letterSpacing: '0.04em',
                }}
              >
                Activity
              </h3>
              {audit.length === 0 ? (
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  No activity recorded yet.
                </div>
              ) : (
                <Timeline
                  entries={audit.map((a) => ({
                    title: a.action.replace(/_/g, ' '),
                    date: new Date(a.created_at).toLocaleString(),
                    description: JSON.stringify(a.payload).slice(0, 100),
                  }))}
                />
              )}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
