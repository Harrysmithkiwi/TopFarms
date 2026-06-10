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
        'bg-surface border-border flex h-[44px] items-center gap-2 border-b px-4',
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
                <span className="font-body text-text text-[13px] font-medium">{item.label}</span>
              ) : (
                <a
                  href={item.href}
                  className={cn(
                    'font-body text-text-subtle hover:text-text rounded-[4px] text-[13px] hover:underline',
                    'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
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
              'inline-flex h-11 w-11 items-center justify-center rounded-[6px] md:h-9 md:w-9',
              'text-text-muted hover:text-text hover:bg-surface-2 transition-colors',
              'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
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
              'inline-flex h-11 w-11 items-center justify-center rounded-[6px] md:h-9 md:w-9',
              'text-text-muted hover:text-text hover:bg-surface-2 transition-colors',
              'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
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
