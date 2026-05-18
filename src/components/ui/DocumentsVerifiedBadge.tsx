import { FileCheck } from 'lucide-react'
import { Tag } from '@/components/ui/Tag'
import { cn } from '@/lib/utils'

interface DocumentsVerifiedBadgeProps {
  /** True when the seeker has at least one document with status='approved'. */
  hasVerifiedDocuments: boolean
  className?: string
}

/**
 * Phase 21 Track B — surfaces a "Documents Verified" badge on seeker-facing
 * employer surfaces (ApplicantPanel) when admin has approved at least one of
 * the seeker's uploaded documents.
 *
 * Distinct from VerificationBadge, which is about employer verification tiers
 * (TrustLevel). This badge is about seeker_documents.status='approved' state.
 *
 * Stateless. Renders nothing when hasVerifiedDocuments=false.
 */
export function DocumentsVerifiedBadge({
  hasVerifiedDocuments,
  className,
}: DocumentsVerifiedBadgeProps) {
  if (!hasVerifiedDocuments) return null
  return (
    <Tag variant="green" className={cn('gap-1.5', className)}>
      <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />
      Documents Verified
    </Tag>
  )
}
