import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Card } from '@/components/tremor/Card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type AdminListRpc =
  | 'admin_list_employers'
  | 'admin_list_seekers'
  | 'admin_list_jobs'
  | 'admin_list_placements'
  | 'admin_list_document_queue'
  | 'admin_skill_coverage'
  | 'admin_list_analytics_events'
  | 'admin_leads_staging_list'
  | 'admin_leads_list'
  | 'admin_outreach_list'

interface AdminTableProps<TRow> {
  /** Name of the SECURITY DEFINER RPC to call (e.g., 'admin_list_employers'). */
  rpc: AdminListRpc
  /** Whether the RPC accepts a search param (placements does not). */
  searchable?: boolean
  /**
   * Whether the RPC accepts p_limit/p_offset pagination params. Default true.
   * Set false for bounded-dataset RPCs whose Postgres signature has no
   * pagination args — sending them anyway makes PostgREST fail to resolve
   * the function. `admin_skill_coverage()` is such a case (24-row bounded
   * dataset, no pagination args on the function).
   */
  paginated?: boolean
  /** Placeholder text for the search input. */
  searchPlaceholder?: string
  /** Column headers — array of {key, label} objects. */
  columns: { key: string; label: string }[]
  /**
   * Render a single row. Receives the row payload, click handler, and the
   * active (debounced) search term — so a row can surface WHY it matched when
   * the hit isn't in a visible column (e.g. a locality buried in raw post text).
   */
  renderRow: (row: TRow, onClick: () => void, search: string) => ReactNode
  /** Called when a row is clicked — typically opens ProfileDrawer. */
  onRowClick?: (row: TRow) => void
  /** Empty state heading + body (per UI-SPEC Copywriting Contract per view). */
  emptyHeading: string
  emptyBody: string
  /** Error state copy (per UI-SPEC). */
  errorCopy: string
  /** Page size. Default 25. */
  pageSize?: number
  /**
   * Phase-1 list-screen treatment: render search + table inside a Tremor Card
   * (carded surface + --shadow-card, search with a leading icon, table without
   * its own border). Opt-in per screen so each adopts the pattern on its own
   * turn; the default (false) path is byte-identical to the pre-uplift table.
   */
  inCard?: boolean
}

/**
 * AdminTable — generic shell for /admin/* list views.
 *
 * Composes Input (search, 300ms debounce per UI-SPEC §"Table search") + Pagination
 * + a 52px-row-height styled table (UI-SPEC §"Component Dimensions"). Calls one of the
 * paginated admin_list_* SECURITY DEFINER RPCs and projects {rows, total} into the table.
 *
 * Click-row affordance fires onRowClick(row) — typically opens <ProfileDrawer/>.
 */
export function AdminTable<TRow extends Record<string, unknown>>({
  rpc,
  searchable = true,
  paginated = true,
  searchPlaceholder = 'Search…',
  columns,
  renderRow,
  onRowClick,
  emptyHeading,
  emptyBody,
  errorCopy,
  pageSize = 25,
  inCard = false,
}: AdminTableProps<TRow>) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<TRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  // 300ms debounce per UI-SPEC §"Table search"
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const offset = (page - 1) * pageSize

  const load = useCallback(async () => {
    setLoading(true)
    setErrored(false)
    try {
      const args: Record<string, unknown> = {}
      if (paginated) {
        args.p_limit = pageSize
        args.p_offset = offset
      }
      if (searchable) args.p_search = debouncedSearch || null
      // Supabase generated types treat rpc names as a literal union; the admin_list_*
      // and admin_skill_coverage functions all return jsonb {rows, total}.
      // Type-asserting via `as never` keeps tsc happy without weakening the
      // AdminListRpc union upstream.
      const { data, error } = await supabase.rpc(rpc as never, args as never)
      if (error) {
        console.error(`AdminTable: ${rpc} failed`, error)
        setErrored(true)
        toast.error(errorCopy)
        return
      }
      const payload = data as { rows?: TRow[]; total?: number } | null
      setRows(payload?.rows ?? [])
      setTotal(payload?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [rpc, debouncedSearch, offset, pageSize, searchable, paginated, errorCopy])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const searchField = searchable ? (
    inCard ? (
      <div className="relative">
        <Search
          size={16}
          className="text-text-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-9"
        />
      </div>
    ) : (
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />
    )
  ) : null

  const tableEl = (
    <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          {columns.map((c) => (
            <th
              key={c.key}
              className="px-4 py-3 text-left text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const rowKey =
            (row.id as string | undefined) ?? (row.user_id as string | undefined) ?? String(idx)
          const handleRowClick = () => onRowClick?.(row)
          return (
            <tr
              key={rowKey}
              className="hover:bg-surface-hover cursor-pointer transition-colors"
              style={{
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--color-border)',
                height: '52px',
              }}
              onClick={handleRowClick}
            >
              {renderRow(row, handleRowClick, debouncedSearch)}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const body = loading ? (
    <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
      Loading…
    </div>
  ) : errored ? (
    <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
      {errorCopy}
    </div>
  ) : rows.length === 0 ? (
    <div className="py-12 text-center">
      <div className="text-[20px] font-semibold" style={{ color: 'var(--color-text)' }}>
        {emptyHeading}
      </div>
      <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {emptyBody}
      </div>
    </div>
  ) : inCard ? (
    // In a Card the Card is the surface (no table border). Inset the table (px-4)
    // so its header + rows + hover highlight breathe off the card walls instead of
    // running flush to them, roughly aligning the content with the search field's
    // text (its pl-9 icon offset). pt-2 gives air below the search field.
    <div className="overflow-x-auto px-4 pt-2">{tableEl}</div>
  ) : (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {tableEl}
    </div>
  )

  const pagination = totalPages > 1 && !errored && !loading && (
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
  )

  const content = (
    <>
      {searchField}
      {body}
      {pagination}
    </>
  )

  return inCard ? (
    <Card className="space-y-4">{content}</Card>
  ) : (
    <div className="space-y-4">{content}</div>
  )
}
