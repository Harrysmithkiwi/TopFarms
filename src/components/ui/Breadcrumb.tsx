import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, Bookmark, Share2 } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  onSave?: () => void
  onShare?: () => void
  className?: string
}

export function Breadcrumb({ items, onSave, onShare, className, ...props }: BreadcrumbProps) {
  return (
    <nav
      className={cn(
        'h-[44px] bg-white border-b border-fog flex items-center px-4 gap-2',
        className,
      )}
      {...props}
    >
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight size={14} className="text-light" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span className="text-[13px] font-body text-ink font-medium">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="text-[13px] font-body text-light hover:text-ink hover:underline"
                >
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>

      <div className="ml-auto flex items-center gap-2">
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className="text-[13px] text-mid hover:text-ink"
            aria-label="Save job listing"
          >
            <Bookmark size={16} />
          </button>
        )}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-[13px] text-mid hover:text-ink"
            aria-label="Share job listing"
          >
            <Share2 size={16} />
          </button>
        )}
      </div>
    </nav>
  )
}
