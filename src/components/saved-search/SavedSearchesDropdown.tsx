import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SavedSearch } from '@/types/domain'

/**
 * Render a short human-readable summary of the most-distinctive filters in a
 * saved search's URLSearchParams snapshot. Mirrors the auto-name derivation
 * priority from src/lib/savedSearch.ts (shed_type → region → accommodation),
 * but produces shorter chip-style copy ("rotary", "2 regions") suitable for
 * a 280px-wide dropdown row.
 */
function summarizeFilters(searchParamsStr: string): string {
  const params = new URLSearchParams(searchParamsStr)
  const parts: string[] = []
  const shed = params.getAll('shed_type')
  if (shed.length > 0) parts.push(shed.length === 1 ? shed[0] : `${shed.length} shed types`)
  const region = params.getAll('region')
  if (region.length > 0) parts.push(region.length === 1 ? region[0] : `${region.length} regions`)
  if (params.getAll('accommodation_type').length > 0) parts.push('accommodation')
  if (parts.length === 0) return 'No filters'
  return parts.join(' · ')
}

type DropdownRow = Pick<SavedSearch, 'id' | 'name' | 'search_params' | 'created_at'>

/**
 * Phase 17 SRCH-14 — quick-load dropdown next to JobSearch's Save button.
 *
 * Fetches the 5 most-recent saved searches when opened. Click loads in-place
 * via navigate('/jobs?<params>', { replace: false }) — the existing JobSearch
 * fetchJobs useEffect picks up the searchParams change and re-fetches. NO new
 * useEffect needed in JobSearch (JOBS-01 / Pitfall 1 regression guard).
 *
 * Accessibility: aria-haspopup, aria-expanded, Esc-to-close, click-outside-close.
 *
 * Visibility: self-guarded on session?.user?.id. Returns null for anonymous
 * visitors. Parent (JobSearch.tsx ResultsArea) additionally gates on
 * isLoggedIn so the trigger doesn't render at all when signed-out — but the
 * self-guard is defence-in-depth.
 */
export function SavedSearchesDropdown() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<DropdownRow[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch top 5 on open. Keyed only on { open, session.user.id } — does NOT
  // depend on searchParams (Pitfall 1 / JOBS-01 regression guard: this
  // component must not couple to JobSearch's URL state).
  useEffect(() => {
    if (!open || !session?.user?.id) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('id, name, search_params, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (cancelled) return
      if (error) {
        setRows([])
        setLoading(false)
        return
      }
      setRows((data ?? []) as DropdownRow[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, session?.user?.id])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Hidden for anonymous visitors (signed-in seeker is the only audience).
  // Parent ResultsArea also gates on isLoggedIn — this is defence-in-depth.
  if (!session?.user?.id) return null

  function handleSelect(searchParams: string) {
    navigate(`/jobs?${searchParams}`, { replace: false })
    window.scrollTo({ top: 0 })
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-brand text-[13px] hover:underline flex items-center gap-1 cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="saved-searches-dropdown-trigger"
      >
        Load saved search <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 right-0 bg-surface border border-border rounded-[10px] shadow-lg w-[280px] z-30"
        >
          {loading ? (
            <p
              className="p-3 text-[13px] font-body"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              Loading…
            </p>
          ) : rows.length === 0 ? (
            <p
              className="p-3 text-[13px] font-body"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              No saved searches yet.
            </p>
          ) : (
            <ul>
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(row.search_params)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0 cursor-pointer"
                  >
                    <div
                      className="text-[14px] font-body font-semibold truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {row.name}
                    </div>
                    <div
                      className="text-[12px] font-body truncate"
                      style={{ color: 'var(--color-text-subtle)' }}
                    >
                      {summarizeFilters(row.search_params)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/dashboard/seeker/saved-searches"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-center text-[13px] font-body font-semibold border-t border-border hover:bg-surface-2"
            style={{ color: 'var(--color-brand)' }}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
