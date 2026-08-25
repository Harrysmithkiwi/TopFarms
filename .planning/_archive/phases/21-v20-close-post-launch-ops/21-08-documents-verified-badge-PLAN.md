---
phase: 21-v20-close-post-launch-ops
plan: 08
type: execute
wave: 5
depends_on: [00, 01]
files_modified:
  - src/components/ui/DocumentsVerifiedBadge.tsx
  - src/components/ui/ApplicantPanel.tsx
  - tests/documents-verified-badge.test.tsx
autonomous: true
requirements:
  - DOC-QUEUE-04
  - DOC-QUEUE-BADGE-SURFACE-01
must_haves:
  truths:
    - "DocumentsVerifiedBadge renders 'Documents Verified' text + FileCheck icon when hasVerifiedDocuments=true"
    - "Returns null when hasVerifiedDocuments=false (no badge in DOM)"
    - "Uses Tag variant='green' for visual consistency with other green-state badges"
    - "Surfaces in employer ApplicantPanel adjacent to the applicant's name/header — visible to employers viewing applicants"
    - "Predicate for hasVerifiedDocuments=true: ANY seeker_document has status='approved' (per CONTEXT.md outcome — Approve flips badge)"
  artifacts:
    - path: "src/components/ui/DocumentsVerifiedBadge.tsx"
      provides: "Stateless badge component"
      contains: "Documents Verified"
    - path: "src/components/ui/ApplicantPanel.tsx"
      provides: "DocumentsVerifiedBadge rendered in employer-visible header"
      contains: "DocumentsVerifiedBadge"
  key_links:
    - from: "src/components/ui/ApplicantPanel.tsx"
      to: "src/components/ui/DocumentsVerifiedBadge.tsx"
      via: "import + render with hasVerifiedDocuments prop"
      pattern: "DocumentsVerifiedBadge"
    - from: "Badge visibility predicate"
      to: "supabase/migrations/032_doc_verification_queue.sql status column"
      via: "Any seeker_document row with status='approved' for this seeker"
      pattern: "status === 'approved'"
---

<objective>
Wave 5 — Create `DocumentsVerifiedBadge` component and surface it in the employer-facing `ApplicantPanel`. When a seeker has at least one document with `status='approved'`, employers see the badge on the applicant card/panel.

Purpose: Closes the "seeker-visible outcome" loop from CONTEXT.md — once admin approves a doc, the seeker's verification status is visible to employers reviewing applications. The badge is the visible payoff for the approve action.

Output: New stateless component (~35 lines) + one integration in ApplicantPanel + GREEN test stubs.

**Decision (per RESEARCH §Pattern 6):** New component, NOT reuse of `VerificationBadge`. `VerificationBadge` is specifically about employer verification tiers (`TrustLevel`) — different data domain. Reusing by passing fake data would be a semantic mismatch.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md

<!--
LOCKED DECISION: New DocumentsVerifiedBadge component (RESEARCH §Pattern 6 — different data domain from VerificationBadge)
LOCKED DECISION: Tag variant='green' + Lucide FileCheck (RESEARCH §Pattern 6 — visually consistent)
LOCKED DECISION: Badge surface = employer ApplicantPanel (CONTEXT.md "Seeker-visible outcome" — "visible to employers on applicant cards/panels")
Open: also surface on JobSearch applicant cards? Defer — ApplicantPanel is the primary surface; expand in v2.1 if needed
-->

<interfaces>
From src/components/ui/Tag.tsx — variant union: 'green'|'warn'|'blue'|'grey'|'orange'|'purple'|'red'. Composition: `<Tag variant="green">...</Tag>` renders `bg-brand-50 text-brand` rounded pill.

From src/components/ui/ApplicantPanel.tsx (exists per ls — full file, ~300+ lines per Phase 19b commit `23ad965` brand migration). The component renders a side panel showing applicant details for employers; load-bearing surface for "employer-facing badge visibility" per CONTEXT.md. Must read to find the header section (typically applicant name + status near the top) to determine the insertion point for the badge.

From src/types/domain.ts — SeekerDocumentStatus (added Wave 1 plan 21-01).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create DocumentsVerifiedBadge component + flip Wave 0 test stubs</name>
  <files>src/components/ui/DocumentsVerifiedBadge.tsx, tests/documents-verified-badge.test.tsx</files>

  <read_first>
    - src/components/ui/Tag.tsx (variant union; class composition)
    - src/components/ui/VerificationBadge.tsx (shape model for stateless badge — but DO NOT reuse; this is a NEW component)
    - tests/documents-verified-badge.test.tsx (Wave 0 stubs)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pattern 6
  </read_first>

  <behavior>
    - Component exports `DocumentsVerifiedBadge` (named export — matches Tag, VerificationBadge convention)
    - Props: `{ hasVerifiedDocuments: boolean; className?: string }`
    - When hasVerifiedDocuments=true: renders `<Tag variant="green">` containing FileCheck icon + "Documents Verified" text
    - When hasVerifiedDocuments=false: returns null (no DOM output)
    - No state, no effects — pure stateless component
    - className prop forwards to Tag's className for layout control
  </behavior>

  <action>
**File 1 — src/components/ui/DocumentsVerifiedBadge.tsx** (new, ~30 lines):

```typescript
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
```

**File 2 — tests/documents-verified-badge.test.tsx** (flip 4 .todos to GREEN):

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentsVerifiedBadge } from '@/components/ui/DocumentsVerifiedBadge'

describe('DocumentsVerifiedBadge (DOC-QUEUE-04)', () => {
  it('DOC-QUEUE-04: renders "Documents Verified" text when hasVerifiedDocuments=true', () => {
    render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} />)
    expect(screen.getByText('Documents Verified')).toBeInTheDocument()
  })

  it('DOC-QUEUE-04: renders nothing when hasVerifiedDocuments=false', () => {
    const { container } = render(<DocumentsVerifiedBadge hasVerifiedDocuments={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('DOC-QUEUE-04: applies green Tag variant', () => {
    render(<DocumentsVerifiedBadge hasVerifiedDocuments={true} />)
    const badge = screen.getByText('Documents Verified').closest('span')
    expect(badge).toBeTruthy()
    // Tag variant="green" applies bg-brand-50 text-brand classes (per Tag.tsx)
    expect(badge!.className).toMatch(/bg-brand-50/)
    expect(badge!.className).toMatch(/text-brand/)
  })

  it('DOC-QUEUE-04: renders FileCheck icon (Lucide svg)', () => {
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
```

Run `pnpm exec vitest run tests/documents-verified-badge.test.tsx` — expect 5 GREEN (4 from Wave 0 + 1 new className forward).
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/documents-verified-badge.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `ls src/components/ui/DocumentsVerifiedBadge.tsx` exits 0
    - `grep -c "export function DocumentsVerifiedBadge" src/components/ui/DocumentsVerifiedBadge.tsx` returns 1
    - `grep -c "Documents Verified" src/components/ui/DocumentsVerifiedBadge.tsx` returns 1
    - `grep -c "FileCheck" src/components/ui/DocumentsVerifiedBadge.tsx` returns ≥ 2 (import + JSX)
    - `grep -c "variant=\"green\"" src/components/ui/DocumentsVerifiedBadge.tsx` returns 1
    - `grep -c "if (!hasVerifiedDocuments) return null" src/components/ui/DocumentsVerifiedBadge.tsx` returns 1
    - `pnpm exec vitest run tests/documents-verified-badge.test.tsx` exits 0; ≥ 5 passing
    - `grep -c "it.todo" tests/documents-verified-badge.test.tsx` returns 0
    - `pnpm exec tsc -b` exits 0 OR only pre-existing errors
  </acceptance_criteria>

  <done>
    Badge component shipped + tests GREEN. Ready for ApplicantPanel integration in Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Surface badge in employer ApplicantPanel</name>
  <files>src/components/ui/ApplicantPanel.tsx</files>

  <read_first>
    - src/components/ui/ApplicantPanel.tsx (entire file — find the panel header where applicant name + status currently render)
    - src/components/ui/DocumentsVerifiedBadge.tsx (Task 1 — to import)
    - src/types/domain.ts §SeekerDocument (status field shape per plan 21-01)
  </read_first>

  <behavior>
    - ApplicantPanel imports DocumentsVerifiedBadge
    - Reads seeker_documents for the displayed applicant (likely via an existing query or hook in the panel — must inspect the file to determine the available data)
    - Computes hasVerifiedDocuments = `documents.some(d => d.status === 'approved')` where documents are this seeker's docs
    - Renders DocumentsVerifiedBadge adjacent to the applicant name/header area
  </behavior>

  <action>
**File — src/components/ui/ApplicantPanel.tsx**:

**Step 1:** Read the entire file to understand:
- How seeker documents are currently fetched (look for `seeker_documents` query, useEffect, or a passed prop)
- Where the applicant header section is (look for the applicant name display near the top of the panel JSX)
- What types/interfaces are in scope

**Step 2:** Add import at the top with other component imports:
```typescript
import { DocumentsVerifiedBadge } from '@/components/ui/DocumentsVerifiedBadge'
```

**Step 3:** Compute hasVerifiedDocuments. Three scenarios — pick the one matching the existing code:

- **Scenario A (recommended if documents already loaded in this panel):** If ApplicantPanel already has access to seeker documents (via an existing `documents` state or a `useApplicantDocuments`-style hook), compute inline:
  ```typescript
  const hasVerifiedDocuments = documents?.some(d => d.status === 'approved') ?? false
  ```

- **Scenario B (if documents aren't loaded here):** Add a lightweight derived query — fetch only the `status` column for this applicant's seeker_id, just enough to compute the predicate. Use the existing supabase client pattern:
  ```typescript
  const [hasVerifiedDocuments, setHasVerifiedDocuments] = useState(false)
  useEffect(() => {
    if (!applicantSeekerId) return
    supabase
      .from('seeker_documents')
      .select('status')
      .eq('seeker_id', applicantSeekerId)
      .eq('status', 'approved')
      .limit(1)
      .then(({ data }) => setHasVerifiedDocuments((data?.length ?? 0) > 0))
  }, [applicantSeekerId])
  ```

- **Scenario C (passed via prop from parent):** If parent (ApplicantDashboard) computes and passes the boolean as a prop, just consume:
  ```typescript
  interface ApplicantPanelProps {
    // existing props...
    hasVerifiedDocuments?: boolean
  }
  ```

**Decision authority:** Executor picks A/B/C after reading the file. A is preferred (no extra round-trip). Document the choice in SUMMARY.

**Step 4:** Render the badge in the applicant header area. Add it adjacent to the applicant name display (typically inside the existing header `<div>` near the top of the JSX). Example placement:
```tsx
<div className="flex items-center gap-3">
  <h2>{applicantName}</h2>
  <DocumentsVerifiedBadge hasVerifiedDocuments={hasVerifiedDocuments} />
</div>
```

**DO NOT:**
- Modify the privacy-gated `useApplicantDocumentUrl` hook (Phase 14 BFIX-02 5-layer gate)
- Add seeker identity document data to the panel (employers cannot see identity docs — PRIV-02)
- Refactor unrelated panel sections — minimal-diff principle (Rule 1)

**Verify after edit:** Run `pnpm exec tsc -b` — must be clean (or only pre-existing errors).
  </action>

  <verify>
    <automated>grep -c "DocumentsVerifiedBadge" src/components/ui/ApplicantPanel.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "DocumentsVerifiedBadge" src/components/ui/ApplicantPanel.tsx` returns ≥ 2 (import + JSX)
    - `grep -c "hasVerifiedDocuments" src/components/ui/ApplicantPanel.tsx` returns ≥ 1
    - `grep -E "documents?\\..*some|status.*'approved'|status === 'approved'" src/components/ui/ApplicantPanel.tsx` returns ≥ 1 (predicate logic OR external prop)
    - No reference to `document_type === 'identity'` added (privacy gate still applies — admin-only path)
    - `pnpm exec tsc -b` exits 0 OR only pre-existing errors
    - Full suite green: `pnpm exec vitest run` exits 0
  </acceptance_criteria>

  <done>
    Badge surfaces in employer ApplicantPanel when seeker has ≥ 1 approved doc. Atomic commit per CLAUDE §4 with Task 1.
  </done>
</task>

</tasks>

<verification>
1. DocumentsVerifiedBadge component on disk + GREEN tests (5/5)
2. ApplicantPanel integration (employer-visible)
3. Full suite green; tsc clean
4. NO PRIV-02 regression (no identity document exposure logic added)
</verification>

<success_criteria>
- DocumentsVerifiedBadge renders only when ≥ 1 approved doc exists
- ApplicantPanel shows the badge to employers
- 5 documents-verified-badge.test.tsx assertions GREEN
- Atomic commit: `feat(21-08): DocumentsVerifiedBadge component + ApplicantPanel surface (Track B)`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-08-SUMMARY.md` capturing:
- Badge component line count
- Test assertion count (5 GREEN)
- ApplicantPanel integration choice (Scenario A/B/C from Task 2 action)
- Confirmation NO identity-document exposure logic added (PRIV-02 baseline preserved)
- Note any additional surfaces deferred (e.g., JobSearch applicant cards) for v2.1 follow-up
- Pointer forward to Wave 6 plan 21-09 (operator UAT — badge visibility in browser as part of end-to-end approve-flow smoke test)
</output>
