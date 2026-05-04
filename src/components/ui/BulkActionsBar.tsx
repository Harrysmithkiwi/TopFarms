import { Button } from '@/components/ui/Button'

interface BulkActionsBarProps {
  selectedCount: number
  onShortlist: () => void
  onExport: () => void
}

export function BulkActionsBar({ selectedCount, onShortlist, onExport }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky bottom-0 bg-surface border-t border-border px-4 py-3 flex items-center gap-3">
      <span className="text-[13px] font-body text-text-muted">{selectedCount} selected</span>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onExport}>
        Export
      </Button>
      <Button variant="primary" size="sm" onClick={onShortlist}>
        Shortlist Selected
      </Button>
    </div>
  )
}
