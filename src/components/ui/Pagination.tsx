import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = []

  // Always show first page
  pages.push(1)

  // Calculate window around current page
  const windowStart = Math.max(2, currentPage - 1)
  const windowEnd = Math.min(totalPages - 1, currentPage + 1)

  // Ellipsis before window
  if (windowStart > 2) {
    pages.push('...')
  }

  // Window pages
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i)
  }

  // Ellipsis after window
  if (windowEnd < totalPages - 1) {
    pages.push('...')
  }

  // Always show last page
  pages.push(totalPages)

  return pages
}

const pageButtonBase =
  'w-[34px] h-[34px] flex items-center justify-center rounded-[6px] border-[1.5px] font-body text-[13px] transition-colors'

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      {/* Previous button */}
      <button
        type="button"
        className={cn(
          pageButtonBase,
          'border-fog bg-white',
          currentPage === 1 && 'opacity-40 cursor-not-allowed',
        )}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page buttons */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="text-[13px] text-light w-[34px] text-center"
            >
              ...
            </span>
          )
        }

        const isActive = page === currentPage

        return (
          <button
            key={page}
            type="button"
            className={cn(
              pageButtonBase,
              isActive
                ? 'border-moss bg-moss text-white'
                : 'border-fog bg-white text-ink hover:border-fern',
            )}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      })}

      {/* Next button */}
      <button
        type="button"
        className={cn(
          pageButtonBase,
          'border-fog bg-white',
          currentPage === totalPages && 'opacity-40 cursor-not-allowed',
        )}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
