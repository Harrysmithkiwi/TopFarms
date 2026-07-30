import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentsVerifiedBadge } from '@/components/ui/DocumentsVerifiedBadge'

// DOC-QUEUE-04: DocumentsVerifiedBadge renders "Documents Verified" only when hasVerifiedDocuments=true.
// Wave 5 plan 21-08 ships the badge.

describe('DocumentsVerifiedBadge (DOC-QUEUE-04)', () => {
  it('DOC-QUEUE-04: renders "Documents Verified" text when hasVerifiedDocuments=true', () => {
    render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} />)
    expect(screen.getByText('Documents Verified')).toBeInTheDocument()
  })

  it('DOC-QUEUE-04: renders nothing (null/no badge in document) when hasVerifiedDocuments=false', () => {
    const { container } = render(<DocumentsVerifiedBadge hasVerifiedDocuments={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('DOC-QUEUE-04: applies green Tag variant (RESEARCH §Pattern 6 — Tag variant="green")', () => {
    render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} />)
    const badge = screen.getByText('Documents Verified').closest('span')
    expect(badge).toBeTruthy()
    // Tag variant="green" applies bg-brand-50 + text-success-text-on-bg (per
    // Tag.tsx; text token changed Phase 4.1 — raw text-brand was 2.94:1 on the tint)
    expect(badge!.className).toMatch(/bg-brand-50/)
    expect(badge!.className).toMatch(/text-success-text-on-bg/)
  })

  it('DOC-QUEUE-04: renders FileCheck icon (RESEARCH §Pattern 6 — Lucide icon)', () => {
    const { container } = render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // Lucide icons render with lucide-* class; FileCheck = lucide-file-check
    expect(svg!.getAttribute('class') ?? '').toMatch(/lucide/)
  })

  it('DOC-QUEUE-04: className prop forwards to Tag', () => {
    render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} className="my-custom-class" />)
    const badge = screen.getByText('Documents Verified').closest('span')
    expect(badge!.className).toContain('my-custom-class')
  })
})
