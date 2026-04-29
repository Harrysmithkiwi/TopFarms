import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test intent (SONB-02 / BFIX-03 — repaired in cleanup-session post-Phase-14):
//
//   1. Step 3 renders a Documents section — UI surface for upload exists.
//   2. Step 3 renders the per-file document uploader scoped to the
//      seeker-documents bucket. Pre-BFIX-03 this was a FileDropzone with
//      auto-upload-on-drop; BFIX-03 (5a228e0) replaced it with DocumentUploader
//      which captures a per-file document_type BEFORE INSERTing into
//      seeker_documents (separate table, locked CHECK enum).
//   3. Form submission forwards qualification fields (dairynz_level /
//      licence_types / certifications) to onComplete, and does NOT
//      couple documents into the form payload. BFIX-03 architectural
//      separation: documents flow directly into seeker_documents via
//      DocumentUploader's INSERT — they no longer ride through the form.
//      A regression that re-couples them would be a defect.

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'test-seeker-id' },
            error: null,
          }),
        })),
      })),
    })),
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user-id' } },
  }),
}))

const { SeekerStep3Qualifications } = await import(
  '@/pages/onboarding/steps/SeekerStep3Qualifications'
)

describe('SeekerStep3Qualifications — document upload (SONB-02 / BFIX-03)', () => {
  it('renders a Documents section', () => {
    render(<SeekerStep3Qualifications onComplete={vi.fn()} />)
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(
      screen.getByText(/upload your cv, certificates, and references/i),
    ).toBeInTheDocument()
  })

  it('renders the post-BFIX-03 DocumentUploader once useSeekerProfileId resolves (FileDropzone replaced)', async () => {
    render(<SeekerStep3Qualifications onComplete={vi.fn()} />)
    // DocumentUploader mounts only after session.user + seekerProfileId both
    // resolve. seekerProfileId resolution is async (maybeSingle()), so use findBy.
    expect(
      await screen.findByText(/drag and drop, or click to select/i),
    ).toBeInTheDocument()
  })

  it('forwards qualification fields to onComplete on submit but does NOT couple documents into the form payload', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<SeekerStep3Qualifications onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const payload = onComplete.mock.calls[0][0]
    expect(payload).toEqual(
      expect.objectContaining({
        dairynz_level: undefined,
        licence_types: [],
        certifications: [],
      }),
    )
    // BFIX-03 separation guard: documents are NOT a form field anymore
    expect(payload).not.toHaveProperty('document_urls')
  })
})
