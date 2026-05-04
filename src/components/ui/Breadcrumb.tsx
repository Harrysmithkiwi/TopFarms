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
        'h-[44px] bg-surface border-b border-border flex items-center px-4 gap-2',
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
                <ChevronRight size={14} className="text-text-subtle" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span className="text-[13px] font-body text-text font-medium">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className={cn(
                    'text-[13px] font-body text-text-subtle hover:text-text hover:underline rounded-[4px]',
                    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  )}
                >
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>

      <div className="ml-auto flex items-center gap-1">
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className={cn(
              'inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-[6px]',
              'text-text-muted hover:text-text hover:bg-surface-2 transition-colors',
              'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            )}
            aria-label="Save job listing"
          >
            <Bookmark size={16} />
          </button>
        )}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className={cn(
              'inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-[6px]',
              'text-text-muted hover:text-text hover:bg-surface-2 transition-colors',
              'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            )}
            aria-label="Share job listing"
          >
            <Share2 size={16} />
          </button>
        )}
      </div>
    </nav>
  )
}
