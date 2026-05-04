import { useState } from 'react'
import { AdminTable } from '@/components/admin/AdminTable'
import { ProfileDrawer } from '@/components/admin/ProfileDrawer'
import { Tag } from '@/components/ui/Tag'

interface JobRow {
  id: string
  title: string
  status: string
  employer_id: string
  employer_name: string | null
  applicant_count: number
  days_live: number
  last_applicant_at: string | null
  created_at: string
}

/**
 * Job-status → Tag display map.
 * Source: UI-SPEC §"Per-view primary actions and states" — Jobs management table.
 *   active   → green
 *   filled   → grey
 *   expired  → warn
 *   archived → grey
 * Falls back to grey for unknown variants (defensive — admin_list_jobs RPC
 * returns whatever is in jobs.status; CHECK constraint may evolve).
 */
const STATUS_VARIANT: Record<string, 'green' | 'grey' | 'warn' | 'red'> = {
  active: 'green',
  filled: 'grey',
  expired: 'warn',
  archived: 'grey',
}

/**
 * JobsManagement — `/admin/jobs`.
 *
 * Composes <AdminTable rpc="admin_list_jobs"> for the searchable / paginated
 * jobs table. Each row click opens <ProfileDrawer userId={row.employer_id}/>
 * targeting the employer behind the job (per CONTEXT.md MVP scope item 6:
 * drawer on rows in views 2/3/4 — jobs is view 4).
 *
 * Jobs are not people, so the natural drill-down is the job's employer.
 * JobRow has no is_active flag for the employer; pass initialActive={true}
 * as the safe default — drawer refetches on mount via admin_get_user_profile
 * and reflects truth on first toggle interaction. Acceptable tradeoff per
 * CONTEXT.md "MVP scope" — drawer on view 4 is a "light" inspector, not a
 * primary mutation surface.
 *
 * Copy + Tag mapping locked by UI-SPEC §"Per-view primary actions and states".
 */
export function JobsManagement() {
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Jobs
      </h1>

      <AdminTable<JobRow>
        rpc="admin_list_jobs"
        searchable
        searchPlaceholder="Search by title or employer…"
        emptyHeading="No jobs posted"
        emptyBody="Jobs will appear here once employers post them."
        errorCopy="Failed to load jobs. Refresh the page or check your connection."
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status' },
          { key: 'applicants', label: 'Applicants' },
          { key: 'employer', label: 'Employer' },
          { key: 'days_live', label: 'Days live' },
          { key: 'last_applicant', label: 'Last applicant' },
        ]}
        renderRow={(row, onClick) => (
          <>
            <td
              className="px-4 py-3 text-[15px]"
              style={{ color: 'var(--color-text)' }}
              onClick={onClick}
            >
              {row.title}
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              <Tag variant={STATUS_VARIANT[row.status] ?? 'grey'}>{row.status}</Tag>
            </td>
            <td
              className="px-4 py-3 text-[15px]"
              style={{ color: 'var(--color-text)' }}
              onClick={onClick}
            >
              {row.applicant_count}
            </td>
            <td
              className="px-4 py-3 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={onClick}
            >
              {row.employer_name ?? '—'}
            </td>
            <td
              className="px-4 py-3 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={onClick}
            >
              {row.days_live}
            </td>
            <td
              className="px-4 py-3 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={onClick}
            >
              {row.last_applicant_at
                ? new Date(row.last_applicant_at).toLocaleDateString('en-NZ', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </td>
          </>
        )}
        onRowClick={(row) => setDrawerUserId(row.employer_id)}
      />

      <ProfileDrawer
        userId={drawerUserId}
        initialActive={true}
        onClose={() => setDrawerUserId(null)}
      />
    </div>
  )
}
