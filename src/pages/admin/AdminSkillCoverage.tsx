import { AdminTable } from '@/components/admin/AdminTable'

interface SkillCoverageRow extends Record<string, unknown> {
  skill_id: string
  name: string
  category: string
  discipline: string
  seeker_count: number
  job_count: number
}

// Friendly labels for the ag-broad category slugs (Phase 23 taxonomy).
// Slugs MUST match the skills_category_check enum in migration 034 verbatim:
// livestock, cropping_agronomy, machinery_equipment,
// farm_operations_infrastructure, management_business, cross_cutting.
// Labels are sentence-case per CONTEXT.md decision #1.
const CATEGORY_LABELS: Record<string, string> = {
  livestock: 'Livestock',
  cropping_agronomy: 'Cropping & agronomy',
  machinery_equipment: 'Machinery & equipment',
  farm_operations_infrastructure: 'Farm operations & infrastructure',
  management_business: 'Management & business',
  cross_cutting: 'Cross-cutting',
}

/**
 * Phase 23 plan 23-02 — Admin skill coverage analytics at /admin/skills.
 *
 * Renders the admin_skill_coverage SECURITY DEFINER RPC (migration 034, plan 23-01)
 * via <AdminTable>. Displays each of the 24 ag-broad competencies with per-competency
 * supply (seeker_count — seekers holding the skill) and demand (job_count — jobs
 * requiring the skill). Read-only; no mutations or row-click handler needed.
 *
 * pageSize=100 renders all 24 rows in a single page (RPC returns ≤24 rows).
 * searchable=false — admin_skill_coverage takes no p_search param.
 */
export function AdminSkillCoverage() {
  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Skill Coverage
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
        Per-competency supply and demand across the 24 ag-broad competencies. Supply counts how
        many candidates hold each skill; demand counts how many active listings require it.
        Use this to identify gaps between what candidates offer and what employers need.
      </p>

      <AdminTable<SkillCoverageRow>
        rpc="admin_skill_coverage"
        searchable={false}
        pageSize={100}
        emptyHeading="No competencies found"
        emptyBody="The taxonomy has not been seeded yet."
        errorCopy="Failed to load skill coverage. Refresh the page."
        columns={[
          { key: 'category', label: 'Category' },
          { key: 'name', label: 'Competency' },
          { key: 'seeker_count', label: 'Seekers (supply)' },
          { key: 'job_count', label: 'Jobs (demand)' },
        ]}
        renderRow={(row) => (
          <>
            <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
              {CATEGORY_LABELS[row.category] ?? row.category}
            </td>
            <td className="px-4 py-3 text-[15px]" style={{ color: 'var(--color-text)' }}>
              {row.name}
            </td>
            <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text)' }}>
              {row.seeker_count}
            </td>
            <td className="px-4 py-3 text-[14px]" style={{ color: 'var(--color-text)' }}>
              {row.job_count}
            </td>
          </>
        )}
      />
    </div>
  )
}
