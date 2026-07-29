import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { Search, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card } from '@/components/tremor/Card'
import { TableSkeleton } from '@/components/admin/Skeleton'
import { supabase } from '@/lib/supabase'

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

type SortDir = 'asc' | 'desc'

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
  /**
   * Column headers. A column with `sortKey` becomes a clickable, server-sorted
   * header — `sortKey` is the allowlist token the RPC validates (e.g.
   * 'captured'). Columns without `sortKey` are inert (the default), so screens
   * that don't opt in are byte-identical to before.
   */
  columns: { key: string; label: string; sortKey?: string }[]
  /**
   * Initial server sort. Sets the RPC's p_sort/p_dir and the header indicator.
   * Only meaningful alongside `sortKey` columns; omit for unsorted tables.
   */
  defaultSort?: { key: string; dir: SortDir }
  /**
   * Extra RPC args forwarded verbatim (e.g. `{ p_source: 'mine' }` for a
   * server-side filter). Changing them refetches and resets to page 1 — same
   * lifecycle as search/sort. The RPC validates them; AdminTable just passes
   * them through. Generic so future filters (and T-5's outreach sort) reuse it.
   */
  extraArgs?: Record<string, unknown>
  /**
   * Optional controls rendered in the card header beside the search (e.g. a
   * source-filter segmented control), so filter + search + table stay one card.
   */
  toolbar?: ReactNode
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
  /**
   * Opt-in row selection: renders a leading checkbox column with a select-all
   * header. Off by default so every other screen is unchanged. The parent owns
   * the selected set (by row id) and the toggle callbacks; AdminTable just draws
   * the checkboxes and reports toggles.
   */
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleRow?: (row: TRow) => void
  /** Toggle every currently-loaded row (select-all header). Receives the page's rows. */
  onToggleAll?: (rows: TRow[]) => void
  /** Row id to visually highlight (keyboard-triage cursor). */
  highlightedId?: string
  /** Fires when the loaded rows change — lets a parent drive keyboard navigation. */
  onRowsChange?: (rows: TRow[]) => void
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
  defaultSort,
  extraArgs,
  toolbar,
  renderRow,
  onRowClick,
  emptyHeading,
  emptyBody,
  errorCopy,
  pageSize = 25,
  inCard = false,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  highlightedId,
  onRowsChange,
}: AdminTableProps<TRow>) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null)
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

  // Serialize extraArgs so the load effect re-runs on value change, not on the
  // new object identity the parent passes each render.
  const extraArgsKey = JSON.stringify(extraArgs ?? {})
  // Reset to page 1 when the filter changes (mirrors the search/sort lifecycle).
  useEffect(() => {
    setPage(1)
  }, [extraArgsKey])

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
      // Server-side sort: the RPC validates p_sort against its own allowlist, so
      // an off-list value can't reach the ORDER BY. Only sent when a sort is set
      // (sortable tables), keeping every other screen's RPC call unchanged.
      if (sort) {
        args.p_sort = sort.key
        args.p_dir = sort.dir
      }
      // Caller-supplied filter args (e.g. p_source). RPC validates them.
      if (extraArgs) Object.assign(args, extraArgs)
      // Supabase generated types treat rpc names as a literal union; the admin_list_*
      // and admin_skill_coverage functions all return jsonb {rows, total}.
      // Type-asserting via `as never` keeps tsc happy without weakening the
      // AdminListRpc union upstream.
      const { data, error } = await supabase.rpc(rpc as never, args as never)
      if (error) {
        // Single error signal: the inline error block below. (Previously also
        // fired a toast — double-signalling the same failure. UI-SPEC: one.)
        console.error(`AdminTable: ${rpc} failed`, error)
        setErrored(true)
        return
      }
      const payload = data as { rows?: TRow[]; total?: number } | null
      setRows(payload?.rows ?? [])
      setTotal(payload?.total ?? 0)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraArgsKey is the stable serialization of extraArgs
  }, [rpc, debouncedSearch, sort, extraArgsKey, offset, pageSize, searchable, paginated, errorCopy])

  useEffect(() => {
    void load()
  }, [load])

  // Notify the parent of the loaded rows so it can drive keyboard navigation.
  // Depends on `rows` only; onRowsChange is a notify callback, not a trigger.
  useEffect(() => {
    onRowsChange?.(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  // Click a sortable header: flip direction if already active, else sort by it
  // ascending. Either way jump back to page 1 so the new top-of-queue is shown.
  const toggleSort = useCallback((key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
    setPage(1)
  }, [])

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

  const rowId = (row: TRow, idx: number) =>
    (row.id as string | undefined) ?? (row.user_id as string | undefined) ?? String(idx)
  const allSelected =
    selectable && rows.length > 0 && rows.every((r, i) => selectedIds?.has(rowId(r, i)))

  const tableEl = (
    <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          {selectable && (
            <th className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => onToggleAll?.(rows)}
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
          )}
          {columns.map((c) => {
            const active = c.sortKey && sort?.key === c.sortKey
            const ariaSort = !c.sortKey
              ? undefined
              : active
                ? sort?.dir === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            return (
              <th
                key={c.key}
                aria-sort={ariaSort}
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
                style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
              >
                {c.sortKey ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.sortKey!)}
                    className="hover:text-text inline-flex items-center gap-1 uppercase transition-colors"
                    style={{ color: active ? 'var(--color-text)' : 'inherit' }}
                  >
                    {c.label}
                    {active ? (
                      sort?.dir === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const rowKey = rowId(row, idx)
          const handleRowClick = () => onRowClick?.(row)
          return (
            <tr
              key={rowKey}
              className="hover:bg-surface-hover cursor-pointer transition-colors"
              style={{
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--color-border)',
                height: '52px',
                backgroundColor:
                  highlightedId && rowKey === highlightedId ? 'var(--color-surface-2)' : undefined,
                boxShadow:
                  highlightedId && rowKey === highlightedId
                    ? 'inset 3px 0 0 var(--color-brand)'
                    : undefined,
              }}
              onClick={handleRowClick}
            >
              {selectable && (
                <td className="w-10 px-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds?.has(rowKey) ?? false}
                    onCheckedChange={() => onToggleRow?.(row)}
                    aria-label="Select row"
                  />
                </td>
              )}
              {renderRow(row, handleRowClick, debouncedSearch)}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  // In a Card the Card is the surface (no table border). Inset (px-4) so header +
  // rows + hover highlight breathe off the card walls; pt-2 gives air below the
  // search field. Bordered otherwise. Skeleton and table share this wrapper so the
  // load → loaded transition doesn't shift the layout.
  const wrapTable = (inner: ReactNode) =>
    inCard ? (
      <div className="overflow-x-auto px-4 pt-2">{inner}</div>
    ) : (
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {inner}
      </div>
    )

  const body = loading ? (
    wrapTable(<TableSkeleton columns={columns} rows={Math.min(pageSize, 8)} />)
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
  ) : (
    wrapTable(tableEl)
  )

  const pagination = totalPages > 1 && !errored && !loading && (
    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
  )

  // Search + toolbar share one header row (search grows, toolbar sits right).
  const header =
    toolbar || searchField ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {searchField && <div className="flex-1">{searchField}</div>}
        {toolbar}
      </div>
    ) : null

  const content = (
    <>
      {header}
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
