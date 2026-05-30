// Phase 23 Wave 0 — RTL render test for the future AdminSkillCoverage page.
//
// Encodes ANLY-01/02 + TAX-04 acceptance criteria:
//   - AdminSkillCoverage page consumes the admin_skill_coverage RPC
//   - Renders supply (Seekers) and demand (Jobs) columns per competency
//   - AdminTable calls supabase.rpc('admin_skill_coverage', { p_limit, p_offset })
//
// This file is RED until plan 23-02 ships src/pages/admin/AdminSkillCoverage.tsx
// (the dynamic import throws because the module does not exist yet).
//
// Mock strategy: vi.hoisted (required for RTL render tests where the SUT statically
// imports @/lib/supabase at module init — see STATE Phase 20-06 decision).
// Pattern: verbatim from tests/admin-doc-queue.test.tsx (canonical template).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    // auth shim — AdminSkillCoverage's transitive imports may pull supabase
    // auth on module init in some envs; the shim makes the mock complete.
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('AdminSkillCoverage page — ANLY-01/02/TAX-04', () => {
  it('ANLY-01: calls admin_skill_coverage RPC with { p_limit, p_offset }', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        rows: [
          {
            skill_id: 's1',
            name: 'Dairy cattle management',
            category: 'livestock',
            discipline: 'agriculture',
            seeker_count: 3,
            job_count: 1,
          },
          {
            skill_id: 's2',
            name: 'Tractor operation',
            category: 'machinery_equipment',
            discipline: 'agriculture',
            seeker_count: 0,
            job_count: 2,
          },
        ],
        total: 2,
      },
      error: null,
    })

    const { AdminSkillCoverage } = await import('@/pages/admin/AdminSkillCoverage')
    render(
      <MemoryRouter>
        <AdminSkillCoverage />
      </MemoryRouter>,
    )

    // Competency row renders
    await waitFor(() =>
      expect(screen.getByText('Dairy cattle management')).toBeInTheDocument(),
    )

    // Supply column value for Dairy cattle management
    expect(screen.getByText('3')).toBeInTheDocument()

    // Demand column value for Dairy cattle management
    expect(screen.getByText('1')).toBeInTheDocument()

    // AdminTable called the RPC with correct name (searchable=false → no p_search)
    expect(rpcMock).toHaveBeenCalledWith('admin_skill_coverage', expect.anything())
  })

  it('ANLY-02: renders Seekers supply header and Jobs demand header', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        rows: [
          {
            skill_id: 's1',
            name: 'Dairy cattle management',
            category: 'livestock',
            discipline: 'agriculture',
            seeker_count: 3,
            job_count: 1,
          },
        ],
        total: 1,
      },
      error: null,
    })

    const { AdminSkillCoverage } = await import('@/pages/admin/AdminSkillCoverage')
    render(
      <MemoryRouter>
        <AdminSkillCoverage />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByText('Dairy cattle management')).toBeInTheDocument(),
    )

    // Column headers: supply = Seekers, demand = Jobs
    expect(screen.getByText(/seekers/i)).toBeInTheDocument()
    expect(screen.getByText(/jobs/i)).toBeInTheDocument()
  })

  // Regression guard: CATEGORY_LABELS map must cover ALL 6 enum slugs from
  // migration 034 (skills_category_check). A prior defect rendered 4/6
  // categories as raw underscore slugs because the map invented keys
  // ('crops_horticulture', 'farm_management', etc.) that didn't exist in the
  // DB. The prior two test cases happened to use only 'livestock' and
  // 'machinery_equipment' — the two slugs the buggy map mapped correctly —
  // so the bug passed RTL. This case mocks one row per slug and asserts each
  // friendly label renders AND the raw slug does not.
  it('ANLY-01/02 regression: every category slug maps to a friendly label (no raw slugs rendered)', async () => {
    const allCategories = [
      { slug: 'livestock',                       label: 'Livestock' },
      { slug: 'cropping_agronomy',               label: 'Cropping & agronomy' },
      { slug: 'machinery_equipment',             label: 'Machinery & equipment' },
      { slug: 'farm_operations_infrastructure',  label: 'Farm operations & infrastructure' },
      { slug: 'management_business',             label: 'Management & business' },
      { slug: 'cross_cutting',                   label: 'Cross-cutting' },
    ]

    rpcMock.mockResolvedValueOnce({
      data: {
        rows: allCategories.map((c, i) => ({
          skill_id: `s${i}`,
          name: `Competency ${i}`,
          category: c.slug,
          discipline: 'agriculture',
          seeker_count: 0,
          job_count: 0,
        })),
        total: allCategories.length,
      },
      error: null,
    })

    const { AdminSkillCoverage } = await import('@/pages/admin/AdminSkillCoverage')
    render(
      <MemoryRouter>
        <AdminSkillCoverage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Competency 0')).toBeInTheDocument())

    for (const { slug, label } of allCategories) {
      expect(screen.getByText(label)).toBeInTheDocument()
      // Raw slug must NOT appear inside any table cell. (It may legitimately
      // appear in the page intro/copy — scope the negative assertion to cells.)
      const cells = screen.getAllByRole('cell')
      const slugInCells = cells.some((c) => c.textContent === slug)
      expect(slugInCells, `raw slug '${slug}' rendered in a cell — CATEGORY_LABELS missing key`).toBe(false)
    }
  })
})
