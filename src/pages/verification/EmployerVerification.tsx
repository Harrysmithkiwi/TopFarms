import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import {
  Mail,
  Phone,
  Building2,
  FileText,
  Camera,
  Check,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useVerifications } from '@/hooks/useVerifications'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { PhoneVerification } from './PhoneVerification'
import { NzbnVerification } from './NzbnVerification'
import type { VerificationMethod, EmployerVerification } from '@/types/domain'
import { cn } from '@/lib/utils'

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
          <span className={cn('h-4 w-4', isVerified ? 'text-brand' : 'text-text-muted')}>
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-body text-text text-[14px] font-semibold">{label}</h3>

            {/* Status badge */}
            {isVerified && (
              <span className="font-body text-brand bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                <Check className="h-3 w-3 stroke-[3]" />
                Verified
              </span>
            )}
            {isPending && (
              <span className="font-body flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Clock className="h-3 w-3" />
                Pending Review
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
              className="font-body text-brand hover:text-brand-hover flex items-center gap-1 text-[12px] font-semibold transition-colors"
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
        if (error) {
          console.error('EmployerVerification: failed to load employer profile', error)
        } else {
          setEmployerId(data?.id ?? null)
        }
        setLoadingProfile(false)
      })
  }, [session?.user?.id])

  // Auto-create email verification record on mount when employerId is available
  useEffect(() => {
    if (!employerId) return

    const emailVerification = verifications.find((v) => v.method === 'email')
    if (emailVerification) return // already exists

    // Only attempt after verifications have loaded (not initial empty state)
    if (loadingVerifications) return

    supabase
      .from('employer_verifications')
      .upsert(
        {
          employer_id: employerId,
          method: 'email',
          status: 'verified',
          verified_at: new Date().toISOString(),
        },
        { onConflict: 'employer_id,method' },
      )
      .then(({ error }) => {
        if (error) {
          console.error('EmployerVerification: failed to create email verification record', error)
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
              className="font-display text-3xl font-semibold"
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

          {/* 2. Phone */}
          <VerificationCard
            method="phone"
            label="Phone Number"
            description="Verify your NZ mobile number via SMS code"
            icon={<Phone className="h-full w-full" />}
            verification={verificationMap.get('phone') ?? null}
            action="Verify Phone"
            isExpanded={expandedMethod === 'phone'}
            onExpand={() => toggleExpand('phone')}
            expandContent={
              employerId ? (
                <PhoneVerification
                  employerId={employerId}
                  onSuccess={() => {
                    setExpandedMethod(null)
                    refresh()
                  }}
                />
              ) : null
            }
          />

          {/* 3. NZBN */}
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
                  employerId={employerId}
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
                      ? 'text-brand'
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
                    <span className="font-body text-brand bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
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
                    className="font-body text-brand hover:text-brand-hover flex items-center gap-1 text-[12px] font-semibold transition-colors"
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
                      ? 'text-brand'
                      : 'text-text-muted',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-body text-text text-[14px] font-semibold">Farm Photos</h3>
                  {verificationMap.get('farm_photo')?.status === 'verified' ? (
                    <span className="font-body text-brand bg-brand/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
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
                    className="font-body text-brand hover:text-brand-hover flex items-center gap-1 text-[12px] font-semibold transition-colors"
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
              { level: 'Basic Verified', requirement: 'Email verified', color: 'text-[#2563eb]' },
              { level: 'Verified', requirement: 'Email + Phone verified', color: 'text-brand' },
              {
                level: 'Fully Verified',
                requirement: 'Email + Phone + Business/Documents + Farm Photos',
                color: 'text-[#b45309]',
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
