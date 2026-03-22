import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileDropzone } from '@/components/ui/FileDropzone'

// Mock supabase storage
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

describe('FileDropzone — multiple mode', () => {
  const baseProps = {
    bucket: 'seeker-documents',
    path: 'user-123/documents',
    accept: { 'application/pdf': ['.pdf'] },
    onUploadComplete: vi.fn(),
  }

  it('renders with multiple prop without crashing', () => {
    const onUploadsComplete = vi.fn()
    render(
      <FileDropzone
        {...baseProps}
        multiple
        maxFiles={5}
        onUploadsComplete={onUploadsComplete}
      />
    )
    // Should render the dropzone area
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('shows existing files from existingPaths prop', () => {
    const onUploadsComplete = vi.fn()
    render(
      <FileDropzone
        {...baseProps}
        multiple
        existingPaths={['user-123/documents/cv.pdf', 'user-123/documents/cert.pdf']}
        onUploadsComplete={onUploadsComplete}
      />
    )
    expect(screen.getByText('cv.pdf')).toBeInTheDocument()
    expect(screen.getByText('cert.pdf')).toBeInTheDocument()
  })

  it('shows max files message when maxFiles reached', () => {
    const onUploadsComplete = vi.fn()
    render(
      <FileDropzone
        {...baseProps}
        multiple
        maxFiles={2}
        existingPaths={['user-123/documents/a.pdf', 'user-123/documents/b.pdf']}
        onUploadsComplete={onUploadsComplete}
      />
    )
    expect(screen.getByText(/maximum 2 files/i)).toBeInTheDocument()
  })

  it('renders in single-file mode by default (backward compat)', () => {
    render(<FileDropzone {...baseProps} />)
    // Should render normally without multiple mode UI
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })
})
