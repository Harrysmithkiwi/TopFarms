import { describe, it } from 'vitest'

describe('Job Search', () => {
  describe('SRCH-01: Search page rendering', () => {
    it.todo('renders FilterSidebar and job results grid')
    it.todo('shows skeleton cards during loading')
    it.todo('shows empty state when no results match')
  })

  describe('SRCH-02: Shed type filter', () => {
    it.todo('filters jobs by shed type checkboxes')
  })

  describe('SRCH-03: Accommodation filter', () => {
    it.todo('filters jobs by accommodation available toggle')
  })

  describe('SRCH-04: Visa sponsorship filter', () => {
    it.todo('filters jobs by visa sponsorship toggle')
  })

  describe('SRCH-05: DairyNZ level filter', () => {
    it.todo('renders DairyNZ level dropdown in filter sidebar')
  })

  describe('SRCH-06: Herd size filter', () => {
    it.todo('filters jobs by herd size checkboxes')
  })

  describe('SRCH-07: Couples welcome filter', () => {
    it.todo('filters jobs by couples welcome toggle')
  })

  describe('SRCH-08: Salary range filter', () => {
    it.todo('filters jobs by salary range slider')
  })

  describe('SRCH-09: Region filter', () => {
    it.todo('filters jobs by region checkboxes')
  })

  describe('SRCH-10: Contract type filter', () => {
    it.todo('filters jobs by contract type checkboxes')
  })

  describe('SRCH-11: Match scores', () => {
    it.todo('displays match score circle on each result card for logged-in seeker')
    it.todo('does not show match scores for visitors')
    it.todo('fetches scores via compute_match_scores_batch RPC')
  })

  describe('URL sync', () => {
    it.todo('filter changes update URL search params')
    it.todo('URL params restore filter state on page load')
    it.todo('results update immediately on filter change (no Apply button)')
  })
})
