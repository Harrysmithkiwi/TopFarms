import { useState } from 'react'
import { Shield, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployerVerification, TrustLevel, VerificationMethod } from '@/types/domain'

interface VerificationBadgeProps {
  verifications: EmployerVerification[]
  trustLevel: TrustLevel
  /** When true (default), clicking the badge expands the verification list */
  expandable?: boolean
  className?: string
}

const TRUST_CONFIG: Record<
  TrustLevel,
  { label: string; shieldClass: string; badgeClass: string }
> = {
  unverified: {
    label: 'Unverified',
    shieldClass: 'text-text-subtle',
    badgeClass: 'bg-surface-2 text-text-muted border-border',
  },
  basic: {
    label: 'Basic Verified',
    shieldClass: 'text-info',
    badgeClass: 'bg-info-bg text-info border-info/30',
  },
  verified: {
    label: 'Verified',
    shieldClass: 'text-brand',
    badgeClass: 'bg-brand-50 text-brand border-brand/30',
  },
  fully_verified: {
    // #b45309 (amber-700) kept for legibility on warn-bg — see PHASE-19-KNOWN-STATE.md
    label: 'Fully Verified',
    shieldClass: 'text-[#b45309]',
    badgeClass: 'bg-warn-bg text-[#b45309] border-warn/30',
  },
}

const METHOD_LABELS: Record<VerificationMethod, string> = {
  email: 'Email',
  phone: 'Phone',
  nzbn: 'Business (NZBN)',
  document: 'ID Document',
  farm_photo: 'Farm Photo',
}

// All possible methods in display order
const ALL_METHODS: VerificationMethod[] = ['email', 'phone', 'nzbn', 'document', 'farm_photo']

/**
 * Aggregate trust level badge with optional expandable popover.
 * Shows shield icon + trust level text.
 * On click (if expandable), toggles a dropdown listing each verification method with status icon.
 */
export function VerificationBadge({
  verifications,
  trustLevel,
  expandable = true,
  className,
}: VerificationBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const config = TRUST_CONFIG[trustLevel]

  // Build a map of method -> verification record
  const methodMap = new Map(verifications.map((v) => [v.method, v]))

  function toggle() {
    if (expandable) setExpanded((prev) => !prev)
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Badge trigger */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-body font-semibold transition-colors duration-150',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          config.badgeClass,
          expandable && 'cursor-pointer hover:opacity-80',
          !expandable && 'cursor-default',
        )}
        aria-expanded={expanded}
        aria-haspopup={expandable ? 'listbox' : undefined}
      >
        <Shield className={cn('w-3.5 h-3.5 flex-shrink-0', config.shieldClass)} />
        {config.label}
      </button>

      {/* Expandable dropdown */}
      {expandable && expanded && (
        <>
          {/* Backdrop — clicking outside closes */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setExpanded(false)}
            aria-hidden="true"
          />

          <div
            className={cn(
              'absolute left-0 top-full mt-1.5 z-20 min-w-[220px]',
              'bg-surface border border-border rounded-[10px] shadow-md py-2',
            )}
            role="listbox"
            aria-label="Verification details"
          >
            <p className="px-3 py-1 text-[10px] font-body font-semibold text-text-subtle uppercase tracking-wide">
              Verification Status
            </p>

            {ALL_METHODS.map((method) => {
              const record = methodMap.get(method)
              const isVerified = record?.status === 'verified'
              const isPending = record?.status === 'pending'

              return (
                <div
                  key={method}
                  className="flex items-center gap-2.5 px-3 py-1.5"
                  role="option"
                  aria-selected={isVerified}
                >
                  {/* Status icon */}
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                      isVerified && 'bg-brand',
                      isPending && 'bg-warn/20',
                      !record && 'bg-surface-2',
                    )}
                  >
                    {isVerified && <Check className="w-2.5 h-2.5 text-text-on-brand stroke-[3]" />}
                    {/* #9a6c1a kept for legibility — see PHASE-19-KNOWN-STATE.md */}
                    {isPending && <Clock className="w-2.5 h-2.5 text-[#9a6c1a]" />}
                  </div>

                  <span className="text-[12px] font-body text-text">{METHOD_LABELS[method]}</span>

                  {/* Status label */}
                  <span
                    className={cn(
                      'ml-auto text-[11px] font-body',
                      isVerified && 'text-brand',
                      isPending && 'text-[#9a6c1a]',
                      !record && 'text-text-subtle',
                    )}
                  >
                    {isVerified ? 'Verified' : isPending ? 'Pending' : 'Not started'}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
