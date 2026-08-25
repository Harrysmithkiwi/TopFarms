import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import {
  Mail,
  Building2,
  FileText,
  Camera,
  Check,
  Clock,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { useAuth } from '@/hooks/useAuth'
import { useVerifications } from '@/hooks/useVerifications'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { NzbnVerification } from './NzbnVerification'
import type { VerificationMethod, EmployerVerification } from '@/types/domain'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

interface VerificationCardProps {
  method: VerificationMethod
  label: string
  description: string
  icon: React.ReactNode
  verification: EmployerVerification | null
  action?: React.ReactNode
  isExpanded?: boolean
  onExpand?: () => void
  expandContent?: React.ReactNode
}

/**
 * Single verification method card shown in the hub grid.
 */
function VerificationCard({
  label,
  description,
  icon,
  verification,
  action,
  isExpanded,
  onExpand,
  expandContent,
}: VerificationCardProps) {
  const status = verification?.status
  const isVerified = status === 'verified'
  const isPending = status === 'pending'
  const isRejected = status === 'rejected'

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
            isVerified ? 'bg-brand/10' : 'bg-surface-2',
          )}
        >
          <span className={cn('h-4 w-4', isVerified ? 'text-brand-hover' : 'text-text-muted')}>
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-body text-text text-[14px] font-semibold">{label}</h3>

            {/* Status badge */}
            {isVerified && (
              <span className="font-body text-success-text-on-bg bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                <Check className="h-3 w-3 stroke-[3]" />
                Verified
              </span>
            )}
            {isPending && (
              <span className="font-body flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn-text-on-bg">
                <Clock className="h-3 w-3" />
                Pending Review
              </span>
            )}
            {/* A rejected row is truthy but neither verified nor pending, so before this
                branch existed ALL THREE conditions were false and the card rendered NO
                badge — while the action link below (gated on !isVerified && !isPending)
                still showed. An employer whose NZBN was rejected saw an untouched-looking
                card and had to expand it to discover they needed to act. Rejection is the
                one state that REQUIRES the employer to do something, so it was the worst
                one to leave silent. Found on prod 2026-08-17. */}
            {isRejected && (
              <span className="font-body text-danger-text-on-bg flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold">
                <X className="h-3 w-3 stroke-[3]" />
                Action needed
              </span>
            )}
            {!verification && (
              <span className="font-body text-text-subtle bg-surface-2 rounded-full px-2 py-0.5 text-[11px]">
                Not started
              </span>
            )}
          </div>

          <p className="font-body text-text-muted mt-0.5 mb-3 text-[12px]">{description}</p>

          {/* Inline expanded content */}
          {isExpanded && expandContent && (
            <div className="bg-surface-2 mt-2 mb-3 rounded-[8px] p-3">{expandContent}</div>
          )}

          {/* Action */}
          {action && !isVerified && !isPending && (
            <button
              type="button"
              onClick={onExpand}
              className="font-body text-brand-hover hover:text-brand-900 flex items-center gap-1 text-[12px] font-semibold transition-colors"
            >
              {action}
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  isExpanded && 'rotate-90',
                )}
              />
            </button>
          )}

          {/* Link-based actions */}
        </div>
      </div>
    </Card>
  )
}

/**
 * Employer Verification Hub
 *
 * Shows all 5 verification methods with their current status.
 * Email is auto-verified on mount.
 * Phone and NZBN expand inline.
 * Documents and farm photos link to dedicated upload pages.
 */
export function EmployerVerification() {
  const { session } = useAuth()
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  // Phase 5.6 — a failed profile fetch left employerId null, which rendered
  // the form but silently blocked every submit. A dead UI, not an error.
  const [profileError, setProfileError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [expandedMethod, setExpandedMethod] = useState<VerificationMethod | null>(null)

  const {
    verifications,
    loading: loadingVerifications,
    trustLevel,
    refresh,
  } = useVerifications(employerId)

  // Load employer profile ID
  useEffect(() => {
    if (!session?.user?.id) return

    supabase
      .from('employer_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          reportError('employer verification: load employer profile', error)
          setProfileError(true)
        } else {
          setEmployerId(data?.id ?? null)
        }
        setLoadingProfile(false)
      })
  }, [session?.user?.id, reloadNonce])

  // Mirror the email/phone confirmations GoTrue already holds into employer_verifications.
  //
  // Audit F-11: this used to upsert `status: 'verified'` directly, which migration 073 had
  // revoked from `authenticated` — so it returned 42501 on EVERY mount, toasted the error
  // every time, and no employer ever reached `basic`, the ladder's first rung. The truth
  // lives in auth.users.{email,phone}_confirmed_at; employer_sync_self_verifications copies
  // it across under SECURITY DEFINER, scoped to auth.uid(). It is idempotent — the upsert
  // inside it no-ops when the row is already 'verified'.
  useEffect(() => {
    if (!employerId) return
    if (loadingVerifications) return

    // Call only when the email rung is missing or not yet verified, so a settled hub does
    // not fire an RPC on every visit.
    const emailVerification = verifications.find((v) => v.method === 'email')
    if (emailVerification?.status === 'verified') return

    supabase.rpc('employer_sync_self_verifications').then(({ error }) => {
      if (error) {
        // Phase 5.6 (adjacent family): a failed WRITE, not a false empty state.
        // Swallowed, the employer's verification never registers and the badge
        // silently never appears -- with nothing to retry.
        reportError('employer verification: sync self verifications', error)
        toast.error('We could not confirm your email verification. Reload to try again.')
        return
      }
      refresh()
    })
  }, [employerId, verifications, loadingVerifications, refresh])

  // Build a map of method -> verification record for easy lookup
  const verificationMap = new Map(verifications.map((v) => [v.method, v]))

  function toggleExpand(method: VerificationMethod) {
    setExpandedMethod((prev) => (prev === method ? null : method))
  }

  const isLoading = loadingProfile || loadingVerifications

  if (profileError) {
    return (
      <DashboardLayout>
        <ErrorState
          message="We could not load your farm profile"
          onRetry={() => {
            setProfileError(false)
            setReloadNonce((n) => n + 1)
          }}
        />
      </DashboardLayout>
    )
  }

  if (isLoading && !employerId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-brand h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="font-display text-[36px] leading-[44px] font-semibold"
              style={{ color: 'var(--color-brand-900)' }}
            >
              Verification
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Build trust with farm seekers by verifying your identity and business
            </p>
          </div>

          {/* Trust badge */}
          {!isLoading && (
            <VerificationBadge verifications={verifications} trustLevel={trustLevel} />
          )}
        </div>

        {/* Verification methods grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 1. Email — always verified */}
          <VerificationCard
            method="email"
            label="Email Address"
            description="Verified when you created your account"
            icon={<Mail className="h-full w-full" />}
            verification={verificationMap.get('email') ?? null}
          />

          {/* Phone was here. Removed 2026-08-17 alongside dropping it from the trust ladder:
              phone auth is disabled project-wide, so the first call PhoneVerification makes —
              updateUser({ phone }) — returns 500 "Unable to get SMS provider" for everyone.
              Verified on prod. Leaving the card would have been a second dead button on a live
              signup surface, which is exactly what the Facebook button was. PhoneVerification
              and employer_sync_self_verifications' phone branch are both kept: nothing about
              them is broken, and restoring the card is a revert once Twilio is configured. */}

          {/* NZBN */}
          <VerificationCard
            method="nzbn"
            label="Business (NZBN)"
            description="Submit your New Zealand Business Number for admin review"
            icon={<Building2 className="h-full w-full" />}
            verification={verificationMap.get('nzbn') ?? null}
            action="Submit NZBN"
            isExpanded={expandedMethod === 'nzbn'}
            onExpand={() => toggleExpand('nzbn')}
            expandContent={
              employerId ? (
                <NzbnVerification
                  existingVerification={verificationMap.get('nzbn') ?? null}
                  onSuccess={() => {
                    setExpandedMethod(null)
                    refresh()
                  }}
                />
              ) : null
            }
          />

          {/* 4. Documents */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                  verificationMap.get('document')?.status === 'verified'
                    ? 'bg-brand/10'
                    : 'bg-surface-2',
                )}
              >
                <FileText
                  className={cn(
                    'h-4 w-4',
                    verificationMap.get('document')?.status === 'verified'
                      ? 'text-brand-hover'
                      : 'text-text-muted',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-body text-text text-[14px] font-semibold">
                    Verification Documents
                  </h3>
                  {verificationMap.get('document')?.status === 'verified' ? (
                    <span className="font-body text-success-text-on-bg bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Verified
                    </span>
                  ) : (
                    <span className="font-body text-text-subtle bg-surface-2 rounded-full px-2 py-0.5 text-[11px]">
                      Not started
                    </span>
                  )}
                </div>
                <p className="font-body text-text-muted mt-0.5 mb-3 text-[12px]">
                  Upload business registration, farm ownership, or other documents
                </p>
                {verificationMap.get('document')?.status !== 'verified' && (
                  <Link
                    to="/dashboard/employer/verification/documents"
                    className="font-body text-brand-hover hover:text-brand-900 flex items-center gap-1 text-[12px] font-semibold transition-colors"
                  >
                    Upload Documents
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </Card>

          {/* 5. Farm Photos */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                  verificationMap.get('farm_photo')?.status === 'verified'
                    ? 'bg-brand/10'
                    : 'bg-surface-2',
                )}
              >
                <Camera
                  className={cn(
                    'h-4 w-4',
                    verificationMap.get('farm_photo')?.status === 'verified'
                      ? 'text-brand-hover'
                      : 'text-text-muted',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-body text-text text-[14px] font-semibold">Farm Photos</h3>
                  {verificationMap.get('farm_photo')?.status === 'verified' ? (
                    <span className="font-body text-success-text-on-bg bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Verified
                    </span>
                  ) : (
                    <span className="font-body text-text-subtle bg-surface-2 rounded-full px-2 py-0.5 text-[11px]">
                      Not started
                    </span>
                  )}
                </div>
                <p className="font-body text-text-muted mt-0.5 mb-3 text-[12px]">
                  Show seekers your farm — photos help build trust and attract candidates
                </p>
                {verificationMap.get('farm_photo')?.status !== 'verified' && (
                  <Link
                    to="/dashboard/employer/verification/photos"
                    className="font-body text-brand-hover hover:text-brand-900 flex items-center gap-1 text-[12px] font-semibold transition-colors"
                  >
                    Upload Photos
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Trust level explanation */}
        <Card className="bg-surface-2 border-border p-5">
          <h3 className="font-body text-text mb-2 text-[13px] font-semibold">
            How trust levels work
          </h3>
          <div className="space-y-1.5">
            {[
              { level: 'Basic Verified', requirement: 'Email verified', color: 'text-info-text-on-bg' },
              {
                level: 'Verified',
                requirement: 'Email + Business/Documents',
                color: 'text-brand-hover',
              },
              {
                level: 'Fully Verified',
                requirement: 'Email + Business/Documents + Farm Photos',
                color: 'text-warn-text-on-bg',
              },
            ].map(({ level, requirement, color }) => (
              <div key={level} className="flex items-center gap-2">
                <span
                  className={cn('font-body w-28 flex-shrink-0 text-[12px] font-semibold', color)}
                >
                  {level}
                </span>
                <span className="font-body text-text-muted text-[12px]">{requirement}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
