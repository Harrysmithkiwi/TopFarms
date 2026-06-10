import { Button } from '@/components/ui/Button'

interface BulkActionsBarProps {
  selectedCount: number
  onShortlist: () => void
  onExport: () => void
}

export function BulkActionsBar({ selectedCount, onShortlist, onExport }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-surface border-border sticky bottom-0 flex items-center gap-3 border-t px-4 py-3">
      <span className="font-body text-text-muted text-[13px]">{selectedCount} selected</span>
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
