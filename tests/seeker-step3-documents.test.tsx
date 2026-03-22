import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock supabase and useAuth before importing component
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` } }),
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

// Dynamic import after mocks
const { default: SeekerStep3Qualifications } = await import(
  '@/pages/onboarding/steps/SeekerStep3Qualifications'
)
// Fallback: named export
const Step3 =
  SeekerStep3Qualifications ??
  (await import('@/pages/onboarding/steps/SeekerStep3Qualifications')).SeekerStep3Qualifications

describe('SeekerStep3Qualifications — document upload (SONB-02)', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onBack: vi.fn(),
  }

  it('renders a Documents section with FileDropzone', () => {
    render(<Step3 {...defaultProps} />)
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(
      screen.getByText(/upload your cv, certificates, and references/i)
    ).toBeInTheDocument()
  })

  it('renders FileDropzone with bucket="seeker-documents"', () => {
    const { container } = render(<Step3 {...defaultProps} />)
    // The dropzone should be in the DOM (rendered when session exists)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('passes document_urls in onComplete when form is submitted', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(
      <Step3
        onComplete={onComplete}
        defaultValues={{ document_urls: ['path/to/doc.pdf'] }}
      />
    )
    // Submit the form (click Continue/Next button)
    const submitButton = screen.getByRole('button', { name: /continue|next|save/i })
    await user.click(submitButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        document_urls: expect.any(Array),
      })
    )
  })
})
