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
    shieldClass: 'text-light',
    badgeClass: 'bg-fog text-mid border-fog',
  },
  basic: {
    label: 'Basic Verified',
    shieldClass: 'text-[#2563eb]',
    badgeClass: 'bg-[rgba(59,130,246,0.08)] text-[#2563eb] border-[rgba(59,130,246,0.25)]',
  },
  verified: {
    label: 'Verified',
    shieldClass: 'text-moss',
    badgeClass: 'bg-[rgba(74,124,47,0.08)] text-moss border-[rgba(74,124,47,0.25)]',
  },
  fully_verified: {
    label: 'Fully Verified',
    shieldClass: 'text-[#b45309]',
    badgeClass: 'bg-[rgba(180,83,9,0.08)] text-[#b45309] border-[rgba(180,83,9,0.25)]',
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
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-body font-semibold transition-all duration-150',
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
              'bg-white border-[1.5px] border-fog rounded-[10px] shadow-lg py-2',
            )}
            role="listbox"
            aria-label="Verification details"
          >
            <p className="px-3 py-1 text-[10px] font-body font-semibold text-light uppercase tracking-wide">
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
                      isVerified && 'bg-moss',
                      isPending && 'bg-[rgba(217,150,45,0.20)]',
                      !record && 'bg-fog',
                    )}
                  >
                    {isVerified && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    {isPending && <Clock className="w-2.5 h-2.5 text-[#9a6c1a]" />}
                  </div>

                  <span className="text-[12px] font-body text-ink">{METHOD_LABELS[method]}</span>

                  {/* Status label */}
                  <span
                    className={cn(
                      'ml-auto text-[11px] font-body',
                      isVerified && 'text-moss',
                      isPending && 'text-[#9a6c1a]',
                      !record && 'text-light',
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
