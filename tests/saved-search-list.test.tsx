/**
 * Phase 17 Wave 0 RED stub — SRCH-15 list page + inline rename.
 *
 * Covers the /dashboard/seeker/saved-searches page (Wave 3 lands the
 * implementation). Includes:
 *
 *   - empty-state copy
 *   - per-row Load + Delete + name-click-to-rename
 *   - Sonner toast Undo flow (5000ms duration, cancellation flag)
 *   - DELETE only fires on toast onAutoClose when not cancelled
 *
 * Critical pattern: Undo cancellation is a flag, not a separate code path.
 * The DELETE callback checks the flag inside onAutoClose. See
 * 17-RESEARCH.md §6.
 *
 * Source: 17-VALIDATION.md per-task map.
 */
import { describe, it } from 'vitest'

describe('SavedSearches list page (SRCH-15)', () => {
  it.todo('renders empty-state copy when no saved searches')
  it.todo('renders card-row per saved search with name + filter chips + Load + Delete')
  it.todo('Load button calls navigate("/jobs?<search_params>", { replace: false })')
  it.todo('Delete button shows sonner toast with Undo action and 5000ms duration')
  it.todo('Clicking Undo within 5s flips cancellation flag and skips DELETE')
  it.todo('onAutoClose fires supabase.from("saved_searches").delete().eq("id", id) when not cancelled')
  it.todo('Click on name enters inline edit mode (Input replaces heading)')
  it.todo('Enter key commits rename via supabase.from("saved_searches").update({name, updated_at})')
  it.todo('Escape key reverts draft to original name')
})
